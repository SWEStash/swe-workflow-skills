# Code Review Checklist

## Contents
- Design principles checklist
- Security checklist
- Testing checklist
- Common patterns to flag
- Language-specific patterns

## Design Principles Checklist

### DRY (Don't Repeat Yourself)
Flag when you see:
- Same logic in multiple places (even if slightly different — the variations often indicate a missing abstraction)
- Copy-pasted code blocks with minor modifications
- Same validation rules implemented in multiple layers without a shared source

Don't flag:
- Similar code that represents genuinely different concepts (false DRY is worse than repetition)
- Test code that repeats setup (test readability trumps DRY)

### KISS (Keep It Simple, Stupid)
Flag when you see:
- Abstraction without a second consumer (premature abstraction)
- Design patterns used where a simple function would suffice
- Complex type gymnastics when a straightforward type would work
- Nested ternaries or complex boolean expressions that need a comment to understand
- Over-engineered configuration when values could be constants

### YAGNI (You Aren't Gonna Need It)
Flag when you see:
- Unused parameters, methods, classes, or exports
- Configuration for hypothetical future features
- Abstraction layers "in case we swap implementations"
- Generic solutions for a problem that currently has one case
- Comments like "we might need this later"

### SRP (Single Responsibility Principle)
Flag when you see:
- Functions longer than ~30 lines (not a hard rule, but a signal)
- Functions that do AND/THEN logic: "validate AND save AND notify"
- Classes with methods that use disjoint subsets of the class's fields
- Files that are the go-to place for "anything related to X"
- Mix of business logic and I/O in the same function

### Naming Quality
Flag when you see:
- Names that require reading the implementation to understand (`data`, `info`, `temp`, `result`, `handle`)
- Disinformation: names that imply something incorrect (`accountList` when it's actually a map, `hp` that could mean hypotenuse or hit points)
- Single-letter variables outside of tiny lambda/loop scopes
- Abbreviations that aren't universally understood in the domain
- Class names that aren't nouns or noun phrases (`ProcessData`, `ManageStuff`)
- Method names that aren't verb phrases (`data()` instead of `fetchData()`, `valid()` instead of `isValid()`)
- Inconsistent vocabulary: `fetch` in one place, `get` in another, `retrieve` in a third for the same concept
- Names that differ only in capitalization or by a number suffix (`user1`, `user2`)

Don't flag:
- Short names in tiny scopes where context is obvious (`i` in a 3-line loop, `e` in a catch block)
- Domain abbreviations the team has agreed on (`DTO`, `API`, `URL`)

### Function Size and Structure
Flag when you see:
- Functions that do more than one thing — look for sections separated by blank lines or comments, each doing a different job
- Mixed levels of abstraction in one function: high-level orchestration mixed with low-level bit manipulation or string parsing
- More than 2-3 function arguments — flag especially if several are the same type (easy to mix up)
- Side effects hidden behind the function name: a function called `checkPermission` that also logs analytics and updates a timestamp
- **Command-Query Separation violations**: A method that both changes state AND returns a value. Methods should either be commands (do something, return void) or queries (return something, change nothing). Mixing them surprises callers and makes code harder to reason about.

### Functional Independence
Flag when you see:
- Modules reaching into other modules' internals
- Shared mutable state between components
- Functions that require knowledge of the caller's context
- Temporal coupling (function A must be called before function B with nothing enforcing this)

## Security Checklist

- [ ] User input is validated/sanitized before use
- [ ] SQL queries use parameterized statements (no string concatenation)
- [ ] Auth checks are present on protected endpoints
- [ ] Sensitive data is not logged or exposed in error messages
- [ ] No hardcoded secrets, API keys, or credentials
- [ ] File paths are validated (no path traversal)
- [ ] Rate limiting considered for public endpoints
- [ ] CORS configuration is explicit, not wildcard

## Testing Checklist

- [ ] New behavior has corresponding tests
- [ ] Tests cover the happy path
- [ ] Tests cover at least one error/edge case
- [ ] Tests are independent (no shared mutable state)
- [ ] Test names describe the behavior being tested
- [ ] No logic in tests (no if/else, no loops)
- [ ] No tests that merely re-verify third-party library behavior (e.g. asserting a compression lib's magic bytes or compression ratio, or that an ORM persists a row) — tests target our own logic and our boundary with the library, not what the vendor's own tests already cover
- [ ] Mocks/stubs are used appropriately (not over-mocked)
- [ ] Integration tests exist for cross-boundary interactions

## Common Patterns to Flag

**Boolean blindness**: A function taking multiple boolean parameters. Prefer named options or enum types.

**Stringly typed**: Using strings where enums, constants, or types would prevent errors at compile time.

**Train wreck**: Long method chains like `user.getProfile().getAddress().getCity().toLowerCase()`. Each dot is a coupling point.

**Primitive obsession**: Passing raw strings/numbers when a domain type (EmailAddress, Money, UserId) would add safety and clarity.

**Feature envy**: A method that uses more data from another class than from its own. The method probably belongs in the other class.

**Shotgun surgery**: One logical change requires modifications across many files. Indicates poor encapsulation.

**Data clumps**: The same group of variables appears together in multiple places (e.g., `x, y, z` or `street, city, zip`). Extract them into a class or struct.

**Middle man**: A class that delegates almost everything to another class without adding value. Inline the delegation.

**Inappropriate intimacy**: Two classes that access each other's private details excessively. Restructure to restore proper boundaries.

## Comments: Good vs Bad

**Good comments** (keep them):
- Intent explanation: *why* a non-obvious approach was chosen
- Consequence warnings: "changing this format breaks the mobile parser"
- TODO with ticket reference: `// TODO(PROJ-123): replace with batch API when available`
- Legal or licensing notices required by policy

**Bad comments** (flag them):
- Redundant comments that restate the code: `// increment counter` above `counter++`
- Commented-out code — it lives in version control, delete it
- Journal comments ("added on 2024-01-15 by Alice") — git log handles this
- Mandated javadoc/docstrings on every function regardless of complexity — these go stale and add noise
- Misleading comments that don't match what the code does

**Rule**: If code needs a comment to explain *what* it does, refactor the code so it doesn't need one. Comments should explain *why*, not *what*.

## Language-Specific Patterns

These are loaded contextually based on the codebase language. If reviewing:

- **JavaScript/TypeScript**: Watch for `any` types, missing null checks, callback hell, missing async error handling, loose equality (== vs ===)
- **Python**: Watch for mutable default arguments, bare except clauses, circular imports, missing type hints on public APIs
- **Go**: Watch for ignored errors, goroutine leaks, missing context propagation, sync issues
- **Rust**: Watch for unnecessary clones, unwrap in non-test code, missing error context
- **Java**: Watch for null returns without Optional, checked exception abuse, mutable shared state
