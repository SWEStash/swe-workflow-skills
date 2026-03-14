# Dev Workflow Skills for Claude Code

A curated collection of 36 Claude Code Agent Skills designed for senior software engineers who want to enforce best practices, maintain high code quality, and accelerate their development workflow.

## Philosophy

These skills encode the methodology of a disciplined engineer: DRY, YAGNI, KISS, functional independence, TDD, clean architecture, and thoughtful design decisions. Each skill guides Claude Code through a specific phase of the SDLC, ensuring consistent quality without sacrificing speed.

## Skills Overview

### Software Engineering (20 skills)

| Skill | Phase | Purpose |
|-------|-------|---------|
| `feature-planning` | Planning | Break features into well-scoped tasks with acceptance criteria |
| `architecture-design` | Design | Make and document architectural decisions with ADRs |
| `api-design` | Design | Design REST/GraphQL endpoints, contracts, errors, and pagination |
| `data-modeling` | Design | Design schemas, relationships, and migration strategies |
| `tdd-workflow` | Implementation | Red-green-refactor cycle with test-first development |
| `test-suite-design` | Quality | Add comprehensive test suites to existing code, plan test strategy |
| `code-reviewing` | Quality | Structured reviews enforcing principles and best practices |
| `security-audit` | Quality | OWASP Top 10 assessment, auth review, vulnerability scanning |
| `performance-optimization` | Quality | Bottleneck detection, query optimization, caching strategy |
| `refactoring` | Improvement | Systematic code improvement guided by design principles |
| `dependency-management` | Maintenance | Evaluate, audit, and upgrade project dependencies |
| `bug-investigating` | Maintenance | Root cause analysis with structured debugging methodology |
| `git-workflow` | All Phases | Commit messages, PR descriptions, and branching strategy |
| `project-documentation` | All Phases | README, API docs, contributing guides, and changelogs |
| `deployment-checklist` | Release | Pre-deploy verification and release safety checks |
| `rollback-strategy` | Release | Design safe rollback plans before deploying — identify irreversible changes, plan undo procedures |
| `incident-response` | Operations | Structured production incident triage, mitigation, communication, and recovery |
| `configuration-strategy` | All Phases | Design environment config, secrets management, and feature flag hierarchy for a feature or service |
| `technical-debt-review` | Improvement | Strategic codebase health assessment — identify hotspots, categorize debt, produce remediation roadmap |
| `dependency-impact-analysis` | All Phases | Map blast radius before changing an API, schema, or shared component — classify breaking vs. additive |

### Design (3 skills)

| Skill | Purpose |
|-------|---------|
| `ui-ux-design` | User flows, screen specs, interaction patterns, loading/error/empty states, responsive strategy |
| `frontend-architecture` | React component hierarchy, state management, design tokens, data fetching, code organization |
| `accessibility-design` | WCAG compliance, semantic HTML, ARIA patterns, keyboard navigation, focus management, screen readers |

### DevOps (3 skills)

| Skill | Purpose |
|-------|---------|
| `containerization` | Dockerfiles, docker-compose, Kubernetes manifests with security and efficiency best practices |
| `cicd-pipeline` | CI/CD pipeline design for GitHub Actions, GitLab CI with quality gates and safe deploys |
| `infrastructure-as-code` | Terraform/IaC modules with state management, security, and environment separation |

### MLOps (3 skills)

| Skill | Purpose |
|-------|---------|
| `ml-experiment-tracking` | Experiment design, reproducibility, tracking with MLflow/W&B, model registry |
| `ml-pipeline-design` | Training pipelines, data validation, feature engineering, continuous training |
| `ml-model-deployment` | Model serving, drift detection, monitoring, safe rollout strategies |

### Evaluation & Monitoring (2 skills)

| Skill | Purpose |
|-------|---------|
| `observability-design` | SLI/SLO/SLA design, error budgets, OpenTelemetry, structured logging, alerting, dashboards |
| `test-data-strategy` | Test data factories, synthetic data, property-based testing, boundary analysis, contract testing, GDPR-safe data |

### Project Management — Agile (5 skills)

| Skill | Purpose |
|-------|---------|
| `project-proposal` | Business case, scope, budget estimate, risk assessment, go/no-go decision documents |
| `prd-writing` | Lightweight agile PRDs and technical RFCs for stakeholder alignment |
| `effort-estimation` | Story points, t-shirt sizing, three-point estimation, capacity planning, budget forecasting |
| `metrics-and-okrs` | OKR design, KPI definition, DORA metrics, success measurement |
| `retrospective` | Sprint retros, project post-mortems, incident post-mortems with blameless culture |

## Installation

### Per-project (recommended for teams)
```bash
cp -r skills/* your-project/.claude/skills/
git add .claude/skills/
git commit -m "feat: add dev workflow skills for Claude Code"
```

### Global (personal use across all projects)
```bash
cp -r skills/* ~/.claude/skills/
```

## Skill Architecture

Each skill follows the progressive disclosure pattern:

