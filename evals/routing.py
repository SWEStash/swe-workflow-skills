#!/usr/bin/env python3
"""Routing (activation) eval harness — does the right skill actually get activated?

`run.py` force-loads a skill and asks "if it runs, does it help?". This harness
asks the other half: **"does the right skill run?"** — the routing factor in

    realized quality = routing accuracy x (GREEN - RED gap)

Under the name-only baseline, most skills only fire when `skill-router` (haiku)
reads the catalog and invokes them by name. This is the **layer-2** routing-
accuracy unit test: isolate that decision. Feed the model the catalog + a prompt
using the router's own routing prompt, force a structured `{ chosen_skill | NONE }`
answer on the **shipping model (haiku)**, and grade by accept-set membership.

Dataset is mined from the existing `skills/*/evals/evals.json` (+ a small curated
trivial set), so it stays in sync as skills are added. Grading uses an **accept
set** per case (see docs/EVALS.md "Activation evaluation"):
  - positive (eval #1):  accept = {home}                       -> top-1 accuracy
  - boundary (eval #3):  accept = {home} u {siblings} u {NONE}  -> no wild misroute
  - trivial  (curated):  accept = {NONE}                        -> false-activation

The gate is **regression-vs-baseline** (`evals/routing-baseline.json`), exactly
like `run.py` — never an absolute threshold.

Usage:
  python evals/routing.py --build-dataset          # mine -> routing-dataset.json
  python evals/routing.py --check-dataset          # fail if dataset is stale
  export ANTHROPIC_API_KEY=...
  python evals/routing.py --run                    # route every case, report metrics
  python evals/routing.py --run -k 3               # majority-of-3 per case
  python evals/routing.py --run --changed --base origin/main
  python evals/routing.py --run --update-baseline  # record routing-baseline.json

The in-session, key-free runner (also the layer-3 behavioral suite) is
`evals/routing-runner.mjs`, driven by the Workflow tool. See docs/EVALS.md.

Requires: pip install -r evals/requirements.txt
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from collections import Counter
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
SKILLS_DIR = REPO / "skills"
CATALOG = REPO / "catalog.json"
EVALS = Path(__file__).resolve().parent
DATASET = EVALS / "routing-dataset.json"
TRIVIAL = EVALS / "routing-trivial.json"
BASELINE = EVALS / "routing-baseline.json"

NONE = "NONE"
# The router itself is the orchestrator, not a routable target — exclude it from
# both the choices and the mined cases.
ROUTER = "skill-router"

# skill-router ships `model: haiku`; route on the shipping model. Haiku 4.5.
ROUTING_MODEL = os.environ.get("EVAL_ROUTING_MODEL", "claude-haiku-4-5")


# --------------------------------------------------------------------------- #
# Dataset mining (no API key needed)
# --------------------------------------------------------------------------- #
def load_catalog() -> list[dict]:
    return json.loads(CATALOG.read_text())["skills"]


def catalog_names(catalog: list[dict]) -> list[str]:
    return [s["name"] for s in catalog]


def _evals_for(skill: str) -> list[dict]:
    f = SKILLS_DIR / skill / "evals" / "evals.json"
    if not f.exists():
        return []
    data = json.loads(f.read_text())
    if isinstance(data, list):  # legacy top-level-list shape
        return data
    return data.get("evals", [])


def build_dataset() -> dict:
    """Mine routing cases from every skill's evals. Deterministic + committed."""
    catalog = load_catalog()
    names = set(catalog_names(catalog))
    cases: list[dict] = []

    for skill in sorted(names):
        if skill == ROUTER:
            continue  # the router is not a routable target
        evals = _evals_for(skill)
        by_id = {e.get("id"): e for e in evals}

        # Happy path (eval #1) -> positive. Reliable single-expected gold.
        e1 = by_id.get(1) or (evals[0] if evals else None)
        if e1 and e1.get("prompt"):
            cases.append({
                "id": f"positive:{skill}:{e1.get('id', 1)}",
                "kind": "positive",
                "skill": skill,
                "prompt": e1["prompt"],
                "accept": [skill],
            })

        # Scope boundary (eval #3) -> boundary. Heterogeneous, so use an accept
        # set: home OR any sibling skill named in the expected_output/assertions
        # OR NONE. Fails only on a wild misroute to an unrelated third skill.
        e3 = by_id.get(3) or (evals[2] if len(evals) >= 3 else None)
        if e3 and e3.get("prompt"):
            text = (e3.get("expected_output", "") + " "
                    + " ".join(e3.get("assertions", []))).lower()
            siblings = [n for n in sorted(names)
                        if n != skill and n != ROUTER and n in text]
            accept = [skill, *siblings, NONE]
            cases.append({
                "id": f"boundary:{skill}:{e3.get('id', 3)}",
                "kind": "boundary",
                "skill": skill,
                "prompt": e3["prompt"],
                "accept": accept,
            })

    # Curated trivial / conversational prompts that must route to nothing.
    trivial = json.loads(TRIVIAL.read_text())
    for i, t in enumerate(trivial.get("prompts", [])):
        cases.append({
            "id": f"trivial:{i}",
            "kind": "trivial",
            "skill": None,
            "prompt": t,
            "accept": [NONE],
        })

    return {"version": 1, "model": ROUTING_MODEL, "cases": cases}


