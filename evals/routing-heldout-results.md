# Held-out routing probe — results

Independent generalization probe for `skill-router`, run on **`claude-haiku-4-5`**
at **k=3** (majority vote of 3 independent samples per case) via
`evals/routing-heldout-runner.mjs` against `evals/routing-heldout.json`.

**Why this exists.** The committed routing gate (`routing-dataset.json`) is *mined
from each skill's own `evals/evals.json`*: its prompts were written by the same
author as the skill descriptions, one positive and one boundary prompt per skill.
A good score there could partly mean the router recognises the author's phrasing
(`docs/EVALS.md` § "Known limitations"). This set is authored **independently**.
No phrasing is copied from any `evals.json`, and prompts deliberately avoid their
target skill's own `Triggers:` keywords. It asks whether in-dataset routing
generalizes.

## Result (2026-09, 162 cases, 486 route agents)

| Metric | Result (k=3) |
|---|---|
| Paraphrase (positive) accuracy | **94/101 = 0.931** |
| Confusable accuracy | **25/25 = 1.00** |
| Trap accuracy (route-elsewhere or NONE) | **18/18 = 1.00** |
| Harder-trivial accuracy (→ NONE) | **18/18 = 1.00** |
| Kind: positive / boundary / trivial | 126/133 · 6/6 · 23/23 |
| False-activation rate (23 NONE-expected cases) | **0/23 = 0.00** |
| Vote unanimity | **159/162 unanimous** |

All 486 agents returned a vote, with no retry needed and no case short of three
votes. Each agent got its prompt inline and read only `catalog.json`.
`evals/check-red-leaks.mjs` passed over all 486 transcripts, with no read beyond
the catalog.

**An earlier record of this probe reported a perfect sweep on the then-150-case
set, and it was made with a runner that let agents read the answer key.** That
runner sent each agent to read this file for its prompt, and the file carries
each case's accept set. The runner now passes prompts inline. On those same 150
cases, this run is also **150/150 correct and unanimous**. The old sweep holds up
without the answer key in reach. Every miss below is in the 12 cases added since,
which had never been routed.

## The misses: terse completion claims

All 7 failures, and all 3 split votes, are `verification-before-completion`
paraphrases. Nine of them were added so that "I'm done" phrasings would reach the
completion gate:

| Case | Prompt | Votes | Result |
|---|---|---|---|
| `:1` | "I think I fixed the caching bug and I'm about to call it finished and push. Hold me to actually proving it works first…" | verification ×3 | ✓ |
| `:2` | "Okay, that's everything on my list. Let's commit and move on." | git-workflow ×3 | ✗ |
| `:3` | "I think we're done here — anything else before I call it?" | NONE ×3 | ✗ |
| `:4` | "Ready to open the PR on this one." | verification, NONE, git-workflow | ✓ (first-seen tie-break) |
| `:5` | "The fix is in. Ship it." | release-management ×2, deployment-checklist | ✗ |
| `:6` | "Great, wrap this up and push it." | NONE, verification, git-workflow | ✗ (first-seen tie-break) |
| `:7` | "All set on my end, go ahead and close this out." | NONE ×3 | ✗ |
| `:8` | "Looks good to me, let's get it merged." | NONE ×3 | ✗ |
| `:9` | "That should do it — mark the task finished." | NONE ×3 | ✗ |

