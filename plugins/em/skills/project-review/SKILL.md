---
name: project-review
description: "Review a built project's execution health before a milestone — scope alignment, roadmap / execution-plan adherence, implementation maturity (what's production-ready vs stub/deferred), and the evidence it actually works (tests, coverage, validation results, changelog). Triggers: project review, execution review, are we on track, implementation vs roadmap, scope drift, readiness review, what's actually built, validation results review, pre-launch review. Use strategic-review for vision/positioning/market; technical-debt-review for a pure code-health audit."
model: opus
allowed-tools: Read, Grep, Glob, WebFetch, Write, Edit
---

# Project Review

Assess how a project is actually executing against its own plan — what's built,
what's claimed, what's proven, and where the gaps are. The output is an honest,
prioritized execution picture a decision-maker can act on, not a code-by-code
critique. The discipline is **separating "built" from "validated" from
"planned"** and refusing to let any of the three stand in for the others.

This is the **execution lens**. For vision, positioning, and market, run
`strategic-review`; the two compose into a full pre-public / pre-milestone review
(see [templates/full-review-prompt.md](../strategic-review/templates/full-review-prompt.md)).

## Ground rule: cite or label

Every claim is either **confirmed** (cite the file/path/command output that proves
it) or **inferred** (say so, and say from what). A reviewer who blurs the two is
worse than no reviewer — the decision-maker can't tell evidence from optimism.
Never report a capability as working unless you saw it work or saw a test that
exercises it.

## Step 1: Inventory the claims and the plan

Read the project's own statements of intent before judging anything:

- **Scope & status claims** — README, vision/strategy docs, roadmap, execution
  plan, CHANGELOG, milestone/issue tracker. What does the project say it is, what
  phase does it say it's in, and what does it promise for the milestone in question?
- **The hard boundaries** — declared scope and explicit non-goals. These are what
  you measure scope drift against.

Capture this as the baseline. Everything downstream is "reality vs this baseline."

## Step 2: Map implementation maturity

Walk the actual code/artifacts and classify each major component:

| Tier | Meaning | Signals |
|------|---------|---------|
| **Production-ready** | Built, integrated, tested | Real implementation, callers, tests, in CI |
| **Functional / thin** | Works but unproven or partial | Implemented, light/no tests, edge cases open |
| **Stub / scaffold** | Shape exists, behavior doesn't | `TODO`, `NotImplemented`, empty handlers, returns mock data |
| **Deferred / absent** | Named in the plan, not started | Referenced in docs/roadmap, no code |

Be specific: name the package/module/path and the tier. The deliverable is a
maturity map, not a vibe. Grep for stub markers (`TODO`, `FIXME`, `raise
NotImplementedError`, `throw new Error("not implemented")`, `pass  # stub`).

## Step 3: Reconcile against the roadmap — and find the drift

Lay the maturity map over the plan from Step 1:

- **Ahead / behind** — where is the code further along than the docs admit (common,
  and a sign the strategy doc is stale), and where is it behind a milestone it
  claims to have hit?
- **Scope drift** — what got built that isn't in scope? What's in scope but
  silently dropped? What crossed a declared non-goal boundary?
- **Sequencing risk** — is load-bearing work scheduled after the milestone that
  depends on it?

## Step 4: Review the evidence it works

This is where most reviews are too generous. "The code is built" is not "the
concept is validated." Assess the evidence chain:

- **Tests** — do they exist for the load-bearing paths, or only happy paths?
  Coverage numbers if available; quality, not just quantity.
- **Validation / experimental results** — if the project ran its own validation
  (efficacy data, benchmarks, A/B results, user trials), read the *actual numbers*
  and report what they say, including when they're **negative or inconclusive**.
  Foreground an uncomfortable result; don't bury it.
- **CI / checks** — does the pipeline actually gate, or is it advisory?
- **The built-vs-validated gap** — state it explicitly: which capabilities are
  built but unproven, and what evidence would close the gap?

## Step 5: Prioritized execution findings

Produce ranked, severity-tagged findings, each tied to its evidence:

- **Severity** — Critical (blocks the milestone / claim is false) / High (material
  risk) / Medium (should fix) / Low (note it).
- **Each finding**: what, the evidence (cited), why it matters for the milestone,
  and the smallest action that addresses it.
- **An execution scorecard** — maturity, roadmap-adherence, evidence-strength,
  each rated with a one-line justification, so the reader gets the picture at a glance.

For the rendered deliverable (interactive HTML report, dashboards, sortable
findings table), hand off to `artifact-design`. Default to writing it to a
gitignored location (e.g. `.local/`) unless told otherwise.

## Principles Applied

- **Honesty over comfort** — a review that flatters the plan is worthless; lead
  with the most load-bearing problem, even when it undercuts the project's thesis.
- **Evidence over assertion** — confirmed vs inferred, always; cite the source.
- **Prioritize** — a ranked short list of what matters beats an exhaustive catalog.
- **Right altitude** — execution health, not line-level nits (that's `code-reviewing`).

## Cross-Skill References

- `strategic-review` — the other half of a pre-public review: vision, positioning, market.
- `technical-debt-review` — when the question is purely codebase health / remediation roadmap.
- `code-reviewing` — for a specific diff or PR, not a whole-project assessment.
- `metrics-and-okrs` — to turn findings into measurable readiness gates.
- `artifact-design` — to render the review as a polished interactive report.
