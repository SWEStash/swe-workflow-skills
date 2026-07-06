---
name: technical-debt-review
description: "Strategic codebase health assessment — identify hotspots, categorize debt, produce remediation roadmap."
when_to_use: "Triggers: technical debt, tech debt, debt review, codebase health, hotspots, debt assessment, remediation plan, what should we fix first, debt roadmap, code rot, legacy code audit."
model: opus
context: fork
agent: general-purpose
allowed-tools: Read, Grep, Glob, Write, Edit
---

# Technical Debt Review

Produce a strategic picture of where the codebase is accumulating debt and what to do about it. The goal is a prioritized roadmap, not an exhaustive list of every imperfection.

## Step 1: Identify Hotspots

Don't try to review everything. Focus on where pain is concentrated.

**Code complexity signals:**
- Files or functions with high cyclomatic complexity (many branches, deep nesting)
- Functions over ~50 lines — usually doing too much (SRP violation)
- Classes over ~300 lines — usually a God class or multiple responsibilities
- High number of parameters (> 5 usually indicates missing abstraction)

**Change frequency signals (most valuable):**
- Files changed in almost every PR — high churn indicates poor separation of concerns or missing abstractions
- Files that always require changes together — tight coupling that should be decoupled
- Files with frequent bug fixes — instability indicates unclear ownership or poor test coverage

**Structural signals:**
- Circular dependencies between modules
- Modules that import from many other modules — likely a coordination layer doing too much
- Dead code (functions/classes with no callers)

**Test coverage signals:**
- Untested code paths in critical or high-churn files
- Tests that only test happy paths (no edge cases, no error cases)
- Test files significantly longer than the code they test (over-specified tests that break on refactoring)

If the request came with team pain points (where engineers slow down, code people avoid touching, where bugs keep appearing), weight those hotspots first. This skill runs in a forked context and cannot ask mid-run — when that input is missing, proceed on the code signals above and list "where does the team actually hurt?" under Open questions in the report.

## Step 2: Categorize by Debt Type and Severity

For each hotspot, classify the debt:

**Debt types:**
| Type | Description | Typical fix |
|------|-------------|-------------|
| **Complexity debt** | Functions/classes doing too much | Extract, decompose, simplify |
| **Duplication debt** | Same logic in multiple places | Extract shared abstraction |
| **Test debt** | Missing or low-quality tests | Add tests before refactoring anything else |
| **Documentation debt** | Undocumented non-obvious behavior | Add comments, docstrings, decision records |
| **Architecture debt** | Wrong abstraction at system level | Restructure, introduce proper boundaries |
| **Dependency debt** | Outdated, vulnerable, or abandoned libraries | Upgrade or replace |
| **Observability debt** | No logging, metrics, or traceability | Add instrumentation |

**Severity:**
- **Critical**: Causing active bugs or security risks. Address immediately.
- **High**: Slowing down every sprint. Blocking new features. Schedule for next quarter.
- **Medium**: Painful but workable. Schedule when capacity allows.
- **Low**: Noticeable but not impeding. Do it opportunistically when touching related code.

## Step 3: Estimate Effort and Risk

For each hotspot, estimate:

**Effort**: hours/days/weeks of engineering work to address
**Risk**: probability that addressing this introduces new bugs (higher for untested, complex code)
**Prerequisite**: does this require tests before it can be safely changed? (almost always yes for High/Critical)

High-risk + no tests = address the tests first, before the underlying debt.

## Step 4: Prioritize by Value-to-Cost Ratio

Score each item: `(Severity × Impact on team velocity) / (Effort × Risk)`

Prioritize in this order:
1. **Quick wins**: Low effort, meaningful impact (inconsistent naming conventions, easy extractions)
2. **High pain, medium effort**: The things that slow every sprint down — worth dedicated sprint time
3. **Strategic investments**: High effort but unlocks future capability — needs executive buy-in and planned downtime from feature work
4. **Low impact**: Log them, don't schedule them — address opportunistically

Avoid the "big rewrite" trap. Long rewrites stall feature work, introduce new bugs, and often fail to ship. Prefer incremental improvement over big-bang rewrites.

## Step 5: Produce the Remediation Roadmap

Output a prioritized action plan:

**Immediate (this sprint):**
- [Quick win 1]: estimated [X hours], owner [Name]
- [Critical fix 1]: estimated [Y days], owner [Name]

**Next quarter:**
- [High-priority debt 1]: estimated [X weeks], requires [tests/migration/team availability]
- [High-priority debt 2]: ...

**Backlog (do when touching related code):**
- [Medium items to address opportunistically]

**Accepted debt (won't address):**
- [Items acknowledged but explicitly not worth fixing] — revisit if severity changes

Use [templates/debt-audit.md](templates/debt-audit.md) for the full audit format.

**Write the full audit to a file** (default a gitignored location, e.g.
`.local/debt-review-<date>.md`) and state its path in your final summary — this
skill runs in a forked context: only the summary returns, everything unwritten is
lost. Judgment calls that need user input (e.g. which subsystem matters most,
unknown team pain points) go in an **Open questions** section of the report, never
guessed silently.

## Principles Applied

- **KISS**: Simplify complexity first — complex code is the root cause of most other debt
- **DRY**: Eliminate duplication — find the patterns, create the abstraction
- **SRP**: Split God classes and functions doing multiple jobs into focused units
- **Tests before refactoring**: Never refactor untested code without adding tests first — you won't know if the refactor is correct

## Cross-Skill References

- `refactoring` — use for the actual small-scale, test-protected code improvements identified in this review
- `architecture-design` — use when debt is architectural (wrong boundaries, wrong abstractions at system level)
- `performance-optimization` — use when debt is causing measurable performance problems, not just code cleanliness
