# Skill Catalog

All 66 skills in the library — 64 SDLC workflows plus two meta skills
(`skill-router`, the orchestrator, and `writing-skills`, the authoring guide).
Every skill's full description lives in `catalog.json` (what the orchestrator
routes on); this page is the human-readable index.

See [ROLES.md](ROLES.md) for which skills each role promotes, and the
[README](../README.md) for installation.

## Meta (2)

| Skill | Purpose |
|-------|---------|
| `skill-router` | Entry point and dispatcher — maps an intent to the right skill(s) and lays out the Golden Path workflow chains. Invoke it FIRST on any non-trivial task. Pairs with the optional [SessionStart hook](../hooks/README.md). |
| `writing-skills` | How to author, edit, and pressure-test skills — description/budget rules, progressive disclosure, the 3-eval rule, TDD-for-docs. The installable companion to [AUTHORING.md](AUTHORING.md). |

## Software Engineering (31)

| Skill | Phase | Purpose |
|-------|-------|---------|
| `feature-planning` | Planning | Break features into well-scoped tasks with acceptance criteria |
| `architecture-design` | Design | Make and document architectural decisions with ADRs |
| `api-design` | Design | Design REST/GraphQL endpoints, contracts, errors, and pagination |
| `data-modeling` | Design | Design schemas, relationships, and migration strategies |
| `threat-modeling` | Design | Design-time security analysis — trust boundaries, STRIDE per element, abuse cases, prioritized mitigations |
| `plan-execution` | Implementation | Execute an approved plan in verified checkpoints — evidence per checkpoint, drift log, re-planning triggers |
| `tdd-workflow` | Implementation | Red-green-refactor cycle with test-first development |
| `test-suite-design` | Quality | Add comprehensive test suites to existing code, plan test strategy |
| `code-reviewing` | Quality | Structured reviews enforcing principles and best practices |
| `security-audit` | Quality | OWASP Top 10 assessment, auth review, vulnerability scanning |
| `compliance-privacy` | All Phases | GDPR/SOC 2 engineering — data mapping, retention/deletion, DSR machinery, audit controls |
| `browser-verification` | Quality | Drive the real UI to prove a web change works — console/network/state evidence |
| `performance-optimization` | Quality | Bottleneck detection, query optimization, caching strategy |
| `refactoring` | Improvement | Systematic code improvement guided by design principles |
| `code-slop-cleanup` | Improvement | Strip AI slop from a branch diff before PR — comments, debug leftovers, defensive theater, stray files |
| `technical-debt-review` | Improvement | Codebase health assessment — hotspots, debt categories, remediation roadmap; plus an AI-slop-audit mode (14-category scorecard, systemic "fix once at the source" patterns) |
| `project-review` | Improvement | Whole-project execution health — scope/roadmap alignment, implementation maturity, evidence it works |
| `dependency-management` | Maintenance | Evaluate, audit, and upgrade project dependencies |
| `code-archaeology` | Maintenance | Understand unfamiliar/legacy code — history mining, tracing, characterization tests |
| `dx-audit` | Improvement | Developer-experience audit — feedback loops, CI wait, flakes, onboarding, tooling friction |
| `subagent-orchestration` | All Phases | Fan work out across subagents/worktrees — decompose, isolate, verify, synthesize |
| `dependency-impact-analysis` | All Phases | Map blast radius before changing an API, schema, or shared component |
| `bug-investigating` | Maintenance | Root cause analysis with structured debugging methodology |
| `git-workflow` | All Phases | Commit messages, PR descriptions, and branching strategy |
| `project-documentation` | All Phases | README, API docs, contributing guides, and changelogs |
| `architecture-documentation` | All Phases | Multi-level architecture diagrams (context, container, component, runtime) |
| `configuration-strategy` | All Phases | Environment config, secrets management, and feature-flag hierarchy |
| `deployment-checklist` | Release | Pre-deploy verification and release safety checks |
| `rollback-strategy` | Release | Safe rollback plans — identify irreversible changes, plan undo procedures |
| `incident-response` | Operations | Structured production incident triage, mitigation, communication, recovery |
| `verification-before-completion` | All Phases | Evidence gate — run the proving command and read its output before claiming done |

## Design (3)

| Skill | Purpose |
|-------|---------|
| `ui-ux-design` | User flows, screen specs, interaction patterns, loading/error/empty states, responsive strategy |
| `frontend-architecture` | React component hierarchy, state management, design tokens, data fetching, code organization |
| `accessibility-design` | WCAG compliance, semantic HTML, ARIA, keyboard navigation, focus management, screen readers |

