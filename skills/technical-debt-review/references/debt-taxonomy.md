# Technical Debt Taxonomy

## Types of Technical Debt

### Deliberate vs. Inadvertent Debt

**Deliberate debt** is incurred consciously: "We know this is not the right approach, but we're taking a shortcut to hit the deadline and will fix it later." This is often acceptable when the trade-off is explicit and the payback is scheduled.

**Inadvertent debt** accumulates without anyone deciding to incur it: the codebase gradually becomes harder to understand and change, and no single moment caused it. This is the most common form and the hardest to address because there's no "wrong decision" to point to.

---

## Debt Patterns by Category

### Complexity Debt

**Symptoms:**
- Functions > 50 lines
- Cyclomatic complexity > 10 (more than 10 independent paths through the function)
- Nested conditionals 3+ levels deep
- Boolean parameters (signals the function does two things)
- Long parameter lists (> 4-5 parameters)
- Comments that explain *what* code does instead of *why* (code should be self-explanatory)

**Why it accumulates:** Features get added to existing functions because it's faster than designing a new abstraction. Over time, every function does a little more.

**Remediation:** Extract method, extract class, replace conditional with polymorphism, introduce parameter objects. Use the `refactoring` skill.

---

### Duplication Debt

**Symptoms:**
- Near-identical blocks of code in different files
- Copy-pasted logic with slight variations
- The same concept (e.g., "active user") defined differently in multiple places
- Changes must be applied in 3+ places to take effect

**Why it accumulates:** It's faster to copy than to find the existing function and understand it. "I'll come back and consolidate this" never happens.

**Remediation:** Extract shared function/class/module. Be careful: not all duplication is bad. Three similar-looking but conceptually distinct things that happen to share implementation details should not be merged — DRY applies to concepts, not to textual similarity.

---

### Test Debt

**Symptoms:**
- Low test coverage in high-churn files
- Tests only cover the happy path
- Tests that pass even when you break the code (false confidence)
- Integration tests that are slow and flaky (never run locally)
- No tests at all for error paths, edge cases, or boundary conditions

**Why it accumulates:** Tests are skipped under deadline pressure. "We'll add tests later" is a very reliable source of future debt.

**Impact:** Untested code cannot be safely refactored. Test debt blocks all other debt reduction — you must address test debt first.

**Remediation:** Add characterization tests (tests that document existing behavior) before any refactoring. Use the `tdd-workflow` and `test-suite-design` skills.

---

### Architecture Debt

**Symptoms:**
- Circular dependencies between modules
- Business logic in presentation layer (or database layer)
- A single class/module that everyone imports
- Inability to test a module without standing up the entire application
- Features that "should be simple" require changes in 5+ files

**Why it accumulates:** Architectural decisions made for an earlier, smaller system don't scale as the system grows. Short-term pragmatic choices ("just put it in the utils file") create long-term coupling.

**Remediation:** This is the highest-effort, highest-risk debt to address. Requires architecture-design level thinking, not just refactoring. Consider the strangler fig pattern: build the new architecture alongside the old, migrate incrementally, delete the old.

---

### Dependency Debt

**Symptoms:**
- Libraries multiple major versions behind current
- Libraries with known CVEs that haven't been patched
- Libraries that are unmaintained or deprecated
- Libraries with no clear reason for inclusion (what does it do?)
- Multiple libraries doing the same thing

**Why it accumulates:** Dependency updates feel risky and don't provide user-visible value, so they're deprioritized.

**Impact:** Outdated dependencies are a security risk and make future updates harder (upgrading 5 major versions at once is much harder than upgrading 1).

**Remediation:** Use the `dependency-management` skill. Update regularly — one major version at a time is much safer than multi-version jumps.

---

### Observability Debt

**Symptoms:**
- Production errors discovered by users, not monitoring
- "We can't tell what's wrong" during incidents
- No structured logging — logs are free-text strings
- No way to trace a user request across services
- Metrics exist but no one looks at them

**Why it accumulates:** Observability isn't visible to users and doesn't affect development-time behavior. It gets skipped until the first production incident makes it painful.

**Remediation:** Use the `observability-design` skill. Add structured logging first (highest immediate value), then metrics, then distributed tracing.

---

## The "Rewrite vs. Refactor" Decision

When debt is severe, teams consider a full rewrite. Rewrites are almost always the wrong choice:

**Against rewrites:**
- The old system embodies years of learned behavior (edge cases, business rules) that are not documented
- Rewrites stall feature development for 6-18 months
- The rewrite accumulates the same debt as the original over time, just starting from a cleaner baseline
- "We'll do it right this time" rarely survives the same time and resource pressures that created the original mess

**When rewrite may be justified:**
- Technology platform is no longer supported (language or framework end-of-life)
- The domain model is fundamentally wrong and cannot be corrected incrementally
- The team is genuinely unable to make progress on the existing codebase (not just unwilling)

**The alternative:** Strangler fig pattern — build the new system incrementally alongside the old, migrate feature by feature, delete the old pieces as they're replaced. Delivers value continuously, reduces risk, and produces a better result.
