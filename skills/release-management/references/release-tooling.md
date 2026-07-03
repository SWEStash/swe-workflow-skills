# Release Tooling and Advanced Patterns

Deep-dive material for Tier 2+ releases. Check each tool's current docs before pinning
versions or config formats — this file describes the stable concepts, not exact syntax.

## Choosing an automation tool

| | release-please | changesets | semantic-release |
|---|---|---|---|
| **Model** | Bot maintains a running "release PR"; merging it bumps, tags, publishes | Contributors add a changeset file per change stating bump level + summary; release command consumes them | Every merge to the release branch analyzes commits and publishes immediately |
| **Human gate** | Yes — merging the release PR | Yes — running/merging the version PR | No — CI is the only gate |
| **Input** | Conventional commits | Explicit changeset files | Conventional commits |
| **Monorepo** | Good (manifest mode, per-package configs) | Best-in-class for JS/TS independent versions | Weak without plugins |
| **Ecosystem** | Language-agnostic (GitHub-centric) | JS/TS | JS-first, plugin-extensible |
| **Pick when** | You want release PRs as review points, any language | Contributors should declare intent per change; JS monorepo | High-cadence, fully hands-off publishing with airtight CI |

Adjacent tools: `git-cliff` / `conventional-changelog` (changelog only, no publish),
`goreleaser` (Go binaries + archives + Homebrew taps), `cargo-release` /
`cargo-dist` (Rust), `commitizen` / `commitlint` (enforce the commit format that feeds
all of the above).

**One tool per repo.** They all want to own the version bump and the tag; running two
produces double-bumps and conflicting tags. Migrating between them is a deliberate
change with its own PR.

## Conventional commits → bump level

| Commit | Bump | Changelog section |
|---|---|---|
| `fix:` | PATCH | Fixed |
| `feat:` | MINOR | Added |
| `feat!:` or `BREAKING CHANGE:` footer (any type) | MAJOR | Breaking / Changed |
| `docs:`, `chore:`, `refactor:`, `test:`, `ci:` | none by default | usually omitted |

Pre-1.0 (`0.y.z`): most tools map breaking → MINOR and everything else → PATCH,
matching SemVer's "anything may change" escape hatch. Configure this explicitly rather
than relying on defaults.

## Publishing gates and supply-chain hygiene

A publish gate is a CI stage between "release approved" and "artifact on the
registry":

1. **Re-run tests + build on the release commit** (the bump commit is new — it was
   never tested).
2. **Inspect the artifact**: `npm pack --dry-run` (file list, size), `twine check
   dist/*`, `docker sbom` / image scan. Catches the classic "files allowlist dropped
   half the package".
3. **Dry-run install**: unpack the tarball / install from the local artifact into a
   clean dir and run a smoke command.
4. **Publish with provenance**:
   - npm: OIDC **trusted publishing** from CI (no long-lived tokens) and
     `npm publish --provenance`; require 2FA on the account regardless.
   - PyPI: **trusted publishers** (OIDC from GitHub Actions/GitLab) instead of API
     tokens; upload with `twine` or `pypa/gh-action-pypi-publish`.
   - Containers: push by digest, sign (`cosign`), and treat mutable tags (`latest`) as
     pointers, never as identity.
5. **Post-publish smoke test** against the registry copy, not the local build.

Registry immutability rules worth remembering: npm allows `unpublish` only in a narrow
window and never lets you reuse a version number; PyPI allows **yank** (pip skips it
unless pinned) but no re-upload of the same filename; container tags are mutable but
digests are not — consumers pinning digests are unaffected by tag rewrites.

## Pre-release channels

- SemVer pre-release identifiers: `2.0.0-alpha.1` < `2.0.0-beta.1` < `2.0.0-rc.1` <
  `2.0.0`. Automation tools support a "prerelease mode" that keeps bumping the
  identifier.
- **npm dist-tags decouple publishing from adoption**: `npm publish --tag next` ships
  a version without making it the default install; promote later with
  `npm dist-tag add pkg@2.0.0 latest`. This is the escape hatch when someone needs a
  fix *now* and the full gate hasn't finished — ship to `next`, promote when green.
- PyPI: pre-release versions (`2.0.0b1`) are skipped by pip unless `--pre` or pinned.
- Channels only help if consumers know they exist — document them in the README.

## Monorepo versioning

- **Fixed / lockstep**: every package shares one version; one tag, one changelog.
  Simple, some no-op bumps. Right when packages are consumed as a set (this library
  versions its role plugins in lockstep for exactly this reason).
- **Independent**: each package has its own version and tag (`pkg-a@1.2.0`).
  Right when consumers depend on packages individually; requires tooling (changesets,
  release-please manifest mode) to track per-package changes and inter-package
  dependency bumps.
- Decide **before** the first release; converting later means rewriting tag history
  conventions and consumer expectations.

## Hotfix and backport flow

When `main` has moved past the released version and a fix must ship for it:

1. Branch from the release tag: `git checkout -b release/1.2.x v1.2.3`.
2. Cherry-pick (or land) the fix there; release `1.2.4` from that branch through the
   same gate.
3. Ensure the fix is also on `main` (forward-port), or the next minor silently
   regresses it.
4. Long-lived release branches (`release/1.x`) are Tier 3 machinery — only maintain
   them if you actually support old majors.

## Release trains (Tier 3)

Fixed-cadence releases (e.g., every two weeks) where whatever is merged by the cutoff
ships: removes per-release negotiation, pairs with feature flags for incomplete work.
Needs: a cutoff automation, a stabilization window, and an explicit hotfix lane that
bypasses the train through the same publish gate.
