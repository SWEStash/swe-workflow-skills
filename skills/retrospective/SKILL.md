---
name: retrospective
description: "Facilitate sprint retros, project post-mortems, and incident post-mortems with actionable, owned improvements. Triggers: retrospective, retro, post-mortem, postmortem, lessons learned, what went wrong, what went well, incident review, blameless, action items, sprint review, after action review."
allowed-tools: Read, Grep, Glob, Write, Edit
---

# Retrospective

Facilitate structured reflection that produces concrete improvements. The goal is not to assign blame — it's to make the next iteration better than the last.

## Three Formats

### Sprint Retrospective
**When**: End of every sprint
**Duration**: 30-60 minutes
**Scope**: What happened this sprint
**Output**: 2-3 action items with owners for next sprint

### Project Post-Mortem
**When**: After a significant project or milestone completes
**Duration**: 60-90 minutes
**Scope**: The entire project from planning through delivery
**Output**: Written document with learnings and recommendations

### Incident Post-Mortem
**When**: After any production incident that impacted users
**Duration**: 60 minutes
**Scope**: The incident timeline, response, and systemic causes
**Output**: Blameless post-mortem document with prevention actions

## Workflow: Sprint Retrospective

### Step 1: Gather Data

Collect information about the sprint before the meeting:
- Sprint velocity vs commitment
- Items completed vs carried over
- Incidents or bugs discovered
- Team sentiment (optional pulse survey)

### Step 2: Facilitate Discussion

Use one of these formats:

**Start/Stop/Continue:**
- **Start doing**: What should we begin doing that we aren't?
- **Stop doing**: What's wasting time or causing problems?
- **Continue doing**: What's working well?

**Went Well / Didn't Go Well / Action Items:**
- What went well this sprint? (Celebrate wins)
- What didn't go well? (Identify problems without blame)
- What specific actions will we take to improve?

**4Ls (Liked, Learned, Lacked, Longed for):**
- What did we like about this sprint?
- What did we learn?
- What was lacking?
- What did we long for (wish we had)?

### Step 3: Prioritize Action Items

Don't try to fix everything. Pick the top 2-3 improvements:
- Each action item gets an owner (one person, not "the team")
- Each action item gets a deadline (usually "by end of next sprint")
- Each action item is specific enough to verify completion

### Step 4: Record and Follow Up

Save the retro notes. At the start of next sprint's retro, review the previous action items: were they completed?

## Workflow: Project Post-Mortem

### Step 1: Prepare the Review

Before the meeting, gather:
- Original project proposal, PRD, and estimates
- Actual timeline and effort vs estimated
- Key decisions made during the project and their outcomes
- Metrics: did the project hit its success criteria?

### Step 2: Walk Through Key Questions

1. **Did we solve the right problem?** Was the original problem statement accurate?
2. **Did we estimate well?** Where were estimates off and why?
3. **What decisions would we make differently?** (Technical, scope, team)
4. **What processes helped?** (What to keep)
5. **What processes hindered?** (What to change)
6. **What surprised us?** (Unknowns that became knowns too late)

### Step 3: Produce the Document

Use the template at [templates/post-mortem.md](templates/post-mortem.md). Share with the team and stakeholders.

## Workflow: Incident Post-Mortem

### Blameless Culture

The most important principle: **incidents are caused by systems, not people.** If a human made an error, the question is "why did the system allow that error to cause an outage?" not "who messed up?"

### Step 1: Build the Timeline

Reconstruct a minute-by-minute timeline:
- When did the incident start?
- When was it detected? (By monitoring or by users?)
- When was the team alerted?
- What actions were taken and when?
- When was the incident resolved?
- When was the root cause confirmed?

### Step 2: Identify Root Causes

Use the "5 Whys" technique to dig past symptoms:

```
Why did users see errors? → The API returned 500s.
Why did the API return 500s? → Database connections were exhausted.
Why were connections exhausted? → A query was holding connections open.
Why was a query holding connections? → A missing index caused full table scans.
Why was the index missing? → No index review process exists for migrations.
→ Root cause: No systematic review of database performance for new migrations.
```

### Step 3: Define Prevention Actions

For each root cause, define an action that prevents recurrence:

| Action | Type | Owner | Deadline |
|--------|------|-------|----------|
| Add EXPLAIN ANALYZE check to migration CI | Prevention | [Name] | [Date] |
| Add connection pool monitoring alert | Detection | [Name] | [Date] |
| Document index guidelines for team | Process | [Name] | [Date] |

**Action types:**
- **Prevention**: Makes the incident impossible to recur
- **Detection**: Makes the incident detectable before user impact
- **Mitigation**: Reduces the blast radius if it happens again
- **Process**: Changes how the team works to reduce risk

### Step 4: Produce the Post-Mortem

Use the template at [templates/post-mortem.md](templates/post-mortem.md). Publish internally — transparency builds trust and helps other teams learn.

## Principles Applied

- **Blameless over blame**: Focus on systems, not individuals. "The deploy script didn't validate X" not "Dave forgot to check X."
- **Action over discussion**: Every retro must produce specific, owned action items. A retro without action items is just venting.
- **KISS**: 2-3 action items per retro, not 15. Fewer items done beats many items forgotten.
- **Continuous improvement**: Small improvements every sprint compound. A 5% improvement per sprint is 3x better in a year.

## Cross-Skill References

- `incident-response` — triggers a post-mortem; use this skill for the post-mortem workflow
- `technical-debt-review` — if retrospectives repeatedly surface the same maintenance pain, escalate to a full debt review

See [references/facilitation-guide.md](references/facilitation-guide.md) for retro formats, handling difficult conversations, and action item quality criteria.