## DevOps (8)

| Skill | Purpose |
|-------|---------|
| `containerization` | Dockerfiles, docker-compose, Kubernetes manifests with security and efficiency best practices |
| `cicd-pipeline` | CI/CD pipeline design for GitHub Actions, GitLab CI with quality gates and safe deploys |
| `release-management` | Cut and publish releases right-sized to the project — semver, changelogs, tagging, publish gates, release automation (release-please/changesets/semantic-release) |
| `infrastructure-as-code` | Terraform/IaC modules with state management, security, and environment separation |
| `deployment-repo` | Multi-repo deployment orchestration and environment promotion |
| `gitops-delivery` | GitOps-based delivery with Flux/ArgoCD patterns |
| `resilience-engineering` | Failure-mode analysis, stability patterns (timeouts/retries/breakers/bulkheads), chaos experiments, DR with RTO/RPO, game days |
| `finops-cost-optimization` | Cloud cost visibility/allocation, unit economics, rightsizing, commitment discounts, architecture cost review |

## MLOps (3)

| Skill | Purpose |
|-------|---------|
| `ml-experiment-tracking` | Experiment design, reproducibility, tracking with MLflow/W&B, model registry |
| `ml-pipeline-design` | Training pipelines, data validation, feature engineering, continuous training |
| `ml-model-deployment` | Model serving, drift detection, monitoring, safe rollout strategies |

## AI Engineering (2)

| Skill | Purpose |
|-------|---------|
| `llm-app-engineering` | Prompt/context engineering, RAG architecture (chunking, hybrid retrieval, reranking, grounding), agent design, memory |
| `ai-evaluation` | Golden datasets, offline metrics, RAG evaluation (ragas/deepeval/promptfoo), LLM-as-judge design and calibration, eval gates in CI, online A/B |

## Data Science (3)

| Skill | Purpose |
|-------|---------|
| `exploratory-data-analysis` | Profile an unfamiliar dataset — missingness structure, distributions/outliers, feature–target relationships, leakage, hypotheses |
| `statistical-analysis` | Hypothesis tests with stated assumptions, experiment design/power, confidence intervals, multiple-comparison discipline |
| `notebook-to-production` | Refactor analysis notebooks to tested, parameterized, scheduled production code — with triage of what deserves it |

## Data Engineering (2)

| Skill | Purpose |
|-------|---------|
| `data-pipeline-design` | Batch/streaming ELT, dbt layering (staging/intermediate/marts), Airflow/Dagster orchestration, idempotent loads, backfills, CDC |
| `data-quality` | dbt tests and expectations, data contracts, source freshness, schema-drift/volume anomaly detection, lineage and blast radius |

## Mobile (2)

| Skill | Purpose |
|-------|---------|
| `mobile-architecture` | Platform choice (native vs cross-platform), navigation/deep links, offline-first and sync, state surviving process death, fleet constraints |
| `mobile-release` | Signing, store review, staged rollouts with halt criteria, beta channels, the forward-only (no-rollback) playbook |

## Evaluation & Monitoring (2)

| Skill | Purpose |
|-------|---------|
| `observability-design` | SLI/SLO/SLA design, error budgets, OpenTelemetry, structured logging, alerting, dashboards |
| `test-data-strategy` | Test data factories, synthetic data, property-based testing, boundary analysis, contract testing |

## Project Management — Agile (8)

| Skill | Purpose |
|-------|---------|
| `brainstorming` | Divergent Socratic ideation before a spec exists — widen options, test constraints, converge with criteria, hand off |
| `project-proposal` | Business case, scope, budget estimate, risk assessment, go/no-go documents |
| `build-vs-buy` | Build vs vendor/SaaS vs OSS adoption — core-vs-commodity, multi-year TCO, lock-in and exit costs |
| `prd-writing` | Lightweight agile PRDs and technical RFCs for stakeholder alignment |
| `effort-estimation` | Story points, t-shirt sizing, three-point estimation, capacity planning |
| `metrics-and-okrs` | OKR design, KPI definition, DORA metrics, success measurement |
| `retrospective` | Sprint retros, project post-mortems, incident post-mortems with blameless culture |
| `strategic-review` | Vision, positioning, defensible wedge, and live competitive/market analysis before going public |
