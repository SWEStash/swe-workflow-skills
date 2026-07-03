# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html) as defined in
[docs/RELEASING.md](docs/RELEASING.md).

## [Unreleased]

### Added
- Four AI & data skills (Phase 2 of the expansion roadmap):
  - `ai-evaluation` — golden datasets, offline metrics, RAG evaluation
    (faithfulness / answer relevance / context precision-recall) with
    ragas / deepeval / promptfoo, LLM-as-judge design and calibration, eval
    regression gates in CI, and online A/B + human feedback.
  - `llm-app-engineering` — prompt/context engineering, RAG architecture
    (chunking, hybrid retrieval, reranking, grounded prompts, context budget),
    agent design (tool surfaces, decomposition, guardrails), memory; delegates
    measurement to `ai-evaluation`.
  - `data-pipeline-design` — batch/streaming ELT, dbt layering
    (staging/intermediate/marts), Airflow/Dagster orchestration, idempotent
    loads, parameterized backfills, CDC ingestion.
  - `data-quality` — dbt tests and expectations, data contracts at the producer
    boundary, source freshness, severity/ownership/alerting, schema-drift and
    volume anomaly detection, lineage-scoped blast radius.
- New roles: `ai` (AI Engineer: llm-app-engineering, ai-evaluation,
  ml-experiment-tracking, ml-model-deployment, api-design) and `data`
  (Data Engineer: data-pipeline-design, data-quality, data-modeling,
  test-data-strategy, observability-design), both on the technical core.
- `skill-router`: new "AI / LLM Apps" and "Data Engineering" phase-index
  sections and two Golden Paths (LLM feature; analytics/data pipeline).
- `release-management` skill: cut and publish releases right-sized to the project —
  semver decisions, changelogs, tagging, publish gates, registry publishing, and
  release automation (release-please / changesets / semantic-release), with a
  pressure-tested "never publish without a fresh verification gate" Iron Law.
  Added to the `devops` and `em` roles and to a new "Ship a release" Golden Path.
- README "Why this library" now showcases the measured strengths (routed activation,
  eval harnesses with CI gates, hardened safety skills, full-SDLC breadth).
- Roadmap of upcoming skills and roles (AI/data, ideation/execution, deferred sets)
  in docs/ROLES.md.

### Changed
- `ml` role gains `ai-evaluation`; `ml-pipeline-design` and
  `ml-experiment-tracking` descriptions now state their boundaries with the new
  `data-pipeline-design` and `ai-evaluation` skills.
- AUTHORING.md and `writing-skills` refreshed to current Agent Skills platform rules:
  `when_to_use` and other newer frontmatter fields (`context: fork`, `paths`,
  `disable-model-invocation`, `effort`), dynamic context injection, compaction
  re-attachment budgets, and corrected listing-budget drop order (least-invoked).
- `git-workflow`, `cicd-pipeline`, `deployment-checklist`, and
  `project-documentation` now cross-reference `release-management` (commit-type →
  semver mapping, publish-gate stage, release-cut checklist item, changelog
  promotion).
- `devops` role: `release-management` replaces `dependency-impact-analysis` (still in
  `architect` and always routable) to stay within the plugin listing cap.

### Fixed
- License badge now uses static shields.io endpoint for reliability.
- `writing-skills` pointed to a non-existent README "Building Skills" section; now
  points to docs/AUTHORING.md.

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
- `swe-workflow-skills` npm package: `npx swe-workflow-skills install [--global|--role R]`
  (and `uninstall`), no clone required.
- Eval harness (in-session workflow runner + CI regression gate) and offline
  `scripts/verify.mjs`.
- Documentation: README, ROLES, INSTALL-MATRIX, SKILLS, AUTHORING, EVALS, RELEASING.

[Unreleased]: https://github.com/SWEStash/swe-workflow-skills/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/SWEStash/swe-workflow-skills/releases/tag/v0.1.0
