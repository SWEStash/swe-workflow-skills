---
name: verification-before-completion
description: "Evidence gate before claiming work is done, passing, fixed, or deployed. Use before saying 'done', 'it works', or 'tests pass', or before committing, pushing, or opening a PR. Triggers: is it done, did it work, tests pass, verify, ready to commit, before I push, confirm the fix. Run the proving command fresh and read its output first."
model: haiku
allowed-tools: Read, Grep, Glob, Bash
---

# Verification Before Completion

A discipline, not a phase: never assert that something works until you have run
the command that proves it and read the output — in this session, just now.
Claiming work is complete without verification is dishonesty, not efficiency.

## ⛔ The Iron Law

**No completion claim without fresh verification evidence.**

If you haven't run the proving command in this exchange, you cannot claim it
passes. "Should pass", "looks right", and "I changed it the way they asked"
are predictions, not evidence.

## The Gate Function

Before any completion claim, walk these five steps in order:

1. **IDENTIFY** — What single command (or observation) would prove this claim?
   ("The tests pass" → `pytest`. "The build works" → the build command. "The
   bug is fixed" → the failing repro now succeeds.)
2. **RUN** — Execute the full command, fresh and complete. Not a subset, not a
   remembered result from earlier, not CI from yesterday.
3. **READ** — Read the entire output. Check the exit code. Count the failures.
   Don't skim for green and stop.
4. **VERIFY** — Does the output actually confirm the claim? A passing exit code
   on the wrong command proves nothing.
5. **CLAIM** — Only now state the result, and state it precisely ("142 passed,
   0 failed" beats "tests pass").

Skipping any step turns a verification into a guess.

## What counts as a claim

Any of these is a completion claim and triggers the gate:
- "Done", "finished", "complete", "ready"
- "It works", "this fixes it", "the bug is gone"
- "Tests pass", "the build is green", "no errors"
- About to commit, push, open/merge a PR, or deploy
- Reporting that a sub-task or delegated agent succeeded

## What counts as evidence

- A command you ran **in this session**, with its output visible.
- The exit code (a command can print reassuring text and still exit non-zero).
- The relevant slice of output read in full (the failure count, not just the
  last line).

NOT evidence: a previous run, a CI result you didn't open, a teammate's report
you didn't confirm, or your own expectation of what the code does.

## Rationalizations to reject

| Excuse | Reality |
|--------|---------|
| "It's a trivial change, no need to run it" | Trivial changes break builds too. The command takes seconds. |
| "Tests passed before my change" | Your change is exactly what could have broken them. Re-run. |
| "CI will catch it" | CI catches it *after* you claimed done — and after you pushed. |
| "The subagent said it succeeded" | Reports aren't evidence. Verify the artifact yourself. |
| "I'm confident it works" | Confidence is a feeling; the exit code is a fact. |
| "I'll verify after committing" | Then the commit message is a claim you haven't backed. |

## Red flags — stop and verify first

- You're typing "done" / "fixed" / "works" without a command output above it.
- You feel satisfaction ("Great!", "Perfect!") before running anything.
- You're about to commit/push/PR and haven't run the test command this session.
- You're relying on a partial run or a stale result.

## Cross-Skill References

This skill is the shared "done" gate for every workflow that ends in a claim:

- `tdd-workflow` — the GREEN step is a verification: watch the test pass for real
- `bug-investigating` — confirm the reproducing test now passes before claiming the fix
- `deployment-checklist` — every checked box is an instance of this gate
- `code-reviewing` — verify the change before approving, not from the diff alone
- `cicd-pipeline` — the pipeline automates this gate; locally, run it yourself first
