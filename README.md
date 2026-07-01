# SWE Workflow Skills for Claude Code

[![roles-check](https://github.com/SWEStash/swe-workflow-skills/actions/workflows/roles-check.yml/badge.svg)](https://github.com/SWEStash/swe-workflow-skills/actions/workflows/roles-check.yml)
![skills](https://img.shields.io/badge/skills-44-blue)
[![license: MIT](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)

A curated library of **44 Claude Code Agent Skills** that walk Claude through the
software lifecycle the way a disciplined senior engineer would — planning, design,
TDD, review, security, deployment, incidents, and the project-management work around
them.

Each skill encodes a *method* (DRY, YAGNI, KISS, clean architecture, evidence-before-done),
not just a task. They compose into end-to-end workflows and are kept honest by an
LLM-as-judge eval harness.

![skill-router routing a live session](docs/demo/routing.gif)

## Why this library

- **An orchestrator, not a pile of skills.** A `skill-router` skill maps your intent to
  the right skill(s) and chains them across phases. Activation is *routed and
  deterministic*, not left to fuzzy auto-triggering.
- **Scales past Claude's skill-listing budget.** Claude Code only injects skill
  descriptions up to ~1% of context, so large libraries silently stop triggering past
  ~20–40 skills. This library keeps only the router + safety skills "loud" and lists the
  rest **name-only** — so the router can invoke all 44 by name, with no cropping and
  without making you pre-pick a subset ([how it works](docs/ROLES.md)).
- **Role-scoped.** `/role backend` (or `frontend`, `devops`, `ml`, `security`,
  `architect`, `em`, `pm`, `qa`, `designer`) promotes a working set to auto-trigger; the
  rest stay one route away.
- **Cross-platform install.** The installer and SessionStart hook are **pure Node** — the
  one runtime Claude Code already requires — so they run identically on Linux, macOS, and
  Windows (no bash, Python, or `sed`).
- **Tested.** Every skill ships 3 evals; safety/discipline skills add pressure tests.

## Quick Start

**Most people — install the per-role plugin for your hat** (works on CLI, Claude Code
web, claude.ai chat, and Cowork):

```text
/plugin marketplace add SWEStash/swe-workflow-skills
/plugin install swe-workflow-pm@swe-workflow
```

**Want the whole library with the orchestrator** (CLI) — no clone needed:

```bash
npx swe-workflow-skills install --global   # all 44 skills + router + /role + the SessionStart hook
```

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

The installer never edits `settings.json` — it prints the SessionStart hook snippet for
you to merge. Re-running is idempotent. See **[INSTALL-MATRIX.md](docs/INSTALL-MATRIX.md)**
for every method × surface, and **[ROLES.md](docs/ROLES.md)** for the activation model.

## Usage

On any non-trivial task, Claude consults **`skill-router`** first; it reads the full
catalog and invokes the matching skill(s) by name, re-routing as the work changes phase.
The default SessionStart hook nudges Claude to do this automatically; you can also route
explicitly ("use the security-audit skill") or switch the promoted set with `/role`.

**A routed chain, by phase** — e.g. *"add OAuth login"*:

```
feature-planning      →  scope tasks, acceptance criteria, risks
architecture-design   →  ADR: session vs token, where auth lives
data-modeling         →  user/session schema + migration
tdd-workflow          →  red-green-refactor the implementation
security-audit        →  authn/authz, token handling, OWASP pass
code-reviewing        →  DRY/KISS/SRP + conventions
deployment-checklist  →  pre-deploy safety + rollback readiness
```

The router invokes each skill as you reach its phase rather than all at once. A single
request often fans out to several skills — *"review this for accessibility and UX"* pulls
in both `accessibility-design` and `ui-ux-design`. See a full session play out in
**[what routing looks like](docs/ROLES.md#what-routing-looks-like-in-a-session)**; the
pre-built chains (new feature · bug/incident · continuous improvement · pre-public
review) live in the `skill-router` skill and **[ROLES.md](docs/ROLES.md)**.

## What's included

44 skills — **[full catalog → SKILLS.md](docs/SKILLS.md)**:

| Area | Count | Examples |
|------|-------|----------|
| Software Engineering | 23 | feature-planning, architecture-design, tdd-workflow, code-reviewing, security-audit, refactoring, incident-response |
| Project Management | 6 | prd-writing, effort-estimation, metrics-and-okrs, retrospective, strategic-review |
| DevOps | 5 | containerization, cicd-pipeline, infrastructure-as-code, gitops-delivery |
| Design | 3 | ui-ux-design, frontend-architecture, accessibility-design |
| MLOps | 3 | ml-pipeline-design, ml-experiment-tracking, ml-model-deployment |
| Evaluation & Monitoring | 2 | observability-design, test-data-strategy |
| Meta | 2 | skill-router, writing-skills |

## Documentation

- **[ROLES.md](docs/ROLES.md)** — the activation model (name-only baseline, roles, the orchestrator) and the CLI vs web/plugin paths.
- **[INSTALL-MATRIX.md](docs/INSTALL-MATRIX.md)** — every install method × surface, side by side.
- **[SKILLS.md](docs/SKILLS.md)** — the full skill catalog by area.
- **[EVALS.md](docs/EVALS.md)** — how the skills are tested (RED/GREEN, pressure tests, CI gate).
- **[AUTHORING.md](docs/AUTHORING.md)** — write or modify a skill (descriptions, budget, progressive disclosure, evals).
- **[RELEASING.md](docs/RELEASING.md)** — versioning policy and how to cut a release. Changes are tracked in **[CHANGELOG.md](CHANGELOG.md)**.

## Evaluation

Each skill carries an `evals/` directory; safety/discipline skills add a `pressure_tests`
block. Two runners replay scenarios through Claude (skill loaded = GREEN, absent = RED)
and judge each assertion with a skeptical LLM-as-judge: `evals/workflow-runner.mjs`
(in-session, no API key) and `evals/run.py` (CI regression gate, wired into
`.github/workflows/skill-evals.yml`). Full guide in **[EVALS.md](docs/EVALS.md)**.

## Contributing

New or improved skills are welcome — start with **[AUTHORING.md](docs/AUTHORING.md)** (or
install the `writing-skills` skill). The short version: descriptions are everything, keep
SKILL.md concise with detail in `references/`, and ship exactly 3 evals.

## License

MIT — see [LICENSE](LICENSE).
