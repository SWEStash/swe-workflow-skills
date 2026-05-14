---
name: git-workflow
description: "Write commit messages, PR descriptions, and manage branching strategy following conventional commits. Triggers: write a commit message, commit this, PR description, pull request, branching strategy, git workflow, squash commits, rebase, conventional commits, how should I commit this, review staged changes."
model: haiku
allowed-tools: Read, Grep, Glob, Write, Edit
---

# Git Workflow

Help write clear commit messages, structured PR descriptions, and manage branching conventions. Good git history is documentation — it tells the story of why the codebase evolved the way it did.

## Workflow: Commit Messages

### Step 1: Analyze the Changes

Read the staged changes to understand what was done:

```bash
git diff --staged
```

Identify:
- **What changed?** (files modified, functions added/removed, logic altered)
- **Why did it change?** (feature, bugfix, refactor, dependency update)
- **Is this one logical change or multiple?** If multiple, suggest splitting into separate commits.

### Step 2: Write the Commit Message

Use the Conventional Commits format — see [references/conventions.md](references/conventions.md):

```
<type>(<scope>): <short description>

<body — explain WHY, not WHAT>

<footer — references, breaking changes>
```

**The subject line** (first line):
- Type: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `ci`, `build`
- Scope: The module, component, or area affected (optional but recommended)
- Description: Present tense, lowercase, no period, under 50 characters
- It should complete the sentence: "If applied, this commit will..."

**The body** (optional but valuable for non-trivial changes):
- Explain WHY this change was made, not WHAT changed (the diff shows what)
- Include context that isn't obvious from the code
- Wrap at 72 characters

**The footer** (optional):
- Reference issues: `Closes #123`, `Fixes #456`
- Breaking changes: `BREAKING CHANGE: description`
- Co-authors: `Co-authored-by: Name <email>`

### Step 3: Validate

Before committing, check:
- [ ] Is this a single logical change? (If not, split it)
- [ ] Does the subject line describe the behavior change, not the implementation?
- [ ] Would someone understand why this commit exists 6 months from now?
- [ ] Are related issue numbers referenced?

## Workflow: PR Descriptions

### Step 1: Analyze the Branch

Read the changes in the branch:

```bash
git log main..HEAD --oneline
git diff main...HEAD --stat
```

Understand the full scope of changes across all commits.

### Step 2: Write the PR Description

Use the template at [templates/pull-request.md](templates/pull-request.md). Key sections:

- **What**: What this PR does (1-2 sentences)
- **Why**: Why this change is needed (link to issue/task)
- **How**: Brief description of the approach taken and key decisions
- **Testing**: How the changes were tested
- **Screenshots**: For UI changes (before/after)
- **Checklist**: Standard items (tests pass, docs updated, etc.)

The PR description should let a reviewer understand the change without reading every line of code first.

### Step 3: Self-Review

Before requesting review:
- [ ] Read through the entire diff one more time
- [ ] Are there any debugging leftovers?
- [ ] Are there any changes that don't belong in this PR?
- [ ] Is the PR a reasonable size? (Under 400 lines changed is ideal. Over 800 is a red flag.)

If the PR is too large, suggest splitting it into stacked PRs or smaller logical units.

## Workflow: Branching Strategy

Help set up or improve branching conventions. Ask about team size and release cadence, then recommend:

**For small teams (1-5 devs) or continuous deployment:**
- `main` — always deployable
- `feat/description` — feature branches, short-lived (1-3 days)
- `fix/description` — bug fix branches
- Merge to main via PR, deploy from main

**For medium teams (5-15 devs) or scheduled releases:**
- `main` — production
- `develop` — integration branch
- `feat/description`, `fix/description` — branch from develop
- `release/x.y.z` — stabilization branch before release
- `hotfix/description` — urgent fixes branching from main

**For large teams or complex release cycles:**
- Consider trunk-based development with feature flags
- Short-lived branches (< 1 day) merged to main
- Feature flags control what's visible to users

See [references/conventions.md](references/conventions.md) for branch naming conventions.

## Principles Applied

- **KISS**: One commit = one logical change. Don't bundle unrelated changes.
- **DRY**: If you're writing the same commit message pattern repeatedly, you might be making commits too granular or too broad.
- **Functional Independence**: Each PR should be independently deployable when possible. Avoid PRs that depend on other unmerged PRs.
