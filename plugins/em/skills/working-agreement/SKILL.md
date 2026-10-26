---
name: working-agreement
description: "Define and validate how a multi-session project is run — where plans, status and decisions live, session routines, new work, milestone close. README/CONTRIBUTING → project-documentation."
when_to_use: "Triggers: where is progress tracked, how do we track this, is this milestone done, how is this project run, document our process, working agreement, definition of done, plans and status out of sync."
---

# Working Agreement

A working agreement says how a project runs, so that humans and agents read
and write the same places: where the plan lives, where status lives, what a
session does when it starts and ends, how new work gets in, how a milestone
closes. This skill does not choose the process for the user. It makes sure one
is chosen, written down where every later session finds it, and **checked by
someone who did not write it**.

Without one, each session improvises: progress lands in a handoff nobody
commits, a report doubles as a tracker once, and work starts on a milestone
that has no plan. Nobody decides to drift; there was nothing to drift from.

## ⛔ The Iron Law

**An agreement is not in force until a fresh reader can answer every core
scenario from the documents alone.**

The author cannot test it: the author fills every gap from memory without
noticing. The content of the agreement is the user's choice; the validation is
not optional.

## Workflow

### Step 1: Find the Agreement, Then Pick the Mode

Look for an agreement on record: a pointer in CLAUDE.md, the README or
CONTRIBUTING; a `docs/how-we-work.md` or similar; tracker conventions.

- **Found** → read it and follow it. Re-validate (Step 5) only when a trigger
  fires: a milestone closes, the process changed, or someone asked a question
  the agreement should have answered.
- **Not found, small work** (one session, one person, nothing to hand over) →
  skip this skill; say so in one line.
- **Not found, large work** (spans sessions or milestones, or several people or
  agents) → pick the mode:
  - **Define (greenfield)** — nothing practiced yet. Go to Step 2.
  - **Discover (brownfield)** — practice exists: plans, reports, issues, git
    log, handoffs. First write the **as-is** from that evidence: where each kind
    of fact lives today, and where it cannot be found. Name each gap concretely
    ("the plan has no per-task status; the report was written once at close;
    progress lives in gitignored handoffs"). That list is what Step 3 fixes.
    Answer the user's immediate question (is M0 done?) from the same evidence,
    or say exactly what would have to be checked.

**Exit condition** — one line, then keep going in the same response:
*"No agreement on record; `<define | discover>`: `<one-line state of practice>`."*

**This step is not a gate on delivering.** When you can't read the repo, state
what you assume exists and continue. Carry the options, the draft agreement and
the validation in the same response; questions go next to the draft, not in
place of it.

### Step 2: Offer Options and Recommend One

Two decisions, each offered as options with a recommendation fitted to the
project — see [references/options.md](references/options.md):

1. **Process shape** — milestone plans, Kanban, Scrum, or for research work a
   methodology framework (hand that section to `research-methodology`).
2. **Where status lives** — an external tracker (GitHub/GitLab issues, Jira,
   Linear) when one exists or can be connected; a status column in each plan
   when there is no tool; or no tracking for short single-person work. A planned
   switch ("markdown until the GitLab remote exists") is a valid choice: record
   the trigger for the switch.

Don't make the draft wait on the answer: draft under the recommendation and say
*"Drafted under `<choice>` — pick another and I'll revise."*

### Step 3: Write the Agreement

Use [templates/agreement.md](templates/agreement.md). Every agreement covers:

- **Where things live** — one owner per kind of fact (scope, plan, task status,
  decisions, results, session context), with when each changes. Other places
  link to the owner; they never copy it.
- **Starting a session** — where to read what to do next, and in what order.
- **During the work** — where decisions, drift and new findings go.
- **Ending a session** — where progress and evidence are recorded, what a
  handoff may and may not contain.
- **New work** — how a new milestone, an added task, a bug and an open question
  each enter.
- **Definition of Done** — what evidence closes a task.
- **Closing a milestone** — what is checked, what is written, what moves on.
- **Asking a human** — requests for human work come as runbooks: what is needed,
  where the data is, what to run, what to look for, what to send back.

Rules that keep it honest:

- **Status lives in one place.** A plan or report that also carries status is a
  second copy, and the second copy goes stale.
- **Handoffs are context, not status.** Nobody should need a handoff to know
  what is done.
- **Versioned documents only use terms a reader can resolve** — no labels from a
  gitignored plan or a chat.
- **Right-size it.** One page for a two-person project is enough.

### Step 4: Prove the Tracker Connection

If status lives in an external tool, prove the agent can **read and write** it
before the agreement depends on it: list the open items, and create, update or
comment on one. A tool that is configured but not loaded in this session is not
connected. If it can't be proven now, the agreement names the fallback (a CLI,
or the human updates the tracker from a list the agent writes) and the fallback
is what's in force.

