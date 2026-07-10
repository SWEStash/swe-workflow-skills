---
name: ml-model-deployment
description: "Deploy ML models to production — serving infrastructure, monitoring, drift detection, safe rollouts. Triggers: deploy model, serve model, model API, model monitoring, data drift, concept drift, model degradation, A/B test model, canary model, inference endpoint, prediction API, retrain trigger."
allowed-tools: Read, Grep, Glob, Write, Edit, Bash
---

# ML Model Deployment

Deploy models to production with serving infrastructure that is reliable, observable, and safely updatable. Deploying a model is not the finish line — it's the beginning of the operational lifecycle.

## Key Difference from Software Deployment

Software deployment is primarily concerned with "does the code work?" Model deployment adds: "does the model still work *well* on real-world data that changes over time?" Models degrade silently — they keep returning predictions, just increasingly wrong ones.

## Workflow

### Step 1: Package the Model

Before deployment, the model must be a self-contained, versioned artifact:

- **Serialize the model**: Use framework-native formats (joblib/pickle for sklearn, SavedModel for TF, TorchScript for PyTorch, ONNX for cross-framework)
- **Pin dependencies**: Exact versions of libraries used during training
- **Include preprocessing**: The serving pipeline must apply the same feature transformations as training. Feature skew (different preprocessing in training vs serving) is the #1 cause of silent model failure
- **Version it**: Tag with model registry version, git commit, training data version, and training metrics

### Step 2: Choose the Serving Pattern

| Pattern | When to Use | Latency | Complexity |
|---------|-------------|---------|------------|
| **REST API** (Flask/FastAPI + model) | Low traffic, simple models | Medium (50-200ms) | Low |
| **Dedicated serving** (TF Serving, Triton, Seldon) | High traffic, GPU inference | Low (5-50ms) | Medium |
| **Batch prediction** (scheduled job) | High volume, latency-tolerant | N/A (scheduled) | Low |
| **Streaming** (Kafka + model) | Real-time event processing | Low | High |
| **Edge / embedded** | Offline, privacy-sensitive | Very low | High |

For most teams starting out: REST API with FastAPI is the right default. Optimize for lower latency only when measured need justifies complexity.

### Step 3: Build the Serving Application

The serving app needs:

```
Request → Validate input → Preprocess → Predict → Postprocess → Response
```

Key requirements:
- **Input validation**: Reject malformed requests before they reach the model
- **Feature preprocessing**: Apply the same transformations used in training
- **Error handling**: Model errors should return 500 with diagnostic info, not crash the service
- **Logging**: Log every prediction request/response for monitoring and debugging
- **Health check**: Endpoint that verifies the model is loaded and responsive

See [references/serving-patterns.md](references/serving-patterns.md) for implementation templates.

### Step 4: Deploy Safely

Models should be deployed with the same caution as any production service — more, given their non-deterministic nature:

**Shadow mode**: Deploy the new model alongside the current one. Both receive traffic, but only the current model's predictions are used. Compare predictions to evaluate the new model on real data.

**Canary deployment**: Route a small percentage of traffic (5-10%) to the new model. Monitor metrics. Gradually increase if performance is acceptable.

**A/B testing**: Split traffic between model versions to measure business impact (conversion rate, click-through, etc.), not just ML metrics.

**Blue-green**: Deploy new model to a separate environment, switch all traffic at once after validation. Fastest rollback.

### Step 5: Monitor in Production

After deployment, monitor continuously. See [references/serving-patterns.md](references/serving-patterns.md) for implementation details.

**Model performance monitoring:**
- Track prediction accuracy against ground truth (when available)
- Monitor prediction distribution (are predictions shifting?)
- Track business KPIs that the model influences

**Data drift detection:**
- Compare input feature distributions against the training data baseline
- Use statistical tests: Population Stability Index (PSI), Kolmogorov-Smirnov (KS) test, Jensen-Shannon divergence
- Alert when drift exceeds thresholds

**System monitoring:**
- Prediction latency (P50, P95, P99)
- Request throughput and error rates
- Resource utilization (CPU, memory, GPU)
- Model loading time

**Retraining triggers:**
- Accuracy drops below threshold
- Data drift exceeds threshold
- Scheduled retraining (weekly/monthly depending on domain)
- New labeled data becomes available

### Step 6: Plan Rollback

Every model deployment needs a rollback plan:
- Previous model version tagged and ready in the registry
- One-command rollback through CI/CD or model registry stage transition
- Automated rollback on monitoring alert (if confidence is high)

## Principles Applied

- **KISS**: Start with REST API + batch monitoring. Add real-time drift detection when scale justifies it.
- **YAGNI**: Don't build an A/B testing framework for your first model. Shadow mode is enough.
- **Defense in depth**: Validate inputs, monitor outputs, detect drift, and have rollback ready.
- **Functional Independence**: Serving, monitoring, and retraining should be independent components, not monolithic.