def write_dataset() -> dict:
    ds = build_dataset()
    DATASET.write_text(json.dumps(ds, indent=2) + "\n")
    return ds


def check_dataset() -> int:
    """Fail if the committed dataset is stale (mirrors build-plugins --check)."""
    fresh = json.dumps(build_dataset(), indent=2) + "\n"
    if not DATASET.exists() or DATASET.read_text() != fresh:
        print("FAIL: routing-dataset.json is stale.\n"
              "Run `python evals/routing.py --build-dataset` and commit it.")
        return 1
    print("OK: routing-dataset.json is up to date.")
    return 0


# --------------------------------------------------------------------------- #
# Routing prompt + the model call (needs API key)
# --------------------------------------------------------------------------- #
def routing_system_prompt(catalog: list[dict]) -> str:
    """Derived from skills/skill-router/SKILL.md — read the catalog, match intent,
    invoke by name, route to NONE when nothing fits / over-routing would cost."""
    lines = [f"- {s['name']}: {s['description']}"
             for s in catalog if s["name"] != ROUTER]
    return (
        "You are skill-router, the orchestrator for the dev-workflow skills "
        "library in Claude Code. Given a developer's message, decide which ONE "
        "skill should be activated to handle it.\n\n"
        "How to route:\n"
        "- Match the developer's intent to the single best-fit skill in the "
        "catalog below.\n"
        "- Most skills are loaded name-only and only run when routed to, so this "
        "decision is the activation path.\n"
        "- If nothing fits — the message is trivial, conversational, a pure "
        "question, a tiny mechanical edit (typo/rename), or otherwise needs no "
        "workflow — choose \"NONE\". Do NOT over-route: an unnecessary activation "
        "costs an extra hop.\n"
        "- The developer's explicit instructions take precedence. Choose exactly "
        "one.\n\n"
        "Catalog (skill — description):\n" + "\n".join(lines)
    )


def choice_schema(catalog: list[dict]) -> dict:
    choices = [s["name"] for s in catalog if s["name"] != ROUTER] + [NONE]
    return {
        "type": "object",
        "properties": {
            "reasoning": {"type": "string"},
            "chosen_skill": {"type": "string", "enum": choices},
        },
        "required": ["reasoning", "chosen_skill"],
        "additionalProperties": False,
    }


def route_once(client, system: str, schema: dict, prompt: str) -> str:
    resp = client.messages.create(
        model=ROUTING_MODEL,
        max_tokens=1024,
        system=system,
        output_config={"format": {"type": "json_schema", "schema": schema}},
        messages=[{"role": "user", "content": prompt}],
    )
    text = next(b.text for b in resp.content if b.type == "text")
    return json.loads(text)["chosen_skill"]


def route(client, system, schema, prompt, k) -> str:
    """Majority-of-k on the chosen skill (mode; first-seen breaks ties)."""
    votes = [route_once(client, system, schema, prompt) for _ in range(k)]
    return Counter(votes).most_common(1)[0][0]


# --------------------------------------------------------------------------- #
# Metrics + report
# --------------------------------------------------------------------------- #
def summarize(results: list[dict]) -> dict:
    pos = [r for r in results if r["kind"] == "positive"]
    triv = [r for r in results if r["kind"] == "trivial"]
    bound = [r for r in results if r["kind"] == "boundary"]
    confusion = Counter()
    for r in pos:
        if not r["pass"]:
            confusion[f"{r['skill']} -> {r['chosen']}"] += 1
    for r in bound:
        if not r["pass"]:
            confusion[f"{r['skill']} -> {r['chosen']}"] += 1

    def rate(rows):
        return round(sum(r["pass"] for r in rows) / len(rows), 4) if rows else None

    return {
        "model": ROUTING_MODEL,
        "n_positive": len(pos),
        "n_boundary": len(bound),
        "n_trivial": len(triv),
        "positive_accuracy": rate(pos),
        "boundary_pass_rate": rate(bound),
        # false-activation = trivial prompts that did NOT route to NONE
        "false_activation_rate": (
            round(sum(not r["pass"] for r in triv) / len(triv), 4) if triv else None
        ),
        "confusion_pairs": confusion.most_common(),
    }


