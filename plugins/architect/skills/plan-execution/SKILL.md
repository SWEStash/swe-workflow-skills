---
name: plan-execution
description: "Execute an already-approved plan with discipline — batch tasks into verifiable checkpoints, verify each with fresh evidence before marking it done, log drift, and stop to re-plan when reality diverges from the plan's assumptions. Triggers: execute the plan, implement the approved plan, work through this plan, continue/resume the plan, next phase, checkpoint. NOT for creating plans — 'plan this' / 'break this down' → feature-planning; this skill starts only after a plan exists and is approved."
model: sonnet
allowed-tools: Read, Grep, Glob, Write, Edit, Bash
---

# Plan Execution

Execute an approved plan without silently drifting from it or claiming
unverified progress. A plan's value survives contact with reality only if
execution (a) proves each step actually worked and (b) notices when the plan's
assumptions stop holding. This skill starts where `feature-planning` ends: a
plan exists and is approved. If there is no plan yet, that's planning work —
route there first.

## ⛔ The Iron Law

**Never mark a checkpoint done without fresh verification evidence.**

A checkpoint marked done is a completion claim; `verification-before-completion`
governs each individual claim, and this skill applies that same gate at the plan
level — declared up front, per batch, with the evidence recorded. "The code is
written" is not "the checkpoint is done."

## Workflow

### Step 1: Load the Plan and Define Checkpoints

Read the *entire* plan before executing any of it — later phases change how you
do earlier ones. Group the tasks into **checkpoints**: coherent batches (typically
3–5 tasks or one milestone) that are independently verifiable. For each
checkpoint, write down **before starting it**:

- the tasks it covers,
- the **verification**: the concrete command or observation that will prove it
  works (tests pass, endpoint responds, migration applies cleanly, doc renders).

A checkpoint whose verification you can't name isn't a checkpoint — split or
rescope it until it has one.

### Step 2: Execute a Batch, Logging Drift As You Go

Work the checkpoint's tasks. Any deviation from the plan — a different approach,
an extra task, a skipped step, a surprise — goes into a **drift log** the moment
it happens, even when the deviation is an improvement. Undocumented "better
ideas" are how a plan dies without anyone deciding to kill it.

### Step 3: Verify the Checkpoint

Run the verification you declared in Step 1 — fresh, in full, reading the entire
output (see `verification-before-completion` for the gate function). Only then
mark the checkpoint done, recording the evidence next to it: the command and its
observed result. A failed verification means the checkpoint stays open — fix and
re-verify; two consecutive failed checkpoints are a re-planning trigger, not a
push-through-it signal.

### Step 4: Drift Check Before the Next Batch

At every checkpoint boundary, compare state against plan:

- **Scope drift** — doing work the plan doesn't contain
- **Assumption drift** — the plan assumed X; reality turned out to be Y
- **Estimate drift** — checkpoints taking a multiple of what was planned

Small drift: record it and continue. Structural drift: stop — Step 5.

### Step 5: Re-Plan When Triggered — Don't Improvise

Stop executing and go back to planning (with the user, via `feature-planning`)
when any of these fires:

- an assumption the plan rests on turns out to be false
- a task reveals the chosen approach won't work
- accumulated unplanned work is a large fraction of the remaining plan
- two consecutive checkpoints failed verification
- you catch yourself thinking "the plan didn't anticipate this, but I'll just…"

Re-planning openly is cheap; silently executing a plan that no longer matches
reality delivers the wrong thing with perfect discipline. Sunk progress is not a
reason to continue — the remaining work costs the same whether or not you admit
the plan changed.

### Step 6: Close Out

Finish with a final end-to-end verification (the whole, not just the last part),
reconcile plan vs as-built from the drift log, and report per checkpoint: done
**with its evidence**, or explicitly not done. No middle state.

## Rationalizations to Reject

| Excuse | Reality |
|--------|---------|
| "The change obviously works; running the check is overhead" | The check takes seconds; an unverified checkpoint poisons every checkpoint built on it. |
| "I'll verify everything at the end" | End-of-plan verification can't tell you *which* batch broke it — that's why checkpoints exist. |
| "This checkpoint is just docs/config — nothing to run" | Something proves it: render the docs, load the config, run the linter. |
| "The plan is outdated here; I'll adapt as I go" | That's drift. Log it; if it's structural, stop and re-plan — don't decide alone silently. |
| "We're 80% through; re-planning now wastes all that work" | Sunk cost. Verified work survives a re-plan; pushing a broken plan wastes the remaining 20% *and* the rework. |
| "Marking them done unblocks the team; we'll backfill verification" | A false "done" misinforms every decision downstream. Report the honest state instead. |

## Red Flags — Stop and Check

- Marking several checkpoints done in one sweep, none with evidence attached.
- You can't say what command verified the last checkpoint.
- "Should work" / "looks done" appearing in your status report.
- Mid-execution, you're building something the plan never mentioned.
- You've stopped consulting the plan and are working from memory.

## Cross-Skill References

- `feature-planning` — creates and (on re-plan) revises the plan this skill executes
- `verification-before-completion` — the per-claim evidence gate each checkpoint applies
- `tdd-workflow` — how the implementation tasks inside a batch get built
- `git-workflow` — commit at checkpoint boundaries; the evidence belongs in the message
- `code-reviewing` — review at checkpoint or close-out, before "done" is claimed
