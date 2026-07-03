---
name: release-management
description: "Cut and publish software releases right-sized to the project — semver decisions, changelogs, tagging, automated version bumps (release-please, changesets, semantic-release), publishing gates, npm/PyPI/container registry publishing, pre-release channels, monorepo versioning. Triggers: cut a release, release this, publish to npm, publish to PyPI, publish this package, version bump, what version should this be, semver, changelog, tag a release, release notes, GitHub release, prerelease, release automation, release PR. Deploy-time safety → deployment-checklist; commit/PR hygiene → git-workflow."
model: sonnet
allowed-tools: Read, Grep, Glob, Write, Edit, Bash
---

# Release Management

Releasing turns committed work into a versioned, consumable artifact — a tag, a package, an image — with a truthful version number and a record of what changed. It is not deploying (that's `deployment-checklist`): a release can exist without a deploy, and vice versa.

## ⛔ The Iron Law

**Never publish without a fresh verification gate — and never impose more release process than the project warrants.**

Registry publishes are effectively irreversible: a version number, once published, is burned even if you yank it, and whatever shipped inside it is already on users' machines. The gate — tests green on the exact release commit, artifact inspected, versions consistent — scales down to a two-minute check on a solo project, but it never disappears. Ceremony scales with the project; the gate doesn't.

## Step 1: Detect Existing Conventions — Never Assume Greenfield

Before proposing anything, find what the project already does:

- **Release config**: `.changeset/`, `release-please-config.json`, `.releaserc*` / `release` key in package.json, `cliff.toml`, `.goreleaser.yml`
- **Docs**: `RELEASING.md`, release sections in `CONTRIBUTING.md`
- **CI**: publish/release jobs in workflow files (tag triggers, `npm publish`, `twine upload`)
- **History**: `git tag --list` (scheme and cadence), `CHANGELOG.md` format, commit-message style

If conventions exist, follow them for this release; propose improvements as a separate change. An org's release process usually encodes constraints you can't see from the repo.

## Step 2: Right-Size the Process

| Tier | Signals | Process |
|---|---|---|
| **Solo / personal** | One maintainer, few users, irregular cadence | Manual: bump version, changelog entry (or `gh release create --generate-notes`), annotated tag, GitHub release. **No automation tooling.** |
| **Team / published package** | Multiple contributors, external consumers, regular cadence | Conventional commits feeding **one** automation tool (release-please / changesets / semantic-release), generated changelog, publish gate as a CI stage |
| **Org / platform / monorepo** | Many packages, coordinated versions, compliance needs | Release PRs, protected release branches, provenance / trusted publishing, pre-release channels, coordinated monorepo versioning |

Under-processing breaks consumers; over-processing kills a small project's momentum. State which tier applies and why. **Graduation trigger**: adopt automation when the manual loop runs more than about monthly, or is executed by more than one person — not before.

## Step 3: Decide the Version

- **Something with consumers of a versioned contract (library, CLI, API)** → SemVer: breaking → MAJOR, feature → MINOR, fix → PATCH. Pre-1.0, MINOR is the breaking-change lever — and don't promise 1.0 stability until you mean it.
- **A deployed app or service nobody installs by version** → CalVer or a build number is fine; don't cargo-cult SemVer where there is no consumer contract.
- The version lives in **one source of truth**; every other occurrence (manifests, generated files) is stamped from it. Grep for the old version before tagging — drift here is the classic broken release.
- Never inflate ("bump minor to be safe"): the version is communication to consumers, not marketing. Inflating it lies about compatibility.

## Step 4: Prepare the Release

- **Changelog** from commits, in [Keep a Changelog](https://keepachangelog.com/) form. Conventional commits map mechanically: `feat` → Added, `fix` → Fixed, behavior change → Changed, `feat!` / `BREAKING CHANGE:` → MAJOR.
- **Release notes ≠ changelog**: notes lead with highlights and breaking changes plus their upgrade steps — what a consumer must know before upgrading, not a commit list.
- Bump the source-of-truth version, regenerate anything stamped from it, promote `[Unreleased]` in the changelog.

## Step 5: Gate, Then Publish

Run the gate on the **exact commit being released** (including the version-bump commit):

1. Clean working tree, correct branch — `git status`.
2. Tests and build green **on this commit**, not "they passed yesterday on main".
3. Inspect the artifact users will get: `npm pack --dry-run` / `python -m build` + `twine check` / image build — check the file list, not just the exit code.
4. Version consistency: manifest(s), changelog heading, and the tag you're about to create all agree.

Then, in order: annotated tag (`vX.Y.Z`) → publish → **post-publish smoke test** (install the *published* artifact in a clean directory and exercise it) → GitHub release with the notes. If the smoke test fails, the fix is a new patch version — which is exactly why the gate runs first.

## Step 6: Automate What Repeats (Tier 2+)

Pick **one** tool — they solve the same problem and fight each other:

- **release-please** — release PRs that accumulate changes; GitHub-centric; good monorepo support; a human merge is the final gate.
- **changesets** — contributors declare intent per change; the standard for JS/TS monorepos with independent package versions.
- **semantic-release** — fully automated publish on merge; no human gate, so the CI gate must be airtight.

Selection detail, trusted publishing/provenance, pre-release channels and dist-tags, monorepo fixed-vs-independent versioning, and hotfix/backport flows: [references/release-tooling.md](references/release-tooling.md).

## Rationalizations to Reject

| Excuse | Reality |
|---|---|
| "It's a one-line fix — publish now, run tests after" | Published versions can't be overwritten. Start the tests, prep in parallel, publish when green; if consumers truly can't wait, publish to a `next` dist-tag, not `latest`. |
| "Small project — tags and changelogs are overkill" | The lightweight tier costs minutes and buys bisect, rollback, and consumer trust. Skipping versioning is not right-sizing. |
| "Let's set up semantic-release" (solo repo, three releases a year) | Below regular cadence, automation costs more than it saves. Right-sizing cuts both ways. |
| "Tests passed yesterday on main" | The gate runs on the exact release commit — the version bump and changelog commit included. |
| "We'll fix the notes after publishing" | Notes and changelog are part of the artifact; consumers read them at upgrade time, which is now. |

## Red Flags — Stop and Correct Course

- Publishing from a dirty tree, an unpushed branch, or a commit CI never saw.
- The manifest, the tag, and the changelog disagree on the version.
- Two release-automation tools active in the same repo.
- "Misc fixes and improvements" as the entire changelog entry for a consumer-facing release.
- A release procedure that requires hand-editing generated files.

## Cross-Skill References

- `git-workflow` — the conventional commits that feed automated bumps
- `cicd-pipeline` — implementing the publish gate as a pipeline stage
- `deployment-checklist` / `rollback-strategy` — deploying the released artifact safely
- `project-documentation` — changelog upkeep between releases
- `verification-before-completion` — the evidence discipline the gate is built on
