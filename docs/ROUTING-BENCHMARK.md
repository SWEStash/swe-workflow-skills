# Routing benchmark: measuring whether the right skill actually activates

**TL;DR** — Claude Code's skill auto-triggering is probabilistic, and community
measurements put it anywhere from ~45% to ~84% depending on prompt and hook hacks. This
library replaces auto-triggering with an **orchestrator that routes intent to skills by
name**, and it measures that routing the way you'd measure code: a 138-case harness,
graded by accept-set, gated in CI against a committed baseline. On the current 66-skill
catalog, routing on `claude-haiku-4-5` at k=3 scores **65/65 top-1, 64/65 boundary, 0/8
false activation, and one confusion pair**. The numbers below are reproducible from
the repo with no API key.

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
   keywords a skill needs to match. At 66 skills, most of the catalog is invisible to
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

- **Dataset (138 cases, generated + committed):** 65 positive + 65 boundary + 8 trivial.
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

## Results (committed baseline, 66-skill catalog)

Recorded 2026-09 over all 138 cases at **k=3**: three independent samples per case,
majority route. Every case was re-recorded, and nothing was carried forward.

| Layer 2 metric | Result |
|---|---|
| Top-1 routing accuracy (positives) | **65 / 65 = 1.00** |
| Boundary pass rate ("no wild misroute") | **64 / 65 = 0.985** |
| False-activation rate (trivial → NONE) | **0 / 8 = 0.00** |
| Confusion pairs | `project-documentation → release-management` |

Layer 3 (behavioral, 16 cases): router-invocation **8/8**, correct-invoke **8/8**,
over-route **0/8**. 133 of 138 cases are unanimous across the three samples. Boundary
routes make real discriminations: none of the 64 passing boundary cases fell back to
`NONE`, and 38 chose a named sibling, for example `notebook-to-production` →
`ml-pipeline-design`, `rollback-strategy` → `incident-response` and `refactoring` →
`technical-debt-review`.

**Earlier versions of this page reported a clean sweep, and those figures were not
sound.** The runner that recorded them sent each agent to read the dataset file for its
prompt. That file carries every case's accept set, so the agents routed with the answer
in reach. And 28 of the 138 rows had been recorded against a prompt or accept set that
has since changed. The runner now passes each prompt inline, and the leak scan fails a
run in which an agent opens a routing dataset. The remaining misroute, and one fixed since,
are described in [EVALS.md § Results](EVALS.md#results-haiku-and-the-haiku-recommendation).

Source of record: [`evals/routing-baseline.json`](../evals/routing-baseline.json)
(every case's chosen skill + pass/fail).

## Reproduce it

```bash
# Offline: confirm the dataset is in sync with the skills' evals
python evals/routing.py --check-dataset

# With an API key: route all 138 cases on haiku, majority-of-3
export ANTHROPIC_API_KEY=...
python evals/routing.py --run -k 3

# Key-free, in-session (also runs layer 3) — via the Claude Code Workflow tool:
#   Workflow({ scriptPath: "evals/routing-runner.mjs",
#              args: { catalog: "<abs>/catalog.json",
#                      cases: <the .cases array of evals/routing-dataset.json>,
#                      k: 3 } })
```

## Honest caveats

- **Haiku, majority of three.** The committed baseline is `k=3`, and six cases split
  their votes. A route that splits can flip between runs without anything changing.
  Routing quality can also shift with the model, and the gate exists to catch that.
- **Accept-set grading is deliberately lenient on boundaries.** Boundary cases pass on
  `{home} ∪ {siblings} ∪ {NONE}` because scope-boundary evals are heterogeneous (some are
  genuine redirects, some in-scope edge cases). It measures "no *wild* misroute," not
  "picked our single favourite." That choice, and why, is documented in EVALS.md.
- **This measures routing, not skill quality.** "The right skill activated" is a separate
  question from "the skill helped" — that's the RED/GREEN content harness (`run.py`). The
  realized value is the product of the two: *routing accuracy × (GREEN − RED gap)*.
- **The committed set is mined from the skills' own evals — but cross-checked held-out.**
  Positive/boundary cases are written by the same hand as the descriptions, so the 138-case
  gate could in principle be teaching to the test. A separate **hand-authored held-out
  set** (`evals/routing-heldout.json`) exists to probe that. It copies no phrasing from any
  `evals.json` and deliberately avoids each skill's own trigger keywords. Routed on haiku
  at k=3 with the fixed runner, it scores **155/162**: every adjacent cluster separated,
  every trap handled, and 0/23 false activations. **All seven misses are terse "I'm
  done" claims** ("Let's commit and move on", "Ship it") meant for
  `verification-before-completion`. The router read them as conversation or as the
  git or release step they mention. A one-line routing instruction in that skill's
  description has since fixed all nine, with no guard case moving.
  It's a periodic manual probe, **not** a CI
  gate (see [EVALS.md § Held-out generalization probe](EVALS.md#held-out-generalization-probe-independent)).
- **The comparison isn't apples-to-apples.** The community numbers above measure native
  auto-triggering on small skill sets; ours measures orchestrator routing on a 66-skill
  catalog. They're different mechanisms — which is the point: routing is what makes a
  large catalog reliable at all.

## The takeaway

Native auto-triggering is a real, useful feature that degrades with scale. For a curated
66-skill SDLC library, routing is what keeps every skill reachable *and* makes activation
predictable enough to regression-test. The number to remember isn't 65/65, it's that
**activation is measured and gated at all**, which is not something the platform or the
community libraries do at catalog scale.
