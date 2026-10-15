# Architect / Staff Engineer

Skills for structural decisions, documentation, contracts, blast radius, and technical-debt strategy. Part of [SWE Workflow Skills](https://github.com/SWEStash/swe-workflow-skills), a library of
software-lifecycle workflow skills for Claude.

Each skill is a step-by-step method, not a prompt snippet: it tells Claude what to
check, in what order, and what evidence to produce before calling the work done.
Claude loads a skill when your request matches it, or when you ask for it by name.

## Skills (17)

- **api-design**: Design RESTful and GraphQL APIs: endpoint naming, request/response contracts, error handling, pagination, versioning, auth patterns, OpenAPI specs.
- **architecture-design**: Guide architectural and structural decisions using Architecture Decision Records (ADRs): new services, pattern choices, database selection, component boundaries, state management, costly-to-reverse decisions.
- **architecture-documentation**: Design and maintain architecture documentation with multi-level diagrams (C4) and docs-as-code.
- **bug-investigating**: Systematic debugging and root cause analysis using structured methodology: reproduce, isolate, hypothesize, verify.
- **code-archaeology**: Understand unfamiliar or legacy code before changing it: map entry points, mine git history (blame, churn, log -S), trace data flow, recover the why behind odd code, pin current behavior with characterization tests, find seams for safe change.
- **code-reviewing**: Structured code reviews enforcing DRY, KISS, YAGNI, SRP, best practices, and project conventions.
- **configuration-strategy**: Design environment configuration, secrets management, and feature-flag hierarchy for a service or feature.
- **data-modeling**: Design database schemas, relationships, indexes, and migration strategies: relational and document stores.
- **dependency-impact-analysis**: Map the blast radius of a change before implementing: find dependents, classify breaking vs additive, identify coordination needs, produce a propagation plan.
- **feature-planning**: Break features into well-scoped tasks with acceptance criteria, risk assessment, and dependency mapping.
- **git-workflow**: Write commit messages, PR descriptions, and manage branching strategy following conventional commits.
- **performance-optimization**: Identify and resolve performance bottlenecks via static analysis: N+1 queries, algorithmic complexity, query optimization, caching, memory leaks, bundle size, connection management.
- **plan-execution**: Execute an already-approved plan with discipline: batch tasks into verifiable checkpoints, verify each with fresh evidence before marking it done, log drift, and stop to re-plan when reality diverges from the plan's assumptions.
- **project-documentation**: Write project docs: README, contributing guides, API docs, changelogs, inline docs; and reconcile existing docs after a change made them wrong.
- **project-review**: Review a built project's execution health before a milestone: scope alignment, roadmap / execution-plan adherence, implementation maturity (what's production-ready vs stub/deferred), and the evidence it actually works (tests, coverage, validation results, changelog).
- **technical-debt-review**: Strategic codebase health assessment: identify hotspots, categorize debt, produce remediation roadmap.
- **verification-before-completion**: Evidence gate before any claim that work is done, fixed, passing, or deployed.

## What the plugin contains

- Skills only: `SKILL.md` instructions, the reference docs and templates they load
  on demand, and each skill's `evals/evals.json` test scenarios.
- No hooks, MCP servers, commands, agents, or scripts. The plugin itself makes no
  network calls and collects no data.
- When loaded, `code-reviewing` and `git-workflow` run read-only `git diff` and `git log` summaries in the
  current repository so Claude starts from your actual changes.

## Install

In Claude Code:

```text
/plugin marketplace add SWEStash/swe-workflow-skills
/plugin install swe-workflow-architect@swe-workflow
```

## The full library

This plugin is one role's subset. The full library has 66 skills and an
orchestrator (`skill-router`) that routes each request to the right skills and chains
them across phases. It installs on the Claude Code CLI:

```bash
npx swe-workflow-skills install --global
```

See the [project README](https://github.com/SWEStash/swe-workflow-skills#readme) for setup and the other roles.

## License

MIT. See [LICENSE](LICENSE).
