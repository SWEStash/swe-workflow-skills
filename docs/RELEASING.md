# Versioning & releasing

The library is versioned with [Semantic Versioning](https://semver.org/) and released
as git tags (and, later, an npm package). This page defines what a version *means* for
a skills library and how to cut a release.

## Single source of truth

The version lives in one file: **[`VERSION`](../VERSION)** (e.g. `0.1.0`).
`scripts/build-plugins.mjs` reads it and stamps it into every generated artifact —
`.claude-plugin/marketplace.json` and each `plugins/<role>/.claude-plugin/plugin.json`.
**Never hand-edit a version in a generated file.** Bump `VERSION`, regenerate, commit.

`package.json`'s `version` is the one place that must be bumped **alongside** `VERSION`
(npm reads it statically at publish time). `scripts/verify.mjs` asserts `VERSION`,
`package.json`, and the marketplace all agree, so drift fails CI.

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
1.0-level stability until `VERSION` reaches `1.0.0`.

## Conventional commits → changelog

Commits follow [Conventional Commits](https://www.conventionalcommits.org/)
(`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`, …) — see the `git-workflow` skill. They
map to changelog sections: `feat` → **Added**, `fix` → **Fixed**, behavior changes →
**Changed**, `feat!`/`BREAKING CHANGE:` → a MAJOR bump. Keep
[CHANGELOG.md](../CHANGELOG.md) in [Keep a Changelog](https://keepachangelog.com/) form;
accumulate entries under `[Unreleased]` and promote them on release.

## Cutting a release

```bash
# 1. Pick the new version per the rules above; bump BOTH single sources to match.
echo "0.2.0" > VERSION
npm version 0.2.0 --no-git-tag-version    # updates package.json without committing/tagging

# 2. Regenerate the marketplace/plugins so they carry the new version.
node scripts/build-plugins.mjs

# 3. Promote [Unreleased] → [0.2.0] in CHANGELOG.md, add the compare links.

# 4. Verify everything still passes (version sync, no drift, install/hook/role/uninstall).
node scripts/build-plugins.mjs --check
node scripts/verify.mjs

# 5. Commit, tag, push.
git add VERSION package.json CHANGELOG.md .claude-plugin plugins
git commit -m "chore(release): v0.2.0"
git tag -a v0.2.0 -m "v0.2.0"
git push && git push --tags

# 6. Publish to npm (see below), then cut the GitHub Release.
npm publish
gh release create v0.2.0 --notes-from-tag
```

Tags are `vMAJOR.MINOR.PATCH` (annotated). The marketplace consumes the tagged commit;
users on `/plugin marketplace add SWEStash/swe-workflow-skills` get whatever the default
branch points at, so only tag from a green `main`.

## npm package

The library ships as the `swe-workflow-skills` npm package so `npx swe-workflow-skills
install` works with no clone. `package.json`'s `bin` maps the command to `bin/cli.mjs`
(which dispatches `install`/`uninstall` to the Node scripts), and the `files` allowlist
bundles `skills/` plus the machinery the installer needs at runtime (`roles.json`,
`catalog.json`, `hooks/session-start.mjs`, `scripts/resolve.mjs`, `commands/role.md`).

Before publishing a new version, sanity-check the tarball actually installs:

```bash
npm pack                                   # inspect the file list + size
tar xzf swe-workflow-skills-*.tgz -C /tmp  # extracts to /tmp/package
node /tmp/package/bin/cli.mjs install --dir /tmp/pkgtest   # should install all skills (count = docs/SKILLS.md)
npm publish                                # requires `npm login` first
```
