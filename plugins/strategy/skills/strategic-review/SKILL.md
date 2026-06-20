---
name: strategic-review
description: "Review a project's strategic position before going public, launching, or raising — vision, mission, value proposition, scope positioning, the defensible wedge, and a live competitive / market comparative analysis. Triggers: strategic review, positioning, go public, go-to-market, market analysis, competitive landscape, value proposition, is there a moat, who are our competitors, platform absorption risk, market positioning, comparable products. Use project-review for execution/roadmap/implementation health; delegates deep market scans to deep-research."
model: opus
allowed-tools: Read, Grep, Glob, WebFetch, WebSearch, Write, Edit
---

# Strategic Review

Pressure-test whether a project has a defensible strategic position before it goes
public. The output is an honest read on vision, positioning, and market — what's
strong, what rests on unproven assumptions, and where the wedge is closing — ending
in **strategic options with trade-offs and a recommendation** (not flattery, and
not a single forced verdict unless asked).

This is the **strategy lens**. For what's actually built and whether it works, run
`project-review`; the two compose into a full pre-public review (see
[templates/full-review-prompt.md](templates/full-review-prompt.md)).

## Ground rule: a thesis is a claim, not a fact

State the project's strategic thesis in one sentence, then treat every load-bearing
assumption inside it as a claim to be tested, not granted. The most valuable thing
this review produces is naming the assumption the whole strategy rests on — and
whether there's evidence for it. Mark every market finding **confirmed** (cited
source, dated) or **inferred**, and date-bound everything ("as of <date>") because
the competitive landscape moves.

## Step 1: Articulate and critique the vision

Extract, from the project's own materials, the core narrative:

- **Vision / mission** — what change in the world, for whom.
- **Value proposition** — the specific job it does and why someone switches to it.
- **The thesis** — the one-sentence bet (e.g. "developers will adopt a neutral
  standard layer because they run multiple tools and feel the lock-in pain").

Then critique it: Is the value proposition concrete or aspirational? Is the target
user real and reachable? **Which assumption is load-bearing, and is it proven?**
(How many users actually have the pain? Would they pay / switch / adopt?)

## Step 2: Scope and positioning

- **Positioning** — what band does this compete in, and against what? Where does it
  sit relative to incumbents and to the platforms it runs on?
- **The defensible wedge** — what can this do that the obvious larger players
  won't or can't, and how durable is that? Separate a real moat (standard,
  network, data, switching cost) from a temporary head start.
- **Where positioning is strong vs. where it leans on unproven assumptions** — be
  explicit about the difference.

## Step 3: Market comparative analysis (live)

Survey the field with current evidence, not memory:

- **Refresh the known bands** — for each established competitor band, who's in it
  now and what shipped recently.
- **Hunt for new entrants** — date-bound searches for products that appeared
  recently in this space, adjacent standards, and platform features that may
  absorb the category.
- For a deep, multi-source, fact-checked sweep, **delegate to `deep-research`** and
  fold its cited report in. For a lighter pass, use `WebSearch`/`WebFetch` directly.
- **Tag each comparable** with its relationship: **competitor**, **complement**,
  or **integration target** — and what it means for this project.
- Label every finding confirmed-vs-inferred and date it.

## Step 4: Trajectory and wedge-closure risk

The dangerous competitor is often the platform, not a peer. Assess:

- **Absorption risk** — is a larger platform shipping features that close the
  wedge? What's the trajectory over the last 6–12 months?
- **Timing** — is the window opening or closing, and what evidence says so?
- **What would invalidate the thesis** — name the observable event that would mean
  "stop."

## Step 5: Synthesis — potential, weak points, strategic forks

Integrate the above into a decision instrument:

- **Potential** — the genuine strengths and the conditions under which the bet pays off.
- **Weak points, ranked** — lead with the assumption most likely to be false.
- **Strategic forks** — present 2–4 distinct paths (e.g. double down / narrow scope /
  reposition / pivot), each with its trade-offs, then **name a recommended path and
  why**. Configurable: if the user wants options only or a hard go/no-go, honor that —
  default is options + a recommendation.
- **A readiness picture** mapped to the project's own gates, if it has them.

For the rendered deliverable (interactive HTML, scorecards, a forks comparison
panel), hand off to `artifact-design`; default to a gitignored path (e.g. `.local/`).

## Principles Applied

- **Honesty over hype** — surface the uncomfortable finding first; a review that
  validates the founder's optimism is worse than none.
- **Assumptions are the product** — the review's value is naming what must be true.
- **Current and cited** — date-bound, confirmed-vs-inferred, sourced.
- **Options with a recommendation** — give the decision-maker the forks *and* a view.

## Cross-Skill References

- `project-review` — the execution half of a pre-public review (roadmap, implementation, evidence).
- `deep-research` — for the deep, fact-checked market fan-out; fold its report into Step 3.
- `project-proposal` — when the question is a forward-looking go/no-go business case, not a review.
- `metrics-and-okrs` — to convert the readiness picture into measurable gates.
- `artifact-design` — to render the review as a polished interactive decision instrument.
