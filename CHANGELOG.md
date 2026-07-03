# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html) as defined in
[docs/RELEASING.md](docs/RELEASING.md).

## [Unreleased]

### Added
- Four ideation & execution skills (Phase 3 of the expansion roadmap):
  - `brainstorming` — divergent Socratic ideation upstream of `prd-writing` /
    `feature-planning`: problem re-framing, real-vs-inherited constraints,
    judgment-deferred generation, wildcard widening (do-nothing / 1/10-scope /
    buy-instead-of-build), criteria-first convergence with a parking lot.
  - `plan-execution` (hardened) — checkpointed execution of an approved plan:
    verification declared per checkpoint before executing, evidence recorded
    before marking done ("never mark a checkpoint done without fresh
    verification evidence" Iron Law, pressure-tested), drift log, and explicit
    re-planning triggers instead of silent improvisation.
  - `threat-modeling` — design-time security analysis: trust boundaries,
    attack-surface enumeration, STRIDE per element/boundary crossing (with a
    per-category mitigation catalog in references/), abuse cases, and
    mitigation decisions that become security requirements. Complements the
    reactive `security-audit`.
  - `build-vs-buy` — build vs vendor/SaaS vs OSS adoption: core-vs-commodity
    framing, 3-year TCO (ownership, opportunity, exit), lock-in and vendor/OSS
    viability, weighted decision matrix recorded ADR-style with a revisit
    trigger. `architecture-design` keeps internal-structure decisions.
- Role/core updates: `brainstorming` joins the **universal core** (em, pm,
  strategy, designer), `plan-execution` joins the **technical core** (all
  engineering roles; backend now sits exactly at the ~20-description crop cap),
  `security` gains `threat-modeling`, `strategy` gains `build-vs-buy`.
- `skill-router`: the four skills registered in the phase index; the "New
  feature" Golden Path now starts at `brainstorming` (when the idea is fuzzy)
  and runs `threat-modeling` (new trust boundaries) and `plan-execution` (work
  the approved plan) at the right phases.
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
- Boundary notes added for the Phase-3 skills: `feature-planning` ("plan this /
  break this down" stays here; executing an approved plan → `plan-execution`),
  `security-audit` (existing code/config here; unbuilt designs →
  `threat-modeling`), and `architecture-design` (internal structure here;
  sourcing decisions → `build-vs-buy`) — instruction-style disambiguation per
  the EVALS.md routing finding.
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
