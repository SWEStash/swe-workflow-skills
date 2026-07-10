---
name: notebook-to-production
description: "Refactor analysis notebooks into production-grade code — triage what deserves productionizing, extract modules with tests, parameterize hardcoded values, pin environments for reproducibility, and schedule unattended runs with alerting. Owns general analysis/reporting notebooks; notebooks that feed model TRAINING (feature engineering + training DAGs, scheduled retraining) → ml-pipeline-design."
when_to_use: "Triggers: productionize this notebook, notebook to script, notebook to module, refactor my notebook, parameterize notebook, papermill, schedule this analysis, reproducible analysis, notebook is a mess."
allowed-tools: Read, Grep, Glob, Write, Edit, Bash
---

# Notebook to Production

Turn exploratory notebooks into code that runs unattended, produces the same
result twice, and fails loudly. The refactor is incremental — the notebook
keeps working at every step — never a from-scratch rewrite.

## Workflow

### 1. Triage — not every notebook earns this

Productionize by **re-run frequency × business impact**. A notebook someone
re-runs by hand every quarter is the first candidate; a one-off exploration is
not — **archive it reproducibly instead**: the query or a data snapshot, a
pinned environment (`pip freeze` at minimum), and a one-line header (question,
finding, date, author). "Archived" without the data recipe and environment is
deleted-with-extra-steps.

For a backlog of many notebooks, also: extract logic duplicated across them
into a shared utility package (one fix, not N), and set a lightweight
convention for future notebooks likely to graduate — imports at top,
parameters in the first cell, logic in functions — so the next migration is
cheap.

### 2. Extract logic into modules

Move transformations out of cells into importable, typed functions in a real
package (`src/`), leaving the notebook as a thin driver that imports and
calls. Separate I/O (load/save) from transformation logic — pure
transformation functions are what you can test. Restartability check: does it
run top-to-bottom in a fresh kernel? Hidden execution-order state is the first
bug this flushes out.

### 3. Parameterize everything hardcoded

Dates, paths, connection strings, thresholds → function arguments driven by a
config file or CLI args (or papermill parameters if the notebook itself stays
the execution vehicle). The run for "last month" and the backfill for "March
2024" must be the same code with different parameters.

### 4. Test the transformations

The extracted pure functions get unit tests: known-input → known-output cases,
plus edge cases the data will eventually throw (empty frame, nulls, duplicate
keys, timezone boundaries). A small golden sample of real data as a fixture
catches most regressions. No tests, no schedule — an untested unattended job
is a silent-corruption machine.

### 5. Pin the environment

Reproducibility means the same code AND the same dependencies: a lock file
(`uv lock`, `poetry.lock`, `pip-compile`) or a container image. Pin the data
too where possible — snapshot inputs or record query + as-of timestamp, so a
rerun of last month's report produces last month's numbers.

### 6. Schedule and operate

Size the scheduler to the team: cron or a CI schedule (GitHub Actions) first;
an orchestrator (Airflow/Dagster) only when there are real DAG dependencies
across jobs. Unattended means operated: fail loudly (alert on failure AND on
suspicious output — empty result, row count off), log enough to debug a 6am
failure, and make the job idempotent so a retry can't double-append or
double-send.

## Principles

- **Incremental (KISS)**: extract one section at a time; the notebook keeps
  running throughout.
- **YAGNI**: no orchestrator, feature store, or microservice for a weekly
  report — cron + a tested module is production.
- **SRP**: load, transform, and render are separate functions with separate
  tests.

## Cross-skill boundaries

- The notebook trains a model (feature engineering, training, evaluation,
  retraining schedule) → **ml-pipeline-design** — training pipelines have
  their own stage/validation/gating design.
- Recurring ELT into a warehouse feeding many consumers → **data-pipeline-design**.
- Still figuring out what the analysis should say → **exploratory-data-analysis**.
- CI mechanics for the scheduled run → **cicd-pipeline**; test design depth →
  **test-suite-design**.
