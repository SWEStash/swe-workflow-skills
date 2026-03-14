# Severity Levels and Escalation

## Severity Classification

### Sev1 / P0 — Critical

**Criteria (any one is sufficient):**
- Complete service outage (no users can use the product)
- Data loss or data corruption actively occurring
- Security breach (unauthorized data access, account compromise)
- Payment processing completely down
- SLA breach is imminent (within minutes)

**Response:**
- All available engineers engaged immediately
- Engineering leadership notified
- Customer-facing status page updated within 5 minutes
- Updates every 15 minutes until resolved
- Target resolution: under 1 hour

### Sev2 / P1 — Major

**Criteria (any one is sufficient):**
- Core feature unavailable for a significant percentage of users
- Severe performance degradation (>5x normal latency)
- Data pipeline stopped (data freshness SLA at risk)
- Monitoring/alerting is completely blind
- Workaround exists but is severely degraded

**Response:**
- On-call engineer + one additional engineer
- Engineering manager notified
- Status page updated within 15 minutes
- Updates every 30 minutes
- Target resolution: under 4 hours

### Sev3 / P2 — Minor

**Criteria:**
- Non-critical feature broken for some users
- Cosmetic or UX issue with workaround
- Performance degradation below 5x normal
- Internal tooling broken (no user impact)

**Response:**
- On-call engineer handles during business hours
- No immediate escalation required
- Fix within one business day
- No status page update required (unless customer-visible)

## The Escalation Decision

Escalate when:
- You've been investigating for 15 minutes without identifying the cause
- The blast radius is larger than initially assessed
- You need access you don't have (database, infrastructure, vendor support)
- A second set of eyes would meaningfully speed up resolution

Don't wait until you're sure escalation is needed. The cost of an unnecessary page is low; the cost of delayed escalation during a real incident is high.

## Roles During an Incident

**Incident Commander (IC)**
- Owns the response: assigns tasks, decides priorities, tracks timeline
- NOT necessarily the person doing the technical work
- Prevents simultaneous conflicting actions ("wait, I was also trying to restart that")
- Can be whoever got paged first if no formal IC is assigned

**Communications Lead**
- Handles all external updates (status page, stakeholder messages)
- Shields the technical responders from interruptions
- If team is small, IC and communications can be the same person for Sev2/Sev3

**Technical Responders**
- Focus on investigation and fix
- Report findings to IC
- Don't take unilateral actions — tell IC first
