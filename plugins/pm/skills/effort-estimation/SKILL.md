---
name: effort-estimation
description: "Estimate engineering effort with agile techniques — story points, t-shirt sizing, three-point estimation, capacity planning."
when_to_use: "Triggers: estimate this, how long will this take, story points, t-shirt sizing, effort estimation, capacity planning, sprint planning, budget estimate, forecast, velocity, when will this be done."
allowed-tools: Read, Grep, Glob, Write, Edit
---

# Effort Estimation

Produce honest, useful estimates without false precision. Estimates are forecasts,
not commitments — always ranges, always improving as you learn more.

## Workflow

### Step 1: Ensure Tasks Are Defined

You can't estimate undefined work. Tasks must be broken down (use `feature-planning`
if not), have acceptance criteria, and have at least a sketched technical approach.
"I can't estimate this until we do a spike" is a valid and responsible answer.

### Step 2: Choose the Method

T-shirt sizing for roadmap and early-stage sizing; story points (Fibonacci) for
sprint planning and velocity tracking; three-point estimation for budget requests
and high-uncertainty, high-stakes work; time-based only for well-understood tasks.
See [references/estimation-methods.md](references/estimation-methods.md) for
detailed guidance on each method.

### Step 3: Apply It

Estimate per task, not the project as a single unit; relative to known work rather
than in absolute terms; as a team where possible (the familiarity gap between
estimators reveals hidden complexity); with uncertainty explicit. Re-estimate when
spikes complete or requirements clarify.

### Step 4: Translate for Stakeholders

Convert to time or cost via team velocity or loaded cost, add a 20-30% buffer for
unknowns, and communicate a range in stakeholder language — weeks and dollars, not
story points. A single number becomes a commitment; a range communicates confidence.

### Step 5: Track and Calibrate

Compare estimated vs actual each sprint, look for systematic bias, and recalibrate
velocity on the last 3-5 sprints, not the all-time average.

## Principles Applied

- **KISS**: Use the simplest estimation method appropriate. T-shirt sizing is fine for most roadmap decisions.
- **Honesty over optimism**: A realistic estimate that disappoints a stakeholder is better than an optimistic estimate that misses a deadline.
- **YAGNI**: Don't estimate items far in the future with precision. Estimate near-term work in detail, far-term work in ranges.
