---
name: refactoring
description: Systematic code improvement guided by design principles, code smells detection, and safe transformation patterns. Use when the user wants to improve existing code without changing behavior — cleaning up tech debt, reducing complexity, improving naming, extracting abstractions, or simplifying logic. Triggers on phrases like "refactor this", "clean this up", "simplify this code", "reduce complexity", "extract this", "this code is messy", "tech debt", "improve this code", or when a code review identifies refactoring opportunities.
---

# Refactoring

Guide safe, incremental code improvements that preserve behavior while enhancing design. Refactoring is disciplined — every change is small, tested, and reversible.

## Core Rule

**Never change behavior and structure in the same step.** Either you're adding a feature (behavior change) or you're refactoring (structure change). Mixing them creates bugs that are hard to trace.

## Workflow

### Step 1: Ensure Test Coverage

Before refactoring anything, verify that tests exist for the behavior you're about to restructure. If tests are missing:

1. Write characterization tests that document current behavior (even if the behavior has quirks)
2. Run them and confirm they pass
3. Only then begin refactoring

If the user resists writing tests first, explain: refactoring without tests is not refactoring, it's rewriting with hope.

### Step 2: Identify Smells

Read the code and identify code smells. Prioritize by impact — don't try to fix everything at once. The most common smells, roughly ordered by severity:

1. **Long function** (>30 lines) → Extract method
2. **Duplicated logic** → Extract and share
3. **Deep nesting** (>3 levels) → Early returns, extract method
4. **Long parameter list** (>4 params) → Introduce parameter object
5. **Feature envy** → Move method to the class it uses most
6. **Primitive obsession** → Introduce domain types
7. **Shotgun surgery** → Consolidate related logic
8. **Divergent change** → Split class by responsibility

See [references/transformations.md](references/transformations.md) for the complete catalog of safe transformations.

### Step 3: Plan the Sequence

Order refactoring steps so that each step:
- Is small enough to verify easily
- Keeps all tests green
- Makes the next step easier

A good sequence often looks like:
1. Rename for clarity (cheapest, highest readability impact)
2. Extract helpers to reduce function length
3. Consolidate duplicates using the extracted helpers
4. Move methods to better homes
5. Simplify interfaces

### Step 4: Execute — One Step at a Time

For each transformation:

1. **Explain** what you're about to do and why
2. **Apply** the single transformation
3. **Run tests** and confirm green
4. **Show the diff** to the user

If tests break, undo immediately. A failing test after refactoring means the transformation changed behavior — that's a bug, not a test to fix.

### Step 5: Review the Result

After completing the planned sequence:

- Compare before/after: Is the intent clearer? Is the code simpler?
- Run the full test suite
- Check that no public API changed (unless that was the goal)
- Look for any new smells introduced by the refactoring

## Principles Applied

- **DRY**: Eliminate duplication discovered during refactoring
- **KISS**: Every transformation should make the code simpler, not more abstract
- **SRP**: Each extracted function/class should have one reason to change
- **YAGNI**: Don't introduce abstractions for hypothetical future needs during refactoring
- **Functional Independence**: Refactoring should reduce coupling, not increase it

## Cross-Skill References

- `technical-debt-review` — use to identify which areas are worth refactoring at a strategic level before starting
- `dependency-impact-analysis` — use before refactoring a shared component or public interface to understand blast radius
