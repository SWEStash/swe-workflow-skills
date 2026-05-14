---
name: effort-estimation
description: "Estimate engineering effort with agile techniques — story points, t-shirt sizing, three-point estimation, capacity planning. Triggers: estimate this, how long will this take, story points, t-shirt sizing, effort estimation, capacity planning, sprint planning, budget estimate, forecast, velocity, when will this be done."
model: haiku
allowed-tools: Read, Grep, Glob, Write, Edit
---

# Effort Estimation

Produce honest, useful estimates that help teams plan without creating false precision. Estimation in agile is about making informed decisions under uncertainty, not predicting the future exactly.

## Core Philosophy

**Estimates are forecasts, not commitments.** They communicate "based on what we know today, here's our best guess at the range of effort." They should always include uncertainty ranges, and they should improve as you learn more.

## Workflow

### Step 1: Ensure Tasks Are Defined

You can't estimate undefined work. Before estimating, ensure:

- Tasks are broken down (use `feature-planning` if not)
- Acceptance criteria exist for each task
- Technical approach is at least sketched (spikes completed for unknowns)

If the work is too vague to estimate, say so. "I can't estimate this until we do a spike" is a valid and responsible answer.

### Step 2: Choose the Estimation Method

| Method | Best For | Precision | Speed |
|--------|----------|-----------|-------|
| **T-shirt sizing** | Roadmap planning, early-stage sizing, large backlogs | Low (ranges) | Very fast |
| **Story points** (Fibonacci) | Sprint planning, velocity tracking, mature teams | Medium (relative) | Moderate |
| **Three-point estimation** | High-stakes estimates, budget requests, uncertain work | High (ranges with confidence) | Slow |
| **Time-based** | Well-understood tasks with low uncertainty | High (hours/days) | Moderate |

**Default recommendation**: T-shirt sizing for roadmap/quarter planning, story points for sprint planning. Three-point for budget requests and stakeholder communication.

### Step 3: Apply the Method

See [references/estimation-methods.md](references/estimation-methods.md) for detailed guidance on each method.

**Key principles across all methods:**

1. **Estimate as a team**, not individually. The person most and least familiar with the area should both contribute — the gap reveals hidden complexity.
2. **Estimate relative to known work**, not in absolute terms. "This is about twice as hard as that login feature we built" is more accurate than "this will take 3 days."
3. **Include uncertainty explicitly.** "3-5 days" is more honest than "4 days."
4. **Estimate the work, not the worker.** Story points measure the task's size, not who's doing it.
5. **Re-estimate when you learn more.** Initial estimates are educated guesses. Update them as spikes complete and requirements clarify.

### Step 4: Handle Budget and Timeline Requests

When stakeholders need dates or dollars, translate estimates thoughtfully:

**From story points to time:**
```
Estimated story points for the project: 85
Team velocity: ~30 points per sprint (2-week sprints)
Sprints needed: 85 / 30 = ~3 sprints = 6 weeks

Add buffer for unknowns (20-30%): 7-8 weeks
Communicate as range: "6-8 weeks with the current team"
```

**From effort to cost:**
```
Effort estimate: 12-16 person-weeks
Team loaded cost: $X per person-week
Total: 12 × $X to 16 × $X
Communicate as range: "$A - $B"
```

**Always provide ranges, never single numbers.** A single number becomes a commitment; a range communicates confidence.

### Step 5: Track and Calibrate

Estimates improve with feedback. After each sprint or project:

- Compare estimated vs actual effort
- Identify systematic patterns (always overestimate UI? Always underestimate integrations?)
- Adjust team velocity based on recent data (use the last 3-5 sprints, not all-time average)

## Common Estimation Traps

- **Anchoring**: The first number said influences everyone else. Use blind estimation (planning poker, simultaneous reveal).
- **Planning fallacy**: People consistently underestimate. Use historical data to calibrate.
- **Scope creep blindness**: Estimate the work as defined, then add buffer for scope growth — it always grows.
- **Hero planning**: Estimating based on the best-case scenario with the best developer with zero interruptions. Estimate for a typical day with meetings and context switches.
- **Precision theater**: Saying "47 hours" when you mean "roughly a week." False precision erodes trust faster than honest ranges.

## Principles Applied

- **KISS**: Use the simplest estimation method appropriate. T-shirt sizing is fine for most roadmap decisions.
- **Honesty over optimism**: A realistic estimate that disappoints a stakeholder is better than an optimistic estimate that misses a deadline.
- **YAGNI**: Don't estimate items far in the future with precision. Estimate near-term work in detail, far-term work in ranges.
