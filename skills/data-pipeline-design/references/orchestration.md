# Orchestration — Choosing and Using the Scheduler

Versions and managed offerings change; check current docs before committing.
The selection logic is stable.

## Airflow vs Dagster vs the rest

| | Airflow | Dagster |
|---|---|---|
| Mental model | Tasks in a DAG; scheduler runs tasks | Software-defined **assets** (tables/files) with partitions; runs materialize assets |
| dbt integration | Via operators (Cosmos et al.) — workable | First-class: each dbt model becomes an asset with its own lineage/partitions |
| Backfill | `airflow backfill` over execution dates | Partitioned assets — backfill = materialize missing partitions, UI-native |
| Ecosystem | Enormous (every provider has an operator); huge hiring pool | Younger, smaller, growing; strong local dev experience |
| Managed | MWAA (AWS), Cloud Composer (GCP), Astronomer | Dagster+ |

Recommendation logic:

- **Greenfield, warehouse/dbt-centric** → Dagster. The asset+partition model
  *is* Steps 5–6 of the skill (idempotent, parameterized, backfillable) encoded
  in the orchestrator; you fight the framework less.
- **Org already runs Airflow, or the pipeline is mostly "call these seven
  systems in order"** → Airflow. Operational familiarity and operator breadth
  beat elegance; don't run two orchestrators for one team.
- **All-in on one vendor stack** → the platform-native option (Databricks
  Workflows, Snowflake Tasks) is acceptable glue; you trade portability.
- **Cron + a queue** is fine for one or two jobs — adopt an orchestrator when
  you need dependencies, backfill, and retry visibility, which is usually at
  the third job.

Whatever the choice: schedules trigger *logical windows*, tasks are
idempotent, retries are bounded and alert on final failure, and secrets come
from the platform's secret backend (`configuration-strategy`), never DAG code.

## Ingestion tool notes

- **Fivetran**: managed, broadest connector catalog, per-row pricing that gets
  real at volume. Buy when engineer time is the scarce resource.
- **Airbyte**: open-source + cloud; connector quality varies — test the
  specific connectors you need, especially for incremental correctness.
- **dlt**: Python library, connectors-as-code, great for API sources a
  framework doesn't cover; you own the runtime.
- **CDC (Debezium / native)**: when daily snapshots lose intermediate states
  or full dumps are too heavy. Operationally nontrivial (snapshotting, schema
  evolution, tombstones) — budget for it.

## Streaming — only after Step 1 says so

- Micro-batch (5–15 min) covers most "real-time" dashboard asks at batch-like
  complexity; genuine streaming (Flink, Spark Structured Streaming,
  Materialize) is for operational decisions made in seconds-to-minutes.
- Streaming reintroduces every hard problem batch solved for you: exactly-once
  vs at-least-once delivery, watermarks for late events, state management,
  replay. Idempotent sinks (merge on key) make at-least-once livable — design
  the sink first.
- Keep the raw stream landed to cheap storage regardless; it's your backfill
  and reprocessing escape hatch.

## Warehouse cost hygiene

- Tag/attribute compute per model or job from day one (dbt does this cheaply).
- Incremental models exist for cost as much as latency — flip when a full
  refresh's bill, not its runtime, annoys you.
- Watch for accidental cross-joins and full scans in staging layers; the
  warehouse will happily execute them nightly forever.
