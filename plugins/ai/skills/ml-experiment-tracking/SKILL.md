---
name: ml-experiment-tracking
description: "Design reproducible ML experiments — tracking, versioning, run comparison with MLflow, W&B, or DVC. Triggers: experiment tracking, MLflow, wandb, weights and biases, DVC, track experiments, compare models, hyperparameter, reproducibility, model registry, which model is better, experiment results, log metrics. Defining WHAT to measure (metrics, golden datasets, judges) → ai-evaluation; this skill records and compares the runs."
model: sonnet
allowed-tools: Read, Grep, Glob, Write, Edit, Bash
---

# ML Experiment Tracking

Establish disciplined experiment tracking that makes ML development reproducible, comparable, and auditable. Without tracking, ML work degenerates into "which notebook had the good results?"

## Why This Matters

ML experiments differ from traditional software in critical ways:
- **Non-deterministic**: Same code + same data can produce different results (random seeds, GPU nondeterminism)
- **Multi-dimensional**: Performance depends on code, data, hyperparameters, and environment simultaneously
- **Retrospective**: You often realize a past experiment was better only after running new ones

Without systematic tracking, reproducing results becomes archaeology.

## Workflow

### Step 1: Set Up Tracking Infrastructure

Before running experiments, establish:

- **Experiment tracker**: MLflow, Weights & Biases, Neptune, or even a structured CSV/JSON approach
- **Data versioning**: DVC, Delta Lake, or immutable dataset snapshots in object storage
- **Code versioning**: Git (this should already exist)
- **Environment capture**: Docker image hash, conda environment export, pip freeze

Recommend MLflow for open-source simplicity, W&B for rich visualization needs. See [references/tracking-tools.md](references/tracking-tools.md) for setup patterns.

### Step 2: Define What to Track

For every experiment run, log:

**Inputs:**
- Dataset version or hash (not just "training_data.csv" — the specific version)
- Git commit hash of the code
- All hyperparameters (learning rate, batch size, epochs, model architecture choices)
- Random seed
- Environment (Python version, key library versions, GPU type)

**Outputs:**
- Primary metric (what you're optimizing: accuracy, F1, RMSE, etc.)
- Secondary metrics (latency, model size, memory usage)
- Training curves (loss per epoch)
- Evaluation on held-out test set
- Model artifacts (serialized model, weights)
- Confusion matrix, ROC curves, or other diagnostic plots

**Metadata:**
- Experiment name and description (what hypothesis is being tested)
- Run duration and compute cost
- Tags for filtering (e.g., "baseline", "feature_engineering", "architecture_search")

### Step 3: Design the Experiment

Before running anything, define:

1. **Hypothesis**: What do you expect to happen and why?
2. **Baseline**: What's the current best result to beat?
3. **Variable**: What exactly are you changing? (Change one thing at a time)
4. **Metric**: What defines "better"? Set this before seeing results to avoid cherry-picking.
5. **Stopping criteria**: When do you stop iterating? (Target metric reached, diminishing returns, time budget exhausted)

Document this as the experiment description in your tracker.

### Step 4: Run and Compare

Run experiments with full tracking. After a batch of runs:

1. **Compare metrics** across runs in a table or parallel coordinates plot
2. **Identify the best run** by the pre-defined primary metric
3. **Verify reproducibility** — can you re-run the best experiment and get similar results?
4. **Check for data leakage** — is the test set truly held out? No information from test in training?
5. **Assess overfitting** — compare train vs validation metrics

### Step 5: Register the Best Model

When a model is ready for staging or production:

1. Register it in a model registry (MLflow Model Registry, or equivalent)
2. Tag it with a stage: `staging`, `production`, `archived`
3. Link it to the experiment run that produced it (full lineage)
4. Document what makes this model better than the previous version

This creates an auditable trail from "model in production" back to "exact data + code + params that created it."

## Principles Applied

- **DRY**: Track once, query many times. Don't reconstruct experiment details from memory or notebooks.
- **YAGNI**: Start with simple tracking (parameters + metrics + artifacts). Add complexity (feature stores, automated comparisons) when the number of experiments justifies it.
- **Reproducibility over speed**: A fast experiment you can't reproduce has zero long-term value.
- **KISS**: One experiment changes one variable. Multi-variable changes make it impossible to attribute improvement.
