---
name: skill-router
description: "Orchestrator and entry point for the swe-workflow skills library — consult FIRST when starting any non-trivial software task; most skills load name-only and only activate when invoked here. Routes intent to the right skill(s) and invokes them by name; shows the Golden Path chains."
when_to_use: "Triggers: starting a feature, planning, an architecture or design decision, implementing, debugging, reviewing, refactoring, testing, security, deployment, an incident, shipping, or unsure which skill fits."
allowed-tools: Read, Grep, Glob, Skill
---

# Skill Router

This project installs the **swe-workflow skills library** — a set of structured
SDLC workflows. This skill is the **orchestrator**: most skills are loaded
**name-only** (listed but not auto-triggering), so they activate by being
invoked. Use this router to pick the right skill — or skills — quickly and invoke them,
then hand off and get out of the way. A task that spans several domains or phases
needs several skills; invoke all that apply, not just the first.

## Activation model (why this skill matters)

To keep the context listing small, only a pinned set auto-triggers (this router
plus the safety skills: `verification-before-completion`, `tdd-workflow`,
`bug-investigating`, `incident-response`, `code-reviewing`). Every other skill is
**name-only** — invocable, but it will not fire on its own. Routing through this
orchestrator is how those skills get activated. A **role** can promote a working
set back to auto-triggering; switch roles with the `/role <name>` command
(`/role` to see options, `/role all` to reset to baseline).

## The rule

Before substantial software work — planning a feature, making a structural or
data decision, implementing, debugging, reviewing, refactoring, or shipping —
**check whether a dedicated skill applies, and invoke it.** This is the default,
not an optional extra. The skills encode the *how* and *why* of doing each
activity well, so you don't have to re-derive them.

Routing is **not a once-per-session gate.** Re-route whenever the *kind* of work
changes — analysis → implementation → writing tests → review → shipping — because
each phase's skill is loaded only when invoked, and the one you need for the new
phase almost certainly isn't loaded yet. A session that routed for analysis and
then writes tests an hour later without re-routing silently drops the testing
skills' guidance.

Do **not** talk yourself out of it because the task "looks like a one-liner,"
touches only one file, or seems obvious. Small structural changes (renames,
config edits, dependency bumps) and anything that matches a specific skill's
domain (accessibility, API design, security, data modeling, migrations,
performance…) are exactly what the skills are for. When in doubt, route.

Skip **only** for genuinely trivial, conversational, or information-lookup
requests where no workflow adds value, or when the user tells you not to use a
skill or to "just do X". **The user's explicit instructions always take
precedence** over any skill.

## How to route

1. **Get the full catalog.** Read `.catalog.json` from the installed skills
   directory (the parent of this skill — e.g. `.claude/skills/.catalog.json` or
   `~/.claude/skills/.catalog.json`). It holds every skill's full description, so
   you can match precisely even though their descriptions aren't in the listing.
   If it's absent (e.g. a plugin install), use the phase index below.
