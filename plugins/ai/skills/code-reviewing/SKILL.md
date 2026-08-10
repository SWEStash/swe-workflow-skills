---
name: code-reviewing
description: "Structured code reviews enforcing DRY, KISS, YAGNI, SRP, best practices, and project conventions."
when_to_use: "Triggers: review this code, code review, check my code, what do you think of this implementation, review this PR, is this code good, feedback on my code, review staged changes before commit."
allowed-tools: Read, Grep, Glob, Write, Edit
---

# Code Reviewing

Perform thorough, constructive code reviews that catch bugs, enforce principles, and improve code quality. Good reviews are specific, actionable, and educational — they explain *why*, not just *what*.

## Review Process

### Step 1: Understand the Context

Working-tree changes right now (live at skill load; empty when the tree is clean,
this isn't a git repo, or the review targets something else — e.g. pasted code or
a PR):

!`git diff --stat 2>/dev/null || true`

If the summary above is empty or irrelevant to what you were asked to review,
proceed with the code as provided.

**Called from the pre-commit gate?** When `verification-before-completion` routes
here before a commit, the review target is `git diff --staged` — the change about
to be published, not the whole branch. Scope to it, keep the pass proportionate to
what tripped the gate, and report findings in time to fix them before the commit.

Before reviewing line-by-line, understand the big picture:

- **What is this code supposed to do?** Read the PR description, linked issue, or ask the user.
- **What changed?** If reviewing a diff, understand the scope of changes — run the
  full `git diff` (or `git diff --staged`) when the stat summary isn't enough.
- **What's the surrounding code like?** Read adjacent files for conventions and patterns.

### Step 2: First Pass — Structural Review

Look at the forest before the trees. Check:

- **Does the change belong here?** Is it in the right module/file?
- **Is the scope right?** Does it do one thing or is it mixing concerns?
- **Is the approach sound?** Before nitpicking syntax, is the overall strategy correct?
- **Are there missing pieces?** Tests? Documentation? Error handling? Migration?

**Step outside the diff.** The most common AI slop is invisible in a single hunk —
it only shows up repo-wide. For any new helper, block, command, or exported symbol in
the diff, run three greps before accepting it:
- **A twin?** Grep the repo for an existing function/block that already does this — AI
  assistants generate a fourth copy instead of finding copies #1–3 (see `code-slop-cleanup`'s
  *Reuse Before Write*).
- **Any importer?** A newly-`export`ed symbol with no consumer is dead surface (often
  exported just to silence the unused-symbol checker).
- **Any consumer?** A new schema field, prop, or param that nothing reads or sets is
  speculative plumbing — the API looks finished but is wired to nothing.
- **A comment in the wrong place?** For any new comment block of four or more lines,
  ask what it explains. System-level rationale — why the component exists, what was
  rejected, how it relates to other services — belongs in an ADR or architecture doc
  with the comment reduced to a pointer; a local invariant the types can't express
  stays inline; a restatement of the code goes nowhere. The essay-in-a-header rots
  unread and is unfindable by anyone grepping the docs for it.
- **A reference nobody can resolve?** `Phase 2`, `CP1.3`, `T02`, `finding #17`,
  `checkpoint 3/5` in comments, names, or strings — check whether a **git-tracked**
  document defines it (`git ls-files '*.md' | xargs grep -l`). Anchored, it's a real
  cross-reference. Unanchored, it names a conversation the reader wasn't in: the
  finding is "write the meaning instead of the label".
- **Any doc still describing the old shape?** If the diff renames, removes, or adds
  something a user types or configures — a flag, env var, endpoint, config key,
  command, script, install step — grep the README and `docs/` for it, old name
  included. Check tables, diagrams, and layout blocks first: prose gets reread when
  someone edits the feature, inventories don't.

When the diff *is* documentation, review it against the code rather than for prose
quality. The failure mode is a confident sentence nobody verified — check each claim
against the file it describes, and treat an unverifiable one as a finding.

Also check the *unit being grown*, not just the hunk: adding 15 lines to an already
800-line function or 200-line file is how god-functions form one reviewer-approved PR at
a time. Judge the total size after the change, not the size of the diff.

### Step 3: Detailed Review

Review the code against these categories, in order of importance. See [references/review-checklist.md](references/review-checklist.md) for the detailed checklist.

**Severity levels for findings:**

- 🔴 **Blocker**: Must fix before merge (bugs, security issues, data loss risks) — including a doc the diff makes *wrong* where the doc is an instruction someone follows: install steps, setup commands, the API contract, config keys. A stale instruction fails for the next person, silently, and is worse than no instruction. **Secrets or real personal data in the diff are always blockers** — they survive removal in git history, so flag them before the commit, not after.
- 🟡 **Suggestion**: Should fix, significantly improves quality (principle violations, missing tests, docs the diff leaves incomplete rather than wrong, misplaced comment essays, unanchored internal terminology)
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

**Readability**: Can someone unfamiliar with this code understand it in one reading? Good naming, manageable function length, and comments that are both *why, not what* and **in the right place** — the why of a system belongs in an ADR the comment points at; the why of a line belongs on the line. Judge "unfamiliar" literally: a reader with the repo and nothing else, who was in none of the conversations that produced it.

**Error Handling**: Are errors caught, logged, and handled appropriately? Are error messages helpful? See [references/error-handling.md](references/error-handling.md) for detailed patterns (null safety, exception context, caller-oriented exceptions).

## Tone Guidelines

- Be specific: "This function does three things" beats "this could be cleaner"
- Be constructive: "Consider extracting X into its own function because..." beats "this is messy"
- Ask questions when uncertain: "Is this intentionally returning null here?" invites discussion
- Acknowledge good work: If something is well-written, say so
- Propose, don't command: "What do you think about..." respects the author's judgment
- Apply the Boy Scout Rule: note small cleanup opportunities near the changed code — a renamed variable, a dead import removed. These compound over time.

## Cross-Skill References

- `refactoring` — when the review surfaces code smells worth a structured cleanup
- `code-slop-cleanup` — strip AI-slop patterns from the diff before (or instead of) debating them in review
- `security-audit` — for a dedicated, deep security pass beyond the review checklist
- `verification-before-completion` — verify the change actually runs before approving, not from the diff alone; also the pre-commit gate that routes staged diffs here
- `architecture-design` — where a system-level rationale found in a comment belongs instead (an ADR)
