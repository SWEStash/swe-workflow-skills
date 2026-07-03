# SLO Framework Reference

## Contents
- Nines table
- Error budget calculations
- SLO examples by service type
- Burn rate alerting
- Error budget policies

## Nines Table

| Availability | Annual Downtime | Monthly Downtime | Common Name |
|-------------|-----------------|------------------|-------------|
| 99% | 3.65 days | 7.3 hours | Two nines |
| 99.5% | 1.83 days | 3.65 hours | |
| 99.9% | 8.77 hours | 43.2 minutes | Three nines |
| 99.95% | 4.38 hours | 21.6 minutes | Three and a half nines |
| 99.99% | 52.6 minutes | 4.32 minutes | Four nines |
| 99.999% | 5.26 minutes | 26 seconds | Five nines |

Each additional nine costs roughly 10x more to achieve. Going from 99.9% to 99.99% doesn't sound like much, but it means moving from 43 minutes of monthly downtime to 4 minutes — that requires redundancy, failover, and operational maturity most teams don't have.

## Error Budget Calculations

```
Error Budget (%) = 100% - SLO (%)
Error Budget (time) = Error Budget (%) × Time Window

Example:
  SLO: 99.9% over 30 days
  Error budget: 0.1% × 30 days = 0.001 × 43,200 minutes = 43.2 minutes

  If an outage lasts 15 minutes:
  Budget consumed: 15 / 43.2 = 34.7%
  Budget remaining: 65.3%
```

For request-based SLOs:
```
Error Budget (requests) = Total requests × (1 - SLO)

Example:
  SLO: 99.9% success rate
  Monthly requests: 10,000,000
  Error budget: 10,000,000 × 0.001 = 10,000 failed requests allowed
```

## SLO Examples by Service Type

### Web API
```
SLI: Availability = Requests with status < 500 / Total requests
SLO: 99.9% over 30 days

SLI: Latency = Requests completing in < 300ms / Total requests
SLO: 99% over 30 days (at P99)
```

### Data Pipeline
```
SLI: Freshness = Pipeline runs completing within 2 hours of schedule / Total scheduled runs
SLO: 99.5% over 30 days

SLI: Quality = Records passing validation / Total records processed
SLO: 99.9% over 30 days
```

### User-Facing Web Application
```
SLI: Availability = Successful page loads / Total page load attempts
SLO: 99.95% over 30 days

SLI: Latency = Page loads completing in < 2s / Total page loads
SLO: 95% over 30 days
```

### Background Job / Queue Consumer
```
SLI: Processing success = Jobs completing successfully / Total jobs started
SLO: 99.9% over 30 days

SLI: Processing latency = Jobs completing within SLA / Total jobs
SLO: 99% within 5 minutes of enqueue
```

## Burn Rate Alerting

Raw threshold alerts ("error rate > 1%") are noisy. Burn rate alerts ask: "At the current error rate, how fast are we consuming our error budget?"

```
Burn rate = (Current error rate / Allowed error rate)

If burn rate = 1: you'll exactly exhaust budget by end of window
If burn rate = 10: you'll exhaust budget in 1/10th of the window
If burn rate = 0.5: you're consuming half the allowed rate (healthy)
```

### Multi-window alerting (Google SRE recommendation)

| Alert Level | Long Window | Short Window | Burn Rate | Budget Consumed |
|-------------|-------------|--------------|-----------|-----------------|
| Page (urgent) | 1 hour | 5 minutes | 14.4x | 2% in 1 hour |
| Page (fast) | 6 hours | 30 minutes | 6x | 5% in 6 hours |
| Ticket (slow) | 3 days | 6 hours | 1x | 10% in 3 days |

The short window confirms the problem is still happening (not a spike that already resolved). The long window establishes the trend.

## Error Budget Policies

Document these policies and get sign-off from engineering and product leadership:

```markdown
## Error Budget Policy for [Service Name]

### When budget > 50% remaining
- Normal development velocity
- Deploy at normal cadence
- Standard review process

### When budget 25-50% remaining
- Review recent incidents for patterns
- Prioritize reliability-related tech debt
- Increase test coverage for affected paths

### When budget 10-25% remaining
- Reduce deployment frequency
- Require additional review for risky changes
- Begin reliability sprint planning

### When budget < 10% remaining
- Freeze all non-critical feature deployments
- Dedicate engineering capacity to reliability
- Conduct architecture review for systemic issues

### When budget is exhausted
- Full feature freeze until budget recovers
- Post-incident review required for every incident
- Escalate to leadership for resource allocation
```

## Common Mistakes in SLO Design

**Setting SLOs too high**: 99.99% sounds great but allows only 4 minutes of downtime per month. If your team can't respond to an incident in 4 minutes, this SLO is aspirational, not achievable.

**Using internal metrics as SLIs**: CPU utilization, memory usage, and queue depth are operational signals, not user experience signals. Users don't care about your CPU — they care about latency and errors.

**No error budget policy**: SLOs without consequences are decorative. Define what happens when the budget runs low.

**Too many SLOs**: 3-5 SLOs per service is sufficient. More than that dilutes focus and creates contradictory pressures.

**SLO = SLA**: Your SLO should be tighter than your SLA. The SLO is your internal early warning. If you only react at SLA boundaries, you're already failing customers.