2. **Match** the user's intent to **every** skill that applies — not just the
   single best fit. A request often spans more than one domain (e.g. "review for
   accessibility *and* UX" → both `accessibility-design` and `ui-ux-design`) or
   more than one phase (a feature → planning, then data model, then API, …).
3. **Invoke them by name** via the Skill tool — name-only skills are fully
   invocable; the listing just doesn't show their description. When several skills
   apply, **invoke them all, in workflow order, and integrate each one's guidance
   — do not stop after the first.** Stating "I'll use both" is not enough; you
   must actually call each one (invoke the next applicable skill before you finish
   — e.g. load the UX skill before writing a combined a11y+UX review, and on a
   Golden Path chain invoke each phase's skill as you reach it). "Hand off" means
   stop narrating the routing and start the work, NOT "one skill is enough." Route
   to a single skill only when the task genuinely maps to exactly one.
4. If a matched skill isn't installed (a subset/plugin install), read its
   `SKILL.md` inline if present, or tell the user which skill/role to add.
5. If the work spans several phases, follow the relevant **Golden Path** chain,
   invoking each skill in the chain as you reach its phase.
6. If nothing fits, proceed normally — not everything needs a skill.

## Role-scoped routing (optional)

If a role is active (a `.active-role` marker sits beside the skills, or the
SessionStart hook named one), lead with that role's working set — read
`.roles.json` for it — then fall back to the rest of the catalog. The user can
change the promoted set with `/role <name>`. Either way you can invoke any
installed skill by name, regardless of role.

## Catalog by SDLC phase

### Plan & Define
- **brainstorming** — divergent Socratic ideation *before* a spec exists; opens options, then hands off
- **feature-planning** — break a feature into scoped tasks, acceptance criteria, dependencies
- **build-vs-buy** — build in-house vs vendor/SaaS vs adopt OSS: TCO, lock-in, exit costs
- **prd-writing** — write a PRD / RFC / tech spec to align on the WHAT and WHY
- **project-proposal** — business case / budget / go-no-go before a project starts
- **strategic-review** — vision, positioning, defensible wedge, live competitive/market analysis before going public
- **effort-estimation** — story points, t-shirt sizing, three-point estimates, capacity
- **metrics-and-okrs** — define OKRs, KPIs, success metrics, DORA / engineering health

### Design & Architecture
- **architecture-design** — costly-to-reverse structural decisions, pattern choice, ADRs
- **architecture-documentation** — C4 diagrams, docs-as-code, runtime/infra views
- **api-design** — REST/GraphQL contracts, endpoints, errors, pagination, versioning
- **data-modeling** — schema, relationships, indexes, migration strategy
- **ui-ux-design** — user flows, wireframes, loading/error/empty states, responsive
- **frontend-architecture** — component hierarchy, state management, design tokens
- **accessibility-design** — WCAG, ARIA, keyboard nav, focus, screen readers
- **threat-modeling** — design-time security: trust boundaries, STRIDE, abuse cases, mitigations
- **compliance-privacy** — GDPR/SOC 2 obligations: data mapping, retention/deletion, DSRs, controls
- **configuration-strategy** — env config, secrets management, feature-flag hierarchy
- **dependency-impact-analysis** — blast radius of a change *before* implementing
- **dependency-management** — evaluate, audit (CVEs), and upgrade libraries

### Build & Test
- **plan-execution** — execute an APPROVED plan: checkpoints, verification evidence, drift → re-plan
- **tdd-workflow** — NEW code, test-first, red-green-refactor
- **test-suite-design** — add tests to EXISTING code, coverage strategy
- **test-data-strategy** — factories, synthetic data, property-based, contract testing
- **browser-verification** — drive the real UI to prove a web change works: console/network/state evidence
- **subagent-orchestration** — fan work out across subagents/worktrees; verify and synthesize results
- **git-workflow** — commit messages, PR descriptions, branching strategy
- **project-documentation** — README, contributing guide, changelog, docstrings

### Review & Improve
- **code-reviewing** — structured review enforcing DRY/KISS/YAGNI/SRP & conventions
- **security-audit** — OWASP Top 10, auth/authz, injection, secrets, dependency CVEs
- **performance-optimization** — N+1, algorithmic complexity, caching, bundle size
- **refactoring** — systematic, test-protected code improvement
- **code-slop-cleanup** — strip AI slop from the branch diff before PR: comment slop, debug leftovers, defensive theater, stray working files, compat shims. Most slop cleanup is a micro-refactor: invoke this for the diff-scoped removal pass, `refactoring` when cleanup turns structural — chain both when a request spans them
- **technical-debt-review** — codebase health, hotspots, remediation roadmap
- **project-review** — whole-project execution health: scope alignment, roadmap adherence, implementation maturity, evidence-it-works
- **code-archaeology** — understand unfamiliar/legacy code first: history mining, tracing, characterization tests
- **dx-audit** — developer-experience audit: feedback loops, CI wait, flakes, onboarding, tooling friction

### Diagnose & Fix
- **bug-investigating** — systematic debugging, reproduce → isolate → hypothesize → verify

### Ship & Operate
- **deployment-checklist** — pre-deploy verification and release safety
- **rollback-strategy** — safe rollback plans, irreversible-change detection
- **containerization** — Dockerfiles, docker-compose, Kubernetes manifests
- **cicd-pipeline** — CI/CD pipelines, quality gates (GitHub Actions, GitLab CI)
- **release-management** — semver, changelog, tagging, publish gates, registry publishing, release automation (right-sized to the project)
- **infrastructure-as-code** — Terraform, CloudFormation, Pulumi, CDK
- **deployment-repo** — GitOps polyrepo orchestration, version pinning, promotion
- **gitops-delivery** — ArgoCD / Flux declarative delivery, drift detection
- **observability-design** — SLI/SLO/SLA, OpenTelemetry, structured logging, alerting
- **resilience-engineering** — failure modes, stability patterns, chaos experiments, DR/RTO/RPO, game days
- **finops-cost-optimization** — cloud spend: allocation, unit economics, rightsizing, commitments, egress
- **incident-response** — ACTIVE production incident: triage, mitigate, communicate

### Mobile
- **mobile-architecture** — platform choice, navigation, offline-first/sync, state, push, fleet constraints
- **mobile-release** — signing, store review, staged rollouts, no-rollback playbook, beta channels

### Reflect
- **retrospective** — sprint retros, project / incident post-mortems, action items

### MLOps
- **ml-pipeline-design** — ML training & feature pipelines, point-in-time correctness, orchestration
- **ml-experiment-tracking** — MLflow / W&B / DVC, run comparison, reproducibility
- **ml-model-deployment** — serving, monitoring, drift detection, safe rollouts

### AI / LLM Apps
- **llm-app-engineering** — prompt/context engineering, RAG architecture, agent design, memory
- **ai-evaluation** — golden datasets, RAG metrics, LLM-as-judge design, eval gates in CI, online A/B

### Data Engineering
- **data-pipeline-design** — batch/streaming ELT, dbt layering, Airflow/Dagster, idempotency, backfill
- **data-quality** — dbt tests, expectations, data contracts, freshness, lineage / blast radius

### Data Science
- **exploratory-data-analysis** — profile an unfamiliar dataset: missingness structure, distributions, leakage, hypotheses
- **statistical-analysis** — hypothesis tests, experiment design/power, confidence intervals, multiple-comparison discipline
- **notebook-to-production** — refactor analysis notebooks to tested, parameterized, scheduled production code

## Golden Path workflow chains

When work spans phases, chain skills rather than improvising:

**New feature**
`brainstorming` (if the idea is still fuzzy) → `feature-planning` →
`architecture-design` (if structural) → `data-modeling` (if schema) →
`threat-modeling` (if new trust boundaries) → `plan-execution` (work the
approved plan; wraps `tdd-workflow` per task) → `code-slop-cleanup` (strip AI
artifacts from the diff) → `code-reviewing` → `deployment-checklist`

**Bug / incident**
`incident-response` (if prod is down) → `bug-investigating` → `tdd-workflow`
(regression test) → `deployment-checklist`

**Continuous improvement**
`technical-debt-review` → `refactoring` → `dependency-impact-analysis`
(blast radius) → `test-suite-design` (if coverage is thin)

**Ship a release**
`git-workflow` (commits carry the bump intent) → `release-management` (version,
changelog, tag, publish gate, registry) → `deployment-checklist` (if it deploys) →
`rollback-strategy`. `cicd-pipeline` automates the gate as a pipeline stage.
App-store releases (signing, review, staged rollout) → `mobile-release`.

**LLM feature**
`feature-planning` → `llm-app-engineering` (prompt/RAG/agent design) →
`ai-evaluation` (golden set, judge, CI gate) → `deployment-checklist`.
`ml-model-deployment` joins when serving your own model.

**Analytics / data pipeline**
`data-pipeline-design` (ELT, layering, orchestration) → `data-modeling`
(marts schema) → `data-quality` (tests, contracts, freshness) →
`observability-design` (pipeline SLOs, alerting).
Notebook to production: `exploratory-data-analysis` (understand the data) →
`statistical-analysis` (test the hypotheses) → `notebook-to-production`
(modules, tests, scheduling); if the notebook trains a model →
`ml-pipeline-design` instead.

**Pre-public / pre-milestone review**
`strategic-review` (vision, positioning, market) → `project-review` (scope,
roadmap, implementation, evidence) → synthesis → `artifact-design` (interactive
report). See `strategic-review/templates/full-review-prompt.md` for the combined brief.

## When NOT to route

- Pure questions, explanations, or conversation with no workflow component.
- The user named a specific skill or explicitly opted out — follow them.
- Tiny mechanical edits (typo, rename) where a workflow is overhead.
