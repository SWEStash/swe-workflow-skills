# Engineering Manager / Tech Lead

Skills for planning, estimation, metrics, retros, proposals, reviews, and steering reviews and incidents. Part of [SWE Workflow Skills](https://github.com/SWEStash/swe-workflow-skills), a library of
software-lifecycle workflow skills for Claude.

Each skill is a step-by-step method, not a prompt snippet: it tells Claude what to
check, in what order, and what evidence to produce before calling the work done.
Claude loads a skill when your request matches it, or when you ask for it by name.

## Skills (14)

- **brainstorming**: Facilitate divergent ideation before committing to a spec: Socratic questioning, widening the option space, challenging assumptions and inherited constraints, then converging on candidates.
- **code-reviewing**: Structured code reviews enforcing DRY, KISS, YAGNI, SRP, best practices, and project conventions.
- **dx-audit**: Audit and improve developer experience: inner-loop feedback (build/test/reload times), CI wait and queue times, flaky tests, local environment setup, onboarding time-to-first-PR, tooling friction, docs discoverability; produce a prioritized remediation plan.
- **effort-estimation**: Estimate engineering effort with agile techniques: story points, t-shirt sizing, three-point estimation, capacity planning.
- **feature-planning**: Break features into well-scoped tasks with acceptance criteria, risk assessment, and dependency mapping.
- **incident-response**: Structured production incident workflow: triage, mitigation, investigation, recovery, comms.
- **metrics-and-okrs**: Define OKRs, KPIs, success metrics, and engineering health metrics (DORA).
- **prd-writing**: Write lightweight agile PRDs and technical RFCs that align stakeholders before implementation.
- **project-proposal**: Write lightweight project proposals for budget approval and go/no-go decisions: problem, business case, scope, rough estimates, risks, success criteria.
- **project-review**: Review a built project's execution health before a milestone: scope alignment, roadmap / execution-plan adherence, implementation maturity (what's production-ready vs stub/deferred), and the evidence it actually works (tests, coverage, validation results, changelog).
- **release-management**: Cut and publish software releases right-sized to the project: semver decisions, changelogs, tagging, automated version bumps (release-please, changesets, semantic-release), publishing gates, npm/PyPI/container registry publishing, pre-release channels, monorepo versioning.
- **retrospective**: Facilitate sprint retros, project post-mortems, and incident post-mortems with actionable, owned improvements.
- **strategic-review**: Review a project's strategic position before going public, launching, or raising: vision, mission, value proposition, scope positioning, the defensible wedge, and a live competitive / market comparative analysis.
- **technical-debt-review**: Strategic codebase health assessment: identify hotspots, categorize debt, produce remediation roadmap.

## What the plugin contains

- Skills only: `SKILL.md` instructions, the reference docs and templates they load
  on demand, and each skill's `evals/evals.json` test scenarios.
- No hooks, MCP servers, commands, agents, or scripts. The plugin itself makes no
  network calls and collects no data.
- Skills run no commands on their own when they load.
- Some skills have Claude use a public service, through Claude's own tools and
  your permission settings:
  - `strategic-review` searches the web for competitor and market information.

## Install

In Claude Code:

```text
/plugin marketplace add SWEStash/swe-workflow-skills
/plugin install swe-workflow-em@swe-workflow
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
