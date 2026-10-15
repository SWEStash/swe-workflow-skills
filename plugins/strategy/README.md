# Strategy / Founder Review

Skills for pre-public and strategic reviews: vision and positioning, market analysis, build-vs-buy decisions, execution-vs-roadmap, and go/no-go synthesis. Part of [SWE Workflow Skills](https://github.com/SWEStash/swe-workflow-skills), a library of
software-lifecycle workflow skills for Claude.

Each skill is a step-by-step method, not a prompt snippet: it tells Claude what to
check, in what order, and what evidence to produce before calling the work done.
Claude loads a skill when your request matches it, or when you ask for it by name.

## Skills (8)

- **brainstorming**: Facilitate divergent ideation before committing to a spec: Socratic questioning, widening the option space, challenging assumptions and inherited constraints, then converging on candidates.
- **build-vs-buy**: Decide whether to build in-house, buy a vendor/SaaS product, or adopt OSS: core-vs-commodity framing, multi-year total cost of ownership, integration and maintenance burden, vendor viability, lock-in and exit costs.
- **feature-planning**: Break features into well-scoped tasks with acceptance criteria, risk assessment, and dependency mapping.
- **finops-cost-optimization**: Understand and reduce cloud spend: cost visibility and allocation (tagging, ownership), unit economics, rightsizing, autoscaling, commitment discounts (reserved instances, savings plans), storage/egress traps, architecture cost review, budgets and anomaly alerts.
- **metrics-and-okrs**: Define OKRs, KPIs, success metrics, and engineering health metrics (DORA).
- **project-proposal**: Write lightweight project proposals for budget approval and go/no-go decisions: problem, business case, scope, rough estimates, risks, success criteria.
- **project-review**: Review a built project's execution health before a milestone: scope alignment, roadmap / execution-plan adherence, implementation maturity (what's production-ready vs stub/deferred), and the evidence it actually works (tests, coverage, validation results, changelog).
- **strategic-review**: Review a project's strategic position before going public, launching, or raising: vision, mission, value proposition, scope positioning, the defensible wedge, and a live competitive / market comparative analysis.

## What the plugin contains

- Skills only: `SKILL.md` instructions, the reference docs and templates they load
  on demand, and each skill's `evals/evals.json` test scenarios.
- No hooks, MCP servers, commands, agents, or scripts. The plugin itself makes no
  network calls and collects no data.

## Install

In Claude Code:

```text
/plugin marketplace add SWEStash/swe-workflow-skills
/plugin install swe-workflow-strategy@swe-workflow
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
