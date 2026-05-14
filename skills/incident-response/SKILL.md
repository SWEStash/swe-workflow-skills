---
name: incident-response
description: "Structured production incident workflow — triage, mitigation, investigation, recovery, comms. Triggers: production is down, site is down, incident, outage, users seeing errors, on-call, alert fired, p0, p1, sev1, sev2, broken in prod, rollback, emergency deploy. For active incidents under time pressure."
model: opus
allowed-tools: Read, Grep, Glob, Write, Edit, Bash
---

# Incident Response

Resolve production incidents quickly and safely. Under pressure, the instinct to jump to fixes causes more harm than good — this workflow keeps the response structured without slowing it down.

## Step 1: Triage — Scope and Severity

Spend 2-3 minutes here, not more.

**Determine blast radius:**
- What is broken? (Specific feature, entire service, dependent services)
- Who is affected? (All users, subset, specific accounts, internal only)
- Is data being lost or corrupted? (If yes: severity immediately escalates)
- Is the issue getting worse over time or stable?

**Classify severity:**
- **Sev1/P0**: Complete service outage, data loss, security breach. All hands.
- **Sev2/P1**: Major feature down, significant user impact, degraded performance at scale.
- **Sev3/P2**: Minor feature broken, small user subset affected, workaround exists.

If you can't classify yet, treat it as Sev2 until proven otherwise.

**Notify the right people now.** Don't wait until you understand the problem. People need lead time to join.

See [references/severity-levels.md](references/severity-levels.md) for team-specific escalation paths.

## Step 2: Mitigate First — Fix Later

The goal is to stop the bleeding, not to understand it. Mitigation and root cause analysis are separate phases.

**Fastest mitigation options (try in order):**
1. **Feature flag off**: If the broken code is behind a flag, disable it immediately
2. **Rollback**: If a recent deploy caused this, revert to the previous version
3. **Traffic shed**: Disable the specific endpoint or functionality that's failing
4. **Circuit breaker / cache**: Serve stale data while the live system is broken
5. **Scale up**: If it's a load issue, add capacity before investigating

Apply the first option that will work. Do not spend 20 minutes finding the perfect mitigation — apply the blunt one now, refine later.

Document each action with a timestamp as you go. This builds the post-mortem timeline automatically.

See [references/communication-templates.md](references/communication-templates.md) for status page and stakeholder update templates.

## Step 3: Communicate

A brief status update every 15-30 minutes prevents stakeholders from escalating or interrupting responders. Use the template in [references/communication-templates.md](references/communication-templates.md):

```
[TIME] Status: [Investigating / Mitigating / Recovering]
Impact: [What is broken, who is affected]
Last action: [What was just done]
Next action: [What's happening next]
ETA: [Best estimate or "unknown"]
```

Assign one person as the incident commander (coordinates response) and one as the communications lead (external updates). The same person should not do both under pressure.

## Step 4: Investigate — Rapid Root Cause

Once mitigation is in place and user impact is reduced, find the root cause.

Apply the binary search from `bug-investigating` at high speed:
1. **When did it start?** Check deployment logs, config changes, dependency changes in the window before the incident.
2. **What changed?** Compare current state to last-known-good state.
3. **Reproduce in isolation?** Can you trigger the error on a single request/record?
4. **Trace the error path**: Follow the error from symptom back to cause using logs, traces, and metrics.

Time-box investigation phases: 15 minutes to identify the probable cause. If not found, escalate or bring in more people.

## Step 5: Recover and Verify

**Deploy the fix:**
- For rollbacks: verify the previous version is clean, deploy, monitor for 10 minutes
- For forward fixes: code review is still required (even during incidents, a second set of eyes prevents making things worse)
- For config changes: change one variable at a time

**Verify recovery:**
- Error rate returns to baseline
- Latency returns to normal
- Affected functionality works end-to-end
- No secondary issues (cascading failures, queue backlogs)

**Declare the incident resolved** with a timestamp. Send a final status update.

**Schedule the post-mortem** within 48-72 hours while memory is fresh. Use the `retrospective` skill (incident post-mortem format).

## Principles Applied

- **KISS**: Apply the simplest mitigation first. A blunt rollback that works beats an elegant fix that takes an hour.
- **Blameless culture**: Incidents are caused by systems, not people. Focus on what the system allowed, not who triggered it.
- **Communication over silence**: Even "we don't know yet" is better than silence. Stakeholders will escalate if they don't hear anything.
- **Separate mitigation from investigation**: Stopping user impact and understanding root cause are different work. Don't conflate them.

## Cross-Skill References

- `rollback-strategy` — design safe rollback plans before incidents happen
- `bug-investigating` — use for offline root cause analysis after mitigation
- `retrospective` — use the incident post-mortem format after the incident resolves
- `deployment-checklist` — gate future deploys to prevent recurrence
