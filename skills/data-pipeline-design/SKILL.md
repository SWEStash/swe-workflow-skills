---
name: data-pipeline-design
description: "Design batch and streaming data pipelines — ELT into a warehouse/lakehouse, dbt and analytics engineering (staging/intermediate/marts layers), orchestration with Airflow or Dagster, idempotent loads, incremental models, backfills, CDC ingestion. Triggers: data pipeline, ELT, ETL, dbt models, data warehouse, Snowflake, BigQuery, ingest into the warehouse, Airflow DAG, Dagster, Kafka streaming, backfill, incremental load, nightly job duplicates rows. ML training/feature pipelines → ml-pipeline-design; validating the data → data-quality."
allowed-tools: Read, Grep, Glob, Write, Edit, Bash
---

# Data Pipeline Design

Design pipelines that move and transform data for analytics — and stay correct
when they fail, rerun, and backfill, because they will. The two design
properties that separate a pipeline from a script: **idempotency** (any run can
be repeated safely) and **parameterization** (any time window can be processed
by the same code). Boundaries: pipelines feeding *model training* (features,
point-in-time correctness) belong to `ml-pipeline-design`; *validating* the
data this pipeline moves belongs to `data-quality`.

## Workflow

### Step 1: Map Sources, Consumers, and Freshness

List each source (databases, SaaS APIs, event streams), each consumer
(dashboards, reverse ETL, downstream teams), and the freshness each consumer
actually needs. Freshness drives everything: daily batch is an order of
magnitude cheaper to build and operate than streaming — don't buy streaming
because "real-time" sounds better; buy it when a consumer decision genuinely
changes within minutes.

### Step 2: Choose ELT (and Say Why)

For a cloud warehouse (Snowflake, BigQuery, Redshift, Databricks), default to
**ELT**: land raw data unchanged, transform inside the warehouse with SQL/dbt.
The reasons are operational, not fashionable — raw history means transform bugs
are fixed by *re-running transforms*, not re-extracting from sources; the
warehouse scales the compute; transformations become versioned, testable SQL.
Classic ETL survives where data must be cleaned/redacted before it may land
(PII, compliance) or the target isn't a warehouse.

### Step 3: Don't Hand-Roll Extraction

Ingestion is undifferentiated heavy lifting with long tail of pain (API
pagination, rate limits, schema changes, backpressure):

- **SaaS/DB sources**: managed or open connectors first — Fivetran/Airbyte/dlt.
  Hand-write only when no connector exists or volume/cost forces it.
- **Operational DBs at scale**: CDC (Debezium or the warehouse-native
  equivalent) instead of daily full dumps or fragile `updated_at` queries.
- **Events**: land the stream (Kafka → object storage/warehouse) raw; process
  micro-batch unless Step 1 proved sub-minute freshness is needed.

### Step 4: Layer the Transforms (dbt)

- **Staging** — 1:1 with sources: rename, cast, deduplicate. No business logic.
- **Intermediate** — joins and business logic, composable, not exposed to BI.
- **Marts** — consumer-facing facts/dimensions, one per business domain.

Each layer only reads from the one below; BI tools read only marts. This is
SRP for SQL: when a number is wrong, the layer tells you where to look. Schema
design for the marts themselves is `data-modeling`'s domain.

### Step 5: Make Every Run Idempotent

The Iron Rule of pipelines: **a rerun must produce the same result as one
run.** Append-only loads fail this and produce the classic duplicate-rows-
after-retry incident. Choose a write pattern per table:

- **Delete + insert by partition** (or `INSERT OVERWRITE`): simplest, right
  default for date-partitioned facts.
- **Merge/upsert on a unique key**: for mutable entities and late updates —
  requires a true unique key (enforce it via `data-quality` tests).
- **Full refresh**: fine while small; flip to incremental on cost, not pride.

In dbt: `incremental` materialization with `unique_key` set — and always define
the full-refresh path (`--full-refresh` must work, or you can't recover from a
logic bug).

### Step 6: Parameterize Time — Backfill Is a First-Class Case

Every run processes an explicit **logical window** passed in by the
orchestrator (`WHERE event_date = {{ ds }}`) — never `CURRENT_DATE - 1` inside
the SQL, which makes yesterday's failure unreproducible today. Then backfill is
not a special script: it's the same job over a range, natively supported by
the orchestrator (Airflow `backfill`, Dagster partitioned assets). If
backfilling means hand-editing dates, Steps 5–6 were skipped.

Handle **late-arriving data** explicitly: reprocess a trailing lookback window
(e.g. the last 3 days) each run, or track a watermark — pick per source based
on how late its data actually arrives.

### Step 7: Orchestrate and Operate

Pick **one** orchestrator and make a recommendation, not a brochure: Dagster
for a dbt-centric greenfield stack (asset/partition model matches warehouse
thinking, first-class dbt integration); Airflow where the org already runs it
or needs its ecosystem breadth (comparison and managed options:
[references/orchestration.md](references/orchestration.md)). Then wire in
operations: retries with alerting on final failure (`observability-design`),
quality checks between layers (`data-quality`), and cost visibility per model —
warehouses make it very easy to spend quietly.

## Principles Applied

- **KISS**: batch over streaming, connectors over custom extractors, SQL over
  a framework — until a measured requirement says otherwise.
- **DRY**: one parameterized job for daily runs *and* backfills; logic lives
  once, in the transform layer, not copied into extraction scripts.
- **YAGNI**: no lakehouse/streaming/metadata-platform buildout for a stack
  whose consumers refresh dashboards daily.

## Cross-Skill References

- `data-quality` — tests, contracts, and freshness checks between the layers
- `data-modeling` — the schema design of the marts this pipeline produces
- `ml-pipeline-design` — when the consumer is model training, not BI
- `observability-design` — pipeline SLOs, alerting, run-level monitoring
- `architecture-design` — ADRs for the costly-to-reverse platform choices
