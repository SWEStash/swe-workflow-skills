---
name: resilience-engineering
description: "Design systems that survive failure — failure-mode analysis, resilience patterns (timeouts, retries with backoff, circuit breakers, bulkheads, load shedding, graceful degradation), chaos experiments, disaster recovery with RTO/RPO, backup restore testing, game days. Triggers: chaos engineering, disaster recovery, DR plan, what if the database goes down, single point of failure, failover, circuit breaker, RTO, RPO, game day, high availability. An incident happening NOW → incident-response; undoing a bad deploy → rollback-strategy."
model: sonnet
allowed-tools: Read, Grep, Glob, Write, Edit, Bash
---

# Resilience Engineering

Assume everything fails; design so users barely notice. Resilience isn't
redundancy shopping — it's knowing your failure modes, choosing which ones
you'll survive (and how degraded), and *proving it* before reality runs the
test for you. Boundaries: `incident-response` is for the fire currently
burning; `rollback-strategy` undoes a bad deploy; `observability-design`
builds the detection this skill's mechanisms depend on. This skill is the
design-and-verification work done in peacetime.

## Workflow

### Step 1: Failure-Mode Analysis — What Can Break, and What Happens Then?

Walk the architecture dependency by dependency and ask, for each: *what does
the user experience when this is down, slow, or wrong?* Cover the classes
people skip: not just crashes but **slowness** (a hung dependency is worse
than a dead one — it ties up your threads), **partial failure** (one AZ, one
shard, 5% of requests), **dependency failure** (the payment provider, the
auth service, DNS), and **data-level failure** (corruption, bad deploy writing
garbage — replication happily replicates it). Mark every **single point of
failure** and every **blast-radius coupler** (shared DB, shared queue, sync
call chains). Rank by likelihood × user impact; this list drives everything
below.

### Step 2: Set the Targets — How Resilient Is Enough?

Resilience costs money and complexity; decide deliberately, per system tier:

- **Availability target** — align with the SLOs (`observability-design`);
  five nines for an internal dashboard is waste, three nines for checkout is
  negligence.
- **RTO** (how long may recovery take) and **RPO** (how much data may be lost)
  per data store — these two numbers *are* the DR design: they decide between
  backups (hours/minutes), warm standby (minutes/seconds), and multi-region
  active-active (seconds/none), whose costs differ by orders of magnitude.

### Step 3: Apply the Stability Patterns at the Boundaries

Every remote call gets the basics — this is where most real-world resilience
lives, not in exotic infrastructure:

- **Timeouts on everything** (the default infinite timeout is the root cause
  of most cascades), sized from the caller's budget, not the callee's average.
- **Retries with exponential backoff + jitter**, only on idempotent
  operations, with a **retry budget** — naive retries turn a blip into a
  self-inflicted DDoS (the retry storm).
- **Circuit breakers** on dependencies that can hang or flap — fail fast and
  give the dependency room to recover.
- **Bulkheads** — isolate resource pools per dependency/tenant so one bad
  citizen can't exhaust the shared thread/connection pool.
- **Load shedding & backpressure** — reject cheap and early at the edge when
  saturated, prioritizing by request value; a queue that only grows is an
  outage on layaway.
- **Graceful degradation** — decide *in advance* what turns off first: serve
  stale cache, disable recommendations, queue writes. Degraded-but-usable is
  the design goal; all-or-nothing is the anti-pattern.
- **Idempotency keys** on mutating endpoints — they're what make retries and
  failover safe end to end.

### Step 4: Design Recovery for Data — Backups Are a Hypothesis

A backup that has never been restored is a hope, not a plan:

- Automate backups to match the RPO; keep at least one copy isolated from the
  blast radius (other account/region; immutable/offline for ransomware-class
  events).
- **Test restores on a schedule** — a real restore into a real environment,
  timed against the RTO, verified for integrity. The restore test failing in
  a drill is a gift; failing during an incident is the disaster.
- Remember correlated data failure: replication is not backup (it replicates
  the corruption); point-in-time recovery covers the bad-deploy-wrote-garbage
  case.

### Step 5: Verify with Experiments — Chaos, Then Game Days

Untested failover fails over nothing. Prove the Step-3/4 mechanisms:

- **Chaos experiments**: hypothesis-driven ("if we kill one API pod, error
  rate stays < 0.1%"), smallest blast radius first, in staging before
  production, always with an abort switch and observability watching. Start
  embarrassingly small — kill one instance, add 200ms latency to one
  dependency — most systems fail the small test first.
- **Game days**: rehearse the human half — a scenario ("region us-east is
  gone", "restore yesterday's DB"), the on-call team executing the real
  runbooks, a timer against RTO. Findings feed runbook and design fixes, and
  the loop repeats. This is also how `incident-response` gets practiced before
  it's needed.

### Step 6: Close the Loop

Every real incident and every drill updates the Step-1 failure-mode list (was
this mode known? why not?), the patterns, and the runbooks — via
`retrospective` post-mortems. Resilience is a cycle, not a milestone: new
dependencies arrive with default-infinite timeouts every sprint.

## Principles Applied

- **Slow is worse than dead**: hung dependencies cascade; timeouts and
  breakers convert hangs into fast, handleable failures.
- **RTO/RPO before mechanism**: pick the numbers first — they select the
  design and the budget honestly.
- **Tested or theoretical**: failover, restores, and degradation paths count
  only after they've run — in a drill or in anger.

## Cross-Skill References

- `observability-design` — the SLOs, alerting, and dashboards that detect failure
- `incident-response` — executing under fire what this skill rehearses in peace
- `rollback-strategy` — the deploy-level undo; this skill covers system-level failure
- `architecture-design` — recording redundancy/DR trade-offs as ADRs
- `containerization` / `infrastructure-as-code` — where health checks, pod
  disruption budgets, and multi-AZ topology get implemented
- `retrospective` — turning incidents and game-day findings into fixes