def changed_skills(base: str) -> set[str]:
    out = subprocess.run(
        ["git", "diff", "--name-only", f"{base}...HEAD"],
        cwd=REPO, capture_output=True, text=True, check=True,
    ).stdout
    names = set()
    for line in out.splitlines():
        parts = line.split("/")
        if len(parts) >= 2 and parts[0] == "skills":
            names.add(parts[1])
    return names


def run(args) -> int:
    import anthropic  # local import so --build/--check work without the dep

    ds = json.loads(DATASET.read_text()) if DATASET.exists() else write_dataset()
    catalog = load_catalog()
    system = routing_system_prompt(catalog)
    schema = choice_schema(catalog)

    cases = ds["cases"]
    if args.changed:
        changed = changed_skills(args.base)
        cases = [c for c in cases
                 if c["kind"] == "trivial" or c["skill"] in changed]
        if not cases:
            print("No routing cases for changed skills.")
            return 0

    client = anthropic.Anthropic()
    results = []
    for c in cases:
        chosen = route(client, system, schema, c["prompt"], args.k)
        ok = chosen in c["accept"]
        results.append({**c, "chosen": chosen, "pass": ok})
        flag = "ok " if ok else "MISS"
        print(f"  {flag} [{c['kind']:8}] {c['id']:42} -> {chosen}")

    summary = summarize(results)
    print("\n=== routing summary ===")
    print(f"  positive (top-1) accuracy : {summary['positive_accuracy']} "
          f"(n={summary['n_positive']})")
    print(f"  boundary pass rate        : {summary['boundary_pass_rate']} "
          f"(n={summary['n_boundary']})")
    print(f"  false-activation rate     : {summary['false_activation_rate']} "
          f"(n={summary['n_trivial']})")
    if summary["confusion_pairs"]:
        print("  confusion pairs (misroutes):")
        for pair, n in summary["confusion_pairs"]:
            print(f"    {n}x  {pair}")

    out = {
        "model": ROUTING_MODEL,
        "k": args.k,
        "summary": summary,
        "cases": {r["id"]: {"chosen": r["chosen"], "pass": r["pass"]}
                  for r in results},
    }

    if args.update_baseline:
        BASELINE.write_text(json.dumps(out, indent=2) + "\n")
        print(f"\nWrote baseline -> {BASELINE}")
        return 0

    # Gate: a case that passed in the baseline must not now fail.
    if not BASELINE.exists():
        print("\nNo baseline yet — run with --update-baseline to record one.")
        return 0
    base = json.loads(BASELINE.read_text()).get("cases", {})
    regressed = [cid for cid, r in out["cases"].items()
                 if base.get(cid, {}).get("pass") and not r["pass"]]
    if regressed:
        print("\nREGRESSIONS (routed correctly in baseline, now misrouted):")
        for cid in regressed:
            print(f"  - {cid}: now -> {out['cases'][cid]['chosen']}")
        return 1
    print("\nNo routing regressions vs baseline.")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--build-dataset", action="store_true",
                    help="mine evals -> routing-dataset.json and exit")
    ap.add_argument("--check-dataset", action="store_true",
                    help="fail if routing-dataset.json is stale")
    ap.add_argument("--run", action="store_true", help="route + grade (needs key)")
    ap.add_argument("--changed", action="store_true",
                    help="only cases for skills changed vs --base")
    ap.add_argument("--base", default="origin/main")
    ap.add_argument("-k", type=int, default=1, help="votes per case (majority)")
    ap.add_argument("--update-baseline", action="store_true")
    args = ap.parse_args()

    if args.build_dataset:
        ds = write_dataset()
        kinds = Counter(c["kind"] for c in ds["cases"])
        print(f"Wrote {DATASET} — {len(ds['cases'])} cases "
              f"({dict(kinds)})")
        return 0
    if args.check_dataset:
        return check_dataset()
    if args.run:
        return run(args)
    ap.print_help()
    return 2


if __name__ == "__main__":
    sys.exit(main())
