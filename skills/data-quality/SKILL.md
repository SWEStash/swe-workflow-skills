---
name: data-quality
description: "Keep warehouse and pipeline data trustworthy — dbt tests, expectations (Great Expectations/Soda), data contracts with upstream producers, source freshness, schema-drift and volume anomaly detection, lineage and blast radius, severity and alerting. Triggers: data quality, bad data in dashboards, data validation, dbt tests, data contract, schema drift, stale data, freshness check, duplicate rows, nulls in the warehouse, data lineage, data SLA, upstream schema change broke us. Generating test/synthetic data → test-data-strategy; schema design → data-modeling."
model: sonnet
allowed-tools: Read, Grep, Glob, Write, Edit, Bash
---

# Data Quality

Make bad data **loud**: caught at the boundary where it enters, blocking what
must not ship, alerting someone who owns the fix — instead of being discovered
by a stakeholder in a dashboard. Boundaries: *generating* fake/test data is
`test-data-strategy`; *designing* the schema is `data-modeling`; this skill
keeps the real data flowing through pipelines trustworthy.

## Workflow

### Step 1: Start From Incidents, Not Inventory

Don't blanket every column with tests. List the recent data incidents (wrong
dashboard numbers, silent breakage) and the tables where an error costs real
money or trust — revenue marts, ML features, anything an exec reads. Each
known symptom maps to a check: nulls → `not_null`, duplicates → `unique`,
staleness → freshness, broken joins → `relationships`. Wins from day one, and
the suite grows the same way tests do after bugs — every new incident adds a
check that would have caught it.

### Step 2: Check at the Right Layer — Boundary First

Where a check runs matters as much as what it checks:

- **Ingestion boundary (sources)**: schema, freshness, volume, primary-key
  integrity — catch bad inputs *before* transforms consume them. One failed
  source check beats fifty downstream test failures at 6 a.m.
- **Transform layers (staging → marts)**: uniqueness/not-null on the grain of
  each model, relationship tests on joins, accepted values on enums.
- **Consumer edge (marts/metrics)**: business-rule assertions — "revenue is
  never negative", "row count within N% of the 7-day average".

In dbt this is: source `freshness` + source tests, generic tests on models
(`unique`, `not_null`, `relationships`, `accepted_values`), singular SQL tests
for business rules. Dedicated tools (Great Expectations, Soda) earn their keep
outside dbt-land or when non-engineers must own the rules:
[references/tooling.md](references/tooling.md).

### Step 3: Assign Severity — What Blocks vs What Warns

A suite where everything fails the build gets muted within a month; a suite
where nothing blocks is decoration. Decide per check:

- **error** — data is unusable or contaminating (duplicate keys in a revenue
  mart, failed contract at ingestion): the pipeline stops, downstream models
  don't build on poisoned input.
- **warn** — degraded but usable (slightly stale, volume dip within reason):
  alert, keep flowing.

dbt: `severity:` config with `error_if`/`warn_if` thresholds. Revisit
severities after each incident and each false alarm.

### Step 4: Route Failures to an Owner

A failing check nobody sees is identical to no check. Every table (or domain)
has a named owner; alerts go where that owner works (Slack channel per domain,
pager only for `error`-severity on critical marts), and each alert says what
failed, on which table, and the blast radius (Step 5). Track
time-to-detection and time-to-fix for data incidents — that's the metric this
whole skill improves (`observability-design` for the SLO framing).

### Step 5: Use Lineage to Scope Blast Radius

When a check fails, the first question is "what downstream is now wrong?" —
lineage (dbt's DAG, `dbt ls --select my_model+`, or a catalog tool) answers
which models, dashboards, and consumers sit downstream of the failure. Use it
to: prioritize fixes by consumer impact, notify affected dashboard owners
proactively, and decide what to rebuild after the fix. If you can't answer
"what breaks if this table is wrong?", invest in lineage before more checks.

### Step 6: Contract the Upstream Boundary

Downstream tests detect what upstream producers break; **contracts prevent
it.** When an external team owns the source: agree schema + semantics + SLA
explicitly (a versioned artifact — dbt model contracts, JSON Schema/protobuf in
a registry), enforce at ingestion so violations fail loudly at entry, and shift
left — contract validation in the *producer's* CI, so a breaking rename fails
their build, not your 6 a.m. run. Breaking changes get a version bump and a
deprecation window, coordinated like an API change
(`dependency-impact-analysis` thinking, applied to data). Back it with
schema-drift detection and volume/distribution anomaly checks for what
enforcement can't see.

## Principles Applied

- **YAGNI**: checks earn their place by a failure mode you've seen or can't
  afford — blanket-testing every column produces alert fatigue, the failure
  mode that kills quality programs.
- **Fail loudly at the boundary**: the cost of bad data grows with every layer
  it flows through undetected.
- **DRY**: one contract at the source replaces N teams' defensive checks
  against the same breakage.

## Cross-Skill References

- `data-pipeline-design` — the pipeline these checks are embedded in
- `data-modeling` — constraints and grain the checks assert (unique keys exist by design)
- `test-data-strategy` — generating synthetic/fixture data for testing pipelines
- `observability-design` — alerting design, SLOs, avoiding alert fatigue
- `incident-response` — when bad data has already reached production consumers
