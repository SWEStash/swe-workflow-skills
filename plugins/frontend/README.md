# Frontend Engineer

Skills for UI/UX, component architecture, accessibility, and client-side performance. Part of [SWE Workflow Skills](https://github.com/SWEStash/swe-workflow-skills), a library of
software-lifecycle workflow skills for Claude.

Each skill is a step-by-step method, not a prompt snippet: it tells Claude what to
check, in what order, and what evidence to produce before calling the work done.
Claude loads a skill when your request matches it, or when you ask for it by name.

## Skills (17)

- **accessibility-design**: Design and implement accessible web/mobile apps to WCAG 2.1/2.2: semantic HTML, ARIA patterns, keyboard navigation, focus management, color contrast, screen readers, accessible forms.
- **api-design**: Design RESTful and GraphQL APIs: endpoint naming, request/response contracts, error handling, pagination, versioning, auth patterns, OpenAPI specs.
- **browser-verification**: Verify a web app change by driving the real UI in a browser: reproduce the user flow end to end, watch console errors and network failures, exercise loading/error/empty states, capture screenshots as evidence.
- **bug-investigating**: Systematic debugging and root cause analysis using structured methodology: reproduce, isolate, hypothesize, verify.
- **code-reviewing**: Structured code reviews enforcing DRY, KISS, YAGNI, SRP, best practices, and project conventions.
- **code-slop-cleanup**: Strip AI slop from a branch diff before PR: judge each hunk against the surrounding file's conventions, remove without changing behavior, re-run tests.
- **feature-planning**: Break features into well-scoped tasks with acceptance criteria, risk assessment, and dependency mapping.
- **frontend-architecture**: Design frontend architecture: React component hierarchy, state management, design tokens, data fetching, routing, error boundaries, code organization.
- **git-workflow**: Write commit messages, PR descriptions, and manage branching strategy following conventional commits.
- **performance-optimization**: Identify and resolve performance bottlenecks via static analysis: N+1 queries, algorithmic complexity, query optimization, caching, memory leaks, bundle size, connection management.
- **plan-execution**: Execute an already-approved plan with discipline: batch tasks into verifiable checkpoints, verify each with fresh evidence before marking it done, log drift, and stop to re-plan when reality diverges from the plan's assumptions.
- **project-documentation**: Write project docs: README, contributing guides, API docs, changelogs, inline docs; and reconcile existing docs after a change made them wrong.
- **refactoring**: Systematic code improvement via design principles, smell detection, and safe transformation patterns.
- **tdd-workflow**: Guide test-driven development with red-green-refactor.
- **test-suite-design**: Design comprehensive test suites for existing code: strategy across unit/integration/e2e, fixtures, factories, helpers.
- **ui-ux-design**: Design user experiences from an engineer's perspective: user flows, wireframes, interaction patterns, responsive strategy, navigation, loading/error/empty states.
- **verification-before-completion**: Evidence gate before any claim that work is done, fixed, passing, or deployed.

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
/plugin install swe-workflow-frontend@swe-workflow
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