```
skill-name/
├── SKILL.md              # Entry point: metadata + core workflow (< 500 lines)
├── references/            # Deep-dive docs loaded on demand
│   └── principles.md     # Domain-specific guidelines
├── templates/             # Output templates
│   └── template.md       # Structured output formats
└── scripts/               # Utility scripts (optional)
    └── validate.sh        # Validation helpers
```

## Design Principles

1. **Concise over verbose** — Claude is smart; only add what it doesn't already know
2. **Progressive disclosure** — SKILL.md is the map; reference files are the territory
3. **Appropriate freedom** — Strict where fragile, flexible where creative
4. **Feedback loops** — Validate-fix-repeat for quality-critical operations
5. **Composable** — Skills can be used independently or combined in workflows

## Evaluation Strategy

Each skill includes an `evals/` directory with test scenarios:

```json
{
  "skill_name": "skill-name",
  "evals": [
    {
      "id": 1,
      "prompt": "Realistic user prompt",
      "expected_output": "Description of what good looks like",
      "assertions": ["Specific verifiable criteria"]
    }
  ]
}
```

## Building Skills

This section covers what you need to know to author a new skill or modify an existing one.

### Description Is Everything

The `description` field in SKILL.md's YAML frontmatter is the primary mechanism Claude uses to decide whether to load a skill. If the description doesn't match the user's prompt, the skill never runs — no matter how good the workflow is.

**Rules for writing descriptions:**
- **Keyword-rich**: Include all the phrases a user might say ("plan this feature", "scope this out", "break this down", "sprint planning"). Cast a wide net.
- **Third-person, present tense**: "Use when the user needs to..." not "I help with..."
- **Under 1024 characters**: Hard limit enforced by Claude Code
- **Slightly assertive**: "Use when the user reports a bug" triggers more reliably than "May be used for bug reports." Lean toward the pushy side — under-triggering is the most common failure mode.
- **Include related vocabulary**: If your skill is about deployments, also mention "go live", "ship it", "push to production", "release".

### Token Economy and Progressive Disclosure

Every token in SKILL.md costs token budget when the skill is loaded. Reference files cost zero tokens until Claude explicitly loads them. This creates three loading tiers:

1. **Metadata** (~100 tokens): Skill name + description. Always loaded when the skill is matched.
2. **SKILL.md** (< 500 lines): Core workflow, principles, and cross-references. Loaded when skill activates.
3. **references/ and templates/**: Deep-dive docs, loaded on demand within a conversation.

This means a skill with 10,000 lines of reference material costs zero extra tokens until Claude needs that material. **Put everything Claude already knows in references; put only what's unique to your workflow in SKILL.md.**

### When to Use Scripts, References, and Templates

| Resource type | Use when | Example |
|---|---|---|
| `references/*.md` | Deep technical detail that's only needed sometimes (patterns, checklists, domain knowledge) | `owasp-top-10.md`, `debugging-patterns.md` |
| `templates/*.md` | Output format matters for consistency (documents, specs, reports) | `adr.md`, `pull-request.md` |
| `scripts/` | A step should always happen identically — pixel-perfect output, file generation, validation | A script that generates a migration file in the project's exact format |

These workflow skills guide *thinking*, not deterministic file operations. When in doubt, use a reference file over a script.

### Eval Design

Each skill must have exactly 3 evals:

1. **Happy path**: The canonical use case. User provides good input, skill produces the expected artifact.
2. **Edge case**: Unusual but valid input that tests a corner of the workflow (empty state, very large scope, ambiguous requirements).
3. **Scope boundary**: A prompt that seems related but should NOT trigger this skill, or that triggers it and correctly hands off to a different skill.

The `assertions` array should contain specific, verifiable criteria — not vague goals like "produces a good plan."

### Common Mistakes

1. **Over-stuffing SKILL.md**: If your skill is over 300 lines, move domain knowledge to `references/`. Claude doesn't need to be taught what a REST API is.
2. **Vague descriptions**: "Helps with development tasks" will never trigger. Be specific about the scenario.
3. **Time-sensitive content**: Don't include specific version numbers, dates, or tool versions in SKILL.md. They go stale. Put them in references/ with a note to check the latest docs.
4. **Windows-style paths**: Use forward slashes in all paths — users may be on any OS.
5. **Imperative commands in ALL CAPS**: "ALWAYS use parameterized queries." Modern LLMs respond better to reasoning: "Use parameterized queries — string interpolation enables SQL injection."
6. **Missing feedback loops**: If a step produces output that could be wrong, add a verification step. "Run the tests. If they fail, fix the issue before proceeding."
7. **Not testing the skill**: Write the evals before publishing. A skill that looks good but doesn't trigger is useless.

### Model Variance

Skills are tested against Claude Sonnet as the baseline. What works on Sonnet will typically work on Opus; Haiku may need more explicit guidance in SKILL.md. If you plan cross-model deployment, test on the lowest capability model you'll target and add detail accordingly.

### Explain the Why

Skills that explain *why* a practice matters produce better outcomes than skills that issue commands. Compare:

- **Command**: "Always write a regression test before fixing a bug."
- **Why**: "Write a regression test before fixing the bug — without it, the same bug will silently reappear in a future refactor."

The second version helps Claude make good judgment calls in edge cases. Apply this throughout your workflow steps.

## License

MIT
