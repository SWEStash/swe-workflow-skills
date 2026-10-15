# Designer / UX

Skills for user flows, accessibility, product requirements, and the frontend architecture that realizes them. Part of [SWE Workflow Skills](https://github.com/SWEStash/swe-workflow-skills), a library of
software-lifecycle workflow skills for Claude.

Each skill is a step-by-step method, not a prompt snippet: it tells Claude what to
check, in what order, and what evidence to produce before calling the work done.
Claude loads a skill when your request matches it, or when you ask for it by name.

## Skills (6)

- **accessibility-design**: Design and implement accessible web/mobile apps to WCAG 2.1/2.2: semantic HTML, ARIA patterns, keyboard navigation, focus management, color contrast, screen readers, accessible forms.
- **brainstorming**: Facilitate divergent ideation before committing to a spec: Socratic questioning, widening the option space, challenging assumptions and inherited constraints, then converging on candidates.
- **feature-planning**: Break features into well-scoped tasks with acceptance criteria, risk assessment, and dependency mapping.
- **frontend-architecture**: Design frontend architecture: React component hierarchy, state management, design tokens, data fetching, routing, error boundaries, code organization.
- **prd-writing**: Write lightweight agile PRDs and technical RFCs that align stakeholders before implementation.
- **ui-ux-design**: Design user experiences from an engineer's perspective: user flows, wireframes, interaction patterns, responsive strategy, navigation, loading/error/empty states.

## What the plugin contains

- Skills only: `SKILL.md` instructions, the reference docs and templates they load
  on demand, and each skill's `evals/evals.json` test scenarios.
- No hooks, MCP servers, commands, agents, or scripts. The plugin itself makes no
  network calls and collects no data.
- Skills run no commands on their own when they load.

## Install

In Claude Code:

```text
/plugin marketplace add SWEStash/swe-workflow-skills
/plugin install swe-workflow-designer@swe-workflow
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
