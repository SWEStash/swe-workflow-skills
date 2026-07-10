---
name: metrics-and-okrs
description: "Define OKRs, KPIs, success metrics, and engineering health metrics (DORA). Triggers: OKR, KPI, metrics, success metrics, key results, objectives, measure success, DORA metrics, engineering metrics, velocity, cycle time, deployment frequency, how do we measure, what should we track."
allowed-tools: Read, Grep, Glob, Write, Edit
---

# Metrics & OKRs

Define meaningful metrics that drive decisions and OKRs that align engineering work with business outcomes. Good metrics answer "are we succeeding?" Bad metrics create busywork.

## Core Rule

**Every metric must drive a decision.** If knowing the metric's value wouldn't change what you do, stop tracking it. Metrics without decisions are vanity metrics.

## Workflow: OKRs

### Step 1: Understand the Context

Before writing OKRs:

- **What's the time horizon?** Quarterly is standard. Annual is too long for engineering.
- **What level?** Company → Team → Individual? Start with team-level.
- **What's the business priority?** Growth? Retention? Reliability? Cost reduction?
- **What did we learn from last quarter?** What OKRs were hit, missed, and why?

### Step 2: Write Objectives

An Objective is a qualitative, inspiring goal that answers "where do we want to go?"

**Good Objectives:**
- "Make the checkout experience delightfully fast"
- "Build a platform our enterprise customers trust"
- "Eliminate the deployment bottleneck"

**Bad Objectives:**
- "Improve latency by 40%" (this is a Key Result, not an Objective)
- "Complete the Q3 roadmap" (this is output, not outcome)
- "Increase revenue" (too vague, not actionable by engineering)

Rules: 3-5 objectives per team per quarter. Each should be ambitious but achievable. If you hit 100% of all OKRs, you aimed too low. 70% achievement is healthy.

### Step 3: Write Key Results

Key Results are quantitative measures that prove the Objective is being met.

**Good Key Results:**
- "Reduce checkout page load time from 3.2s to under 1.5s at P95"
- "Achieve 99.95% API availability (up from 99.8%)"
- "Reduce time from PR merge to production from 4 hours to 30 minutes"

**Bad Key Results:**
- "Launch the new checkout page" (this is output, not outcome)
- "Improve performance" (not measurable)
- "No production incidents" (not realistic and incentivizes hiding incidents)

Each Objective should have 2-4 Key Results. Each Key Result needs:
- **Current value** (baseline)
- **Target value** (goal)
- **How it's measured** (data source, calculation)

### Step 4: Validate the OKRs

Check each OKR against these criteria:
- [ ] Is the Objective inspiring and clearly directional?
- [ ] Are Key Results measurable with a specific number?
- [ ] Can we actually measure this today? (If not, first KR might be "instrument X")
- [ ] Do Key Results measure outcomes, not outputs?
- [ ] Is 70% achievement of all KRs realistic with focused effort?
- [ ] Are there perverse incentives? (Reducing errors by not logging them)

### Step 5: Produce the OKR Document

Use the template at [templates/okr-document.md](templates/okr-document.md).

## Workflow: Project Success Metrics

For any project or feature, define metrics in three categories:

**Leading indicators** (early signals during development):
- Sprint velocity, burndown trend, scope change rate
- Test coverage of new code, CI pipeline pass rate

**Lagging indicators** (results after launch):
- User adoption (DAU, feature usage rate)
- Performance metrics (latency, error rate, availability)
- Business metrics (conversion rate, revenue, support ticket volume)

**Health indicators** (ongoing system health):
- DORA metrics (see below)
- Technical debt metrics (code quality trends, dependency freshness)

See [references/metric-catalog.md](references/metric-catalog.md) for a catalog of useful metrics by category.

## Workflow: DORA Engineering Metrics

The four DORA metrics are the industry standard for measuring engineering team effectiveness:

| Metric | What It Measures | Elite | High | Medium | Low |
|--------|-----------------|-------|------|--------|-----|
| **Deployment Frequency** | How often you deploy | Multiple/day | Weekly | Monthly | Quarterly |
| **Lead Time for Changes** | PR merge to production | < 1 hour | < 1 day | < 1 week | > 1 month |
| **Change Failure Rate** | % of deploys causing incidents | < 5% | < 10% | < 15% | > 30% |
| **Mean Time to Recover** | Incident to resolution | < 1 hour | < 1 day | < 1 week | > 1 month |

These four metrics together tell you if your team is delivering quickly and reliably. Optimizing one at the expense of another is a trap (deploying fast but breaking things, or never breaking things but never shipping).

## Principles Applied

- **KISS**: 3-5 OKRs per team, 2-4 KRs each. More means none get attention.
- **Outcomes over outputs**: Measure "user checkout time reduced" not "new checkout page shipped."
- **YAGNI**: Don't build a metrics dashboard for 50 KPIs. Start with the 5 that would actually change a decision.
- **Leading over lagging**: Prefer metrics you can act on now over metrics you can only measure after the fact.
