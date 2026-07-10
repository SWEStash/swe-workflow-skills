---
name: brainstorming
description: "Facilitate divergent ideation before committing to a spec — Socratic questioning, widening the option space, challenging assumptions and inherited constraints, then converging on candidates. Triggers: brainstorm, let's explore ideas, what are our options, help me think through, generate ideas, what could we build, not sure what I want, explore approaches, ideate. Once ideas converge, hand off to prd-writing (WHAT/WHY) or feature-planning (breakdown) — this skill opens options; those close them."
allowed-tools: Read, Grep, Glob, Write, Edit
---

# Brainstorming

Divergent exploration *before* convergent specification. The most expensive
failure in product work is efficiently building the wrong thing — this skill
exists to widen the option space and test the framing before anything gets
specced. It sits upstream of `prd-writing` and `feature-planning`: they converge
on one answer; this skill makes sure the right answers were on the table first.

The mode is **Socratic**: the user's tacit knowledge of their domain beats any
generated list. Ask questions that surface it; generate to provoke, not to
replace their thinking.

## Workflow

### Step 1: Frame the Real Problem

Before generating anything, ask: what problem, for whom, why now, and what would
"solved" look like? Then challenge the framing — the stated problem is often a
solution in disguise ("we need a dashboard" usually means "someone can't answer
a question"). Ask "what does that get you?" until you hit the underlying need.
If the user arrives with a solution already chosen, brainstorm the *problem
behind it* before brainstorming within it.

### Step 2: Separate Real Constraints from Inherited Ones

List the constraints, then interrogate each: is it physics/budget/law (real), or
habit/assumption/"we've always done it this way" (inherited)? Explicitly mark
which are negotiable. Most breakthrough options live behind a constraint that
turned out to be assumed.

### Step 3: Diverge — Quantity First, Judgment Deferred

Generate broadly, and do not evaluate mid-generation — criticism during
divergence kills the unusual options that make the exercise worthwhile. Mix
techniques rather than exhausting one:

- **Vary the axes**: who else could this serve, what adjacent problem does it
  solve, how else could it be delivered, when/where else does it apply?
- **Invert**: how would we guarantee this fails? Each failure mode implies an option.
- **Analogize**: how do other domains solve the structural equivalent?
- **Recombine**: force-pair two existing ideas or systems.

Alternate generating with asking — offer a batch, then ask a question that
mines the user's context for the next batch.

### Step 4: Widen Once More (the Wildcards)

Before converging, deliberately add the options nobody proposes on their own:
the **do-nothing / process-change** option (no build at all), the **1/10-scope**
version (what's the smallest thing that dents the problem?), the **10x**
version (what if this were the company's main bet?), and the
**buy-instead-of-build** option (delegate that comparison to `build-vs-buy` if
it becomes a contender).

### Step 5: Converge with Explicit Criteria

Cluster related ideas, then name the selection criteria *before* scoring
(typical set: impact, effort, reversibility, confidence) — criteria chosen after
seeing favorites just rationalize them. Score roughly, pick 1–3 candidates, and
keep the rest in a **parking lot** with a one-line reason each — parked, not
deleted; today's reject is next quarter's answer.

### Step 6: Hand Off

Write a one-paragraph brief per surviving candidate (problem, idea, why it won,
open questions) and route it onward: `prd-writing` for requirements,
`feature-planning` for task breakdown, `project-proposal` for a business case,
`architecture-design` if the open questions are structural.

## Principles Applied

- **Defer judgment during divergence; be ruthless during convergence** — mixing
  the modes does both badly.
- **Ask > tell**: a question that unlocks the user's knowledge outperforms ten
  generated ideas.
- **YAGNI applies at convergence, not divergence** — generating a wild option
  costs a line; building it is what needs justification.

## Cross-Skill References

- `prd-writing` — turn the winning idea into WHAT/WHY requirements
- `feature-planning` — break the chosen idea into scoped tasks
- `project-proposal` — wrap a candidate in a business case for a go/no-go
- `build-vs-buy` — when a candidate could be bought or adopted instead of built
- `architecture-design` — when the surviving questions are structural