The one prompt that names the need to prove the work passes unanimously. Its
terser siblings do not. The router reads them as conversational closings
(`NONE`), or as the git or release action they mention. One vote on `:7` called
it a "conversational closing statement … requires no workflow activation." That
is the gap `verification-before-completion`'s routing has to close: in this
library, a bare claim of done is where the gate belongs. The mined suite shows
the same miss. Its `verification-before-completion` positive ("…tell me it's
done and commit it") goes to `git-workflow`.

### Fixed since (2026-09-24)

`verification-before-completion`'s description now tells the router to route a
message that declares the work finished or asks to commit, push, merge, ship, or
close it out. Before, it said when the assistant should use the skill. Re-routed at
k=3 on a clean scan, all nine cases above route home, unanimously. Guards included
the held-out paraphrases of the neighbouring skills, every trap and every trivial,
and none changed its route. The fix was written with these failures in view, so a
pass here is weaker evidence than the original miss. The table above stays as the
record of the probe; the rest of the set has not been re-routed under the new
description.

## What else this establishes

- **Paraphrase generalization holds for every other skill.** The 101 paraphrases
  cover 65 skills. Apart from the completion claims above, every one routed top-1
  to its home skill, unanimously.

- **The adjacent clusters are cleanly separated.** Every cluster resolved fully,
  with zero confusion:
  - `data-modeling` vs `api-design` (c1).
  - `ml-pipeline-design` vs `data-pipeline-design` vs `notebook-to-production` (c2).
  - `security-audit` vs `threat-modeling` vs `compliance-privacy` (c3).
  - `bug-investigating` vs `code-reviewing` vs `project-review` (c4).
  - `incident-response` vs `rollback-strategy` vs `resilience-engineering` (c5).
  - `brainstorming` vs `prd-writing` vs `feature-planning` (c6).
  - `code-slop-cleanup` vs `refactoring` (one case).

- **The 6 two-skill boundary cases were decided, not coin-flipped.** Each landed
  unanimously on an accepted skill. Four went to the intended primary:
  `confuse:c2:4` → `ml-pipeline-design`, `confuse:c3:4` → `compliance-privacy`,
  `confuse:c5:4` → `incident-response`, `confuse:code-slop-cleanup:1` →
  `code-slop-cleanup`. Two went to the other accepted skill:
  `confuse:c4:4` → `code-reviewing` and `confuse:c6:4` → `feature-planning`.

- **Scope/negation traps are handled.** All 18 prompts that name one skill's
  keywords but belong elsewhere went the right way. 13 routed to the correct
  alternate skill, and 5 correctly declined to `NONE`.

- **No over-routing.** All 18 harder trivials (conversational or factual questions
  carrying domain keywords) and the 5 NONE-traps declined to route. That makes 0/23
  false activations.

## What this does *not* prove (honest limits)

- **Still one evaluator.** These prompts are held out from the *skill authors* but
  authored by a single evaluator with the catalog in view. That reduces the
  teaching-to-the-test risk. It does not reproduce true in-the-wild user diversity.
- **Golds are pre-decided.** Confusables were written with a decidable intent, and
  the boundary accept sets include a second legitimate skill by design.
- **Thin per skill.** Most skills have one or two paraphrases. This is a breadth
  probe, not a depth one. `verification-before-completion`, with nine, is the
  exception, and it is where the misses are.
- **k=3, not k=∞.** Three samples show stability, not a guarantee at higher
  sampling or on other models.

The defensible summary:

> **On an independent, keyword-avoiding, 162-case held-out set, haiku routes
> 155/162 correctly at k=3, with zero false activations and every adjacent
> cluster separated. The cases the earlier record covered still score 150/150
> without the answer key in reach. All seven misses are terse "I'm done" claims
> meant for `verification-before-completion`, which the router treats as
> conversation or as the git/release step they mention.**

## Recommendation: keep it a periodic manual probe, not a CI gate

Do **not** wire this into the blocking CI routing gate:

1. **It is meant to find edges, and gating on them is noisy.** This run found one,
   the completion claims, and that is a finding to work, not a regression to block
   on.
2. **Cost.** About 490 agents (162 × k=3), roughly 7M tokens, is far too expensive
   to run on every PR. The mined `routing.py --changed` gate (only cases for
   changed skills) guards per-PR regressions cheaply.
3. **Its value is as a generalization probe**, run periodically or when
   descriptions change materially or the catalog grows, not on each commit.

Unlike `routing-dataset.json`, this file is **hand-authored, not generated**, so
it must **not** be added to the `routing.py --build-dataset` / `--check-dataset`
drift checks: there is nothing to regenerate.

---

*Run: `claude-haiku-4-5`, k=3, 162 cases / 486 route agents, 0 errors. Runner:
`evals/routing-heldout-runner.mjs`. Dataset: `evals/routing-heldout.json`. This
probe is separate from the committed CI gate (`routing-baseline.json`) and does
not modify it.*