### Step 5: Validate With a Fresh Reader

Walk the scenario bank in [references/validation.md](references/validation.md)
against the written agreement, **in the same response as the draft**. Don't
promise the check for after the user answers your questions: the gaps it finds
are part of what they are answering.

- **Preferred:** a subagent that sees only the repo's documents, not this
  conversation, answers each scenario twice: as a new agent session and as a new
  human contributor. Each answer must cite one file and section.
- **Fallback** (no subagent available, or no repo yet): walk the scenarios
  yourself, in the reply, and label it a self-check — weaker, because you wrote
  it.
- Add the coverage check for the chosen process shape and, when the project
  already has docs, the conformance check: do they follow the agreement's own
  rules (same reference)?

Score each scenario: **answered in one place**, **ambiguous** (two places, or
two readings), or **missing**. Every ambiguous or missing scenario becomes a
question for the user or a fix to the draft. Repeat until the core scenarios
are all answered in one place.

**Exit condition:** *"Validated: `<n>/<n>` core scenarios answered from the
documents. Open: `<questions>`."*

### Step 6: Wire It In and Keep It Alive

- Put a pointer in CLAUDE.md (agents read it every session) and the README
  (humans): *"`docs/how-we-work.md` is the process; follow it."* Both the
  agreement and the pointer must be **tracked** files: if CLAUDE.md is
  gitignored, a collaborator's assistant never sees it — point from the README or
  a committed AGENTS.md, and keep only personal state in untracked files.
- **If the agreement and practice disagree, fix the agreement first**, in its
  own commit, then act.
- Re-validate at milestone close, after a retrospective changes the process,
  during `project-review`, and whenever a question the agreement should answer
  had to be asked.

## Rationalizations to Reject

| Excuse | Reality |
|--------|---------|
| "It looks complete; we'll fix gaps as we hit them" | A gap is hit by the person who needed the answer, at that moment, after the drift has started. Five scenarios take minutes now. |
| "I wrote it, I can tell it's clear" | The author fills gaps from memory. That is why the reader must be fresh. |
| "The plan already has a Status field" | A plan's lifecycle (Draft, Active, Closed) is not task status. Where does task 14's status live, and who updates it? |
| "The handoff says what was done" | Handoffs are uncommitted and per-session. Status nobody else can see isn't status. |
| "We use GitLab, so tracking is covered" | Choosing a tool isn't an agreement. Which facts live there, which in docs, who updates what, when? |
| "The MCP server is configured" | Configured isn't connected. Prove one read and one write in this session. |
| "This is project management overhead for a small project" | Then the agreement is one page. Skipping it is how a small project loses track of what's done. |

## Red Flags — Stop and Check

- A session starts work and can't name which plan item it advances.
- The same task's status appears in two documents.
- "Is X done?" can only be answered by reading git log or a handoff.
- Work began on a milestone that has no plan.
- The agreement names a tool that no session has written to.

## Cross-Skill References

- `plan-execution` — follows the agreement: reads it at Step 1, records status
  where it says, closes out by its rules. When a plan spans sessions and no
  agreement exists, it comes here first.
- `feature-planning` and `prd-writing` — hand off here when the first plan or
  PRD that spans sessions is written.
- `research-methodology` — writes the agreement's Methodology section for
  research and data-science projects.
- `project-documentation` — writes the README and CONTRIBUTING text that link to
  the agreement, and includes the agreement in its sync sweep. The agreement's
  content and validation stay here.
- `retrospective` — process changes agreed in a retro come back here as edits to
  the agreement, followed by re-validation.
- `project-review` — re-validates the agreement as part of an execution review.
