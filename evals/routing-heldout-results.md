# Held-out routing probe — results

Independent generalization probe for `skill-router`, run on **`claude-haiku-4-5`**
at **k=3** (majority vote of 3 independent samples per case) via
`evals/routing-heldout-runner.mjs` against `evals/routing-heldout.json`.

**Why this exists.** The committed routing gate (`routing-dataset.json`) is *mined
from each skill's own `evals/evals.json`* — prompts written by the same author as
the skill description. It scores 64/64 positive, 52/52 boundary, 0/8
false-activation, but only measures routing on author-anticipated phrasings
(`docs/EVALS.md` § "Known limitations"). This set is authored **independently**:
no phrasing copied from any `evals.json`, and every prompt deliberately avoids its
target skill's own `Triggers:` keywords (0/92 paraphrases contain an own-trigger
phrase). It asks the harder question — *does the perfect in-dataset routing
generalize?*

## Result: perfect sweep, fully stable

| Metric | Result (k=3) |
|---|---|
| Paraphrase (positive) accuracy | **92/92 = 1.00** |
| Confusable accuracy | **24/24 = 1.00** |
| Trap accuracy (route-elsewhere or NONE) | **18/18 = 1.00** |
| Harder-trivial accuracy (→ NONE) | **16/16 = 1.00** |
| Kind: positive / boundary / trivial | 124/124 · 5/5 · 21/21 |
| False-activation rate (21 NONE-expected cases) | **0/21 = 0.00** |
| Confusion pairs | **none** |
| Vote unanimity | **150/150 unanimous** (0 split, 0 unstable, 0 failures) |

451/451 route agents completed with 0 errors (one session-limit interruption at
301 agents; the resume replayed the cache and ran the remaining tail — no
re-spend). Read-only throughout: no `SKILL.md`, `catalog.json`, or dataset files
were touched.

## What this establishes

- **Paraphrase generalization holds.** All 64 routable skills were hit with
  intent-preserving prompts in a different register/vocabulary than their
  descriptions, with their own trigger keywords removed; every one routed top-1 to
  its home skill, unanimously. The mined suite's 64/64 is **not** an artifact of
  shared author phrasing — routing survives when the keywords are stripped and the
  wording is foreign.

- **The six adjacent clusters are cleanly separated.** Every cluster resolved 4/4
  with zero confusion:
  - `data-modeling` vs `api-design` (c1) — storage/records vs request/response
    contract.
  - `ml-pipeline-design` vs `data-pipeline-design` vs `notebook-to-production` (c2).
  - `security-audit` vs `threat-modeling` vs `compliance-privacy` (c3).
  - `bug-investigating` vs `code-reviewing` vs `project-review` (c4).
  - `incident-response` vs `rollback-strategy` vs `resilience-engineering` (c5).
  - `brainstorming` vs `prd-writing` vs `feature-planning` (c6).

- **The 5 "genuinely ambiguous" boundary cases were decided, not coin-flipped.**
  Each 2-skill-accept case landed unanimously on the *intended primary*:
  `confuse:c2:4` → `ml-pipeline-design` (notebook that feeds training),
  `confuse:c3:4` → `compliance-privacy` (auditor access controls),
  `confuse:c4:4` → `bug-investigating`, `confuse:c5:4` → `incident-response`
  (active-incident revert decision), `confuse:c6:4` → `prd-writing`. This is
  *stronger* than the mined k=3 pass, where 4 boundary cases split inside their
  accept-set — here the router had a stable opinion on all five.

- **Scope/negation traps are handled correctly.** Prompts that name a skill's
  keywords but should route elsewhere all went the right way — e.g. "the schema's
  frozen, I need a tested rollout-with-undo" → `rollback-strategy` (not
  `data-modeling`); "don't threat-model, the feature shipped — audit the real
  code" → `security-audit`; "there's no model, it's a plain reporting notebook" →
  `notebook-to-production`. 13 traps routed to the correct alternate skill, 5
  correctly declined to `NONE`.

- **No over-routing.** All 16 harder trivials (conversational/factual questions
  carrying domain keywords — "what does idempotent mean", "roughly what's a normal
  default page size for paginated endpoints", "did the deploy go okay") plus the 5
  NONE-traps declined to route. 0/21 false activations.

## What this does *not* prove (honest limits)

- **Still one evaluator.** These prompts are held out from the *skill authors* but
  authored by a single evaluator with the catalog in view. It reduces the
  teaching-to-the-test risk; it does not reproduce true in-the-wild user diversity.
  Real usage will phrase things in ways neither author anticipated.
- **Golds are pre-decided.** Confusables (including the 5 boundary cases) were
  written with a decidable intent. A perfect score partly reflects that
  decidability — genuinely undecidable phrasings were not heavily probed. The
  boundary accept-sets still include a second legitimate skill by design.
- **Thin per skill.** 1–2 paraphrases per skill (92 across 64). Coverage of each
  skill's phrasing space is shallow; this is a breadth probe, not a depth one.
- **k=3, not k=∞.** Unanimity across 3 samples is strong stability evidence but
  not a guarantee at higher sampling or on stronger/weaker models.

The defensible summary:

> **On an independent, keyword-avoiding, 150-case held-out set, haiku routing
> generalizes with no measured degradation — 150/150 correct and unanimous at
> k=3, all six adjacent clusters cleanly separated, scope/negation traps handled,
> zero false activations. The perfect in-dataset result is not an artifact of
> author-shared phrasing. Caveat: still a single-evaluator probe with pre-decided
> golds, so it lowers rather than eliminates the generalization risk.**

## Recommendation: keep it a periodic manual probe, not a CI gate

Do **not** wire this into the blocking CI routing gate:

1. **It's expected to eventually surface ambiguity, and gating on that is noisy.**
   Held-out/adversarial prompts are designed to find edges; a future prompt
   landing in a genuinely-ambiguous spot would fail a hard gate without signaling
   a real regression.
2. **Cost.** ~450 agents (150 × k=3) per run is far too expensive to run on every
   PR. The mined `routing.py --changed` gate (only cases for changed skills)
   already guards per-PR regressions cheaply.
3. **Its value is as a generalization probe**, run *periodically* or *when
   descriptions change materially / the catalog grows*, not on each commit. This
   run is the baseline reading for that cadence.

Unlike `routing-dataset.json`, this file is **hand-authored, not generated**, so
it must **not** be added to `routing.py --build-dataset` / `--check-dataset` drift
checks — there is nothing to regenerate, and a drift check would be meaningless.

**Optional middle ground:** if we want a manual regression signal, record a
`routing-heldout-baseline.json` (same `{cases: {id: {chosen, pass}}}` shape as
`routing-baseline.json`) from this run so a future manual re-run can diff against
it. Given the perfect, unanimous result, that's low-value today; revisit if the
catalog grows enough that hand-inspecting a re-run becomes impractical, or promote
to a scheduled (non-blocking) CI job if the set proves stable across a few
periodic runs.

---

*Run: `claude-haiku-4-5`, k=3, 150 cases / 451 route agents, 0 errors. Runner:
`evals/routing-heldout-runner.mjs`. Dataset: `evals/routing-heldout.json`. This
probe is separate from the committed CI gate (`routing-baseline.json`) and does
not modify it.*
