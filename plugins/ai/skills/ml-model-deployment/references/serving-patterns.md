# Serving and Monitoring Patterns

## Contents
- FastAPI serving template
- Drift detection patterns
- Monitoring dashboard design
- Retraining pipeline triggers

## FastAPI Model Serving Template

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, validator
import mlflow
import numpy as np
import logging
import time

app = FastAPI(title="Model Serving API")
logger = logging.getLogger(__name__)

# Load model at startup (not per-request)
model = None

@app.on_event("startup")
async def load_model():
    global model
    model = mlflow.pyfunc.load_model("models:/my-classifier/Production")
    logger.info("Model loaded successfully")

class PredictionRequest(BaseModel):
    features: list[float]

    @validator("features")
    def validate_features(cls, v):
        if len(v) != EXPECTED_FEATURE_COUNT:
            raise ValueError(f"Expected {EXPECTED_FEATURE_COUNT} features, got {len(v)}")
        return v

class PredictionResponse(BaseModel):
    prediction: int
    probability: float
    model_version: str
    latency_ms: float

@app.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest):
    start = time.time()
    try:
        features = np.array(request.features).reshape(1, -1)
        prediction = model.predict(features)
        probability = model.predict_proba(features).max()

        latency_ms = (time.time() - start) * 1000

        # Log for monitoring
        logger.info(f"prediction={prediction[0]} prob={probability:.4f} latency={latency_ms:.1f}ms")

        return PredictionResponse(
            prediction=int(prediction[0]),
            probability=float(probability),
            model_version=model.metadata.run_id,
            latency_ms=latency_ms,
        )
    except Exception as e:
        logger.error(f"Prediction failed: {e}")
        raise HTTPException(status_code=500, detail="Prediction failed")

@app.get("/health")
async def health():
    return {"status": "healthy", "model_loaded": model is not None}
```

## Drift Detection Patterns

### Population Stability Index (PSI)

PSI measures how much a feature distribution has shifted from a baseline.

```python
import numpy as np

def calculate_psi(baseline, current, bins=10):
    """Calculate Population Stability Index between two distributions."""
    # Bin the data
    breakpoints = np.quantile(baseline, np.linspace(0, 1, bins + 1))
    breakpoints[0] = -np.inf
    breakpoints[-1] = np.inf

    baseline_counts = np.histogram(baseline, bins=breakpoints)[0] / len(baseline)
    current_counts = np.histogram(current, bins=breakpoints)[0] / len(current)

    # Avoid division by zero
    baseline_counts = np.clip(baseline_counts, 1e-6, None)
    current_counts = np.clip(current_counts, 1e-6, None)

    psi = np.sum((current_counts - baseline_counts) * np.log(current_counts / baseline_counts))
    return psi

# Interpretation:
# PSI < 0.1:  No significant drift
# PSI 0.1-0.2: Moderate drift — investigate
# PSI > 0.2:  Significant drift — retrain
```

### Monitoring with Evidently AI

```python
from evidently.report import Report
from evidently.metric_preset import DataDriftPreset, TargetDriftPreset

# Compare current production data against training baseline
report = Report(metrics=[
    DataDriftPreset(),
    TargetDriftPreset(),
])

report.run(reference_data=training_df, current_data=production_df)
report.save_html("drift_report.html")

# Programmatic access to results
results = report.as_dict()
drift_detected = results["metrics"][0]["result"]["dataset_drift"]
```

## Monitoring Dashboard Design

A model monitoring dashboard should show:

**Real-time panel:**
- Prediction throughput (requests/sec)
- Latency percentiles (P50, P95, P99)
- Error rate
- Prediction distribution (histogram updated hourly)

**Drift panel (updated daily/hourly):**
- PSI per feature over time (line chart)
- Drift alert threshold line
- Feature importance × drift magnitude (which drifted features matter most?)

**Performance panel (updated as ground truth arrives):**
- Primary metric (accuracy, F1, RMSE) over time
- Comparison against baseline model
- Performance by segment (if applicable)

**Operational panel:**
- Model version currently serving
- Last retrain date
- Resource utilization (CPU, memory, GPU)
- Cost per prediction

## Retraining Pipeline Triggers

| Trigger | When to Use | Implementation |
|---------|-------------|---------------|
| **Scheduled** | Stable domains (weekly/monthly) | Cron job or orchestrator schedule |
| **Performance-based** | When ground truth is available | Monitor metric, trigger when below threshold |
| **Drift-based** | When data changes are detectable | Monitor PSI/KS, trigger when above threshold |
| **Data-volume** | When new labeled data accumulates | Count new labels, trigger at threshold |
| **Manual** | Regulatory or business-driven | Human approval in model registry |

Start with scheduled + drift-based triggers. Add performance-based when ground truth labeling is established.
