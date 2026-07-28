---
name: verification-before-completion
description: "Evidence gate before claiming work is done, passing, fixed, or deployed. Use before saying 'done', 'it works', or 'tests pass', or before committing, pushing, or opening a PR. Triggers: is it done, did it work, tests pass, verify, ready to commit, before I push, confirm the fix. Run the proving command fresh and read its output first."
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

## The tests aren't the only gate

Tests prove behavior; they don't prove the change is clean. When the project
configures **static gates** — a type checker (`tsc --noEmit`, `mypy`), a linter
(`eslint`, `ruff`), a dead-code / unused-export check (`knip`, `vulture`) — those
are part of "done" too. A change is not complete until they run green *this
session*, on the same five-step gate (IDENTIFY → RUN → READ → VERIFY → CLAIM).

The failure mode this prevents is a **rotted gate**: a repo declares
`mypy strict = true` (or `eslint --max-warnings 0`) and it quietly sits on 40+
errors because no one runs it — so the gate that was supposed to stop `any`-casts,
stale `type: ignore`s, and dead exports stops nothing. A declared strict gate with
N errors is not "passing"; it is broken, and adding to it is adding slop the gate
was meant to catch. Run it, read the count, and either land it at zero or name the
pre-existing debt explicitly — never let "the tests pass" stand in for "the gates pass."

## The docs are part of the surface you changed

Tests prove behavior, the static gates prove the code is clean — neither notices
that the README still documents the flag you just renamed. A change carries a
**documented surface** when it adds, renames, or removes something a person types,
configures, or calls: a CLI flag, env var, config key, endpoint, command, script,
package or directory, install/setup step, or public exported symbol. A purely
internal refactor usually carries none — say so and move on. This gate is for
changes that made an existing document wrong.

Same five steps, with a grep as the proving command:

1. **Derive** the identifiers your diff touched — the old names as well as the new
   ones. The old name is what the docs still contain.
2. **Grep** the doc set for them: README, `docs/`, and inline docs.
3. **Read** the hits, in place. A hit is not automatically drift; the surrounding
   sentence decides.
4. **Reconcile or report.** Fix what your change made wrong, or state plainly which
   docs are stale and why you're leaving them.

Two things make this gate miss:

- **Prose survives; inventories rot.** People reread the paragraph they're editing
  and never reread the table three sections down. Endpoint tables, architecture
  diagrams, project-layout blocks, ADR indexes, and command lists go stale first
  and silently — check those before the prose.
- **An empty grep is not evidence of no drift.** Docs use shorthand, globs, and
  brace expansion (`/api/{users,orders}`), so a literal grep for `orders` can miss
  a line that documents it. When the doc plausibly covers the area, open the
  section and read it rather than trusting a clean grep.

Scope this to **reconciliation, not authoring**: it touches documents that already
reference what you changed. It never means writing new docs nobody asked for —
that produces the doc-slop `project-documentation` exists to prevent.

## What you write into a doc is also a claim

A document is a set of assertions about the code, and the Iron Law does not stop
at prose. Every factual sentence you add must come from something you read **this
session**, not from what you remember the code doing. Sweeps introduce errors as
readily as they remove them, and a confidently-worded wrong sentence outlives the
stale one it replaced.

- **Enumerate from the source of truth.** Endpoints come from the router file,
  scripts from listing the directory, packages from the manifest, flags from the
  arg parser. Do not reconstruct a list from memory and then spot-check it.
- **Re-read your own doc diff before committing**, against the code — the same
  scrutiny you would give a code hunk. This is where a wrong claim gets caught.
- **Verify links resolve.** A doc edit that moves or adds a relative link is a
  change whose proving command is a link check.

## Rationalizations to reject

| Excuse | Reality |
|--------|---------|
| "It's a trivial change, no need to run it" | Trivial changes break builds too. The command takes seconds. |
| "Tests passed before my change" | Your change is exactly what could have broken them. Re-run. |
| "CI will catch it" | CI catches it *after* you claimed done — and after you pushed. |
| "The subagent said it succeeded" | Reports aren't evidence. Verify the artifact yourself. |
| "I'm confident it works" | Confidence is a feeling; the exit code is a fact. |
| "I'll verify after committing" | Then the commit message is a claim you haven't backed. |
| "Lint and types are separate from tests" | If the repo configures them, "green" means all of them — a strict gate on N errors is a broken gate, not an optional one. |
| "Docs can go in a follow-up PR" | The follow-up is where doc debt goes to die, and meanwhile the README documents a flag that no longer exists. The reconciliation is a grep, not a project. |
| "The user didn't ask me to touch the docs" | They asked for a working change. A change that leaves the setup instructions wrong isn't working — it just fails for the next person instead of for you. |
| "Nobody reads the README anyway" | The people who read it are exactly the ones who can't ask you. And a *wrong* doc is worse than a missing one: it's followed, then it fails. |
| "I know what that endpoint does, I don't need to open the file" | That's recall, and recall is what puts false sentences into docs. Read it, then write it. |

## Red flags — stop and verify first

- You're typing "done" / "fixed" / "works" without a command output above it.
- You feel satisfaction ("Great!", "Perfect!") before running anything.
- You're about to commit/push/PR and haven't run the test command this session.
- You ran the tests but not the configured type checker / linter the repo defines.
- You're relying on a partial run or a stale result.
- You renamed or removed something a user types or configures, and haven't grepped
  the docs for the old name.
- You're writing a sentence about how the code behaves into a doc, and you haven't
  opened that code this session.

## Cross-Skill References

This skill is the shared "done" gate for every workflow that ends in a claim:

- `tdd-workflow` — the GREEN step is a verification: watch the test pass for real
- `bug-investigating` — confirm the reproducing test now passes before claiming the fix
- `deployment-checklist` — every checked box is an instance of this gate
- `code-reviewing` — verify the change before approving, not from the diff alone
- `cicd-pipeline` — the pipeline automates this gate; locally, run it yourself first
- `project-documentation` — the sync sweep and the accuracy method, when the grep
  turns up docs that need reconciling
