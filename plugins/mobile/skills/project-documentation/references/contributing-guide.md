# Writing a Contributing Guide

## Contents
- What to include
- Template structure
- Common mistakes

## What to Include

A CONTRIBUTING.md answers: "I want to help — how do I start?"

It should cover:

1. **How to set up the development environment** — complete, from-scratch instructions
2. **How to run the project locally** — including any seed data, test accounts, etc.
3. **How to run tests** — and what's expected to pass before submitting
4. **Code conventions** — style guide, linting, formatting expectations
5. **Branching and commit conventions** — branch naming, commit message format
6. **How to submit a change** — PR process, review expectations, CI requirements
7. **Where to ask questions** — Slack channel, GitHub discussions, issue templates

## Template Structure

```markdown
# Contributing to [Project Name]

Thanks for your interest in contributing! This guide will help you get started.

## Development Setup

### Prerequisites
- [List all tools and versions]

### Getting Started
```bash
# Step-by-step from clone to running
```

### Verifying Your Setup
[How to confirm everything is working — specific expected output]

## Making Changes

### Branch Naming
- `feat/short-description` — new features
- `fix/short-description` — bug fixes
- `docs/short-description` — documentation only
- `refactor/short-description` — code improvements

### Commit Messages
[Format and conventions — reference git-workflow skill]

### Code Style
- [Linting tool and config]
- [Formatting tool and config]
- Run `npm run lint` before committing

### Testing
- Write tests for new functionality
- Ensure all existing tests pass: `npm test`
- Add integration tests for API changes

## Submitting a Pull Request

1. Fork the repository and create your branch from `main`
2. Make your changes with tests
3. Ensure the test suite passes
4. Update documentation if needed
5. Submit a PR with a clear description of the changes

### PR Description Template
- **What**: What this PR does
- **Why**: Why this change is needed
- **How**: Brief description of the approach
- **Testing**: How you tested the changes

### Review Process
- PRs require [N] approving reviews
- CI must pass before merge
- Maintainers may request changes — this is normal and collaborative

## Reporting Bugs

Use the GitHub issue template. Include:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment (OS, Node version, etc.)

## Questions?

[Where to reach the team for help]
```

## Common Mistakes

- **Assuming knowledge**: Don't assume contributors know your stack. A Python developer might want to contribute to your TypeScript project.
- **Outdated setup instructions**: These go stale fast. Run through them periodically on a clean machine.
- **Missing the "verify" step**: After setup, how does the contributor know it worked? Give them a specific command and expected output.
- **No mention of the PR process**: Contributors submit code and then wonder what happens next. Be explicit about review timelines and expectations.
