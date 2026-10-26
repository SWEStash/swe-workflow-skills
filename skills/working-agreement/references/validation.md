# Validating a working agreement

The check: can someone who did not write the agreement do the project's normal
work using only the documents? Run it in the same response as the draft. Don't
wait for the user's answers to the open questions first; the gaps it finds are
part of what the user is answering.

## Core scenarios

Each must be answerable from the documents, in **one** place.

| # | Scenario | What a full answer names |
|---|---|---|
| 1 | A new session starts. What do I work on next? | Where to find the current milestone or board, how to pick an item, what to read before starting |
| 2 | I finished a task. How do I mark it done? | Where status lives, what evidence closes it (Definition of Done), who updates it |
| 3 | The session ends with work half done. What do I record, and where? | Status update location, what goes in a handoff and what doesn't |
| 4 | I found work the plan doesn't contain. | Where a new task, a bug, a follow-up and a question each go |
| 5 | A decision changes (a library, a scope cut, a method). | Where decisions are recorded, how the plan and docs follow |
| 6 | A task needs something only a human can do. | How the request is written (runbook: what, where, run what, look for what, return what) and where it waits, visible to everyone (not in a private handoff) |
| 7 | Is milestone X done? | Where to look, and what "done" means for a milestone |
| 8 | The milestone closes. | The close-out steps, what is written, what moves on |
| 9 | A new human contributor joins. | The entry point (README → agreement), what to read in what order |
| 10 | Two documents disagree. | Which one owns that fact; the rule that the agreement is fixed first |

Add project-specific scenarios when the project has them, e.g. "can I quote this
number in the thesis?" (research) or "a stakeholder asks for a status report".

## Scoring

- **Answered** — one document and section gives the answer.
- **Ambiguous** — two places answer it, or the text allows two readings.
- **Missing** — no document answers it.

Every ambiguous or missing scenario becomes either a fix to the draft or a
question for the user, written next to the draft.

## Conformance check (brownfield, and every re-validation)

The scenarios test what the agreement says; this tests whether the project does
it. Both real-project pilots that shaped this skill found the docs breaking the
agreement's own rules. Check:

- **Status in only one place** — reports, plans, roadmaps or findings tables that
  still carry live status the agreement assigns elsewhere.
- **One definition each** — Definition of Done, status values, lifecycle values:
  an older copy left in another doc, or a value in use that the agreement never
  defines.
- **Entry points are tracked** — the reading order an agent or human is told to
  follow must not live in a gitignored file.
- **Names match the rules** — file and ID patterns the agreement prescribes
  versus what exists.

Each violation is fixed in the docs or written into the agreement as an
explicit exception.

## Coverage check by process shape

Light, not a ceremony audit: does the agreement say how each of these works here?

- **Milestone plans:** plan lifecycle, task index, how a task is picked, changes
  during execution, milestone report, close-out.
- **Kanban:** columns and what moves a card, WIP limit, pull rule, policy per
  column, blocked items.
- **Scrum:** backlog and its owner, sprint length and goal, Definition of Done,
  review, retro, product owner.
- **Research framework:** phases and their exit criteria, where method decisions
  and claims live (from `research-methodology`).

## Fresh-reader brief (for a subagent)

> You are joining this project for the first time. Read only the files in this
> repository; you have no other context. For each scenario below, answer as (a) a
> new AI-assistant session and (b) a new human contributor. For each answer, cite
> the file and section it comes from. If no document answers it, say MISSING. If
> two places answer it differently, or the text could be read two ways, say
> AMBIGUOUS and quote both. Do not guess and do not fill gaps from general
> practice.
>
> Scenarios: [paste the core scenarios plus project-specific ones]

Give the subagent the repository, not this conversation. When no subagent is
available, run the same brief yourself, label the result "self-check by the
author", and treat any answer you could only give from memory as MISSING.
