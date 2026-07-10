---
name: finops-cost-optimization
description: "Understand and reduce cloud spend — cost visibility and allocation (tagging, ownership), unit economics, rightsizing, autoscaling, commitment discounts (reserved instances, savings plans), storage/egress traps, architecture cost review, budgets and anomaly alerts. Triggers: cloud costs, AWS bill, cut costs, cost optimization, FinOps, why is our bill so high, rightsizing, reserved instances, savings plan, egress fees, cost per customer. Whether to build or buy a capability → build-vs-buy; making code faster → performance-optimization."
allowed-tools: Read, Grep, Glob, Write, Edit, Bash, WebFetch, WebSearch
---

# FinOps & Cost Optimization

Treat cloud cost as an engineering metric — observable, attributed, and
optimized with the same rigor as latency. The failure mode this skill counters:
nobody owns the bill, so it only gets attention as a quarterly surprise, and
the response is a panicked freeze instead of systematic reduction. Boundaries:
`performance-optimization` makes code faster (sometimes cheaper as a side
effect); `build-vs-buy` decides whether to run the capability at all; this
skill optimizes what you *do* run.

## Workflow

### Step 1: Visibility Before Optimization

You can't cut what you can't attribute. Establish first:

- **Allocation**: tag/label resources by service, team, and environment;
  measure the untagged remainder and drive it down — an 40%-unattributed bill
  makes every later step guesswork.
- **The big rocks**: rank spend by service and by resource type. Cloud bills
  follow a power law; the top 5 line items usually carry most of the total.
  Optimizing anything outside them is procrastination with charts.
- **Trend vs events**: is spend growing with usage (fine, if unit costs hold),
  or did it step-change with a deploy (an incident with a dollar signature)?

Pull real billing data (cost explorer exports, `infracost` on IaC diffs, the
provider CLIs) — never optimize from memory of last quarter's bill.

### Step 2: Define Unit Economics

Total spend is noise; **cost per unit of value** — per customer, per request,
per GB processed, per model inference — is signal. A bill that doubles while
customers triple is a win. Pick 1–3 unit metrics with the team, compute them
from the Step-1 allocation, and make them the number optimization is judged by.
This is also what connects engineering to the business conversation
(`metrics-and-okrs`).

### Step 3: Harvest the Waste (no architecture changes)

The reliable first wins, in typical order of return:

- **Orphans**: unattached volumes/IPs, forgotten environments, snapshots-forever,
  idle dev clusters running nights and weekends (schedule them off).
- **Rightsizing**: instances/databases provisioned for imagined peak — check
  actual utilization (single-digit CPU on a large instance is a purchase order
  for the cloud provider, not capacity planning).
- **Storage classes & lifecycle**: hot-tier data nobody has read in a year;
  logs and backups with no expiry — lifecycle policies are one-line fixes.
- **Non-prod parity**: staging doesn't need production's instance sizes,
  replica counts, or retention.

### Step 4: Buy Commitment for the Stable Baseline

After rightsizing (never before — you'd lock in the waste): cover the stable,
predictable baseline with reserved instances / savings plans / committed-use
discounts, and keep the spiky remainder on-demand or spot (spot for
interruption-tolerant work: batch, CI, stateless workers). Start conservative
(cover well under 100% of the baseline) and ratchet up as forecasts prove out —
over-commitment converts a variable cost into a fixed regret.

### Step 5: Review the Architecture's Cost Shape

Some spend is structural, and only architecture changes move it:

- **Egress and cross-zone/region chatter** — the classic invisible line item;
  co-locate chatty services, cache at the edge, compress.
- **Per-invocation pricing at scale** — serverless that grew past the
  crossover where instances are cheaper (and vice versa: idle instances that
  should be serverless).
- **Managed-premium vs ops-burden** — the managed service's markup is often
  worth it (that's a `build-vs-buy` call when it gets big).
- **Data pipelines** — scan-based pricing (warehouse queries over unpartitioned
  tables) and always-on streaming for hourly-batch needs (`data-pipeline-design`).

Cost these with current provider pricing (verify live — pricing changes), and
record significant trade-offs as ADRs (`architecture-design`).

### Step 6: Keep It Continuous

- **Budgets + anomaly alerts** per team/service, routed to the owning team —
  a cost regression is a defect, detected in days not quarters.
- **Cost in the deploy loop**: IaC cost diffs (e.g. infracost) in PRs makes
  cost visible at decision time.
- **A monthly 30-minute review** of the unit metrics and top movers beats an
  annual cost-cutting project.

## Principles Applied

- **Attribution before optimization** — unowned costs never stay cut.
- **Unit economics over totals** — growth should raise the bill; only rising
  *unit* cost is a problem.
- **Biggest line item first** — a 10% cut of the top item beats a 90% cut of
  the tenth.

## Cross-Skill References

- `build-vs-buy` — whether to run the capability at all; managed-vs-self-hosted TCO
- `performance-optimization` — efficiency work that reduces compute per request
- `architecture-design` — recording cost-driven structural decisions as ADRs
- `observability-design` — the metrics/alerting machinery cost signals ride on
- `data-pipeline-design` — cost-shaping batch/streaming and warehouse workloads
- `metrics-and-okrs` — tying unit economics to business metrics
