# Options: process shape and where status lives

Offer two or three options with a recommendation fitted to the project. None of
these is the right answer in general; each has a situation it fits.

## Process shape

| Shape | Fits when | What the agreement must then define |
|---|---|---|
| **Milestone plans** | Small team or volunteers, AI-assisted sessions, no fixed cadence; work comes in large known chunks (a PRD split into milestones) | Plan lifecycle (Draft → Active → Closed), task index per plan, how a task is picked, milestone close-out and report |
| **Kanban** | Continuous flow of mixed-size work, no natural batches, interruptions are normal (maintenance, support, ops) | Board columns and what moves a card, WIP limit, pull rule, explicit policy per column, how a card is closed |
| **Scrum** | A team of about 3+ with a regular cadence and a stakeholder who reviews increments | Sprint length, backlog owner, sprint goal, Definition of Done, review and retro, who plays product owner |
| **Research framework** (CRISP-DM, TDSP, own) | The work answers questions with data or models; the plan changes with what is found | Hand the Methodology section to `research-methodology`; the rest of the agreement (where things live, sessions, status) still applies |

Combinations are normal: milestone plans with a Kanban board inside each
milestone; a research framework with milestone plans per phase. Name the
combination; don't leave it implied.

## Where task status lives

| Option | Fits when | Rules it brings |
|---|---|---|
| **External tracker** (GitHub/GitLab issues and milestones, Jira, Linear, Asana, Trello) | One exists, or the repo has a remote that offers one; several people; stakeholders who don't read the repo | Status lives only there. Plans keep scope and a task index that links each task to its item. Say which copy owns a task's details once it becomes an item (usually the item). Prove the agent can read and write it (SKILL.md Step 4) |
| **Status column in each plan** (markdown in the repo) | No tool, no remote yet, or the team prefers everything in git; cheap to share between agents and humans | One status column (and an evidence column) in the plan's task table, updated at each checkpoint in the same commit as the work. Reports record results at close and carry no live status |
| **One status file** (`docs/plans/status.md`) | Several plans run at once and a single board is easier to scan | Plans stay static; the status file is the only place status changes. Say what happens to it when a tracker arrives |
| **None** | One person, short-lived work, nothing to hand over | Say so in the agreement, so a later session doesn't invent a tracker |

**A planned switch is a valid option** ("status column now, GitLab issues once the
remote exists"). Record the trigger and what migrates, so the switch doesn't leave
two live copies.

## Recommending

Fit the recommendation to the facts given: team size, cadence, whether a remote
or tracker exists, who needs to read status without opening the repo. Say why in
one sentence. When the user names a tool they already use, that is the
recommendation unless something rules it out.
