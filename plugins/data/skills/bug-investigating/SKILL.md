---
name: bug-investigating
description: "Systematic debugging and root cause analysis using structured methodology — reproduce, isolate, hypothesize, verify. Triggers: this doesn't work, I'm getting an error, something is broken, bug, debug this, why is this happening, unexpected behavior, regression, root cause, stack trace, error message."
allowed-tools: Read, Grep, Glob, Write, Edit, Bash
---

# Bug Investigating

Guide systematic debugging to find root causes, not just symptoms. Good debugging is methodical — form hypotheses, test them, narrow down, and verify the fix.

## ⛔ The Iron Law

**No fix without a confirmed root cause and a failing test that reproduces the bug.**

A change that makes the symptom disappear without an explanation of *why* it worked is a guess, not a fix — and guesses regress. If you can't articulate the mechanism that produced the wrong behavior, you have not found the root cause yet.

## Workflow

### Step 1: Gather Evidence

Before guessing at causes, collect information:

- **What is the expected behavior?** What should happen?
- **What is the actual behavior?** What happens instead?
- **When did it start?** Did it work before? What changed?
- **Is it reproducible?** Always, sometimes, only under certain conditions?
- **Error messages and stack traces?** Read them carefully — they usually point to the right area.

If the user provides a vague report ("it's broken"), ask these questions before investigating. A well-defined bug is half-solved.

### Step 2: Reproduce the Bug

Reproduction is the most important step. If you can't reproduce it, you can't verify the fix.

1. Follow the user's steps to trigger the bug
2. Identify the minimum reproduction case — strip away everything irrelevant
3. Document the exact steps to reproduce

If it's intermittent, look for:
- Race conditions (timing-dependent)
- State-dependent bugs (order of operations)
- Environment-dependent bugs (config, versions, OS)

### Step 3: Form Hypotheses

Based on the evidence, list 2-5 likely causes, ordered by probability. For each hypothesis:

- What would be true if this hypothesis is correct?
- What quick test can confirm or eliminate it?

Good hypotheses come from:
- Reading the error message and stack trace carefully
- Checking what changed recently (`git log`, `git diff`)
- Examining the code path the failing scenario exercises
- Looking at similar past bugs

### Step 4: Binary Search for the Cause

Narrow down systematically:

**In code**: Add logging/breakpoints at the midpoint of the suspected code path. Is the state correct at that point? If yes, the bug is in the second half. If no, the first half.

**In time**: If it worked before, use `git bisect` to find the commit that introduced the regression:
```bash
git bisect start
git bisect bad          # current state is broken
git bisect good <hash>  # this commit was working
# Git checks out the midpoint — test and report good/bad
```

**In data**: If the bug depends on input, narrow down which input triggers it. Test boundary values, null/empty cases, and special characters.

### Step 5: Verify the Root Cause

Before fixing, confirm you've found the actual root cause, not a symptom:

- Can you explain *why* this code produces the wrong behavior?
- Does the explanation account for all observed symptoms?
- If you remove/change the suspected cause, does the bug disappear?

If you can't explain why, you haven't found the root cause yet.

### Step 6: Fix and Verify

1. **Write a failing test** that reproduces the bug (this is your regression test)
2. **Apply the minimal fix** — change as little as possible
3. **Run the test** — it should now pass
4. **Run the full test suite** — the fix shouldn't break anything else
5. **Document** what caused the bug and why the fix works

See [references/common-bugs.md](references/common-bugs.md) for patterns of frequently encountered bugs by language/framework.

## Principles Applied

- **Methodical over intuition**: Resist the urge to guess and change things. Every action is a test of a hypothesis.
- **Binary search mindset**: Always cut the problem space in half. Don't narrow from the edges — bisect from the middle.
- **Root cause vs. symptom**: A null check that masks a null isn't a fix. Understand *why* the unexpected state exists.
- **Reproducibility before fixes**: If you can't reproduce the bug reliably, you can't verify the fix. Spend time here first.
- **Minimal fix**: Change the least amount of code that fixes the root cause. Broad changes introduce new bugs.

## Anti-patterns in Debugging

- **Shotgun debugging**: Changing random things and hoping. Always have a hypothesis.
- **Blame debugging**: Assuming the bug is in someone else's code (library, framework, OS). Start with your code.
- **Printf-only debugging**: Print statements are fine, but use a debugger for complex state issues.
- **Fix the symptom**: Adding a null check instead of understanding why the value is null.
- **Fixing without a test**: You'll be back here in a month.

See [references/debugging-patterns.md](references/debugging-patterns.md) for hypothesis-driven debugging technique and language-specific tips.

## Rationalizations to reject

| Excuse | Reality |
|--------|---------|
| "This null check will probably fix it" | If you can't explain why the value is null, you're masking a symptom — it will resurface elsewhere. |
| "It's probably flaky / the library's fault" | Start in your own code. Blame is not a diagnosis. |
| "I can't reproduce it, but this should help" | Unreproduced means unverifiable — you won't know if the change actually worked. |
| "Let me just try a few things" | Shotgun debugging. Every change must test a stated hypothesis. |
| "The fix is obvious, no need for a test" | Without a regression test, the bug comes back and nobody notices. |

## Red flags — stop and correct course

- Changing code without a written hypothesis.
- Proposing a fix before you've reproduced the bug.
- The fix works but you can't explain the mechanism.
- Adding defensive checks at the symptom instead of the source.

## Cross-Skill References

- `incident-response` — use instead when production is actively down and users are impacted (time-pressured response)
- `tdd-workflow` — write the regression test (Step 6) using the TDD workflow
- `verification-before-completion` — confirm the reproducing test passes before claiming the fix
