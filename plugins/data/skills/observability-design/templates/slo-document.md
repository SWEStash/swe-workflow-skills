# SLO Document Template

```markdown
# SLO: [Service Name]

**Owner**: [Team / individual]
**Last reviewed**: [YYYY-MM-DD]
**Review cadence**: Quarterly

## Service Description

[1-2 sentences: what this service does and who its users are.]

## Critical User Journeys

1. [Journey 1: e.g., "User loads the product catalog"]
2. [Journey 2: e.g., "User completes checkout"]
3. [Journey 3: e.g., "User searches for products"]

## SLIs and SLOs

### SLO 1: Availability

**SLI**: Proportion of HTTP requests that return a non-5xx status code
**Measurement**: Load balancer access logs
**Window**: 30-day rolling
**Target**: 99.9%

**Error Budget**: 0.1% = 43.2 minutes of downtime per month

### SLO 2: Latency

**SLI**: Proportion of HTTP requests completing within 300ms
**Measurement**: Application-side histogram (P99)
**Window**: 30-day rolling
**Target**: 99% of requests under 300ms

### SLO 3: [Additional SLO if needed]

**SLI**: [measurement]
**Measurement**: [data source]
**Window**: [time window]
**Target**: [target value]

## Error Budget Policy

| Budget Remaining | Action |
|-----------------|--------|
| > 50% | Normal development velocity |
| 25-50% | Prioritize reliability tech debt |
| 10-25% | Reduce deployment frequency |
| < 10% | Freeze non-critical features |
| Exhausted | Full reliability focus |

## Alerting

| Alert | Condition | Severity | Runbook |
|-------|-----------|----------|---------|
| Fast burn | 2% budget consumed in 1 hour | Page | [link] |
| Slow burn | 5% budget consumed in 6 hours | Page | [link] |
| Trend | 10% budget consumed in 3 days | Ticket | [link] |

## Dashboard

[Link to the service dashboard]

## Dependencies

| Dependency | Their SLO | Impact if degraded |
|------------|-----------|-------------------|
| [Database] | [target] | [what breaks] |
| [Auth service] | [target] | [what breaks] |
| [External API] | [target] | [what breaks] |

## Review History

| Date | Change | Rationale |
|------|--------|-----------|
| [YYYY-MM-DD] | Initial SLO | Based on historical performance |
```
