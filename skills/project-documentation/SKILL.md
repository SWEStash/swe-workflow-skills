---
name: project-documentation
description: "Write and maintain project docs — README, contributing guides, API docs, changelogs, inline docs. Triggers: write a README, document this project, create documentation, contributing guide, changelog, API docs, how do I document, this needs docs, onboarding docs, JSDoc, docstrings."
model: haiku
allowed-tools: Read, Grep, Glob, Write, Edit
---

# Project Documentation

Help create and maintain documentation that makes a project understandable, usable, and contributable. Good documentation answers three questions: What is this? How do I use it? How do I contribute?

## Document Types

Identify which documents the project needs based on context:

| Document | When Needed | Audience |
|----------|-------------|----------|
| README.md | Every project | Users, contributors, evaluators |
| CONTRIBUTING.md | Open source or team > 3 | New contributors |
| API Documentation | Any project with an API | API consumers |
| CHANGELOG.md | Any project with releases | Users upgrading between versions |
| Architecture docs | Complex systems | New team members, future maintainers |
| Inline docs (JSDoc/docstrings) | Public APIs, complex logic | Developers reading the code |

Ask the user which they need. If unsure, start with README — every project needs one.

## Workflow: README

### Step 1: Analyze the Project

Before writing, understand what exists:

- Read the codebase structure, package.json/pyproject.toml/go.mod, and existing docs
- Identify the project type (library, CLI, web app, API, monorepo)
- Identify the tech stack and key dependencies
- Look for existing setup scripts, Docker files, or CI config
- Check for a license file

### Step 2: Write the README

Use the template at [templates/readme.md](templates/readme.md). Adapt sections based on project type:

**For a library/package**: Emphasize installation, quick start, API reference, and examples.
**For a web app**: Emphasize prerequisites, setup, running locally, and environment config.
**For a CLI tool**: Emphasize installation, usage with command examples, and configuration options.
**For an API**: Emphasize endpoints overview, authentication, and link to full API docs.
**For a monorepo**: Emphasize structure overview, per-package docs, and how packages relate.

Key principles:
- **Lead with value**: The first thing someone reads should explain what the project does and why they should care. Not the tech stack, not the folder structure.
- **Working examples**: Every code snippet should be copy-pasteable and actually work.
- **Prerequisites explicitly stated**: Don't assume Node 20, Python 3.12, or Docker are installed. State versions.
- **From zero to running**: A new developer should go from `git clone` to a working local instance by following the README, without asking anyone.

### Step 3: Verify

- [ ] Can someone who has never seen this project understand what it does from the first paragraph?
- [ ] Are all setup steps complete and in order?
- [ ] Do code examples actually work?
- [ ] Are prerequisites and versions specified?
- [ ] Is there a way to verify the setup worked (e.g., "you should see X")?

## Workflow: CONTRIBUTING.md

See [references/contributing-guide.md](references/contributing-guide.md) for the full guide on writing contributing docs.

## Workflow: API Documentation

When documenting an API:

1. **Inventory endpoints**: List all routes from the codebase (read router files)
2. **For each endpoint**: Method, path, description, request params/body, response shape, error codes, auth requirements
3. **Group by resource**: `/users/*`, `/orders/*`, `/products/*`
4. **Include examples**: Real request/response pairs, including error responses
5. **Output format**: Markdown for simple APIs, OpenAPI/Swagger spec for complex ones

Suggest using the `api-design` skill if the API doesn't exist yet and needs designing.

## Workflow: CHANGELOG

Follow Keep a Changelog conventions:

- Group changes under: Added, Changed, Deprecated, Removed, Fixed, Security
- Newest version at the top
- Link version headers to git comparison URLs
- Write entries from the user's perspective, not the developer's

See [templates/changelog.md](templates/changelog.md) for the format.

## Workflow: Inline Documentation

For code-level documentation (JSDoc, Python docstrings, Go doc comments):

- **Document public APIs**: Every exported function, class, and type
- **Skip obvious code**: Don't document `getName()` returning a name
- **Document the why**: Why this approach, why this parameter exists, why this edge case matters
- **Include examples** for non-obvious usage
- **Document exceptions/errors**: What can go wrong and under what conditions

## Principles Applied

- **KISS**: Write the minimum documentation that makes the project usable. Don't over-document internals.
- **DRY**: Don't duplicate information across docs. Link between documents instead.
- **YAGNI**: Don't write architecture docs for a 200-line script. Match documentation depth to project complexity.
