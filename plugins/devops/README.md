# DevOps / SRE / Platform Engineer

Skills for CI/CD, containers, infrastructure-as-code, delivery, observability, and incidents. Part of [SWE Workflow Skills](https://github.com/SWEStash/swe-workflow-skills), a library of
software-lifecycle workflow skills for Claude.

Each skill is a step-by-step method, not a prompt snippet: it tells Claude what to
check, in what order, and what evidence to produce before calling the work done.
Claude loads a skill when your request matches it, or when you ask for it by name.

## Skills (19)

- **bug-investigating**: Systematic debugging and root cause analysis using structured methodology: reproduce, isolate, hypothesize, verify.
- **cicd-pipeline**: Design CI/CD pipelines for automated build, test, deploy: GitHub Actions, GitLab CI, quality gates.
- **code-reviewing**: Structured code reviews enforcing DRY, KISS, YAGNI, SRP, best practices, and project conventions.
- **configuration-strategy**: Design environment configuration, secrets management, and feature-flag hierarchy for a service or feature.
- **containerization**: Write production-grade Dockerfiles, docker-compose, and Kubernetes manifests following security and reliability best practices.
- **deployment-checklist**: Pre-deploy verification and release safety checks: config, migrations, monitoring, rollback readiness, comms.
- **deployment-repo**: Design a deployment (GitOps) repo that orchestrates multiple services in a polyrepo: version pinning, environment promotion, compatibility matrices, system config.
- **feature-planning**: Break features into well-scoped tasks with acceptance criteria, risk assessment, and dependency mapping.
- **git-workflow**: Write commit messages, PR descriptions, and manage branching strategy following conventional commits.
- **gitops-delivery**: Design GitOps continuous delivery with ArgoCD or Flux: declarative reconciliation, cross-repo CI/CD triggers, drift detection, progressive delivery.
- **incident-response**: Structured production incident workflow: triage, mitigation, investigation, recovery, comms.
- **infrastructure-as-code**: Write and review IaC with Terraform, CloudFormation, Pulumi, or CDK: modularity, security, state management.
- **observability-design**: Design production observability: SLIs, SLOs, SLAs, error budgets, OpenTelemetry traces/metrics/logs, structured logging, alerting, dashboards.
- **plan-execution**: Execute an already-approved plan with discipline: batch tasks into verifiable checkpoints, verify each with fresh evidence before marking it done, log drift, and stop to re-plan when reality diverges from the plan's assumptions.
- **project-documentation**: Write project docs: README, contributing guides, API docs, changelogs, inline docs; and reconcile existing docs after a change made them wrong.
- **release-management**: Cut and publish software releases right-sized to the project: semver decisions, changelogs, tagging, automated version bumps (release-please, changesets, semantic-release), publishing gates, npm/PyPI/container registry publishing, pre-release channels, monorepo versioning.
- **resilience-engineering**: Design systems that survive failure: failure-mode analysis, resilience patterns (timeouts, retries with backoff, circuit breakers, bulkheads, load shedding, graceful degradation), chaos experiments, disaster recovery with RTO/RPO, backup restore testing, game days.
- **rollback-strategy**: Design safe rollback plans before deploying: identify irreversible changes, classify rollback complexity, create tested undo procedures.
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

- `deployment-checklist`: includes a dependency audit (`npm audit`, `pip audit`) among the pre-deploy checks.

## Install

In Claude Code:

```text
/plugin marketplace add SWEStash/swe-workflow-skills
/plugin install swe-workflow-devops@swe-workflow
```

## The full library

This plugin is one role's subset. The full library has 66 skills and an
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
