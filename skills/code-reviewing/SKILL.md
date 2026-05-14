---
name: code-reviewing
description: "Structured code reviews enforcing DRY, KISS, YAGNI, SRP, best practices, and project conventions. Triggers: review this code, code review, check my code, what do you think of this implementation, review this PR, is this code good, feedback on my code, review staged changes before commit."
model: sonnet
allowed-tools: Read, Grep, Glob, Write, Edit
---

# Code Reviewing

Perform thorough, constructive code reviews that catch bugs, enforce principles, and improve code quality. Good reviews are specific, actionable, and educational — they explain *why*, not just *what*.

## Review Process

### Step 1: Understand the Context

Before reviewing line-by-line, understand the big picture:

- **What is this code supposed to do?** Read the PR description, linked issue, or ask the user.
- **What changed?** If reviewing a diff, understand the scope of changes.
- **What's the surrounding code like?** Read adjacent files for conventions and patterns.

### Step 2: First Pass — Structural Review

Look at the forest before the trees. Check:

- **Does the change belong here?** Is it in the right module/file?
- **Is the scope right?** Does it do one thing or is it mixing concerns?
- **Is the approach sound?** Before nitpicking syntax, is the overall strategy correct?
- **Are there missing pieces?** Tests? Documentation? Error handling? Migration?

### Step 3: Detailed Review

Review the code against these categories, in order of importance. See [references/review-checklist.md](references/review-checklist.md) for the detailed checklist.

**Severity levels for findings:**

- 🔴 **Blocker**: Must fix before merge (bugs, security issues, data loss risks)
- 🟡 **Suggestion**: Should fix, significantly improves quality (principle violations, missing tests)
- 🔵 **Nit**: Optional improvement (naming, style, minor simplification)

### Step 4: Present Findings

Structure your review as:

1. **Summary** (1-2 sentences: overall impression and most important finding)
2. **Blockers** (if any — these must be addressed)
3. **Suggestions** (improvements that meaningfully raise quality)
4. **Nits** (optional, non-blocking)
5. **Positive notes** (what's done well — this matters for morale and learning)

For each finding, provide:
- The specific location (file and line/function)
- What the issue is
- Why it matters (link to principle)
- A concrete suggestion for fixing it (show code when helpful)

### Step 5: Offer to Help Fix

After presenting findings, offer to help implement the suggested changes. Don't just criticize — help improve.

## Review Dimensions

These are the lenses through which code is examined:

**Correctness**: Does it work? Does it handle edge cases? Can it fail silently?

**Design Principles**: DRY, KISS, YAGNI, SRP, functional independence. See [references/review-checklist.md](references/review-checklist.md).

**Security**: Input validation, auth checks, SQL injection, XSS, secrets in code.

**Performance**: Obvious N+1 queries, unnecessary allocations, missing indexes. Don't optimize prematurely, but flag clearly wasteful patterns.

**Testability**: Is the code testable? Are there tests? Do tests test behavior or implementation?

**Readability**: Can someone unfamiliar with this code understand it in one reading? Good naming, appropriate comments (why, not what), manageable function length.

**Error Handling**: Are errors caught, logged, and handled appropriately? Are error messages helpful? See [references/error-handling.md](references/error-handling.md) for detailed patterns (null safety, exception context, caller-oriented exceptions).

## Tone Guidelines

- Be specific: "This function does three things" beats "this could be cleaner"
- Be constructive: "Consider extracting X into its own function because..." beats "this is messy"
- Ask questions when uncertain: "Is this intentionally returning null here?" invites discussion
- Acknowledge good work: If something is well-written, say so
- Propose, don't command: "What do you think about..." respects the author's judgment
- Apply the Boy Scout Rule: note small cleanup opportunities near the changed code — a renamed variable, a dead import removed. These compound over time.
