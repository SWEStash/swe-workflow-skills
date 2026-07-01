# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html) as defined in
[docs/RELEASING.md](docs/RELEASING.md).

## [Unreleased]

## [0.1.0] — 2026-07-01

Initial release.

### Added
- 42 SDLC workflow skills across Software Engineering, Design, DevOps, MLOps, and
  Project Management, plus two meta skills (`skill-router`, `writing-skills`).
- Orchestrator-routed activation with a name-only baseline so the full library stays
  reliable under Claude Code's skill-listing budget; `/role` promotes a role's set.
- Pure-Node installer, uninstaller, and SessionStart hook (`install.mjs`,
  `uninstall.mjs`, `scripts/resolve.mjs`, `hooks/session-start.mjs`) — identical on
  Linux, macOS, and Windows.
- Per-role plugin marketplace (`.claude-plugin/marketplace.json`).
- Eval harness (in-session workflow runner + CI regression gate) and offline
  `scripts/verify.mjs`.
- Documentation: README, ROLES, INSTALL-MATRIX, SKILLS, AUTHORING, EVALS, RELEASING.

[Unreleased]: https://github.com/SWEStash/swe-workflow-skills/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/SWEStash/swe-workflow-skills/releases/tag/v0.1.0
