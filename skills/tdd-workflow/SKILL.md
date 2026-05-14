---
name: tdd-workflow
description: "Guide test-driven development with red-green-refactor. Triggers: use tdd, test first, write the tests, red green refactor, test-driven, what should I test, write tests before code, failing test, implement using TDD. For NEW code via test-first — use test-suite-design for adding tests to existing code."
model: sonnet
allowed-tools: Read, Grep, Glob, Write, Edit, Bash
---

# TDD Workflow

Guide implementation through the red-green-refactor cycle. TDD produces code that is testable by design, has a living specification, and tends toward simpler solutions because you only write what's needed to pass the next test.

## The Cycle

```
┌──────────────────────────────────┐
│           RED                     │
│  Write a failing test that        │
│  describes the next behavior      │
├──────────────────────────────────┤
│           GREEN                   │
│  Write the minimum code to        │
│  make the test pass               │
├──────────────────────────────────┤
│           REFACTOR                │
│  Improve the code while           │
│  keeping all tests green          │
└──────────────────────────────────┘
         ↑                    │
         └────────────────────┘
```

## Workflow

### Step 0: Plan the Test List

Before writing any test, create a list of behaviors to test. Derive this from acceptance criteria or the task description. Order from simplest to most complex:

1. **Happy path** — the simplest valid scenario
2. **Edge cases** — boundary values, empty inputs, single items
3. **Error cases** — invalid input, missing resources, permission failures
4. **Integration points** — interactions with other components

Present the test list to the user. This is the roadmap — each item becomes one red-green-refactor cycle.

### Step 1: RED — Write a Failing Test

Write exactly one test that describes the next behavior. The test should:

- Have a descriptive name that reads like a specification: `test_user_cannot_login_with_expired_password`
- Follow the Arrange-Act-Assert pattern (or Given-When-Then)
- Test behavior, not implementation (assert on outputs, not internal state)
- Fail for the right reason (missing function, wrong return value — not syntax error)

Run the test and confirm it fails. Show the failure output to the user. If the test passes immediately, either the behavior already exists or the test is wrong.

### Step 2: GREEN — Make It Pass

Write the **minimum code** to make the failing test pass. This is critical — resist the urge to write the "right" solution. Minimum means:

- Hard-code a return value if that's enough
- Use the simplest possible data structure
- Skip error handling if no test requires it yet
- Ignore performance, elegance, or future needs

Run all tests (not just the new one). Everything must be green.

### Step 3: REFACTOR — Improve Under Green

Now improve the code while all tests stay green. Look for:

- **Duplication** → Extract methods, constants, or shared setup
- **Naming** → Rename to reveal intent
- **Complexity** → Simplify conditionals, flatten nesting
- **Responsibility** → Extract classes/modules if a function does too much

Also refactor the tests:
- Remove duplication in test setup (use fixtures/helpers)
- Improve test names if the behavior is clearer now
- Ensure tests are independent (no shared mutable state)

Run all tests after each refactoring step. If anything breaks, undo the last change immediately.

### Step 4: Repeat

Pick the next item from the test list. Return to Step 1.

After completing all items, do a final review — see [references/test-quality.md](references/test-quality.md).

## Adapting TDD to Different Contexts

**Unit tests** (default): Test a single function or class in isolation. Mock external dependencies. Fast feedback loop (milliseconds).

**Integration tests**: Test how components work together. Use for database queries, API endpoints, message handling. Slower but catch wiring bugs.

**Outside-in TDD**: Start with an acceptance test (failing), then drive the implementation with unit tests. Useful when you know the desired API or user interaction.

**Inside-out TDD**: Start with the core domain logic, build outward. Useful when the domain is complex and the interface is flexible.

Suggest the appropriate approach based on the task. Default to unit tests unless the task is primarily about integration.

## What NOT to TDD

TDD is a design tool, not a coverage tool. Don't TDD:
- Trivial getters/setters
- Framework configuration
- Third-party library wrappers (test at integration level instead)
- UI layout (visual regression tools are better here)

## Principles Applied

- **YAGNI**: The test list prevents building more than needed. If there's no test for it, don't build it.
- **KISS**: Minimum code to pass forces simplicity.
- **Functional Independence**: Tests that mock dependencies encourage decoupled design.
- **DRY**: Refactoring phase explicitly targets duplication.
- **FIRST**: Tests should be Fast, Independent, Repeatable, Self-validating, and Timely — see [references/test-quality.md](references/test-quality.md) for the full checklist and test smell detection.
