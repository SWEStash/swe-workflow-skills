# Routing benchmark: measuring whether the right skill actually activates

**TL;DR** — Claude Code's skill auto-triggering is probabilistic, and community
measurements put it anywhere from ~45% to ~84% depending on prompt and hook hacks. This
library replaces auto-triggering with an **orchestrator that routes intent to skills by
name**, and it measures that routing the way you'd measure code: a 124-case harness,
graded by accept-set, gated in CI against a committed baseline. On the current 65-skill
catalog, routing on `claude-haiku-4-5` scores a **clean sweep — 64/64 top-1, 52/52
boundary, 0/8 false activation, zero confusion pairs.** The numbers below are
reproducible from the repo with no API key.

This is the one artifact worth reading if you're deciding whether "routed activation" is
marketing or measurable. It's measurable.

---

## Why activation is the hard part

A skill only helps if it *runs* on the prompt it was built for. Two failure modes make
that unreliable as a library grows:

1. **Probabilistic auto-triggering.** Claude decides whether to load a skill by matching
   your prompt against skill descriptions — "LLM semantic reasoning over descriptions, no
   algorithmic matching." It's a judgment call, and it misses.
2. **Listing-budget cropping.** Claude Code injects skill `name`+`description` pairs into
   a listing capped at ~1% of the context window (~20–22 descriptions on a 200k window).
   Past the cap it drops the least-recently-used descriptions, silently stripping the
   keywords a skill needs to match. At 65 skills, most of the catalog is invisible to
   auto-triggering by default.

### What the wild looks like (⚠ small-sample practitioner benchmarks)

These are third-party numbers, corroborated across several independent write-ups and a
Claude Code GitHub issue — directional, not audited:

| Measurement (2025–26) | Auto-trigger hit rate |
|---|---|
| Nov 2025, global vs local skills | **4/10 · 5/10** ("basically a coin flip") |
| Feb 2026, 4 SvelteKit skills × 5 prompts × 10 runs (Haiku), simple reminder hook | **~50%** |
| …same, forced YES/NO-eval hook | **~84%** (and it failed one category entirely) |
| …same, LLM pre-router | **~80%** |

The recurring community workaround — a `UserPromptSubmit` hook + a keyword `skill-rules.json`
that injects "INSTRUCTION: Use Skill(x)" — is itself evidence that practitioners find
descriptions insufficient and reach for routing metadata *outside* the description.

## What this library does instead

One meta-skill, `skill-router`, stays fully described (so it always triggers), reads the
full `catalog.json` on demand (every skill's complete description, with no budget
pressure), matches your intent, and **invokes the chosen skill(s) by name**. Everything
else is listed `name-only` — invocable, but not competing for the auto-trigger budget.
See [ROLES.md](ROLES.md) for the activation model.

Routing turns activation from a probabilistic match into an explicit decision — which
means it can be *tested*.

## How we measure it

Full methodology in [EVALS.md § Activation evaluation](EVALS.md#activation-evaluation-routing--implemented).
The short version:

- **Dataset (124 cases, generated + committed):** 64 positive + 52 boundary + 8 trivial.
  Positive and boundary cases are **mined from each skill's own evals** (happy-path eval
  → positive; scope-boundary eval → boundary), so the dataset grows with the catalog and
  can't drift. The 8 trivial/conversational cases are the only hand-authored ones.
- **Accept-set grading (not single-expected).** Each case carries an accept set; a route
  passes iff `chosen ∈ accept`:
  - positive → `{home}` — measures **top-1 accuracy**;
  - boundary → `{home} ∪ {siblings named in its expected_output} ∪ {NONE}` — measures
    **"no wild misroute"** (fails only on an unrelated third skill);
  - trivial → `{NONE}` — measures **false-activation rate** (guards against over-routing).
- **Layer 3 (behavioral).** A subagent that *has* a `Skill(name)` tool decides whether to
  **invoke** vs merely name a skill, and whether it over-routes on trivial prompts.
