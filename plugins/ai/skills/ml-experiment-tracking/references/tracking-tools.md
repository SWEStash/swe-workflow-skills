# Experiment Tracking Tools

## Contents
- MLflow setup and patterns
- Weights & Biases patterns
- DVC for data versioning
- Comparison matrix

## MLflow Setup

### Basic tracking
```python
import mlflow

mlflow.set_tracking_uri("http://localhost:5000")  # Or remote server
mlflow.set_experiment("my-classification-project")

with mlflow.start_run(run_name="baseline-logistic-regression"):
    # Log parameters
    mlflow.log_param("model_type", "logistic_regression")
    mlflow.log_param("C", 1.0)
    mlflow.log_param("max_iter", 100)
    mlflow.log_param("dataset_version", "v2.3")
    mlflow.log_param("git_commit", subprocess.check_output(["git", "rev-parse", "HEAD"]).strip())

    # Train model
    model = LogisticRegression(C=1.0, max_iter=100)
    model.fit(X_train, y_train)

    # Log metrics
    y_pred = model.predict(X_test)
    mlflow.log_metric("accuracy", accuracy_score(y_test, y_pred))
    mlflow.log_metric("f1_score", f1_score(y_test, y_pred, average="weighted"))
    mlflow.log_metric("precision", precision_score(y_test, y_pred, average="weighted"))

    # Log model artifact
    mlflow.sklearn.log_model(model, "model")

    # Log additional artifacts
    mlflow.log_artifact("confusion_matrix.png")
```

### Model Registry
```python
# Register a model from a run
model_uri = f"runs:/{run_id}/model"
mlflow.register_model(model_uri, "my-classifier")

# Transition model stage
client = mlflow.tracking.MlflowClient()
client.transition_model_version_stage(
    name="my-classifier",
    version=3,
    stage="Production"
)
```

## Weights & Biases Patterns

```python
import wandb

wandb.init(
    project="my-classification-project",
    name="baseline-logistic-regression",
    config={
        "model_type": "logistic_regression",
        "C": 1.0,
        "max_iter": 100,
        "dataset_version": "v2.3",
    }
)

# Training loop with automatic metric logging
for epoch in range(config.epochs):
    train_loss = train_one_epoch(model, train_loader)
    val_loss, val_acc = evaluate(model, val_loader)
    wandb.log({
        "train_loss": train_loss,
        "val_loss": val_loss,
        "val_accuracy": val_acc,
        "epoch": epoch
    })

# Log final artifacts
wandb.log({"confusion_matrix": wandb.plot.confusion_matrix(
    y_true=y_test, preds=y_pred, class_names=class_names
)})

wandb.finish()
```

## DVC for Data Versioning

```bash
# Initialize DVC in a git repo
dvc init

# Track a dataset
dvc add data/training_data.csv
git add data/training_data.csv.dvc data/.gitignore
git commit -m "track training data v1"

# Push data to remote storage
dvc remote add -d myremote s3://my-bucket/dvc-store
dvc push

# Switch to a different data version
git checkout v2.0  # Checkout the git tag
dvc checkout        # Pull the matching data version
```

DVC tracks large files (datasets, model weights) alongside git without storing them in git. The `.dvc` file in git points to the actual data in remote storage.

## Comparison Matrix

| Feature | MLflow | W&B | Neptune | DVC |
|---------|--------|-----|---------|-----|
| Experiment tracking | ✓ | ✓ | ✓ | Partial |
| Model registry | ✓ | ✓ | ✓ | ✗ |
| Data versioning | ✗ | ✓ (Artifacts) | ✗ | ✓ |
| Visualization | Basic | Rich | Rich | ✗ |
| Self-hosted | ✓ | Enterprise | ✗ | ✓ |
| Free tier | Open source | Free (limits) | Free (limits) | Open source |
| Best for | Teams wanting open-source control | Rich visualization and collaboration | Team collaboration | Data and pipeline versioning |

**Recommendation**: MLflow + DVC for open-source, self-hosted workflows. W&B for teams that value visualization and can use SaaS.
