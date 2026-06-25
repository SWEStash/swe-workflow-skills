# SWE Workflow Skills for Claude Code

A curated collection of 40 SDLC Claude Code Agent Skills (plus two meta skills — `skill-router` and `writing-skills`) designed for senior software engineers who want to enforce best practices, maintain high code quality, and accelerate their development workflow.

## Philosophy

These skills encode the methodology of a disciplined engineer: DRY, YAGNI, KISS, functional independence, TDD, clean architecture, and thoughtful design decisions. Each skill guides Claude Code through a specific phase of the SDLC, ensuring consistent quality without sacrificing speed.

## Skills Overview

### Meta (2 skills)

| Skill | Purpose |
|-------|---------|
| `skill-router` | Entry point and dispatcher — maps an intent to the right skill and lays out the Golden Path workflow chains. Invoke it FIRST on any non-trivial task — before exploring, planning, or editing — not only when unsure which skill applies. Pairs with the optional [SessionStart hook](hooks/README.md) that nudges Claude to consult it. |
| `writing-skills` | How to author, edit, and pressure-test skills in this library — description/budget rules, progressive disclosure, the 3-eval rule, and TDD-for-docs. The installable companion to the [Building Skills](#building-skills) guide below. |

### Software Engineering (22 skills)

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
| `architecture-documentation` | All Phases | Multi-level architecture diagrams (context, container, component, runtime) |
| `verification-before-completion` | All Phases | Evidence gate — run the proving command and read its output before claiming done/passing/fixed |

### Design (3 skills)

| Skill | Purpose |
|-------|---------|
| `ui-ux-design` | User flows, screen specs, interaction patterns, loading/error/empty states, responsive strategy |
| `frontend-architecture` | React component hierarchy, state management, design tokens, data fetching, code organization |
| `accessibility-design` | WCAG compliance, semantic HTML, ARIA patterns, keyboard navigation, focus management, screen readers |

### DevOps (5 skills)

| Skill | Purpose |
|-------|---------|
| `containerization` | Dockerfiles, docker-compose, Kubernetes manifests with security and efficiency best practices |
| `cicd-pipeline` | CI/CD pipeline design for GitHub Actions, GitLab CI with quality gates and safe deploys |
| `infrastructure-as-code` | Terraform/IaC modules with state management, security, and environment separation |
| `deployment-repo` | Multi-repo deployment orchestration and environment promotion |
| `gitops-delivery` | GitOps-based delivery with Flux/ArgoCD patterns |

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

Two supported paths, chosen by what your environment can run. (See
**[ROLES.md](docs/ROLES.md)** for the full activation model and **why** it splits this way.)

### 1. Plugins — recommended (CLI, Claude Code web, claude.ai chat, Cowork)

Install the per-role plugin for your hat. Each is a focused, crop-safe subset that
auto-triggers with no extra setup, and it works everywhere plugins do:

```text
/plugin marketplace add SWEStash/swe-workflow-skills
/plugin install swe-workflow-pm@swe-workflow
```

Roles: `backend`, `frontend`, `devops`, `ml`, `security`, `architect`, `em`, `pm`,
`qa`, `designer`. The subset *is* the scope, so it stays under the skill-listing
budget (no "cropping").

> **Why per-role, not one all-in-one plugin?** Plugin-bundled skills are exempt from
> `skillOverrides`, so Claude Code can't mark them name-only — a 40-skill plugin would
> always inject 40 descriptions and crop the listing. The full library needs the
> installer below, which places skills where the name-only baseline *can* apply.

### 2. Installer — the full library + orchestrator (CLI / Cowork, advanced)

For the whole library with reliable activation, use `install.sh`. It copies all 42
skills into `.claude/skills/`, applies the **name-only baseline** (only `skill-router`
+ the safety skills keep descriptions; the rest list by name and are routed on
demand), and installs the SessionStart hook + `/role` command. This is the only way
to get all 40+ skills without cropping.

```bash
./install.sh                    # all skills + machinery + hook + baseline -> ./.claude/
./install.sh --global           # ...to the user config dir ($CLAUDE_CONFIG_DIR or ~/.claude)
./install.sh --no-hook          # skip the hook (baseline still applied)
./install.sh --role pm          # a lean hard subset (just the PM skills)
./install.sh --role pm --prune  # ...and remove other library skills from a prior install
./install.sh --dir /etc/claude  # a custom config dir
```

The hook is installed **by default**; it re-asserts the baseline each session and
nudges Claude to consult `skill-router` first. The installer prints a `settings.json`
snippet to enable it — it never edits your settings. Switch the promoted set at
runtime with **`/role`** (`/role backend`, `/role all` to reset). Re-running is
idempotent (clean per-skill copy); `--prune` narrows a prior install to the selection
(never touches your own custom skills). `--global` honors `$CLAUDE_CONFIG_DIR`;
`--dir` targets an explicit dir.

> **Teams:** run the installer into your project's `.claude/` and commit it — a
> committed `.claude/` (skills + the baseline in `settings.json`) also carries over to
> Claude Code on the web.

### Uninstallation

```bash
./uninstall.sh                    # remove from ./.claude/
./uninstall.sh --global           # remove from the user config dir ($CLAUDE_CONFIG_DIR or ~/.claude)
./uninstall.sh --dir /etc/claude  # remove from a custom config dir
./uninstall.sh --dry-run          # preview what would be removed; change nothing
```

`uninstall.sh` removes only what the installer created — this repo's skills, the
catalog/role markers, `resolve.py`, the SessionStart hook script, and the `/role`
command — and prunes the library's `skillOverrides` from `settings.local.json`. Your
own custom skills are left alone. It prompts before deleting (`--yes` to skip). It
never edits `settings.json`; if you enabled the hook, it prints the exact
`SessionStart` block for you to remove from `settings.json` by hand.

### How activation works (the short version)

At 40+ skills, description-based auto-triggering becomes unreliable: Claude injects
each skill's name+description into a listing capped at ~1% of context, and past the
cap it drops descriptions (so skills silently stop auto-triggering). This library's
answer is **orchestrator-routed activation** — a core feature, not just a cropping
fix: only `skill-router` + the safety skills keep descriptions, and the router
deterministically invokes everything else by name from a full catalog. **Activation
is driven by the router, not by Claude's auto-trigger** — predictable and testable
(there's a routing-eval harness), and reliable no matter how large the library grows. That baseline is
`skillOverrides`, which **only applies to skills in `.claude/skills/`** — hence the
installer (path 2) for the full library, and small per-role **plugins** (path 1)
everywhere else, where staying small is the only way to avoid cropping. The full
activation model is in **[ROLES.md](docs/ROLES.md)**; a side-by-side comparison of every
install method and surface is in **[INSTALL-MATRIX.md](docs/INSTALL-MATRIX.md)**; the
default [SessionStart hook](hooks/README.md) re-asserts the baseline and nudges Claude
toward the router.

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

Each skill includes an `evals/` directory with test scenarios. Safety-critical
and discipline skills also carry an optional `pressure_tests` block that tempts
the agent to skip the skill's Iron Law under named pressure levers:

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
  ],
  "pressure_tests": [
    {
      "id": 1,
      "prompt": "A request that tempts the agent to skip the discipline",
      "pressure": ["time", "sunk_cost", "authority", "exhaustion"],
      "expected_behavior": "How the skill should hold under that pressure",
      "assertions": ["Does NOT capitulate to ...", "Insists on ..."]
    }
  ]
}
```

### Running evals (TDD for the skill set)

Both runners replay the scenarios through Claude — generate a candidate reply
(skill loaded = GREEN, absent = RED), then judge each assertion with a skeptical
LLM-as-judge. Pick the path that fits; see [EVALS.md](docs/EVALS.md) for the full guide.

| Runner | Use | Needs |
|--------|-----|-------|
| `evals/workflow-runner.mjs` | Fast local RED/GREEN loop | Claude Code (Workflow tool) |
| `evals/run.py` | CI regression gate / scripting | `ANTHROPIC_API_KEY` + `pip install -r evals/requirements.txt` |

#### Way 1 — In Claude Code (no API key, no setup)

Ask Claude to run the in-session runner. It builds the test payload from the
skills' `evals.json` and invokes the Workflow tool — no key, no `pip install`:

> "Run `evals/workflow-runner.mjs` over the pressure tests and show GREEN vs RED per skill."

Under the hood Claude builds the payload (one `{skill, path, prompt, assertions}`
per case — the snippet is in the runner's header comment) and calls
`Workflow({ scriptPath: "evals/workflow-runner.mjs", args })`. Output is a
per-skill `GREEN x/n  RED x/n` table plus a total.

#### Way 2 — In CI or from a shell (API key)

```bash
pip install -r evals/requirements.txt
export ANTHROPIC_API_KEY=...

