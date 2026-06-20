# Metric Catalog

## Contents
- Product metrics
- Engineering metrics
- Reliability metrics
- Business metrics
- Anti-metrics (what NOT to measure)

## Product Metrics

| Metric | Formula | Good For |
|--------|---------|----------|
| Daily Active Users (DAU) | Unique users performing a core action / day | Growth tracking |
| Feature Adoption Rate | Users who used feature / Total active users | Feature success |
| Task Completion Rate | Successful completions / Attempts | UX quality |
| Time to Value | Time from signup to first meaningful action | Onboarding quality |
| Retention (Day N) | Users active on day N / Users who signed up N days ago | Product-market fit |
| NPS | % Promoters - % Detractors | Customer satisfaction |
| Churn Rate | Users lost / Total users (per period) | Retention health |

## Engineering Metrics

### DORA Metrics (team effectiveness)
| Metric | How to Measure | Target |
|--------|---------------|--------|
| Deployment Frequency | Count deploys per week/day | Multiple per day (elite) |
| Lead Time for Changes | Median time from commit to production | < 1 day |
| Change Failure Rate | Deploys causing incidents / Total deploys | < 5% |
| Mean Time to Recover | Median incident duration (detection → resolution) | < 1 hour |

### Development Health
| Metric | How to Measure | Warning Signal |
|--------|---------------|----------------|
| Cycle Time | Median time from "in progress" to "done" | Increasing over time |
| PR Review Time | Median time from PR open to first review | > 24 hours |
| PR Size | Median lines changed per PR | > 400 lines regularly |
| Build Time | CI pipeline duration | > 15 minutes |
| Test Coverage | Lines covered / Total lines (of new code) | Declining trend |
| Flaky Test Rate | Tests with inconsistent results / Total tests | > 2% |
| Dependency Freshness | Packages more than 1 major version behind | Increasing count |

## Reliability Metrics

| Metric | Formula | Typical SLO |
|--------|---------|------------|
| Availability | Successful requests / Total requests | 99.9% - 99.99% |
| Latency (P50) | Median response time | < 200ms |
| Latency (P99) | 99th percentile response time | < 1s |
| Error Rate | 5xx responses / Total responses | < 0.1% |
| Saturation | Resource utilization (CPU, memory, connections) | < 80% |
| Error Budget Remaining | Budget consumed / Total budget | > 50% is healthy |

## Business Metrics

| Metric | Formula | Good For |
|--------|---------|----------|
| Revenue per Feature | Revenue attributable to a feature / Cost to build | ROI of features |
| Cost per Transaction | Infrastructure cost / Number of transactions | Efficiency |
| Support Ticket Volume | Tickets per feature area per week | Quality signal |
| Time to Market | Idea to production for a typical feature | Organizational speed |

## Anti-Metrics (What NOT to Measure)

**Lines of Code**: More lines ≠ more value. Incentivizes bloat over simplicity.

**Number of Commits**: More commits ≠ more productivity. Incentivizes tiny meaningless commits.

**Story Points Completed (as individual performance)**: Points measure task size, not person performance. Using them for individual evaluation destroys team dynamics.

**100% Test Coverage**: Incentivizes writing shallow tests to hit the number rather than meaningful tests for real behavior.

**Bug Count (as a quality metric)**: More bugs found can mean better testing, not worse code. Punishing bug count discourages reporting.

**Hours Worked**: Measures input, not output. Incentivizes presence over results.

## Choosing the Right Metrics

Ask three questions for every metric:

1. **Does it drive a decision?** If the metric changes, would you do something differently? If not, stop tracking it.

2. **Can it be gamed?** If someone optimizes purely for this metric, would the overall system get worse? If yes, add a counterbalancing metric.

3. **Is it a leading or lagging indicator?** Leading indicators (cycle time, build time) let you act before problems grow. Lagging indicators (revenue, churn) tell you what already happened.

For every primary metric, consider a counterbalance:
- Deployment frequency ↔ Change failure rate (deploy fast BUT safely)
- Feature velocity ↔ Support ticket volume (ship features BUT quality ones)
- Cost reduction ↔ Performance metrics (reduce spend BUT maintain SLOs)
