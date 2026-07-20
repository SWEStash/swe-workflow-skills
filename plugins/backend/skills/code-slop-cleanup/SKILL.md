---
name: code-slop-cleanup
description: "Strip AI slop from a branch diff before PR — judge each hunk against the surrounding file's conventions, remove without changing behavior, re-run tests. Removal only: hunting bugs → code-reviewing; structural improvement → refactoring; repo-wide audit → technical-debt-review; pruning tests → test-suite-design."
when_to_use: "Triggers: deslop, AI slop, slop cleanup, tighten this diff, remove AI artifacts, clean the diff before PR, debug leftovers, stray PLAN.md, obvious comments, unnecessary try/catch, backwards-compat shim nobody asked for, diff hygiene."
allowed-tools: Read, Grep, Glob, Write, Edit, Bash
---

# Code Slop Cleanup

Strip the residue AI-assisted coding leaves in a branch — obvious comments, defensive theater, debug leftovers, stray files, hedging shims — so the diff that reaches review contains only the change itself. Runs after implementation, before `git-workflow`/`code-reviewing`. This pass **removes**; it never redesigns.

## ⛔ The Iron Law

**Remove only what you can prove is slop — never change behavior. If a removal could change behavior, keep the code and flag it instead.**

Slop cleanup that deletes a load-bearing check trades clutter for a bug — a strictly worse codebase. When in doubt, the code stays and the doubt goes in the report.

## Workflow

### Step 1: Scope the Diff

Branch state vs the default branch (live at skill load):

!`git diff main...HEAD --stat 2>/dev/null || git diff master...HEAD --stat 2>/dev/null || true`

Run the full `git diff <base>...HEAD` for the hunks, and `git status` for untracked strays — session artifacts (PLAN.md, scratch scripts) often aren't in the diff yet. Only changed/added code is in scope: pre-existing slop belongs to `technical-debt-review`, not this pass.

### Step 2: Judge Each Hunk Against Its Surroundings

Slop is relative — the same construct is correct in one place and slop in another. For each candidate, read the surrounding file and ask: is this **abnormal for this file's conventions and this codepath's trust level?** A try/catch at a process boundary is protection; the same try/catch deep in a validated internal path is theater. See [references/slop-patterns.md](references/slop-patterns.md) for the full catalog with per-pattern "when it's NOT slop" columns.

### Step 3: Classify by Severity

- **High**: debug leftovers, silent-failure handlers, stray working files
- **Medium**: defensive theater on trusted paths, generic TODOs, unrequested backwards-compat shims, duplication of existing helpers
- **Low**: comment slop, dead weight (unused imports, `=== true`, redundant returns), style inconsistent with the file

### Step 4: Strip — Deletions Only, Production Code Only

Apply removals highest severity first. Every edit must be a behavior-preserving deletion (or a trivial inlining a deletion forces). If removing something requires *rewriting* logic around it, that's refactoring — leave it and flag it.

**The two test rules:**
1. A test failing after a production-code removal is the oracle saying the removal changed behavior. **Revert the removal. Never edit the test.**
2. Slop *inside test files* (redundant tests, trivial asserts, mock-testing) is flagged and routed to `test-suite-design` — never deleted here. A test's value can't be judged from the diff alone.

### Step 5: Re-Run the Tests

Run the project's test suite fresh and read the output (`verification-before-completion`). Green is the proof the removals were behavior-preserving; a failure means Step 4's rule 1 applies to the offending removal.

### Step 6: Report the Tightened Diff

Show what was removed, grouped by category with counts, plus a **flagged-not-removed** list: anything kept under the Iron Law's doubt clause, test-file slop routed to `test-suite-design`, suspected bugs routed to `code-reviewing`/`bug-investigating`.

## Prevention: Reuse Before Write

The biggest slop category — duplication — is created at generation time and only caught at review time. Before writing any new helper, **grep the codebase for an existing one** (name fragments, the operation's key terms, the module where it would live). AI assistants generate what looks plausible instead of searching for what exists; searching first is the cheap counter.

## Boundaries — What This Skill Never Does

- **Never adds code** — no new abstractions, no "while I'm here" improvements.
- **Found a bug?** Flag it and route to `code-reviewing`/`bug-investigating`. Fixing bugs mid-cleanup makes both the cleanup and the fix unreviewable.
- **Structural cleanup** → `refactoring`. Most slop cleanup is a micro-refactor, and the two chain naturally: strip slop first, then refactor what remains — but extraction, moving, and re-abstraction are the refactoring skill's discipline (test-protected, one transformation at a time).
- **Whole-repo slop** → `technical-debt-review` with its slop debt categories.

## Rationalizations to Reject

| Excuse | Reality |
|--------|---------|
| "This check might catch something someday" | If nothing upstream can produce that state, it's theater — and it hides the real bugs by normalizing noise. |
| "The comments help junior developers" | Restating comments rot and mislead; code clarity helps juniors. Keep why-comments, cut what-comments. |
| "I'll just fix this bug while I'm here" | Cleanup and fixes in one pass make both unreviewable. Flag it, route it, finish the cleanup. |
| "Strip it all — defensive code is slop" | A boundary check is not slop. Over-removal breaks behavior, the one thing this pass must never do. |
| "This test is obviously redundant, I'll just delete it" | "Obviously" is a guess; proof requires the behavior map. Route to `test-suite-design`. |

## Red Flags — Stop and Revert

- You modified a conditional's logic instead of deleting something.
- A test failed and you're editing the test.
- You deleted a test.
- You removed validation at a public, API, or user-input boundary.
- You added anything.

## Cross-Skill References

- `refactoring` — structural improvement after the slop is gone; this skill deletes, that one reshapes
- `code-reviewing` — the review this pass prepares the diff for; bugs found here route there
- `test-suite-design` — pruning test-file slop with behavior-map proof
- `technical-debt-review` — repo-scoped slop audit (type/config/doc-drift debt)
- `git-workflow` — the pre-PR self-review this pass feeds into
- `verification-before-completion` — the fresh-test-run gate behind Step 5
