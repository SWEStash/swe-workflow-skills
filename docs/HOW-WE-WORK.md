# How we work

swe-workflow-skills has one maintainer and is public: bug reports, feature requests and skill
ideas are welcome from anyone. GitHub holds what is planned and what is done; the repository
holds how and why.

| What | Where |
|---|---|
| Bugs, feature requests, tasks, and whether each is open or done | [Issues](https://github.com/SWEStash/swe-workflow-skills/issues) |
| How the project runs: filing, claiming, what counts as done, PRs, releases, what agents may post | This document |
| What a release ships | The release-please PR and [CHANGELOG](../CHANGELOG.md), generated from commit subjects ([RELEASING](RELEASING.md)) |
| How skills are written and tested | [AUTHORING](AUTHORING.md), [EVALS](EVALS.md) |
| Eval results | `evals/baseline*.json`, `evals/routing-baseline.json`, summarised in [EVALS](EVALS.md) |
| Decisions | The issue comment that settles it; a decision that changes how skills, evals or roles work also goes into the doc that describes it (AUTHORING, EVALS, [ROLES](ROLES.md)) |
| Anything else (install, roles, the skill catalog, the security model) | The doc the README's *Documentation* list gives for that topic |

Working plans stay outside the repository (`.local/`, git-ignored). They refer to issues by
number and never track an issue's status: the issue does.

**When two documents disagree**, the owner in the table above wins and the other document is
fixed in the same PR. When this document and practice disagree, this document is fixed first,
in its own PR, and then the work follows it.

## Writing

Issues and comments are short and precise, like commit messages: bullets and short lines, no
prose, no filler. Enough context to understand the issue at a glance; detail that only matters
while working stays in the working plan. Name files, skills and functions in code spans,
commits by hash, PRs and CI runs by link. Don't hard-wrap issue text: GitHub keeps every line
break.

## Filing

One issue per problem or change.

- **Type**: *Bug*, *Feature* or *Task* (the repository's issue types, not labels).
- **Title**: the symptom for a bug ("`rollback-strategy` plans a rollback while users are
  getting 500s"), the outcome otherwise ("Measure Sonnet on the skills changed since its run").
  Under about 70 characters. Name the skill when there is one.
- **Body**, written for someone who doesn't know the code:
  - **Context**: the skill, script or eval involved and why it matters. One to three lines.
  - Bug: *Steps* (the prompt, the skill, the command), *Expected*, *Actual*, *Version and
    setup* (library version, install method, Claude Code version, model), and *Impact* when
    known (who is hit, how badly, any workaround).
  - Feature: *Problem*; *Proposal* and *Out of scope* when they help.
  - Task: *Context* and *Proposal*.
  - **Done when**: a checklist of observable results. It is this issue's acceptance criteria;
    the project-wide definition of done is under [Closing](#closing).
  - *Notes*: leads, constraints, links. Optional.

  The issue forms ask the public for the essentials; the maintainer adds Context and Done when
  on triage. Outside reporters use the *Bug* or *Feature* form, whichever is closer, also for a
  question; the *Task* form is for the maintainer.
- An issue labelled `needs decision` lists the options instead of *Done when*. The decision is
  recorded in a comment and *Done when* is added before the issue is claimed.
- Labels only for what a type can't say:
  - `needs decision`: the maintainer chooses before work starts.
  - `priority: low`: worth doing, but not before other work; picked up after every other issue
    that could be picked (see [Picking the next issue](#planning-and-claiming)), or when related
    work touches it anyway.
  - `good first issue`: small and self-contained.
  - `autorelease: *` labels belong to release-please; don't set them by hand.
- Security problems never go in a public issue: see [SECURITY](../SECURITY.md).

**Found while working on something else.** A follow-up that is its own change is a new issue
that links the one it came from; a fact about the issue you're on is a comment there. An eval
case that fails, or a skill a pattern doesn't fit, is a finding like any other: an issue, or a
comment on the issue that covers it. A question that blocks an issue is a comment on that
issue; a choice the maintainer has to make is an issue labelled `needs decision`.

**Scope changes.** The issue body is edited to the new scope (*Done when* included), with a
one-line comment saying what changed and why.

**Work only the maintainer can do** (a secret, a repository or npm setting, a release merge,
an approval) is a *Task* assigned to the maintainer, written as a runbook: what is needed,
where it lives, what to run, what to look for, and what to send back. It waits there, visible,
not in a private note. An outside contributor who needs the maintainer asks in a comment on
the issue or PR they're working on.

## Planning and claiming

There are no milestones: release-please cuts a release from whatever has merged. Open and
unassigned: not started. Assigned: in progress; an issue is claimed only once it has *Done
when*. Nothing else marks progress, so no "working on it" comments.

**Picking the next issue**: unassigned, with *Done when*, not `needs decision`. Bugs before
features and tasks, then oldest first. `priority: low` comes after every other issue that
meets those conditions. A comment from the maintainer on an issue overrides this order,
`priority: low` included.

**Claiming**: the maintainer and agents working for the maintainer assign the issue when work
starts and unassign it when they stop working on it, not when a session ends. An outside
contributor comments on the issue to ask for it; the maintainer assigns them.

**Work in progress** lives on a branch; once there is something to look at, a draft PR that
links the issue. Context for the next session goes in the working plan (the maintainer, and
agents working for the maintainer) or, for an outside contributor, the branch's commits and
then the draft PR's description; never in a status comment.

## Comments

New facts only: a repro, a finding, a decision with its reason, the commit, PR or run that
changes things. One fact per comment, a few lines; never restate the issue or report status.

## Closing

The PR that resolves an issue says so in its description: `Fixes #72` for a bug, `Closes #72`
otherwise. Merging it closes the issue. An issue closed without code is closed as *not
planned* with one line why; a duplicate links the other issue.

Done means: merged to `main` with CI green, and

- for a skill change, every case of the skill re-run as [EVALS](EVALS.md) describes, on Opus
  and on Haiku: GREEN ≥ RED on every case, and no green assertion given up in
  `evals/baseline.json` (a drop on a row recorded on an older model counts only after the
  pre-change text, re-run on the current model, keeps it);
- for a bug, a regression check (an eval case, a `verify.mjs` check or a test) that fails
  before the fix;
- docs that describe what changed are reconciled in the same PR.

The PR description carries the evidence: the commands run and their results, and for a skill
change the GREEN / RED score per case on each model plus `merge-baseline.mjs`'s "gate coverage
given up" count.

## Pull requests

`main` takes changes only through pull requests, with the `drift` and `verify` checks green
and the branch up to date with `main`. PRs are squash-merged; the PR title is a Conventional
Commit subject and becomes the changelog entry, so feature PRs carry no CHANGELOG edits
([RELEASING](RELEASING.md)).

Outside pull requests are welcome. For a new skill or a larger change, open an issue first so
the scope is agreed before the work; a typo or a small fix can go straight to a PR. Skill PRs
follow [AUTHORING](AUTHORING.md) (including *Adding a skill*) and ship their evals. The eval
runner needs Claude Code's Workflow tool; a contributor who can't run it says so in the PR, and
the maintainer runs the evals and commits the baseline rows.

## Releases

release-please keeps a release PR open with the next version and changelog. The maintainer
merges it explicitly, never as a side effect of other work, after the checks in
[RELEASING](RELEASING.md) → *How a release happens*. A change is **released** once its version
is on npm (`npm view swe-workflow-skills versions`). The merge first tags it and creates the
GitHub release, and the `publish` job then publishes to npm; a GitHub release or CHANGELOG
entry alone means the publish may still be pending or have failed, and a closed issue alone
means merged, not released. Marketplace plugins follow the tagged commit, so plugin users get
a version at the tag, before npm.

## Agents

Agents follow this document and act through the maintainer's account (`gh`). They draft
issues, comments, closes and label changes, and post them only after the maintainer approves:
every post is public. That covers comments on PRs too. Assigning or unassigning an issue when
work on it starts or stops needs no approval. Pushing branches and opening PRs, pushing to them and editing their
descriptions, for work the maintainer asked for, also needs no approval. Closing an issue and
merging a PR need the maintainer's approval; the release PR is merged by the maintainer, never
by an agent. Outside contributors don't close or merge.
