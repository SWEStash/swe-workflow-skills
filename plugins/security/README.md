# Security Engineer

Skills for design-time threat modeling, security audits, dependency/CVE management, blast-radius analysis, and incident handling. Part of [SWE Workflow Skills](https://github.com/SWEStash/swe-workflow-skills), a library of
software-lifecycle workflow skills for Claude.

Each skill is a step-by-step method, not a prompt snippet: it tells Claude what to
check, in what order, and what evidence to produce before calling the work done.
Claude loads a skill when your request matches it, or when you ask for it by name.

## Skills (15)

- **bug-investigating**: Systematic debugging and root cause analysis using structured methodology: reproduce, isolate, hypothesize, verify.
- **code-reviewing**: Structured code reviews enforcing DRY, KISS, YAGNI, SRP, best practices, and project conventions.
- **compliance-privacy**: Engineer for regulatory and privacy obligations: GDPR/CCPA privacy-by-design, PII data mapping and minimization, retention and deletion (right to erasure), data subject requests, consent, SOC 2 controls (access, change management, audit logging).
- **configuration-strategy**: Design environment configuration, secrets management, and feature-flag hierarchy for a service or feature.
- **dependency-impact-analysis**: Map the blast radius of a change before implementing: find dependents, classify breaking vs additive, identify coordination needs, produce a propagation plan.
- **dependency-management**: Evaluate, audit, and upgrade project dependencies: assess libraries before adoption, audit CVEs, plan major upgrades, resolve conflicts.
- **feature-planning**: Break features into well-scoped tasks with acceptance criteria, risk assessment, and dependency mapping.
- **git-workflow**: Write commit messages, PR descriptions, and manage branching strategy following conventional commits.
- **incident-response**: Structured production incident workflow: triage, mitigation, investigation, recovery, comms.
- **plan-execution**: Execute an already-approved plan with discipline: batch tasks into verifiable checkpoints, verify each with fresh evidence before marking it done, log drift, and stop to re-plan when reality diverges from the plan's assumptions.
- **project-documentation**: Write project docs: README, contributing guides, API docs, changelogs, inline docs; and reconcile existing docs after a change made them wrong.
- **rollback-strategy**: Design safe rollback plans before deploying: identify irreversible changes, classify rollback complexity, create tested undo procedures.
- **security-audit**: Comprehensive security analysis: OWASP Top 10, auth/authz flows, injection vulnerabilities, data exposure, secrets detection, dependency CVEs, hardening recommendations.
- **threat-modeling**: Design-time security analysis of a system or feature before it's built: trust boundaries, attack surface, STRIDE per element, abuse cases, prioritized mitigations that become security requirements.
- **verification-before-completion**: Evidence gate before any claim that work is done, fixed, passing, or deployed.

## What the plugin contains

- Skills only: `SKILL.md` instructions, the reference docs and templates they load
  on demand, and each skill's `evals/evals.json` test scenarios.
- No hooks, MCP servers, commands, agents, or scripts. The plugin itself makes no
  network calls and collects no data.
- Skills run no commands on their own when they load.

## Network use

The plugin declares no connectors or MCP servers and sends nothing on its own. A
few skills include a step, within the task you asked for, where Claude looks
something up or runs a standard developer tool. Claude does this with its own
built-in tools (web search, or a command in your project), only when the task
reaches that step, and under your permission settings, so you approve each
command as you normally would. No skill contacts a service on its own initiative,
and nothing is sent to SWEStash.

Steps of that kind in this plugin:

- `dependency-management`: when vetting a package, confirms it exists on its registry (`npm view <pkg>`, the PyPI page) and checks public advisory databases (npm, Snyk, GitHub); when auditing, runs your ecosystem's audit tool (`npm audit`, `npx better-npm-audit audit`, `pip audit`, `safety check`, `govulncheck`, `bundle audit check --update`); when pruning, runs `npx depcheck`, which npm downloads before it runs locally.
- `security-audit`: during the dependency scan, runs your ecosystem's audit tool (`npm audit`, `npx better-npm-audit audit`, `pip audit`, `safety check`, `govulncheck`, `bundle audit check --update`), which checks your dependencies against that ecosystem's public vulnerability data; some, like `npm audit`, send the dependency list to do so.

## Install

In Claude Code:

```text
/plugin marketplace add SWEStash/swe-workflow-skills
/plugin install swe-workflow-security@swe-workflow
```

## The full library

This plugin is one role's subset. The full library has 68 skills and an
orchestrator (`skill-router`) that routes each request to the right skills and chains
them across phases. It installs on the Claude Code CLI:

```bash
npx swe-workflow-skills install --global
```

See the [project README](https://github.com/SWEStash/swe-workflow-skills#readme) for setup and the other roles.

## Privacy

The plugin collects, stores, and sends no data, and SWEStash runs no service that
receives any. Skills are instructions that run inside your Claude session. When a
skill has Claude look something up or run a command, it happens through Claude's
own tools, under your permission settings, as part of a task you asked for. What
Claude does with your data is covered by Anthropic's privacy policy.

## License

MIT. See [LICENSE](LICENSE).
