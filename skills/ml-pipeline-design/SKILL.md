---
name: ml-pipeline-design
description: "Design reproducible ML training and data pipelines — ingestion, validation, feature engineering, training, evaluation, continuous training orchestration. Triggers: training pipeline, data pipeline, feature engineering, ETL for ML, continuous training, data validation, feature store, preprocessing, notebook to pipeline, orchestrate training, Airflow, Kubeflow, pipeline DAG."
model: opus
allowed-tools: Read, Grep, Glob, Write, Edit, Bash
---

# ML Pipeline Design

Design reproducible, automated ML pipelines that transform notebooks into production-grade workflows. A pipeline is the difference between "I ran this notebook and got good results" and "this system produces, validates, and deploys models automatically."

## Why Pipelines Matter

Manual ML workflows break in predictable ways:
- **Undocumented steps**: "You need to run cell 7 before cell 3, but skip cell 5"
- **Hidden state**: Notebook variables carry state between cells that isn't captured
- **No validation**: Bad data enters silently and produces silently bad models
- **No automation**: Retraining requires a human to re-run the notebook
- **No lineage**: "Which data produced this model?" becomes unanswerable

Pipelines solve all of these by making each step explicit, validated, and reproducible.

## Workflow

### Step 1: Map the Pipeline Stages

Every ML pipeline follows this general DAG (Directed Acyclic Graph):

```
Data Ingestion → Data Validation → Feature Engineering → Data Split
                                                            ↓
Model Evaluation ← Model Training ← Hyperparameter Config
      ↓
Model Validation → Model Registration → (Optional) Deployment
```

Identify which stages the user's workflow needs. Not every project needs every stage — a simple model might skip feature stores and hyperparameter tuning.

### Step 2: Design Each Stage

**Data Ingestion:**
- Where does raw data come from? (Database, API, files, streaming)
- How is it versioned? (DVC, Delta Lake, immutable snapshots)
- What's the trigger? (Schedule, event, data arrival)

**Data Validation:**
- Schema validation: Do columns exist? Are types correct?
- Statistical validation: Are distributions within expected ranges?
- Freshness checks: Is the data recent enough?
- Completeness checks: Missing value rates within tolerance?

Use frameworks like Great Expectations, Pandera, or TensorFlow Data Validation. See [references/pipeline-components.md](references/pipeline-components.md).

**Feature Engineering:**
- Transform raw data into model-ready features
- Document every transformation (input → output, rationale)
- Ensure transformations are deterministic and reproducible
- Consider a feature store for features reused across models (Feast, Tecton)
- **Critical**: Use the same feature code for training and serving to prevent training-serving skew

**Data Split:**
- Train/validation/test split with consistent strategy
- Time-based splits for temporal data (no future leakage)
- Stratified splits for imbalanced classes
- Document the split ratios and method

**Model Training:**
- Parameterized: hyperparameters passed as config, not hardcoded
- Tracked: all runs logged to experiment tracker (use `ml-experiment-tracking` skill)
- Resource-aware: specify compute requirements (GPU type, memory)

**Model Evaluation:**
- Evaluate on held-out test set (never used during training or tuning)
- Compute all relevant metrics (not just accuracy)
- Compare against baseline model (the one currently in production)
- Check for fairness across segments if applicable
- **Gate**: Only promote models that beat the baseline by a defined threshold

**Model Validation (pre-deployment):**
- Inference latency meets SLA
- Model size fits the deployment target
- No prediction anomalies on a validation dataset
- Input/output schema matches the serving contract

### Step 3: Choose the Orchestrator

| Tool | Best For | Complexity |
|------|----------|------------|
| **Simple scripts + cron** | Single-model, small team | Low |
| **Airflow / Dagster** | Data engineering teams, complex DAGs | Medium |
| **Kubeflow Pipelines** | Kubernetes-native, large scale | High |
| **Vertex AI / SageMaker Pipelines** | Cloud-native, managed | Medium |
| **Prefect** | Python-native, modern alternative to Airflow | Medium |
| **GitHub Actions** | Simple CI/CD-triggered training | Low |

Start simple: scripts + cron or GitHub Actions for early-stage ML. Move to Airflow/Dagster when you have multiple pipelines and complex dependencies.

### Step 4: Implement

Write each pipeline stage as an independent, testable component:

```python
# Each stage is a function with clear inputs and outputs
def ingest_data(source_config: dict) -> pd.DataFrame:
    """Ingest data from configured source."""
    ...

def validate_data(df: pd.DataFrame, schema: Schema) -> ValidationResult:
    """Validate data against expected schema and statistics."""
    ...

def engineer_features(df: pd.DataFrame, feature_config: dict) -> pd.DataFrame:
    """Apply feature transformations."""
    ...

def train_model(X_train, y_train, hyperparams: dict) -> Model:
    """Train model with given hyperparameters."""
    ...

def evaluate_model(model: Model, X_test, y_test) -> dict:
    """Evaluate model and return metrics dict."""
    ...
```

This pattern makes each stage unit-testable, composable, and replaceable.

### Step 5: Add Data Validation Gates

Data validation is the most overlooked and most valuable pipeline component. Bad data in → bad model out, silently.

```python
import pandera as pa

# Define expected schema
schema = pa.DataFrameSchema({
    "user_id": pa.Column(int, nullable=False),
    "amount": pa.Column(float, pa.Check.in_range(0, 100000)),
    "category": pa.Column(str, pa.Check.isin(["A", "B", "C"])),
    "timestamp": pa.Column(pd.Timestamp, nullable=False),
})

# Validate before training
validated_df = schema.validate(raw_df)  # Raises on failure
```

### Step 6: Validate and Document

- [ ] Pipeline runs end-to-end from raw data to registered model
- [ ] Each stage can be run independently for debugging
- [ ] Data validation catches bad data before training
- [ ] Experiment tracking captures all runs
- [ ] Model evaluation gates prevent worse models from being promoted
- [ ] Pipeline configuration is version-controlled (not hardcoded)
- [ ] Feature transformations are shared between training and serving

## Principles Applied

- **DRY**: Share feature engineering code between training pipeline and serving. One transformation definition, used everywhere.
- **KISS**: Start with a linear script, refactor into a DAG when complexity demands it. Don't adopt Kubeflow for one model.
- **YAGNI**: Don't build a feature store for 3 features. Build it when you have 50+ features shared across multiple models.
- **Functional Independence**: Each pipeline stage is an independent component with defined inputs and outputs. Replace any stage without rewriting the pipeline.
- **Fail fast**: Validate data at ingestion, not after 2 hours of training.
