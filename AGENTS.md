# Guide for coding agents

Read these before working in this repository, in this order:

1. [docs/HOW-WE-WORK.md](docs/HOW-WE-WORK.md): how issues, PRs and releases are run, what counts as done, and what an agent may post without approval.
2. [docs/AUTHORING.md](docs/AUTHORING.md): how a skill is written, including *Adding a skill*.
3. [docs/EVALS.md](docs/EVALS.md): how skills are measured. What counts as done, evals included, is HOW-WE-WORK → *Closing*.
4. [docs/ROLES.md](docs/ROLES.md): the activation model, roles, and the generated files (`plugins/`, `catalog.json`, `.claude-plugin/marketplace.json`). Edit `roles.json` and the skills, never the generated files, then run `node scripts/build-plugins.mjs`.

Before opening a PR: `node scripts/verify.mjs` and `node scripts/build-plugins.mjs --check`.