- **Model:** `claude-haiku-4-5` — `skill-router`'s shipping model. If haiku routes it
  cleanly, stronger models are headroom, not a requirement.
- **Gate:** regression-vs-baseline, never an absolute threshold. A case that routed
  correctly in the committed `routing-baseline.json` must not later misroute. Wired into
  `.github/workflows/routing-evals.yml`.

## Results (committed baseline, 2026-07, 65-skill catalog)

| Layer 2 metric | Result |
|---|---|
| Top-1 routing accuracy (positives) | **64 / 64 = 1.00** |
| Boundary pass rate ("no wild misroute") | **52 / 52 = 1.00** |
| False-activation rate (trivial → NONE) | **0 / 8 = 0.00** |
| Confusion pairs | **none** |

Layer 3 (behavioral, 16 cases): router-invocation **8/8**, correct-invoke **8/8**,
over-route **0/8**. Boundaries stayed nuanced in both directions — e.g.
`notebook-to-production` ↔ `ml-pipeline-design`, `statistical-analysis` → `ai-evaluation`,
`rollback-strategy` → `incident-response`, and `refactoring` / `strategic-review`
boundaries → `NONE`.

Source of record: [`evals/routing-baseline.json`](../evals/routing-baseline.json)
(every case's chosen skill + pass/fail).

## Reproduce it

```bash
# Offline: confirm the dataset is in sync with the skills' evals
python evals/routing.py --check-dataset

# With an API key: route all 124 cases on haiku, majority-of-3
export ANTHROPIC_API_KEY=...
python evals/routing.py --run -k 3

# Key-free, in-session (also runs layer 3) — via the Claude Code Workflow tool:
#   Workflow({ scriptPath: "evals/routing-runner.mjs",
#              args: { dataset: "<abs>/evals/routing-dataset.json",
#                      catalog: "<abs>/catalog.json" } })
```

## Honest caveats

- **Haiku, single-vote by default.** The committed baseline is `k=1`; the harness
  supports majority-of-k (`-k 3`) for lower variance. Routing quality can shift with the
  model — the gate exists precisely to catch that.
- **Accept-set grading is deliberately lenient on boundaries.** Boundary cases pass on
  `{home} ∪ {siblings} ∪ {NONE}` because scope-boundary evals are heterogeneous (some are
  genuine redirects, some in-scope edge cases). It measures "no *wild* misroute," not
  "picked our single favourite." That choice, and why, is documented in EVALS.md.
- **This measures routing, not skill quality.** "The right skill activated" is a separate
  question from "the skill helped" — that's the RED/GREEN content harness (`run.py`). The
  realized value is the product of the two: *routing accuracy × (GREEN − RED gap)*.
- **The committed set is mined from the skills' own evals — but cross-checked held-out.**
  Positive/boundary cases are written by the same hand as the descriptions, so the 124-case
  gate could in principle be teaching to the test. To probe that, a separate **hand-authored
  150-case held-out set** (`evals/routing-heldout.json`) — no phrasing copied from any
  `evals.json`, each skill's own trigger keywords deliberately avoided — was routed on haiku
  at k=3: a perfect, fully-unanimous sweep (paraphrase 92/92, confusable 24/24 with zero
  confusion pairs, trap 18/18, trivial 16/16, false-activation 0/21). So the clean sweep
  isn't an artifact of shared author phrasing. It's a periodic manual probe, **not** a CI
  gate (see [EVALS.md § Held-out generalization probe](EVALS.md#held-out-generalization-probe-independent)).
- **The comparison isn't apples-to-apples.** The community numbers above measure native
  auto-triggering on small skill sets; ours measures orchestrator routing on a 65-skill
  catalog. They're different mechanisms — which is the point: routing is what makes a
  large catalog reliable at all.

## The takeaway

Native auto-triggering is a real, useful feature that degrades with scale. For a curated
65-skill SDLC library, routing is what keeps every skill reachable *and* makes activation
predictable enough to regression-test. The number to remember isn't "100%" — it's that
**activation is measured and gated at all**, which is not something the platform or the
community libraries do at catalog scale.