python evals/run.py --all --update-baseline       # record the golden baseline (once)
python evals/run.py --changed --base origin/main  # CI: only changed skills
python evals/run.py --skills tdd-workflow -k 3     # one skill, majority of 3
```

The GitHub Actions workflow (`.github/workflows/skill-evals.yml`) runs `run.py`
on PRs that touch `skills/` (gated on the `ANTHROPIC_API_KEY` repo secret — it
skips, rather than fails, when the secret is absent). It **gates on
regression-vs-baseline**: a previously-green assertion that now fails fails the
build. It does not gate on an absolute pass rate — the judge is intentionally
harsh and some assertions span a whole session rather than one reply, so the
stable signals are *GREEN ≥ RED* and *no drift between commits*.

## Building Skills

This section covers what you need to know to author a new skill or modify an existing one. It's also packaged as the installable `writing-skills` skill, which adds the SDO description rule and pressure-testing (TDD-for-docs) on top of these rules.

### Description Is Everything

The `description` field in SKILL.md's YAML frontmatter is the primary mechanism Claude uses to decide whether to load a skill. If the description doesn't match the user's prompt, the skill never runs — no matter how good the workflow is.

**Rules for writing descriptions:**
- **Keyword-rich**: Include all the phrases a user might say ("plan this feature", "scope this out", "break this down", "sprint planning"). Cast a wide net.
- **Third-person, present tense**: "Use when the user needs to..." not "I help with..."
- **~350 characters, hard cap 1024**: The 1024-char per-skill limit is enforced, but it is not the binding constraint at scale. Claude Code only injects skill listings up to `skillListingBudgetFraction` of the context (default 1% ≈ 2k tokens). With 30+ skills installed, ~350 chars per description is a realistic target — anything longer and `/doctor` will report descriptions being dropped.
- **Slightly assertive**: "Use when the user reports a bug" triggers more reliably than "May be used for bug reports." Lean toward the pushy side — under-triggering is the most common failure mode.
- **Include related vocabulary**: If your skill is about deployments, also mention "go live", "ship it", "push to production", "release".

**Recommended pattern:** `<one-line purpose>. Triggers: <comma-separated keywords>. <one-line boundary or delegation note>.`

**Skill Discovery Optimization (SDO):** describe *when to use* the skill, not
*what it does internally*. Agents follow the description over the body, so a
description that summarizes the workflow ("reviews code in two passes") triggers
worse than one that lists situations. The `Triggers:` keyword list above is the
when-to-use expressed as the phrases a user actually types — that's what makes
this format SDO-compliant.

### Listing Budget

Every installed skill contributes its `name` + `description` to a single listing that Claude Code injects on every prompt. The total is capped by `skillListingBudgetFraction` in `settings.json` (default `0.01`, i.e. 1% of context). When the cap is exceeded, the least-recently-used descriptions are dropped arbitrarily, and dropped skills will not trigger. Check with `/doctor` — it reports dropped descriptions.

**This repo sidesteps the cap with a name-only baseline** rather than by raising the budget: only a pinned set keeps full descriptions; the rest are listed name-only (invoked on demand by `skill-router`). So the listing stays tiny on any window — see [ROLES.md](docs/ROLES.md). A good `description` still matters for every skill: it's what the orchestrator routes on (from `catalog.json`) and what auto-triggers when a role promotes the skill to `on`.

(If you instead run a flat install of many skills with descriptions on, you can raise the budget — e.g. `{ "skillListingBudgetFraction": 0.02 }` — but the baseline approach is preferred.)

### Frontmatter Fields

Beyond `name` and `description`, two optional fields are recommended:

| Field | Purpose | Used in this repo |
|---|---|---|
| `model` | Pin a default model when the skill activates | `haiku` for cheap formatting/lookup skills, `sonnet` for most design/review work, `opus` for deep multi-step reasoning (architecture, security audit, debt review, RCA) |
| `allowed-tools` | Restrict tools the skill can call | Most skills use `Read, Grep, Glob, Write, Edit`. Implementation- or infra-adjacent skills add `Bash`. Research-oriented skills (dependency-management, security-audit) add `WebFetch, WebSearch`. |

Neither field counts toward the listing budget — only `name` + `description` do.

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

For safety-critical and discipline skills, add a **`pressure_tests`** block on
top of the three evals: a scenario that tempts the agent to skip the skill's
Iron Law under combined pressure (time, sunk cost, authority, exhaustion), with
assertions that it doesn't capitulate. Bulletproof skills by capturing the exact
rationalizations a fresh agent uses *without* the skill (RED), then writing the
minimum that counters them (GREEN) — see [EVALS.md](docs/EVALS.md) and the
`writing-skills` skill.

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
