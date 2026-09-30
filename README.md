# SWE Workflow Skills for Claude Code

[![npm](https://img.shields.io/npm/v/swe-workflow-skills)](https://www.npmjs.com/package/swe-workflow-skills)
[![roles-check](https://github.com/SWEStash/swe-workflow-skills/actions/workflows/roles-check.yml/badge.svg)](https://github.com/SWEStash/swe-workflow-skills/actions/workflows/roles-check.yml)
![skills](https://img.shields.io/badge/skills-66-blue)
[![license: MIT](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)

A curated library of **66 Claude Code Agent Skills** that walk Claude through the
software lifecycle the way a disciplined senior engineer would: planning, design,
TDD, review, security, deployment, incidents, and the project-management work around
them.

Each skill encodes a *method* (DRY, YAGNI, KISS, clean architecture, evidence before
"done"), not just a task. An orchestrator skill, **`skill-router`**, matches your intent
to the right skills and chains them across phases. Every skill is kept honest by an
**LLM-as-judge evaluation harness** that compares the model with and without the skill.

![skill-router routing a live session](docs/demo/routing.gif)

## Quick Start

**Most people: install the per-role plugin for your hat.** It works on the CLI, Claude
Code web, claude.ai chat, and Cowork:

```text
/plugin marketplace add SWEStash/swe-workflow-skills
/plugin install swe-workflow-pm@swe-workflow
```

**Want the whole library with the orchestrator?** On the CLI, with no clone needed, it
is a **two-step** setup:

```bash
# 1. Install all 66 skills + router + /role + the hook script, and apply the baseline
npx swe-workflow-skills install --global
```

```jsonc
// 2. Wire the hook: merge the snippet the installer prints into your settings.json
//    (the installer never edits settings.json for you; it just prints the block).
//    Then start a new session; /doctor should show the hook registered.
{ "hooks": { "SessionStart": [ /* ...the printed block... */ ] } }
```

> ⚠️ **Don't skip step 2.** Step 1 alone installs the skills and prevents cropping, but
> the hook is what nudges Claude to consult `skill-router` first. **Without it, skills
> won't auto-route** (the whole point of the library), and the baseline isn't re-asserted
> after `/compact`. If you deliberately want no hook, pass `--no-hook`; auto-routing stays
> off until a hook is wired. The **per-role plugin** path above needs no hook: it is
> self-contained.

Or from a clone: `node install.mjs --global`.

> **Prerequisite:** Node.js ≥ 18 (already present wherever Claude Code runs).

## Installation

Two supported paths, chosen by what your environment can run:

| Path | What you get | Works on |
|------|--------------|----------|
| **Per-role plugin** (above) | your role's crop-safe subset, auto-triggering | CLI · Code web · claude.ai chat · Cowork |
| **`npx swe-workflow-skills`** | the full library + orchestrator + `/role` + hook | CLI · Cowork |

```bash
npx swe-workflow-skills install               # all skills -> ./.claude/ (project-local)
npx swe-workflow-skills install --global      # -> user config dir ($CLAUDE_CONFIG_DIR or ~/.claude)
npx swe-workflow-skills install --role pm     # a lean hard subset (just the PM skills)
npx swe-workflow-skills install --no-hook     # skip the SessionStart hook (baseline still applied)
npx swe-workflow-skills uninstall --dry-run   # preview removal; --global/--dir mirror install
```

From a clone, the same commands are `node install.mjs …` / `node uninstall.mjs …`.

The installer never edits `settings.json`: it prints the SessionStart hook snippet for
you to merge. Re-running is idempotent. See **[INSTALL-MATRIX.md](docs/INSTALL-MATRIX.md)**
for every method × surface, and **[ROLES.md](docs/ROLES.md)** for the activation model.

## Usage

On any non-trivial task, Claude consults **`skill-router`** first. It reads the full
catalog and invokes the matching skill(s) by name, re-routing as the work changes phase.
The default SessionStart hook nudges Claude to do this automatically. You can also route
explicitly ("use the security-audit skill") or switch the promoted set with `/role`.
Don't want a particular skill routed at all? `npx swe-workflow-skills disable <skill>`
opts it out durably; see [disable a skill from routing](docs/ROLES.md#advanced-disable-a-skill-from-routing).

**A routed chain, by phase**, e.g. *"add OAuth login"*:

```
feature-planning      →  scope tasks, acceptance criteria, risks
architecture-design   →  ADR: session vs token, where auth lives
data-modeling         →  user/session schema + migration
tdd-workflow          →  red-green-refactor the implementation
security-audit        →  authn/authz, token handling, OWASP pass
code-reviewing        →  DRY/KISS/SRP + conventions
verification-before-completion
                      →  evidence for the "done" claim; docs reconciled
deployment-checklist  →  pre-deploy safety + rollback readiness
```

The router invokes each skill as you reach its phase rather than all at once, and one
request can fan out to several skills. See a full session in
**[what routing looks like](docs/ROLES.md#what-routing-looks-like-in-a-session)**.

## Why this library

- **An orchestrator, not auto-trigger roulette.** Description-based auto-triggering is
  probabilistic. Here `skill-router` routes intent to skills by name, and a routing
  harness measures it: 65/65 top-1 and 64/65 on boundary cases on the committed k=3
  baseline ([routing benchmark](docs/ROUTING-BENCHMARK.md)).
- **Every skill stays reachable.** Claude Code lists skill descriptions only up to about
  1% of context, so large libraries stop auto-triggering past 20 to 40 skills. This
  library keeps the router and safety skills fully listed and the rest **`name-only`**
  (Claude Code's own setting for low-priority skills), so every skill is one route away
  with no pre-picking ([how it works](docs/ROLES.md)).
- **Tested like code, not prose.** Across 234 eval cases and 1323 assertions, the same
  model passes **63.6%** of assertions without the skill's content and **97.9%** with
  it, and **no case scores lower with the skill** ([results](docs/EVALS.md#results-content-evals-full-catalog)).
  Safety-critical skills are **hardened** with an Iron Law, a rationalization table, and
  pressure tests.
- **Curated, not a mega-catalog.** First-party and reviewed. Nothing executes on its own
  except the open Node installer ([SECURITY.md](SECURITY.md)).
- **Full-SDLC breadth, role-scoped.** From planning to incidents, plus MLOps, LLM apps,
  data, and PM work. `/role backend` (or any of 15 roles) promotes a working set to
  auto-trigger.
- **Cross-platform.** The installer and hook are pure Node, so they run the same on
  Linux, macOS, and Windows.

## What's included

66 skills, listed in the **[full catalog → SKILLS.md](docs/SKILLS.md)**:

| Area | Count | Examples |
|------|-------|----------|
| Software Engineering | 30 | feature-planning, plan-execution, architecture-design, threat-modeling, compliance-privacy, code-archaeology, tdd-workflow, security-audit, browser-verification, subagent-orchestration |
| Project Management | 8 | brainstorming, prd-writing, effort-estimation, build-vs-buy, metrics-and-okrs, retrospective, strategic-review |
| DevOps | 8 | containerization, cicd-pipeline, release-management, gitops-delivery, resilience-engineering, finops-cost-optimization |
| Design | 3 | ui-ux-design, frontend-architecture, accessibility-design |
| MLOps | 3 | ml-pipeline-design, ml-experiment-tracking, ml-model-deployment |
| AI Engineering | 2 | llm-app-engineering, ai-evaluation |
| Data Science | 3 | exploratory-data-analysis, statistical-analysis, notebook-to-production |
| Data Engineering | 2 | data-pipeline-design, data-quality |
| Mobile | 2 | mobile-architecture, mobile-release |
| Evaluation & Monitoring | 2 | observability-design, test-data-strategy |
| Meta | 2 | skill-router, writing-skills |

## Evaluation

Every skill ships 3 evals (happy path, edge case, scope boundary), and safety skills add
pressure tests. Each case is replayed with the skill loaded (GREEN) and without it (RED),
and a skeptical LLM-as-judge grades every assertion. Evals run in-session through
`evals/workflow-runner.mjs`, with no API key, and the results are committed to
`evals/baseline.json`. Merging a re-run reports any assertion that regressed. Full guide
in **[EVALS.md](docs/EVALS.md)**.

## Documentation

- **[ROLES.md](docs/ROLES.md)**: the activation model (name-only baseline, roles, the orchestrator) and the CLI vs web/plugin paths.
- **[INSTALL-MATRIX.md](docs/INSTALL-MATRIX.md)**: every install method × surface, side by side.
- **[SKILLS.md](docs/SKILLS.md)**: the full skill catalog by area.
- **[EVALS.md](docs/EVALS.md)**: how the skills are tested (RED/GREEN, pressure tests, the regression baseline).
- **[ROUTING-BENCHMARK.md](docs/ROUTING-BENCHMARK.md)**: the routing reliability numbers, methodology, and how to reproduce them.
- **[AUTHORING.md](docs/AUTHORING.md)**: write or modify a skill (descriptions, budget, progressive disclosure, evals).
- **[RELEASING.md](docs/RELEASING.md)**: versioning policy and how to cut a release. Changes are tracked in **[CHANGELOG.md](CHANGELOG.md)**.
- **[SECURITY.md](SECURITY.md)**: the security model, what runs automatically, supply-chain guarantees, and how to report a vulnerability.

## Contributing

New or improved skills are welcome. Start with **[AUTHORING.md](docs/AUTHORING.md)** (or
install the `writing-skills` skill). The short version: descriptions are everything, keep
SKILL.md concise with detail in `references/`, and ship exactly 3 evals.

## Acknowledgements

This library stands on ideas from projects we found genuinely useful:

- **[obra/superpowers](https://github.com/obra/superpowers)**: the guardrail pattern
  our hardened safety skills adopt (an Iron Law, a rationalization table distilled from
  real failures, and pressure tests that try to talk the agent out of it) comes from
  Jesse Vincent's work here, as does the idea of a Socratic brainstorming skill as the
  entry point to a feature. Superpowers goes deeper on the coding inner loop than we do;
  if that's what you want, use it.
- **[anthropics/skills](https://github.com/anthropics/skills)**: Anthropic's official
  skills (and `skill-creator` in particular) are the authoring practice we benchmark
  ours against; the eval-first loop in [AUTHORING.md](docs/AUTHORING.md) follows the
  same instinct.
- **The [Agent Skills docs](https://code.claude.com/docs/en/skills) and Anthropic's
  engineering posts**: progressive disclosure, the listing budget, and the
  `name-only` + `skillOverrides` activation surface this library's routing model is
  built on.
- **The awesome-claude-skills community lists**: the ecosystem survey that shaped our
  gap analysis of what a full-SDLC library should cover.

## License

MIT, see [LICENSE](LICENSE).
