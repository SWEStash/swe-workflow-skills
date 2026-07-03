# Data Quality Tooling — Selection Notes

Tool capabilities shift quickly; verify against current docs. The placement
logic is stable.

## Picking the enforcement layer

| Tool | Shape | Choose when |
|---|---|---|
| **dbt tests** | YAML generic tests + singular SQL tests, run with the transforms | You're already on dbt. Zero new infrastructure; tests version with the models; severity/thresholds built in. The default. |
| **dbt model contracts** | Enforced column names/types on a model; breaks the *producer's* build | A dbt model is consumed across team boundaries — the contract fails the producing project's CI, which is the shift-left goal. |
| **Great Expectations** | Python expectation suites + data docs, runs anywhere | Checks must run outside the warehouse/dbt (files, in-flight DataFrames, non-dbt pipelines), or you need its rich expectation vocabulary and generated documentation. Heavier to operate. |
| **Soda (Core/Cloud)** | Declarative checks YAML (SodaCL), CLI + SaaS | Non-engineers own quality rules, or checks span multiple stores with one syntax; Cloud adds anomaly detection and incident routing. |
| **Elementary / observability platforms (Monte Carlo, Metaplane…)** | Monitor the warehouse from metadata: freshness, volume, schema drift, distribution anomalies | You want detection you didn't hand-write — anomaly monitoring across many tables — and (platforms) column-level lineage + incident management. Elementary is the dbt-native OSS entry point. |

Layering that works in practice: **dbt tests + source freshness** as the
foundation; **contracts** at team boundaries; **one anomaly/observability
layer** for the unknown-unknowns. Adding a second tool in the same layer buys
maintenance, not coverage.

## Contract mechanics by boundary type

- **Event streams**: schema registry (Avro/Protobuf/JSON Schema) with
  compatibility mode set (backward at minimum); producers can't publish a
  breaking schema. The strongest enforcement available — use it if events are
  the interface.
- **Warehouse-to-warehouse (dbt ↔ dbt)**: dbt model contracts + versioned
  models (`v2` with a deprecation window) on the shared models.
- **API/file drops from another org**: JSON Schema validated at ingestion;
  reject-and-alert (dead-letter the bad batch) rather than best-effort
  parsing.
- The social half matters as much: a named producer contact, a change-notice
  channel, and the contract in a repo both teams can PR.

## Anomaly checks worth having before "ML-powered" anything

- Row count vs trailing 7/28-day window (volume drops are the most common
  silent failure).
- Freshness vs declared SLA per source.
- Schema diff vs last run (added/removed/retyped columns) with an explicit
  allowlist flow.
- Null-rate and distinct-count drift on business-critical columns.

These four catch the large majority of real incidents; statistical/ML anomaly
detection is a refinement, not a starting point.
