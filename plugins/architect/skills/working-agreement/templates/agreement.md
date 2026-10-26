# Working Agreement Template

Save as `docs/how-we-work.md` (or wherever the project keeps process docs) and
link it from CLAUDE.md and the README. Delete sections that don't apply; one
page is enough for a small project.

```markdown
# How we work

[Who builds this, how (sessions with an AI assistant? a team with a cadence?),
and any constraint that shapes the process: volunteers, no deadlines, a thesis.]

If this document and practice disagree, fix this document first, in its own commit.

## Process

[The chosen shape — milestone plans / Kanban / Scrum / a research framework —
in two or three sentences, and why it fits.]

## Where things live

Each fact has one owner. Other places link to it instead of copying it.

| Information | Lives in | Changed when |
|---|---|---|
| What we build and why | [PRD path] | Product scope changes |
| How it's built; decisions | [RFC / ADR path] | A decision is made (a changed decision gets a new record) |
| Order of milestones | [roadmap path] | A milestone starts or closes |
| One milestone: scope, acceptance criteria, task index | [plan path pattern] | The plan is written; scope changes |
| One task: details, status, evidence | [tracker issue / plan status column] | Any time; it is the working copy |
| Results of a milestone | [report path pattern] | Once, when the milestone closes |
| Session context: what was tried, next step | [handoff location, never committed] | End of each session |

Rules:
- Status is written in one place only: [where].
- Handoffs are context, not status. Nobody needs a handoff to know what is done.
- Versioned documents only use terms defined in versioned documents.

## Tracker

[Only if an external tracker is used: project link, labels, milestones, how an
item references the plan, how the agent reaches it (MCP / CLI) and the fallback
when it can't. If the tracker will change later, the trigger for the switch.]

## Starting a session

1. [Where to find the current milestone and pick the next item, e.g. "open the
   milestone, take an item whose dependencies are closed".]
2. [What to read before starting: the item, the decisions it cites, the latest handoff.]

## During the work

- A decision → [where it is recorded].
- Drift from the plan → [where it is logged; when it triggers re-planning].
- New work found → see "New work".
- Work only a human can do → a runbook in [where]: what is needed, where the
  data is, what to run, what to look for, what to send back.

## Ending a session

1. [Update status where it lives, with the evidence that closes each item.]
2. [Update docs only when the session changed what they describe, in the same commit.]
3. [Write the handoff: context only.]

## New work

| Kind | Goes to |
|---|---|
| A new milestone | [plan first, then tracker] |
| A task added to a milestone | [plan's task index + a "changes during execution" note + tracker item] |
| A bug or follow-up | [tracker only / plan's follow-up list] |
| A question for a stakeholder | [where open questions live] |

## Definition of Done

A task is done when [the evidence: tests pass on the commit, the acceptance
criteria are checked, docs that describe it are updated]. "Implemented" or
"verification pending" is not done.

## Closing a milestone

1. Every item is closed or moved to the next milestone with a reason.
2. The report is written: results, evidence, changes, open items.
3. The docs are checked against what was built.
4. The plan's header reads Closed; the roadmap shows the next milestone.
5. This agreement is re-validated.
```
