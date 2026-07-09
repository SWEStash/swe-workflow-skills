# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html) as defined in
[docs/RELEASING.md](docs/RELEASING.md).

## [0.5.0](https://github.com/SWEStash/swe-workflow-skills/compare/v0.4.0...v0.5.0) (2026-07-09)


### Added

* add disable/enable command and clean docs for public launch ([#8](https://github.com/SWEStash/swe-workflow-skills/issues/8)) ([7ef998b](https://github.com/SWEStash/swe-workflow-skills/commit/7ef998b3d48953d41ba30f08ba5f5bf4ae05189a))

## [Unreleased]

### Added
- `disable` / `enable` / `list-disabled` CLI commands (`npx swe-workflow-skills
  disable <skill>`, also `node disable.mjs …`) — an advanced opt-out that hides a
  skill from routing and auto-trigger. Default state `user-invocable-only` (still
  runnable as `/<skill>`), `--off` to hide it entirely. The choice is recorded in a
  `.disabled-skills` marker beside the skills and folded into the baseline by
  `applyBaseline`, so the SessionStart hook re-asserts it instead of reverting a
  manual `settings.local.json` edit. Documented in docs/ROLES.md; covered by a new
  `verify.mjs` fixture.

### Changed
- Documentation cleanup for the public launch: removed internal planning naming
  (milestone/phase codes, the roadmap and open-follow-ups sections, and the
  obsolescence-pilot cost log) from the public docs — internal planning now lives in
  `.local/` (gitignored). Fixed stale counts (INSTALL-MATRIX role list → 15).
- Clarified that the CLI installer is a **two-step** setup: wiring the printed
  `SessionStart` hook snippet is required for auto-routing. README, INSTALL-MATRIX,
  ROLES.md, and the installer's own output now call this out (skipping it keeps
  crop-safety but disables the router nudge and post-`/compact` re-assert).
- README: added an npm version badge and a pointer to the disable command.

## [0.4.0](https://github.com/SWEStash/swe-workflow-skills/compare/v0.3.0...v0.4.0) (2026-07-08)


### Added

* harden installer provenance, /role, and CI; add SECURITY.md ([#4](https://github.com/SWEStash/swe-workflow-skills/issues/4)) ([e20e292](https://github.com/SWEStash/swe-workflow-skills/commit/e20e29252508034f060514bfb499e463508a4d84))

## [0.3.0](https://github.com/SWEStash/swe-workflow-skills/compare/v0.2.0...v0.3.0) (2026-07-07)

This release: library-machinery modernization plus the Data Scientist
expansion — 3 new skills (62 → 65) and the 15th role. The toolchain is now
`when_to_use`-aware with lazy per-skill migration, the heavy review skills run
as forked subagents, the diff-driven skills inject their diff at load time, the
obsolescence review is a standing policy with its first pass done, and three
installer/command hardening items are closed. Everything gated before release:
GREEN ≥ RED on every touched skill's evals (opus runner) and a routing layer-2
clean sweep — 124 cases, positive 64/64, boundary 52/52, zero confusion pairs.

Library-machinery modernization: the toolchain is now `when_to_use`-aware
(lazy per-skill migration, no big-bang), the four heavy review skills run as
forked subagents, and the two diff-driven skills load their diff at
skill-load time.

The obsolescence review is now a standing policy (slim first, retire late) and
its first pass reviewed 6 of the oldest task-like skills: one slimmed, one real
content bug caught and fixed, four confirmed still earning their tokens. Three
Low-severity installer/command hardening items from the security audit are
closed.

The Data Scientist expansion: three new data-science skills (62 → 65) and the
15th role, with the notebook-productionization boundary between the new skills
and `ml-pipeline-design` designed and eval-gated in both directions.

### Added
- Three data-science skills, authored natively in the `description`/
  `when_to_use` split with RED baselines captured before authoring
  (GREEN ≥ RED on all 9 eval cases, opus runner):
  - `exploratory-data-analysis` — profile an unfamiliar dataset: missingness
    structure (random vs structural), distributions/outliers, feature–target
    relationships, target leakage, explicit hypothesis generation; hands
    pipeline-level data trust to `data-quality`.
  - `statistical-analysis` — hypothesis tests with stated assumptions,
    experiment design and power, effect sizes and confidence intervals over
    bare p-values, multiple-comparisons/peeking discipline; hands live A/B of
    AI apps to `ai-evaluation`.
  - `notebook-to-production` — triage-first refactor of analysis notebooks to
    tested, parameterized, environment-pinned, scheduled production code;
    hands model-training notebooks to `ml-pipeline-design`.
- `data-scientist` role (15th): technical core + the three new skills +
  `ml-experiment-tracking`, `data-quality`, `data-modeling`, `ai-evaluation`
  (15 skills, crop-safe), with its own `swe-workflow-data-scientist` plugin.
- `skill-router`: new Data Science catalog section and a notebook-to-production
  chain on the Analytics Golden Path.
- `ml-pipeline-design` gained its missing scope-boundary eval (a reporting
  notebook must hand off to `notebook-to-production`) — the first of the
  two-eval skills flagged in the obsolescence review to be topped up at touch time.
- `description`/`when_to_use` split support: `build-plugins.mjs` reads the
  `when_to_use` frontmatter field (single-line and block scalars) and emits
  `description` + `when_to_use` concatenated into each `catalog.json` entry
  (schema unchanged), so migrated and unmigrated skills are equivalent to the
  `skill-router` and the routing evals. New guards: `description` > 1,024 chars
  errors (platform cap), combined listing > 1,536 errors (platform listing
  cap), combined > 600 warns. Migration policy is **lazy**: new skills use the
  split natively; existing skills migrate whenever next touched, as a pure
  move with boundary instructions staying in `description` (docs/AUTHORING.md).
- `context: fork` + `agent: general-purpose` on `project-review`,
  `technical-debt-review`, `security-audit`, `strategic-review`: the heavy
  reads happen in an isolated subagent; each skill now writes its full report
  to a file and records anything needing user input in an **Open questions**
  section (forked skills cannot ask mid-run). Smoke-tested 4/4.
- Dynamic context injection: `git-workflow` opens its commit and PR workflows
  with live `git diff --stat` / `git log` output (failure-tolerant, `main` →
  `master` fallback); `code-reviewing` opens with a guarded `git diff --stat`
  and proceeds with the provided code when it's empty or irrelevant.
- `verify.mjs`: fixture assertions for the `when_to_use` concatenation and a
  corrupt-settings regression check.
- Obsolescence review policy (docs/AUTHORING.md § Obsolescence review, applied
  form in `writing-skills`): once per release cycle — or on a major base-model
  update — re-run a skill's evals RED on shipping models; RED ≈ GREEN across
  all evals → slim first (keep Iron Laws, boundaries, cross-references); retire
  only after a slimmed skill stays RED ≈ GREEN a full further cycle, with a
  deprecation notice here and in ROLES.md first.
- `verify.mjs`: installer-hardening step — a path-traversal positional arg must
  be rejected before anything is copied, and a config path containing `$(…)`
  must come out escaped in the printed hook snippet.

### Changed
- First six skills migrated to the `description`/`when_to_use` split (the
  fork quartet + `git-workflow` + `code-reviewing`); routing neighborhood
  re-verified 17/17 with zero confusion pairs.
- `git-workflow`'s small-team branching guidance now names squash-merge as the
  default, explicit branch naming, and a review bar — a gap its own evals
  exposed (GREEN 6/6 after the fix).
- Content-eval generators and judges are pinned to opus in
  `evals/workflow-runner.mjs` for cross-session score comparability.
- `effort-estimation` slimmed per the obsolescence review (95 → 54 lines):
  the worked translation math, the method table, and the estimation-traps list
  — all RED-equivalent on shipping models across 3 samples — are cut; the
  workflow, boundaries, and reference pointers stay. GREEN ≥ RED held per case
  after the slim.
- `project-documentation`'s changelog workflow now keeps entry drafting (from
  git history included) in-skill and hands only the release mechanics (version
  choice, tagging, publish automation) to `release-management` — the obsolescence
  review caught the old boundary wording deflecting the whole task (GREEN 0/6 vs RED
  4/6; 6/6 after the fix).
- Three more skills lazy-migrated to the `description`/`when_to_use` split
  (`writing-skills`, `effort-estimation`, `project-documentation` — 9 total);
  regenerated catalog byte-identical each time, routing neighborhood 12/12
  with zero confusion pairs.
- `ml-pipeline-design`'s "notebook to pipeline" trigger narrowed to "notebook
  to **training** pipeline" with an explicit scope check in the body — general
  analysis/reporting notebooks now route to `notebook-to-production`
  (GREEN ≥ RED held on all 3 of its evals after the change).
- `ai-evaluation` gained the reciprocal boundary: general experiment
  statistics → `statistical-analysis`.
- Three more skills lazy-migrated to the split at touch time
  (`ml-pipeline-design`, `ai-evaluation`, `skill-router` — 12 total;
  `skill-router`'s catalog entry proven content-equal, 488 → 488 chars).

### Fixed
- Corrupt (hand-edited) `settings.local.json` no longer reads as empty — the
  SessionStart hook would rebuild it and silently destroy the user's local
  settings. It now throws; the hook skips the write and leaves the file alone.
- `resolvedSkills` was implemented twice (resolve.mjs and build-plugins.mjs)
  and had drifted; the builder now imports the single implementation.
- npm package description still advertised "44 skills" (stale since the initial
  release, shipped in 0.2.0); now number-free.
- `install.mjs` accepted path-like positional args: `node install.mjs ../..`
  passed the directory guard and the clean-copy `rmSync` could then delete
  outside the destination. Positional args are now whitelisted against the
  `skills/` directory names before anything is copied or removed.
- The printed SessionStart hook snippet quoted the hook path with plain JSON
  escaping, so a config path containing `$(cmd)` or backticks would execute at
  every session start once merged into `settings.json`; the path is now
  shell-quoted (backslash/quote rendering unchanged, Windows paths unaffected).
- The `/role` command interpolated `$ARGUMENTS` directly inside its executable
  script, letting a crafted argument run in the shell. The argument now reaches
  the script only through a validated placeholder transfer, with an in-script
  guard as defense-in-depth.

## [0.2.0](https://github.com/SWEStash/swe-workflow-skills/compare/v0.1.0...v0.2.0) (2026-07-04)

The skills-expansion release: 18 new skills (44 → 62), 3 new roles (ai, data,
mobile — 14 total), and the automated release pipeline that shipped this very
version. Every new skill carries 3 evals; the full expansion passed the
RED/GREEN content harness (GREEN ≥ RED on all cases, pressure tests held) and
the routing harness (top-1 1.00, zero confusion pairs) before release.

### Added
- Nine skills across three groups:
  - Governance & ops: `compliance-privacy` (GDPR/CCPA/SOC 2 engineering — data
    mapping, minimization/retention, DSR machinery, control evidence; →
    `security` role), `finops-cost-optimization` (allocation, unit economics,
    rightsizing, commitments, architecture cost shape; → `strategy` role),
    `code-archaeology` (history mining, tracing, Chesterton's fence,
    characterization tests; → `architect` role), `resilience-engineering`
    (failure modes, stability patterns, restore testing, chaos experiments,
    game days, RTO/RPO; → `devops` role).
  - DX & verification: `dx-audit` (loop measurement, friction log, avoidance
    signals, tax-based prioritization; → `em` role), `browser-verification`
    (drive the real UI; console/network/state evidence; the browser-specific
    practice of verification-before-completion; → `frontend` + `qa` roles),
    `subagent-orchestration` (fan-out judgment, cold-start prompting, worktree
    isolation, skeptical verification and synthesis; deliberately role-less via
    `meta_only`).
  - Mobile: `mobile-architecture` (platform choice, offline-first/sync,
    process-death survival, fleet constraints) and `mobile-release` (signing,
    store review, staged rollouts with halt criteria, the forward-only
    no-rollback playbook) — plus the new **`mobile` role** (14th role).
- Catalog budget guards in `scripts/build-plugins.mjs`: per-description error
  above the 1,024-char platform cap, warning above the 600-char soft cap, and a
  total-catalog warning at 48k chars (~12k tokens) — the router (haiku) pays
  the whole catalog per routing call; the warning points at the two-stage
  routing adaptation documented in docs/ROLES.md.
- `skill-router`: nine new phase-index entries, a new "Mobile" section, and an
  app-store branch on the "Ship a release" Golden Path.
- Four ideation & execution skills:
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
- Four AI & data skills:
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
- Automated release pipeline, per the library's own `release-management` skill:
  release-please maintains a release PR from the Conventional Commit history;
  `scripts/sync-version.mjs` fans the computed version into the `VERSION` SSOT
  and regenerates the marketplace / 14 plugins / catalog inside the release
  commit; merging the PR tags, cuts the GitHub release, and publishes to npm
  via OIDC trusted publishing behind a fresh `verify.mjs` gate. This release
  (0.2.0) is the first cut by the pipeline.
- README "Why this library" now showcases the measured strengths (routed activation,
  eval harnesses with CI gates, hardened safety skills, full-SDLC breadth), and a new
  Acknowledgements section credits the projects this library builds on
  (obra/superpowers, anthropics/skills, the Agent Skills docs, the community lists).

### Changed
- docs/RELEASING.md rewritten for the automated flow: what release-please
  automates, what stays manual (the semver sanity check, changelog curation on
  the release PR, the merge as the deliberate trigger), how the
  VERSION/package.json/marketplace lockstep works, and a manual-fallback recipe.
- Boundary notes added for the ideation/execution skills: `feature-planning` ("plan this /
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

[Unreleased]: https://github.com/SWEStash/swe-workflow-skills/compare/v0.4.0...HEAD
[0.1.0]: https://github.com/SWEStash/swe-workflow-skills/releases/tag/v0.1.0
