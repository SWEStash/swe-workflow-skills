---
name: git-workflow
description: "Write commit messages, PR descriptions, and manage branching strategy following conventional commits."
when_to_use: "Triggers: write a commit message, commit this, PR description, pull request, branching strategy, git workflow, squash commits, rebase, conventional commits, how should I commit this, review staged changes."
allowed-tools: Read, Grep, Glob, Write, Edit
---

# Git Workflow

Help write clear commit messages, structured PR descriptions, and manage branching conventions. Good git history is documentation — it tells the story of why the codebase evolved the way it did.

## Workflow: Commit Messages

### Step 1: Analyze the Changes

Currently staged (live at skill load; empty when nothing is staged, this isn't a
git repo, or injection is disabled):

!`git diff --staged --stat 2>/dev/null || true`

If the summary above is empty or not enough to understand the change, run
`git diff --staged` yourself for the full diff.

Identify:
- **What changed?** (files modified, functions added/removed, logic altered)
- **Why did it change?** (feature, bugfix, refactor, dependency update)
- **Is this one logical change or multiple?** If multiple, suggest splitting into separate commits.

**This step is not a gate on writing the message.** Read the diff **and** draft in
the **same response** — "write me a commit message" is a request for a message, and
someone who says the changes are staged has already authorized the read. Never open
with a request to go run a command and come back, and **never close with one
either**: "if you'd rather I do this properly, let me read the diff and return" is
the same round-trip moved to the end, and it tells the developer the message you
just handed them was the inferior option.

**The diff is the basis, not an optional cross-check.** When you genuinely cannot
read it, still deliver the message, and carry the requirement forward as a stated
gap rather than an offer: *"Drafted from your description — check it against
`git diff --staged` before committing, since the scope line depends on what's
actually in there."* That is a deferred requirement. "Want me to look?" is not.

**Brevity applies to the message, not to the judgment.** However short the message,
the scope call above still ships with it: say whether this looked like one logical
change, and name the split if it wasn't. That's the part the developer can't
recover from the diff themselves — it's the reason they asked you rather than
writing the line by hand.

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
- Description: Present tense, lowercase, no period, **72 characters total** including
  the `type(scope):` prefix — the commitlint default, and what keeps `git log --oneline`
  readable in an 80-column terminal. (The older 50-char rule predates Conventional
  Commits: a `fix(skills): ` prefix spends 13 characters before you write a word.)
- It should complete the sentence: "If applied, this commit will..."

Where a tool generates the changelog (release-please, changesets, semantic-release),
**this line is the changelog entry** a consumer reads at upgrade time — and on a
squash-merge repo, that means the **PR title** is. Write it for the person deciding
whether to upgrade, not for yourself: `fix(api): reject expired tokens on refresh`
tells them something; `fix(api): address review feedback` is true and useless. The
type prefix picks the changelog section too, so a mislabeled type hides the entry or
files it under the wrong heading.

**The body** — governed by one test:

> **Delete any sentence a reader could reconstruct from the diff.**

The diff is attached to the message. Every line spent restating it is a line the
reviewer must read to discover it says nothing, which is why over-long messages
make review *worse*, not more thorough. What survives the test is what the diff
cannot show:

- **Why now** — the trigger, the bug report, the constraint that forced it
- **What was rejected** — the approach you didn't take, and what ruled it out
- **The non-obvious consequence** — what this breaks, enables, or quietly changes
- **Why nobody noticed** — for bugs, often the most valuable sentence in the message

And what fails it: file-by-file enumerations, "renamed X to Y", "added a test for
Z", restating the type signature, narrating the steps you took.

Length follows from that, not from the size of the change:

| Change | Body |
|---|---|
| Mechanical — rename, format, dep bump, generated file, typo | **None.** The subject is the whole message. |
| Ordinary — a feature or fix whose reasoning is visible in the code | A sentence or two, or none. |
| Subtle — a non-obvious bug, a rejected alternative, a surprising constraint | However long the reasoning actually is. |

A long message is not a failure. An *unearned* long message is. Do not compress a
message that carries real reasoning just to make it short — that loses the only
part worth keeping.

Wrap at 72 characters.

**The footer** (optional):
- Reference issues: `Closes #123`, `Fixes #456`
- Breaking changes: `BREAKING CHANGE: description`
- Co-authors: `Co-authored-by: Name <email>`

Commit types are not just style — in automated release flows they drive the version:
`fix` → PATCH, `feat` → MINOR, `feat!`/`BREAKING CHANGE:` → MAJOR. A mislabeled type
mis-versions the next release (see `release-management`).

### Step 3: Validate — Re-read the Message You Just Wrote

Not a checklist to nod at: **read the drafted message back against the rules
above, line by line, before you commit.** These constraints are trivially easy to
state and trivially easy to skip — a subject line drifts past its limit, a
body accumulates a restatement paragraph, and nothing ever catches it because the
message is never re-read.

- [ ] **Read the subject as a stranger.** Does it name the behavior change on its own?
      That's the real test; 72 characters is the ceiling, not the goal. Over it, cut
      words — and if it can't be cut, ask whether it's more than one change.
- [ ] **Apply the recoverability test to each body sentence.** Could the reader
      get this from the diff? Then delete it. Whatever's left is the message.
