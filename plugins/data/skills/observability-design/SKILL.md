---
name: observability-design
description: "Design production observability — SLIs, SLOs, SLAs, error budgets, OpenTelemetry traces/metrics/logs, structured logging, alerting, dashboards. Triggers: SLO, SLI, SLA, error budget, observability, monitoring, OpenTelemetry, OTel, tracing, distributed tracing, structured logging, alerting, dashboard, metrics, correlation ID, alert fatigue."
model: sonnet
allowed-tools: Read, Grep, Glob, Write, Edit
---

# Observability Design

Design observability systems that answer "is the system healthy?" before users complain, and "why is it broken?" when they do. Good observability means you don't need to add more instrumentation to debug an issue — the signals are already there.

## The Three Pillars + Reliability Framework

Observability has three signal types (metrics, logs, traces) and one decision framework (SLIs/SLOs/error budgets). This skill covers all four.

```
SLIs/SLOs/Error Budgets → WHAT to measure and WHEN to act
Metrics                  → HOW MUCH is happening (counters, gauges, histograms)
Logs                     → WHAT happened in detail (events, errors, context)
Traces                   → WHERE time was spent across services (request flow)
```

## Workflow: SLI/SLO Design

### Step 1: Identify Critical User Journeys

Before defining metrics, identify the 3-5 user-facing interactions that matter most:

- What does a user do when the service is "working"? (Load a page, complete a checkout, send a message)
- What would a user notice if the service degraded? (Slow responses, errors, stale data)

SLIs must reflect user experience. Internal metrics (CPU usage, queue depth) are useful for debugging but should not be SLIs — users don't care about CPU.

### Step 2: Define SLIs

For each critical journey, define 1-2 SLIs. Express each SLI as a ratio:

```
SLI = (good events / total events) × 100%
```

Common SLI types:

| SLI Type | Formula | Good For |
|----------|---------|----------|
| **Availability** | Successful requests / Total requests | APIs, web apps |
| **Latency** | Requests < threshold / Total requests | User-facing endpoints |
| **Quality** | Correct responses / Total responses | Data pipelines, ML serving |
| **Freshness** | Data updated within threshold / Total checks | Caches, dashboards, feeds |

Measure SLIs at the point closest to the user — load balancer logs or client-side metrics, not server-side process metrics.

### Step 3: Set SLO Targets

An SLO is the target value for an SLI over a rolling time window:

```
"99.9% of requests will succeed within 300ms over a 30-day rolling window"
```

Setting the right target:

- **Don't base SLOs on current performance** — you'll lock yourself into an unsustainable target
- **Start with user expectations** — what would cause a user to complain or leave?
- **Leave room for innovation** — 99.99% uptime allows 4.3 minutes/month of downtime. 99.9% allows 43 minutes. That difference is engineering velocity.
- **Set SLOs tighter than SLAs** — your SLO should trigger action before you breach your SLA

See [references/slo-framework.md](references/slo-framework.md) for the nines table, error budget calculations, and SLO examples by service type.

### Step 4: Calculate Error Budget

```
Error Budget = 100% - SLO target
```

If your SLO is 99.9% availability over 30 days:
- Error budget = 0.1% = 43.2 minutes of downtime per month
- Each incident consumes a portion of this budget

Error budget policies define what happens when the budget runs low:

- **Budget > 50% remaining**: Ship features normally
- **Budget 25-50%**: Reduce deployment velocity, increase review rigor
- **Budget < 25%**: Freeze non-critical deploys, focus on reliability
- **Budget exhausted**: Full reliability focus until budget replenishes

### Step 5: Document and Communicate

Save the SLO document using the template at [templates/slo-document.md](templates/slo-document.md). Share with engineering, product, and on-call teams.

## Workflow: OpenTelemetry Instrumentation

### Step 1: Choose What to Instrument

Don't instrument everything — instrument what matters:

**Always instrument:**
- HTTP/gRPC request handling (latency, status codes, paths)
- Database queries (duration, query type, table)
- External API calls (duration, status, endpoint)
- Queue operations (publish, consume, processing time)
- Authentication events (success, failure, method)

**Instrument when needed:**
- Business-specific operations (checkout, search, upload)
- Cache operations (hit/miss ratio, latency)
- Background jobs (duration, success/failure)

### Step 2: Implement the Three Signals

**Metrics** (aggregated measurements over time):
- Use counters for events that only go up (requests, errors, bytes sent)
- Use histograms for distributions (latency, request size)
- Use gauges for point-in-time values (queue depth, active connections)
- Follow OpenTelemetry semantic conventions for naming

**Traces** (request flow across services):
- Auto-instrument HTTP frameworks, database clients, and message queues
- Add custom spans for business-critical operations
- Propagate trace context across service boundaries (W3C Trace Context)
- Add attributes (user ID, order ID, feature flag) to spans for filtering

**Logs** (detailed event records):
- Use structured JSON format, never unstructured text
- Include trace ID and span ID in every log for correlation
- Define consistent log levels (see [references/logging-patterns.md](references/logging-patterns.md))
- Redact sensitive data (passwords, tokens, PII) before logging

### Step 3: Set Up Alerting

Alerts should be actionable. Every alert should answer: "What happened? Is it urgent? What should I do?"

**Alert design rules:**
- Alert on SLO burn rate, not raw metric thresholds — this catches meaningful degradation while ignoring noise
- Every alert must link to a runbook
- Use severity levels: Page (wake someone up) vs Notify (review next business day)
- Set up multi-window burn rate alerts (fast burn = 1h window, slow burn = 6h window)
- Test alerts — an untested alert is an alert that won't fire when needed

See [references/logging-patterns.md](references/logging-patterns.md) for alerting patterns.

### Step 4: Design Dashboards

Dashboards should answer "is the system healthy?" in 5 seconds:

**Service overview dashboard:**
- SLO status and error budget remaining (the single most important panel)
- Request rate, error rate, and latency percentiles (P50, P95, P99)
- Active alerts

**Debug dashboard (per service):**
- Latency breakdown by dependency (database, cache, external APIs)
- Error rate by error type/code
- Resource utilization (CPU, memory, connections)
- Recent deployments overlaid on metrics

## Principles Applied

- **KISS**: Start with availability and latency SLIs. Add quality and freshness only when needed.
- **YAGNI**: Don't instrument everything on day one. Instrument the critical paths, add more when debugging reveals gaps.
- **DRY**: Use OpenTelemetry auto-instrumentation for common frameworks. Only add manual instrumentation for business-specific operations.
- **Functional Independence**: Each service owns its SLOs. Don't create SLOs that depend on another team's service — those become SLAs between teams.
