# Versioning & releasing

The library is versioned with [Semantic Versioning](https://semver.org/) and released
automatically: [release-please](https://github.com/googleapis/release-please) turns the
Conventional Commit history into a **release PR**, and merging that PR is the deliberate
act that tags, cuts the GitHub release, and publishes to npm. This page defines what a
version *means* for a skills library and how the automation works — including the parts
that stay manual.

## Single source of truth

The version lives in one file: **[`VERSION`](../VERSION)** (e.g. `0.2.0`).
`scripts/build-plugins.mjs` reads it and stamps it into every generated artifact —
`.claude-plugin/marketplace.json` and each `plugins/<role>/.claude-plugin/plugin.json`.
**Never hand-edit a version in a generated file.** `package.json`'s `version` must match
(npm reads it statically at publish time); `scripts/verify.mjs` asserts `VERSION`,
`package.json`, and the marketplace all agree, so drift fails CI.

During a release, **release-please bumps `package.json`** and
**`scripts/sync-version.mjs` fans that version out**: it writes `VERSION`, then re-runs
`build-plugins.mjs` so the marketplace, the 14 per-role plugins, and `catalog.json` are
regenerated from it — all inside the release PR, so the merged release commit is
internally consistent (the "lockstep" below).

## Lockstep

All per-role plugins and the marketplace share the **one** library version (lockstep).
The plugins are different slices of the same curated set built from the same `roles.json`
— independent per-plugin versions would add bookkeeping with no real benefit. One library
version, one tag, one changelog entry.

## What MAJOR / MINOR / PATCH mean here

SemVer is about the **consumer contract**: the install/activation surface and the set of
skills people route to.

- **MAJOR** (`x.0.0`) — breaking changes. Removing or renaming a skill or role; changing
  the install/uninstall CLI or flags; changing the activation contract (`skillOverrides`
  baseline, `/role`, hook registration) in a way that requires users to re-install or
  edit settings; restructuring the marketplace/plugin layout.
- **MINOR** (`0.x.0`) — additive, backward-compatible. New skills or roles; new optional
  flags; substantive new guidance within existing skills; new docs/tooling.
- **PATCH** (`0.0.x`) — fixes with no contract change. Typos, description tweaks that
  don't change routing intent, eval fixes, internal refactors of the Node tooling.

While the project is pre-1.0 (`0.y.z`), the public surface may still shift: treat
**MINOR as the breaking-change lever and PATCH as everything else**, and don't promise
1.0-level stability until `VERSION` reaches `1.0.0`. The automation encodes this policy
in [`release-please-config.json`](../release-please-config.json):
`bump-minor-pre-major: true` + `bump-patch-for-minor-pre-major: false`, i.e.
**breaking → MINOR, `feat` → MINOR, `fix` → PATCH** until 1.0.

## Conventional commits drive everything

Commits follow [Conventional Commits](https://www.conventionalcommits.org/)
(`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`, …) — see the `git-workflow` skill.
They are the *input* to the release automation: release-please computes the next version
from the commit types since the last tag and maps them to changelog sections
(`feat` → **Added**, `fix` → **Fixed**, `refactor`/`perf`/`docs` → **Changed**;
`chore`/`ci`/`test` are hidden). A sloppy commit type is now a versioning bug, not just
untidy history.

[CHANGELOG.md](../CHANGELOG.md) stays in [Keep a Changelog](https://keepachangelog.com/)
form: accumulate rich, hand-written entries under `[Unreleased]` as you land work.
Release-please generates its own section from the commit titles; the hand-written prose
is folded into that section on the release PR before merging (see step 3 below) — the
curated file, not the generated stub, is the canonical history.

## How a release happens

The machinery: [`release-please-config.json`](../release-please-config.json) +
[`.release-please-manifest.json`](../.release-please-manifest.json) (tool config and
last-released version), [`scripts/sync-version.mjs`](../scripts/sync-version.mjs) (the
lockstep fan-out), and [`.github/workflows/release.yml`](../.github/workflows/release.yml)
(two jobs: `release-please` and `publish`). None of these files ship in the npm package.

**Automated** (on every push to `main`, or a `workflow_dispatch` nudge):

1. release-please opens or updates the **release PR**: bumps `package.json`, computes
   the next version from the commits since the last tag, and regenerates the
   `CHANGELOG.md` section for it.
2. The workflow's sync step runs `scripts/sync-version.mjs` on the PR branch and commits
   the result: `VERSION` + marketplace + plugins + catalog now carry the new version, so
   `verify.mjs` and `build-plugins.mjs --check` are green on the PR *and* on the merged
   release commit.
3. When the PR merges, release-please tags `vX.Y.Z` (annotated, no component prefix) and
   creates the GitHub release.
4. The `publish` job (gated on the release actually being created) checks out the tag,
   runs the **verification gate fresh** (`node scripts/verify.mjs` — the Iron Law: never
   publish without a fresh gate; `prepublishOnly` re-runs it too), inspects the tarball
   (`npm pack --dry-run`), and publishes to npm via **OIDC trusted publishing** — no
   token; provenance is attached automatically (public repo, npm ≥ 11.5.1). See
   [SECURITY.md](../SECURITY.md) for the full supply-chain trust model.

**Manual** (the human parts, in order):

1. **Sanity-check the computed version** on the release PR against the table above
   before merging. The tool knows the commit types; you know whether a change was
   actually contract-breaking. Disagreement means a mislabeled commit — fix the label
   (or the config), don't hand-edit the version.
2. **Curate the changelog on the PR branch**: fold the hand-written `[Unreleased]`
   entries under the generated `## [X.Y.Z]` heading (keep the richer prose), leave
   `[Unreleased]` empty for the next cycle, and update the link refs. Pushes to the PR
   branch don't re-trigger the release workflow; a later push to `main` **regenerates
   the PR**, so curate last.
3. **Merge the release PR** — this is the deliberate release trigger. Nothing tags or
   publishes until a human merges.
4. **Verify the artifact like a user** (see below) before announcing.

One-time npm-side prerequisite (already done for this repo): a **trusted publisher**
configured on npmjs.com for `swe-workflow-skills`, pointing at
`SWEStash/swe-workflow-skills` / `release.yml`. Optional: a `RELEASE_PLEASE_TOKEN`
secret (fine-grained PAT) if you want CI checks to run on the release PR itself —
`GITHUB_TOKEN`-pushed PRs don't trigger workflows; the publish-time gate runs
regardless. Forks are inert: both jobs are guarded on the canonical repo name.

## npm package

The library ships as the `swe-workflow-skills` npm package so `npx swe-workflow-skills
install` works with no clone. `package.json`'s `bin` maps the command to `bin/cli.mjs`
(which dispatches `install`/`uninstall` to the Node scripts), and the `files` allowlist
bundles `skills/` plus the machinery the installer needs at runtime (`roles.json`,
`catalog.json`, `hooks/session-start.mjs`, `scripts/resolve.mjs`, `commands/role.md`).

After a release publishes, verify the artifact users actually get:

```bash
npm view swe-workflow-skills@<version> version dist.attestations   # registry + provenance
npm pack swe-workflow-skills@<version>     # pull the published tarball
tar xzf swe-workflow-skills-*.tgz -C /tmp  # extracts to /tmp/package
node /tmp/package/bin/cli.mjs install --dir /tmp/pkgtest   # should install all skills (count = docs/SKILLS.md)
```

## Manual fallback

If the automation is unavailable, a release is the same steps by hand — bump
`package.json` (`npm version X.Y.Z --no-git-tag-version`), run
`node scripts/sync-version.mjs`, promote `[Unreleased]` in CHANGELOG.md, run
`node scripts/verify.mjs` + `node scripts/build-plugins.mjs --check`, commit as
`chore(release): vX.Y.Z`, tag `vX.Y.Z` (annotated), push with tags, `npm publish`
(the `prepublishOnly` gate still runs), and `gh release create vX.Y.Z --notes-from-tag`.
Afterwards update `.release-please-manifest.json` to the released version so the bot's
next PR computes from the right base. Tags only ever come from a green `main` — the
marketplace consumes the tagged commit.