- [ ] Is this a single logical change? (If not, split it)
- [ ] Does the subject describe the behavior change, not the implementation?
- [ ] Would someone understand why this commit exists 6 months from now?
- [ ] Are related issue numbers referenced?
- [ ] Does the message use vocabulary a reader can resolve? Phase names,
      checkpoint IDs, and task codes belong in a commit only when a tracked
      document defines them — otherwise write what they mean.

Then **invoke `verification-before-completion`** — committing is publishing, and
that skill owns the publish gate.

**Exit condition** — name it, by name, in the response where you commit:
*"Invoking `verification-before-completion` on the staged diff before this commit."*

Don't substitute your own reading of the diff for the call. Knowing roughly what
that gate looks for is precisely what makes skipping it feel harmless.

## Workflow: PR Descriptions

### Step 1: Analyze the Branch

Branch state vs the default branch (live at skill load; tries `main` then
`master`):

!`git log main..HEAD --oneline 2>/dev/null || git log master..HEAD --oneline 2>/dev/null || true`

!`git diff main...HEAD --stat 2>/dev/null || git diff master...HEAD --stat 2>/dev/null || true`

If the output above is empty or the repo uses a different default branch, run the
equivalents against the actual base branch. Understand the full scope of changes
across all commits — run the full `git diff <base>...HEAD` when the stat summary
isn't enough.

### Step 2: Write the PR Description

Use the template at [templates/pull-request.md](templates/pull-request.md). Key sections:

- **What**: What this PR does (1-2 sentences)
- **Why**: Why this change is needed (link to issue/task)
- **How**: Brief description of the approach taken and key decisions
- **Testing**: How the changes were tested
- **Screenshots**: For UI changes (before/after)
- **Checklist**: Standard items (tests pass, docs updated, etc.)

The PR description should let a reviewer understand the change without reading every line of code first.

The same recoverability test governs here, and it bites hardest on **Changes**:
that section is for the handful of changes a reviewer would otherwise miss, not a
transcription of the file list they can already see. If a bullet only names a file
and what obviously happened to it, cut the bullet. **Why**, **How**, and the
reviewer notes are where a PR description earns its length — a reviewer who reads
three paragraphs of restatement before reaching the one real trade-off is worse
off than one who read nothing.

### Step 3: Self-Review

Before requesting review, invoke `verification-before-completion` — opening a PR
is a completion claim, and that skill owns the evidence gate. Then:
- [ ] Read through the entire diff one more time
- [ ] Does anything here change what the docs describe? A renamed flag, env var,
      endpoint, config key, script, or install step means the README and `docs/`
      are part of this diff — grep them for what you changed
- [ ] Are there any debugging leftovers?
- [ ] Any stray working artifacts (PLAN.md, NOTES.md, scratch files, one-off test scripts) that shouldn't ship?
- [ ] Are there any changes that don't belong in this PR?
- [ ] Is the PR a reasonable size? (Under 400 lines changed is ideal. Over 800 is a red flag.)

If the PR is too large, suggest splitting it into stacked PRs or smaller logical units.

## Workflow: Branching Strategy

Help set up or improve branching conventions. Ask about team size and release cadence, then recommend:

**For small teams (1-5 devs) or continuous deployment:**
- `main` — always deployable
- Branch naming: `feat/<description>`, `fix/<description>` — short-lived (1-3 days)
- Merge to main via PR — **squash-merge by default** (one clean commit per logical
  change on main); one approval is the right review bar at this size
- Deploy from main

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

## Rationalizations to Reject

| Excuse | Reality |
|--------|---------|
| "A thorough message is better than a short one" | Thorough about the *reasoning*, yes. Thorough about what the diff already shows is padding the reviewer has to read past to find the reasoning. |
| "The subject needs all of this to be clear" | If the change can't be named in 72 characters, that's usually a signal it's more than one change. Split it, or move the detail to the body. |
| "I'll list the changes so reviewers know what to look at" | They have the diff and the file list. Point at the *non-obvious* change; enumerating the rest buries it. |
| "This is a big change, so it needs a big message" | Length tracks unrecoverable reasoning, not lines touched. A 2,000-line mechanical rename needs one line. |
| "Documenting the decision here saves writing an ADR" | A commit message is the worst place to look up a decision — nobody greps git log. Write the ADR (`architecture-design`) and reference it. |
| "The phase/task ID gives it traceability" | Only if a tracked doc defines it. Otherwise it traces to a conversation the reader wasn't in. |
| "I'll just commit and fix the message later" | Amending after a push rewrites history others have pulled. The message is part of the commit, not a follow-up. |
| "I should read the diff before I can write anything" | Read it *and* draft, in the same reply. Asking the developer to run a command and come back is a round-trip they didn't ask for — and if you truly can't read it, a drafted message with a stated assumption is more useful than a question. |

## Red Flags — Stop and Re-Read

- You wrote the body without re-reading the subject line's character count.
- A body paragraph could be reconstructed by anyone with the diff open.
- The message enumerates files or functions that changed.
- You're about to commit without having read `git diff --staged` this session.
- The message contains a phase, checkpoint, task code, or finding number, and no
  tracked document defines it.
- You're writing a commit body for a rename, a formatting pass, or a dep bump.
- Your reply to "write me a commit message" contains no commit message.

## Cross-Skill References

- `release-management` — cutting the release these commits accumulate into: semver, changelog, tagging, publishing
- `code-reviewing` — reviewing the PR the description introduces
- `code-slop-cleanup` — tighten the diff (AI artifacts, debug leftovers, stray files) before the self-review
- `verification-before-completion` — run the proving commands before pushing or opening the PR
