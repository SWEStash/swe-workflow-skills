#!/usr/bin/env python3
"""Skill eval harness — TDD for the skill set.

Runs each skill's `evals` and `pressure_tests` against the Claude API:
  1. GENERATE a candidate reply (the skill is loaded into the system prompt).
     GREEN may also read files inside the skill's own directory (option A) —
     references/ and templates/ hold ~half the library's instructional bytes,
     and a real session reads them. RED stays tool-less.
  2. JUDGE that reply against each assertion with a skeptical LLM-as-judge
     (structured output → per-assertion pass/fail).
  3. Majority-of-k voting tames nondeterminism.
  4. Compare to a stored baseline; a previously-passing assertion that now
     fails is a REGRESSION and exits non-zero (the CI gate). Only rows recorded
     on the SAME model are compared — otherwise a model release would
     manufacture regressions library-wide.

GREEN (skill loaded) is the gate. RED (no skill) is tracked for delta only —
base-model behavior varies, so we never gate on it.

The baseline (evals/baseline.json) is normally produced by the in-session
Workflow arm (evals/workflow-runner.mjs) and consumed here — the same split
evals/routing-baseline.json already uses.

Usage:
  export ANTHROPIC_API_KEY=...
  export EVAL_GEN_MODEL=claude-opus-5 EVAL_JUDGE_MODEL=claude-opus-5
  python evals/run.py --all                      # every skill
  python evals/run.py --skills tdd-workflow,...  # specific skills
  python evals/run.py --changed --base origin/main   # only skills changed vs base
  python evals/run.py --all --mode both -k 3     # RED+GREEN, 3 votes
  python evals/run.py --all --update-baseline    # write evals/baseline.json

Requires: pip install -r evals/requirements.txt
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path

import anthropic
from anthropic import beta_tool

REPO = Path(__file__).resolve().parent.parent
SKILLS_DIR = REPO / "skills"
BASELINE = Path(__file__).resolve().parent / "baseline.json"

# No hardcoded model default: a pinned model silently goes stale, and a stale
# pin plus a committed baseline manufactures false regressions. The operator
# names the model, and it is recorded in every baseline row.
GEN_MODEL = os.environ.get("EVAL_GEN_MODEL")
JUDGE_MODEL = os.environ.get("EVAL_JUDGE_MODEL")

RUNNER = "run.py"
MAX_READ_BYTES = 60_000

client = anthropic.Anthropic()

VERDICT_SCHEMA = {
    "type": "object",
    "properties": {
        "verdicts": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "index": {"type": "integer"},
                    "pass": {"type": "boolean"},
                    "why": {"type": "string"},
                },
                "required": ["index", "pass", "why"],
                "additionalProperties": False,
            },
        }
    },
    "required": ["verdicts"],
    "additionalProperties": False,
}


def load_skill(name: str) -> dict | None:
    """Return {skill, dir, md, evals[], pressure[]} or None if no evals exist."""
    skill_dir = SKILLS_DIR / name
    skill_md = skill_dir / "SKILL.md"
    evals_json = skill_dir / "evals" / "evals.json"
    if not skill_md.exists() or not evals_json.exists():
        return None
    data = json.loads(evals_json.read_text())
    # Tolerate the legacy top-level-list shape (kept as a safety net; the
    # library's own files were normalized to the object shape).
    if isinstance(data, list):
        data = {"evals": data, "pressure_tests": []}
    return {
        "skill": name,
        "dir": skill_dir,
        "md": skill_md.read_text(),
        "evals": data.get("evals", []),
        "pressure": data.get("pressure_tests", []),
    }


def _read_tool_for(skill_dir: Path):
    """A read-only tool scoped to one skill directory (option A).

    The path guard resolves the request and rejects anything that leaves the
    skill directory — `..`, absolute paths, and symlink escapes alike. Read
    only: no write, no bash.
    """
    root = skill_dir.resolve()

    @beta_tool
    def read_skill_file(path: str) -> str:
        """Read a file from this skill's own directory.

        Use it for the files SKILL.md links to — references/ and templates/.

        Args:
            path: Path relative to the skill directory, e.g.
                "references/component-patterns.md".
        """
        try:
            target = (root / path).resolve()
        except OSError as exc:
            return f"ERROR: could not resolve {path!r}: {exc}"
        if target != root and root not in target.parents:
            return "ERROR: path escapes the skill directory; refused."
        if not target.is_file():
            return f"ERROR: no such file: {path}"
        data = target.read_text(errors="replace")
        if len(data) > MAX_READ_BYTES:
            return data[:MAX_READ_BYTES] + "\n\n[truncated]"
        return data

    return read_skill_file


GREEN_SYSTEM = (
    "You are a coding assistant in a developer's terminal. You have the "
    "following skill installed and you follow your installed skills when "
    "they are relevant:\n\n=== INSTALLED SKILL ===\n{md}\n=== END SKILL ===\n\n"
    "The skill's directory also holds the files it links to (references/, "
    "templates/). Use the read_skill_file tool to read any of those the skill "
    "points you to, exactly as you would in a real session. Then respond to "
    "the developer exactly as you would in a real session. Take no other "
    "actions — your final message must be only the reply you would send back."
)

RED_SYSTEM = (
    "You are a coding assistant in a developer's terminal. Respond exactly "
    "as you naturally would in a real session. Do not use tools — output "
    "only the reply message you would send back."
)


def generate(skill: dict, prompt: str, with_skill: bool) -> str:
    """Produce a candidate assistant reply to `prompt`."""
    if not with_skill:
        # RED arm — unchanged, tool-less. The RED/GREEN contrast is the signal.
        resp = client.messages.create(
            model=GEN_MODEL,
            max_tokens=2000,
            thinking={"type": "adaptive"},
            system=RED_SYSTEM,
            messages=[{"role": "user", "content": prompt}],
        )
        return "".join(b.text for b in resp.content if b.type == "text")

    runner = client.beta.messages.tool_runner(
        model=GEN_MODEL,
        max_tokens=2000,
        thinking={"type": "adaptive"},
        system=GREEN_SYSTEM.format(md=skill["md"]),
        messages=[{"role": "user", "content": prompt}],
        tools=[_read_tool_for(skill["dir"])],
    )
    final = runner.until_done()
    return "".join(b.text for b in final.content if b.type == "text")


def judge(prompt: str, reply: str, assertions: list[str]) -> list[bool]:
    """Return a pass/bool per assertion (index-aligned)."""
    listing = "\n".join(f"{i}. {a}" for i, a in enumerate(assertions))
    user = (
        f'A developer wrote this under pressure:\n"{prompt}"\n\n'
        f'An assistant replied:\n"""\n{reply}\n"""\n\n'
        f"Decide, for EACH assertion, whether the reply CLEARLY satisfies it. "
        f"Be conservative: if in doubt, fail it. Return one verdict per assertion "
        f"by index.\n\nAssertions:\n{listing}"
    )
    resp = client.messages.create(
        model=JUDGE_MODEL,
        max_tokens=2000,
        thinking={"type": "adaptive"},
        system="You are a strict, skeptical evaluator of assistant behavior.",
        output_config={"format": {"type": "json_schema", "schema": VERDICT_SCHEMA}},
        messages=[{"role": "user", "content": user}],
    )
    text = next(b.text for b in resp.content if b.type == "text")
    verdicts = {v["index"]: v["pass"] for v in json.loads(text)["verdicts"]}
    return [bool(verdicts.get(i, False)) for i in range(len(assertions))]


def run_case(skill, prompt, assertions, with_skill, k):
    """Majority-of-k: an assertion passes if it passes in > half the runs."""
    tallies = [0] * len(assertions)
    for _ in range(k):
        reply = generate(skill, prompt, with_skill)
        for i, ok in enumerate(judge(prompt, reply, assertions)):
            tallies[i] += 1 if ok else 0
    return [t * 2 > k for t in tallies]


def changed_skills(base: str) -> list[str]:
    out = subprocess.run(
        ["git", "diff", "--name-only", f"{base}...HEAD"],
        cwd=REPO, capture_output=True, text=True, check=True,
    ).stdout
    names = set()
    for line in out.splitlines():
        parts = line.split("/")
        if len(parts) >= 2 and parts[0] == "skills":
            names.add(parts[1])
    return sorted(names)


def main() -> int:
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--all", action="store_true")
    g.add_argument("--skills", help="comma-separated skill names")
    g.add_argument("--changed", action="store_true", help="skills changed vs --base")
    ap.add_argument("--base", default="origin/main")
    ap.add_argument("--mode", choices=["green", "red", "both"], default="green")
    ap.add_argument("-k", type=int, default=1, help="votes per case (majority)")
    ap.add_argument("--update-baseline", action="store_true")
    args = ap.parse_args()

    if not GEN_MODEL or not JUDGE_MODEL:
        print(
            "EVAL_GEN_MODEL and EVAL_JUDGE_MODEL must be set (e.g. claude-opus-5).\n"
            "They are recorded in the baseline so the gate only compares "
            "same-model rows; there is deliberately no default.",
            file=sys.stderr,
        )
        return 2

    if args.all:
        names = sorted(p.name for p in SKILLS_DIR.iterdir() if p.is_dir())
    elif args.skills:
        names = [s.strip() for s in args.skills.split(",") if s.strip()]
    else:
        names = changed_skills(args.base)

    skills = [s for s in (load_skill(n) for n in names) if s]
    if not skills:
        print("No skills with evals to run.")
        return 0

    baseline = json.loads(BASELINE.read_text()) if BASELINE.exists() else {}
    base_skills = baseline.get("skills", {})
    results, regressed, skipped = {}, [], []

    def all_cases(s):
        for e in s["evals"]:
            yield ("eval", e["id"], e["prompt"], e["assertions"])
        for p in s["pressure"]:
            yield ("pressure", p["id"], p["prompt"], p["assertions"])

    for s in skills:
        print(f"\n=== {s['skill']} ===")
        skill_res = {}
        for kind, cid, prompt, assertions in all_cases(s):
            key = f"{kind}:{cid}"
            green = run_case(s, prompt, assertions, True, args.k)
            row = {"green": green, "model": GEN_MODEL, "k": args.k, "runner": RUNNER}
            gp = sum(green)
            line = f"  {key}: GREEN {gp}/{len(green)}"
            if args.mode in ("red", "both"):
                red = run_case(s, prompt, assertions, False, args.k)
                row["red"] = red
                line += f"  RED {sum(red)}/{len(red)}"
            print(line)
            # Regression check: a baseline-green assertion now failing, compared
            # only against a row recorded on the same model.
            base_row = base_skills.get(s["skill"], {}).get(key, {})
            base_green = base_row.get("green")
            base_model = base_row.get("model", baseline.get("model"))
            if base_green:
                if base_model != GEN_MODEL:
                    skipped.append(f"{s['skill']} {key} (baseline {base_model})")
                else:
                    for i, (was, now) in enumerate(zip(base_green, green)):
                        if was and not now:
                            regressed.append(f"{s['skill']} {key} assertion #{i}")
            skill_res[key] = row
        results[s["skill"]] = skill_res

    if skipped:
        print(
            f"\nNOT COMPARABLE — {len(skipped)} case(s) recorded on a different "
            f"model than {GEN_MODEL}; not gated:"
        )
        for r in skipped[:10]:
            print(f"  - {r}")
        if len(skipped) > 10:
            print(f"  ... and {len(skipped) - 10} more")

    if args.update_baseline:
        # Preserve the hand-maintained provenance note rather than clobbering it.
        out = {
            "_note": baseline.get("_note", ""),
            "model": GEN_MODEL,
            "k": args.k,
            "runner": RUNNER,
            "option": "A",
            "skills": {**base_skills, **results},
        }
        BASELINE.write_text(json.dumps(out, indent=2) + "\n")
        print(f"\nWrote baseline → {BASELINE}")
        return 0

    if regressed:
        print("\nREGRESSIONS (assertion was green in baseline, now red):")
        for r in regressed:
            print(f"  - {r}")
        return 1

    print("\nNo regressions vs baseline.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
