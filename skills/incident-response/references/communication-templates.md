# Incident Communication Templates

## Principles for Incident Communication

- **Frequency over perfection**: A brief update every 15 minutes beats a comprehensive update every hour
- **No technical jargon in external updates**: "Database connection issue" not "connection pool exhaustion due to missing index causing table locks"
- **Acknowledge what you don't know**: "We're still investigating the root cause" is honest and appropriate
- **Never promise a resolution time you're not confident in**: "We expect resolution by 3pm" that misses creates more frustration than "ETA unknown"

---

## Internal Status Update (Slack / incident channel)

Use during active incident, every 15-30 minutes:

```
[TIME] Incident Update

Status: [INVESTIGATING | MITIGATING | RECOVERING | RESOLVED]

Impact: [What is broken, who is affected, estimated scope]

What we know: [Findings so far]

What we've tried: [Actions taken and results]

Next action: [What is happening right now / next]

ETA: [Best estimate, or "unknown — update in 15 min"]

IC: [Name of incident commander]
```

---

## External Status Page Update

For customer-visible incidents. Use plain language.

**Initial post** (publish within 5-15 minutes of declaring incident):
```
[SERVICE NAME] - Investigating
We are investigating reports of [brief description of what users are experiencing].
We will provide an update in [15/30] minutes.
[TIME]
```

**Update post** (every 30 minutes until resolved):
```
[SERVICE NAME] - [Investigating / Identified / Monitoring]
We have [identified the cause of / are continuing to investigate] [brief description].
[One sentence on what you're doing about it.]
We will provide an update in [15/30] minutes.
[TIME]
```

**Resolution post**:
```
[SERVICE NAME] - Resolved
This incident has been resolved. [Brief description of what was fixed.]
If you continue to experience issues, please contact support at [email/URL].
We will publish a full post-mortem within [48-72] hours.
[TIME]
```

---

## Stakeholder Notification (executive / customer success)

For Sev1 or high-visibility Sev2. Send via email or direct message within 15 minutes:

```
Subject: [INCIDENT] [Brief description] - [STATUS]

[DATE TIME]

What happened: [1-2 sentences, no jargon]

Who is affected: [User scope]

Current status: [What you're doing right now]

Next update: [When they'll hear from you next]

Point of contact: [Your name / incident channel]
```

---

## Post-Incident Communication

After resolution, send a brief wrap-up to stakeholders:

```
Subject: [RESOLVED] [Brief description] - Post-incident summary

The [description] incident that began at [time] has been fully resolved as of [time].

Duration: [X hours Y minutes]
Users affected: [Scope]
Root cause (brief): [1-2 sentences]

We will publish a full post-mortem by [date]. If you have questions, [contact].
```

---

## Handoff Template

When handing off an incident between engineers (shift change, bringing someone new in):

```
INCIDENT HANDOFF — [TIME]

Incident: [Brief description]
Duration: Started at [time] ([X hours ago])
Current status: [MITIGATING / INVESTIGATING / etc.]

What we know:
- [Finding 1]
- [Finding 2]

What we've tried:
- [Action 1] → [Result]
- [Action 2] → [Result]

Current hypothesis: [Best guess at root cause]

Immediate next step: [What the new person should do first]

Pending questions: [What we still don't know]

Stakeholder updates: Last update sent at [time]. Next due at [time].
```
