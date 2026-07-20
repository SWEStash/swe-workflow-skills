# AI Slop Patterns — Shared Taxonomy

The pattern catalog for `code-slop-cleanup` (diff scope) and `technical-debt-review` (repo scope). Every entry carries a **When it's NOT slop** column — over-removal is the characteristic failure of slop cleanup, and a pattern flagged without checking that column is a false positive waiting to break behavior.

**The governing principle: slop is relative, not absolute.** Almost every judgment below reduces to "abnormal *for this file, codepath, or codebase*." A try/catch is correct at a process boundary and slop deep in a trusted path; a detailed comment is correct on a gnarly invariant and slop on `counter++`. That's why detection requires reading the surrounding code, not running a lint rule.

## High severity — remove first

| Pattern | Tells | When it's NOT slop |
|---------|-------|--------------------|
| **Debug leftovers** | `console.log`/`print` debugging, function entry/exit logging, dump-everything statements | Structured logging through the project's logger at intentional log points |
| **Silent-failure handlers** | Empty catch blocks; `catch (e) { console.log(e) }` and continue; fallback values that mask real errors (`?? defaultValue` hiding a failed fetch) | Deliberate, documented degradation (feature flag off, optional enhancement) where the fallback is a product decision |
| **Stray working files** | `PLAN.md`, `NOTES.md`, `SCRATCH.md`, `SUMMARY.md`, one-off test scripts, session artifacts committed to the tree | Files the project's conventions actually track (an ADR, a checked-in design doc in `docs/`) |

## Medium severity

| Pattern | Tells | When it's NOT slop |
|---------|-------|--------------------|
| **Defensive theater** | try/catch on trusted internal paths; triple null checks (`!== null && !== undefined && !== ''`); re-validation of input already validated upstream; guards for states nothing can produce | Process boundaries, external API calls, user input, deserialization — anywhere the input is genuinely untrusted or the failure genuinely reachable |
| **Generic TODOs** | `// TODO: handle errors`, `// TODO: improve this` — no context, no ticket, no owner | TODO with a ticket reference or a concrete, actionable description |
| **Unrequested backwards-compat shims** | `_legacy` wrappers, kept old code paths "just in case", re-exports nobody consumes, dual old/new implementations | A migration the plan actually calls for, with a removal date or ticket |
| **Duplication of existing helpers** | A new utility that re-implements something already in the codebase or stdlib; parallel functions differing by a constant | Genuinely different concepts that happen to look similar (false DRY is worse than repetition) |

## Low severity — cosmetic residue

| Pattern | Tells | When it's NOT slop |
|---------|-------|--------------------|
| **Comment slop** | Comments restating the code (`// increment counter`), section dividers, agent narration ("Here we now handle…"), docstrings repeating the signature, journal comments | Why-comments on non-obvious decisions; consequence warnings; docstrings on public API the project mandates |
| **Dead weight** | Unused imports/params/variables, `return undefined`, `=== true`, `Promise.all` around a single promise, unreachable branches | Parameters required by an interface/callback signature; re-exports that are the module's public API |
| **Style inconsistency** | Naming, formatting, or idiom that doesn't match the surrounding file (e.g. `fetchData` in a file that uses `getX` everywhere) | The file itself is inconsistent and the new code follows the project-level convention |

## Routed patterns — flag here, fix elsewhere

These are slop, but this catalog's consumers don't fix them in place:

| Pattern | Tells | Route to |
|---------|-------|----------|
| **Test-file slop** | Redundant/duplicate tests, trivial asserts (`expect(true)`), asserting on the mock, implementation-mirroring tests | `test-suite-design` (Pruning Test Slop) — deleting a test is never behavior-neutral for the safety net; it needs behavior-map judgment. **Never delete a test during diff cleanup.** |
| **Type slop** | `any`/`unknown` to silence the checker, casts papering over mismatches, single-implementer interfaces "for testing", overly broad types | `technical-debt-review` (type debt) — usually cross-file; fixing it changes signatures |
| **Config/scaffolding slop** | Config keys and feature flags nothing reads, orphan `.env` entries, checked-in generated files, half-finished TODO scaffolds | `technical-debt-review` (config/scaffolding debt) — proving "unread" needs repo-wide tracing |
| **Documentation drift** | README/docs describing endpoints, flags, or behavior that no longer exists | `technical-debt-review` (documentation drift) — needs docs-vs-code reconciliation, not deletion |
| **Structural slop** | Three different patterns for the same concern, business logic in controllers, circular imports | `refactoring` / `architecture-design` — structural change, not removal |
