---
name: exploratory-data-analysis
description: "Explore and profile an unfamiliar dataset before modeling or analysis — structural profiling, missingness structure, distributions and outliers, feature–target relationships, leakage awareness, and explicit hypothesis generation. Pipeline-level data trust (broken dashboards, tests, contracts, freshness) → data-quality; formal inference on the hypotheses → statistical-analysis."
when_to_use: "Triggers: explore this dataset, EDA, profile the data, what's in this data, first look at the data, understand this CSV, distributions, outliers, missing values, correlation, data leakage."
model: sonnet
allowed-tools: Read, Grep, Glob, Write, Edit, Bash
---

# Exploratory Data Analysis

Understand a dataset before trusting it with a model or a decision. The output
of EDA is not a pile of statistics — it is a documented understanding: what the
data is, what's wrong or surprising in it, and a set of explicit hypotheses to
test next. Every step below feeds that document.

## Workflow

### 1. Frame the goal and the grain

Before profiling anything, write down what decision or model this data will
feed, and establish the **grain**: what does one row represent (an order? a
customer? a customer-month?)? Duplicate keys and mixed grains invalidate every
later statistic. If the eventual use is prediction, note *when* the prediction
would be made — that timestamp drives the leakage checks in step 5.

### 2. Profile structurally

Column types, ranges, cardinality, and summary statistics for every column —
cheaply, before any deep dive. Triage wide tables by metadata first (null rate,
cardinality, type) and prioritize columns by relevance to the goal; don't
profile 400 columns equally.

If the data doesn't fit in memory: push aggregations down to the warehouse
(SQL), or use an out-of-core/lazy engine (DuckDB, Polars). When you sample,
**sample representatively** — random or stratified, never `head()` (files are
usually ordered by time or id) — and state the caveat that rare events and
extreme outliers can be missed under sampling; verify those against the full
data with targeted queries.

### 3. Map the missingness structure

Null counts are the start, not the answer. Distinguish:

- **Random gaps** — sporadic nulls, roughly uniform across segments.
- **Structural missingness** — a column populated only for some segment, after
  some date, or by some source system. Cross-tab null rates against segments
  and time to find these.
- **Informative missingness** — where the *fact* that a value is missing
  predicts the outcome (e.g., income missing for churned users). Flag it; it
  may be a feature, or it may be leakage.

Also check for disguised missing values: sentinel codes (0, -1, 999,
"unknown", empty string) that aren't NULL.

### 4. Distributions and outliers

For key numeric columns: quantiles, histograms, and an outlier pass (IQR or
similar). For categoricals: frequency tables and rare-level counts. Decide for
each outlier cluster whether it is a data error, a unit mismatch, or a genuine
tail — **never drop outliers before classifying them**; genuine tails are often
the interesting part. Check skew before assuming any statistic (mean, std) is
representative.

### 5. Target definition, balance, and leakage

If the data will feed a model:

- **Define the target explicitly** (e.g., "churn = no order in 90 days after
  cutoff") and check its **class balance** — a 2% positive rate changes the
  whole modeling and evaluation approach downstream.
- **Hunt for leakage**: any column recorded at-or-after the outcome
  (cancellation reason, final status, updated_at aggregates), and proxies that
  encode the outcome indirectly. Test: "would this value exist at prediction
  time?" If unsure, trace how the column is produced. A too-good correlation
  with the target is a leakage smell, not a win.

### 6. Relationships, not just profiles

Univariate profiles alone don't generate hypotheses. Examine bivariate
structure: correlations among candidate features, and each candidate feature
against the target (grouped rates, means by decile, simple cross-tabs). Note
confounders — a feature↔target association may be explained by segment or
time. This is where most real hypotheses come from.

### 7. Write the hypotheses and hand off

Close with a short findings document: data issues found, columns excluded and
why (especially leakage suspects), and **explicit hypotheses phrased as
testable statements** ("weekend signups churn more", "the price effect is
driven by segment X") plus open questions for the data owners. Formal testing
of those hypotheses is `statistical-analysis` territory; feature/training
pipeline work is `ml-pipeline-design`.

## Principles

- **KISS**: value counts and group-by rates beat clever visualizations for
  finding problems fast.
- **YAGNI**: profile to the goal — an exhaustive 400-column report nobody reads
  is not EDA.
- **Honest accounting**: record what you did NOT check (columns skipped,
  sample-size limits) in the findings doc.

## Cross-skill boundaries

- Bad data in a *pipeline or dashboard* (freshness, contracts, dbt tests,
  lineage) → **data-quality** — that's an operational trust problem, not
  exploration of an unfamiliar dataset.
- Formal hypothesis testing, experiment design, significance → **statistical-analysis**.
- Turning the analysis into scheduled production code → **notebook-to-production**.
- Schema design for storing the data → **data-modeling**.
