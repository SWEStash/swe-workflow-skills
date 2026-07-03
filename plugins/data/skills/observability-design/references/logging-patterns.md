# Logging and Alerting Patterns

## Contents
- Structured logging design
- Log levels guide
- Correlation patterns
- Sensitive data handling
- Alerting design patterns
- OpenTelemetry instrumentation snippets

## Structured Logging Design

Every log entry should be a JSON object with consistent fields:

```json
{
  "timestamp": "2025-03-05T14:30:00.123Z",
  "level": "error",
  "message": "Payment processing failed",
  "service": "payment-service",
  "environment": "production",
  "trace_id": "abc123def456",
  "span_id": "789ghi",
  "request_id": "req-001-xyz",
  "user_id": "usr_42",
  "error": {
    "type": "StripeCardError",
    "message": "Card declined",
    "code": "card_declined"
  },
  "context": {
    "order_id": "ord_123",
    "amount_cents": 5999,
    "currency": "USD"
  },
  "duration_ms": 342
}
```

**Required fields** (every log entry):
- `timestamp` — ISO 8601 UTC
- `level` — debug, info, warn, error, fatal
- `message` — human-readable summary
- `service` — originating service name

**Recommended fields** (when available):
- `trace_id`, `span_id` — for correlation with distributed traces
- `request_id` — for correlating all logs within a single request
- `user_id` — for investigating user-reported issues
- `environment` — dev, staging, production
- `duration_ms` — for operations with measurable duration

**Contextual fields** (operation-specific):
- Add structured context relevant to the operation (order_id, endpoint, query)
- Use nested objects for complex context, not flat key collision

## Log Levels Guide

| Level | When to Use | Example | Alerting |
|-------|-------------|---------|----------|
| **fatal** | System cannot continue | Unrecoverable startup failure, data corruption detected | Page immediately |
| **error** | Operation failed, requires attention | Payment declined, database connection failed, unhandled exception | Alert / ticket |
| **warn** | Unexpected but recoverable | Retry succeeded, deprecated API called, approaching rate limit | Monitor trend |
| **info** | Normal operations worth noting | Request completed, user logged in, deployment started | None |
| **debug** | Diagnostic detail | SQL query executed, cache hit/miss, intermediate calculation | Never in prod |

**Rules:**
- Production should run at `info` level by default
- `debug` in production only temporarily, for active debugging (turn off after)
- Every `error` log should include enough context to investigate without reproduction
- Never log at `error` for expected conditions (user input validation failure = `warn`, not `error`)

## Correlation Patterns

### Request-scoped correlation
```javascript
// Middleware that creates a correlation context for every request
app.use((req, res, next) => {
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  const traceId = req.headers['traceparent']?.split('-')[1] || requestId;

  // Attach to request context
  req.context = { requestId, traceId };

  // Include in all logs for this request
  req.log = logger.child({
    request_id: requestId,
    trace_id: traceId,
    method: req.method,
    path: req.path,
  });

  next();
});
```

### Cross-service propagation
When calling another service, propagate the trace context:
```javascript
// Include trace headers when making downstream calls
const response = await fetch('https://payment-service/charge', {
  headers: {
    'traceparent': `00-${traceId}-${spanId}-01`,
    'x-request-id': requestId,
  },
  body: JSON.stringify(payload),
});
```

This allows tracing a single user request across all services it touches.

## Sensitive Data Handling

**Never log:**
- Passwords, tokens, API keys, secrets
- Full credit card numbers (log last 4 digits only)
- Social Security Numbers, government IDs
- Personal health information
- Full request/response bodies containing PII

**Redaction patterns:**
```javascript
function redactSensitive(obj) {
  const sensitiveKeys = ['password', 'token', 'secret', 'authorization', 'ssn', 'credit_card'];
  const redacted = { ...obj };
  for (const key of Object.keys(redacted)) {
    if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
      redacted[key] = '[REDACTED]';
    }
  }
  return redacted;
}
```

## Alerting Design Patterns

### Good alert anatomy
```yaml
alert: HighErrorRate
expr: |
  (sum(rate(http_requests_total{status=~"5.."}[5m]))
  / sum(rate(http_requests_total[5m]))) > 0.01
for: 5m    # Must persist for 5 minutes (avoid flapping)
labels:
  severity: page
annotations:
  summary: "Error rate above 1% for 5 minutes"
  description: "{{ $labels.service }} error rate is {{ $value | humanizePercentage }}"
  runbook: "https://runbooks.internal/high-error-rate"
  dashboard: "https://grafana.internal/d/service-overview"
```

### Alert quality checklist
- [ ] **Actionable**: Someone can do something about it right now
- [ ] **Urgent**: It needs attention now (if not, make it a ticket, not an alert)
- [ ] **Contextualized**: Includes which service, what metric, and links to dashboards/runbooks
- [ ] **Not noisy**: Fires less than once per week on average (more frequent = tune or suppress)
- [ ] **Tested**: Someone has verified it fires correctly and the runbook works
- [ ] **Has an owner**: Someone is responsible for responding

### Reducing alert fatigue
- Alert on symptoms (error rate, latency) not causes (CPU, memory)
- Use burn rate alerting instead of raw thresholds
- Aggregate related alerts (one "service degraded" instead of five "endpoint X failing")
- Auto-resolve alerts that recover within the evaluation window
- Review alerts monthly: if an alert never fires, remove it; if it always fires, fix or tune it

## OpenTelemetry Instrumentation Snippets

### Node.js auto-instrumentation
```javascript
// tracing.js — import before any other module
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({ url: 'http://otel-collector:4318/v1/traces' }),
  metricExporter: new OTLPMetricExporter({ url: 'http://otel-collector:4318/v1/metrics' }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
```

### Python auto-instrumentation
```python
# Run with: opentelemetry-instrument python app.py
# Or programmatically:
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

provider = TracerProvider()
processor = BatchSpanProcessor(OTLPSpanExporter(endpoint="http://otel-collector:4317"))
provider.add_span_processor(processor)
trace.set_tracer_provider(provider)

# Add custom spans
tracer = trace.get_tracer(__name__)

with tracer.start_as_current_span("process_order", attributes={"order.id": order_id}):
    validate_order(order)
    with tracer.start_as_current_span("charge_payment"):
        charge_result = process_payment(order)
```

### Custom metrics
```python
from opentelemetry import metrics

meter = metrics.get_meter(__name__)

# Counter — things that only go up
request_counter = meter.create_counter("http.requests.total", description="Total HTTP requests")
request_counter.add(1, {"method": "GET", "path": "/api/users", "status": 200})

# Histogram — distributions
latency_histogram = meter.create_histogram("http.request.duration", unit="ms")
latency_histogram.record(42.5, {"method": "GET", "path": "/api/users"})

# Gauge (via observable) — point-in-time values
def get_queue_depth(observer):
    observer.observe(get_current_queue_size(), {"queue": "orders"})

meter.create_observable_gauge("queue.depth", callbacks=[get_queue_depth])
```
