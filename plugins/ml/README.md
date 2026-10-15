# ML Engineer / MLOps

Skills for ML pipelines, experiment tracking, evaluation, model deployment, and the data/observability around them. Part of [SWE Workflow Skills](https://github.com/SWEStash/swe-workflow-skills), a library of
software-lifecycle workflow skills for Claude.

Each skill is a step-by-step method, not a prompt snippet: it tells Claude what to
check, in what order, and what evidence to produce before calling the work done.
Claude loads a skill when your request matches it, or when you ask for it by name.

## Skills (14)

- **ai-evaluation**: Define how to evaluate ML models and GenAI/LLM apps: golden datasets, offline metrics, RAG evaluation (faithfulness, relevance, context precision/recall) with ragas/deepeval/promptfoo, LLM-as-judge design and calibration, eval regression gates in CI, online A/B and human feedback.
- **bug-investigating**: Systematic debugging and root cause analysis using structured methodology: reproduce, isolate, hypothesize, verify.
- **code-reviewing**: Structured code reviews enforcing DRY, KISS, YAGNI, SRP, best practices, and project conventions.
- **data-modeling**: Design database schemas, relationships, indexes, and migration strategies: relational and document stores.
- **feature-planning**: Break features into well-scoped tasks with acceptance criteria, risk assessment, and dependency mapping.
- **git-workflow**: Write commit messages, PR descriptions, and manage branching strategy following conventional commits.
- **ml-experiment-tracking**: Design reproducible ML experiments: tracking, versioning, run comparison with MLflow, W&B, or DVC.
- **ml-model-deployment**: Deploy ML models to production: serving infrastructure, monitoring, drift detection, safe rollouts.
- **ml-pipeline-design**: Design reproducible ML training and data pipelines: ingestion, validation, feature engineering, training, evaluation, continuous training orchestration.
- **observability-design**: Design production observability: SLIs, SLOs, SLAs, error budgets, OpenTelemetry traces/metrics/logs, structured logging, alerting, dashboards.
- **plan-execution**: Execute an already-approved plan with discipline: batch tasks into verifiable checkpoints, verify each with fresh evidence before marking it done, log drift, and stop to re-plan when reality diverges from the plan's assumptions.
- **project-documentation**: Write project docs: README, contributing guides, API docs, changelogs, inline docs; and reconcile existing docs after a change made them wrong.
- **test-data-strategy**: Design and generate test data: factories, synthetic data, property-based testing, boundary analysis, contract testing, load scenarios, GDPR-safe data.
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
/plugin install swe-workflow-ml@swe-workflow
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
