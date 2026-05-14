---
name: test-suite-design
description: "Design comprehensive test suites for existing code — strategy across unit/integration/e2e, fixtures, factories, helpers. Triggers: add tests, write tests for, increase coverage, test this module, testing strategy, test plan, what tests do I need, test infrastructure, test helpers, this has no tests. Not for TDD — use tdd-workflow."
model: sonnet
allowed-tools: Read, Grep, Glob, Write, Edit, Bash
---

# Test Suite Design

Design and implement test suites for existing code. This is different from TDD: TDD drives *new* implementation through tests. This skill adds *meaningful test coverage* to code that already exists, designs test architecture, and builds test infrastructure.

## When to Use This vs TDD

| Situation | Use This Skill | Use tdd-workflow |
|-----------|---------------|-----------------|
| Existing module with no tests | ✓ | |
| Building a new feature from scratch | | ✓ |
| Planning overall test strategy for a project | ✓ | |
| Increasing coverage on legacy code | ✓ | |
| Fixing a bug (write regression test + fix) | | ✓ |
| Designing test fixtures and factories | ✓ | |

## Workflow

### Step 1: Assess the Current State

Before writing any tests, understand what you're working with:

- **What code needs testing?** A single function, a module, or a whole layer?
- **What does the code do?** Read it and identify the behaviors (inputs → outputs, side effects, state changes)
- **What's the risk profile?** Business-critical logic, data transformations, auth/security, and integrations deserve tests first. Glue code and configuration deserve tests last.
- **What test infrastructure exists?** Test runner, assertion library, mocking framework, fixtures, CI pipeline?
- **What's the dependency situation?** Does the code have hard dependencies that make it difficult to test in isolation?

If there's no test infrastructure at all, start with Step 2. Otherwise, skip to Step 3.

### Step 2: Set Up Test Infrastructure

Establish the foundation before writing individual tests:

1. **Test runner and framework** — Choose based on the stack (Jest/Vitest for JS/TS, pytest for Python, Go's built-in testing, JUnit for Java)
2. **Directory structure** — Co-located (`foo.test.ts` next to `foo.ts`) or separate (`tests/` directory). Recommend co-located for unit tests, separate directory for integration/e2e.
3. **Shared helpers** — Create a `tests/helpers/` or `tests/fixtures/` directory for reusable setup
4. **CI integration** — Tests should run on every PR at minimum

See [references/test-infrastructure.md](references/test-infrastructure.md) for framework-specific setup patterns.

### Step 3: Map Behaviors to Test

For each piece of code to test, create a behavior map — not a line-by-line mirror of the implementation, but a list of *what the code is supposed to do*:

**For a function/method:**
- What does it return for valid inputs? (happy path)
- What happens with boundary values? (empty, zero, max, null)
- What happens with invalid inputs? (wrong type, missing required fields)
- What side effects does it produce? (database writes, API calls, events emitted)
- What errors can it throw/return? Under what conditions?

**For a class/module:**
- What are the key public methods and their contracts?
- What state transitions are possible?
- What invariants should always hold?
- How do methods interact (does calling A affect the result of B)?

**For an API endpoint:**
- What responses for valid requests? (status codes, response shape)
- What responses for invalid requests? (validation errors, 400/401/403/404)
- What auth/permission checks exist?
- What database state changes occur?

Present the behavior map to the user and refine before writing tests.

### Step 4: Choose the Testing Layer

Apply the testing pyramid — see [references/testing-pyramid.md](references/testing-pyramid.md):

- **Unit tests** (70%): Pure functions, business logic, transformations, validators. Fast, isolated, many of them.
- **Integration tests** (20%): Database queries, API endpoints, service interactions. Slower, need setup/teardown, fewer of them.
- **E2E tests** (10%): Critical user journeys only. Slowest, most brittle, fewest of them.

For each behavior from Step 3, assign it to the appropriate layer. Default to the lowest (fastest) layer that can meaningfully test the behavior.

### Step 5: Handle Untestable Code

Existing code is often hard to test because of tight coupling. Common patterns and solutions:

**Hard-coded dependencies** → Inject dependencies through constructor or function parameters. Refactor minimally to enable testing — just enough to inject a mock, not a full redesign.

**Global state** → Isolate in a module you can mock. Or reset state in beforeEach/setUp.

**Side effects mixed with logic** → Extract the pure logic into a separate testable function. Test the logic directly, test the side effects at the integration level.

**External API calls** → Wrap in a client class/module. Mock the wrapper in unit tests. Test the wrapper itself in integration tests.

If refactoring is needed to make code testable, keep changes minimal. The goal is test coverage now, not architectural perfection. Suggest the `refactoring` skill for deeper structural improvement later.

### Step 6: Write the Tests

Write tests grouped by behavior, not by function. Use descriptive `describe`/`context` blocks:

```
describe('OrderService')
  describe('calculateTotal')
    it('sums item prices for a standard order')
    it('applies percentage discount when coupon is valid')
    it('returns zero for an empty cart')
    it('throws when item has negative price')
  describe('placeOrder')
    it('creates order record in database')
    it('sends confirmation email')
    it('rejects when inventory is insufficient')
```

For each test, follow Arrange-Act-Assert. Keep tests focused — one behavior per test.

### Step 7: Evaluate Coverage Quality

After writing the suite, assess quality (not just line coverage percentage):

- [ ] Are the critical paths tested? (payments, auth, data mutations)
- [ ] Are error paths tested? (not just happy paths)
- [ ] Do tests document behavior? (can you understand the module by reading only the tests?)
- [ ] Are tests independent? (can run in any order)
- [ ] Are tests deterministic? (no flakiness from timing, randomness, or external state)
- [ ] Is the test-to-implementation coupling low? (can you refactor internals without breaking tests?)

Coverage percentage is a floor, not a ceiling. 80% meaningful coverage beats 100% shallow coverage.

## Principles Applied

- **DRY in tests**: Share setup through fixtures/factories, but keep each test readable on its own. A little repetition in tests is better than obscure shared state.
- **KISS**: Test behavior, not implementation. Don't mirror the code structure 1:1 in tests.
- **YAGNI**: Don't test trivial code (getters, delegating wrappers). Focus coverage where bugs hide.
- **Functional Independence**: Each test should set up its own state and clean up after itself.
