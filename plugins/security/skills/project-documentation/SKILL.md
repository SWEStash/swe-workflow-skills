---
name: project-documentation
description: "Write project docs — README, contributing guides, API docs, changelogs, inline docs — and reconcile existing docs after a change made them wrong. Owns doc drift from the change in front of you; a repo-wide doc-rot audit belongs to technical-debt-review."
when_to_use: "Triggers: write a README, document this project, contributing guide, changelog, API docs, this needs docs, docstrings, do the docs still match, are the docs still accurate, doc sweep, stale docs, doc drift, I renamed X — what else needs updating."
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

Two modes use this skill. **Authoring** creates a document that doesn't exist yet
(the four workflows below). **Sync** reconciles documents that already exist
because a change made them wrong — that's the next section, and it's the mode you
want when someone says "I changed X" rather than "write me a Y".

## Workflow: Sync After a Change

Docs don't rot evenly. They rot where a change moved something a document names,
and nobody reread that document. Work from the diff, not from a general sense
that the docs feel old:

1. **Derive the identifiers.** From the diff, list what a reader could be relying
   on: flags, env vars, config keys, endpoints, commands, script names, package
   and directory names, install/setup steps, public exported symbols. Include the
   **old** names — those are what the docs still say.
2. **Grep the doc set** for each: README, `docs/`, and inline docs.
3. **Triage each hit** — wrong (contradicts the code now), incomplete (the code
   grew, the doc didn't), or fine. Only the first two are yours.
4. **Reconcile**, smallest edit that makes it true. Reconciliation is not a
   rewrite, and it's not an excuse to restructure a document you happened to open.
5. **Verify links resolve** if you moved or added any.

**Check inventories before prose.** Prose gets reread when someone edits the
feature it describes; tables, diagrams, ADR indexes, project-layout blocks, and
endpoint lists do not. Machine-like lists are where drift accumulates silently and
where it's least visible — a paragraph that's half-wrong reads oddly, while a
table missing two rows reads perfectly.

**A clean grep is not an all-clear.** Docs use shorthand, globs, and brace
expansion (`/api/{users,orders}`), so a literal grep can miss a line that
documents exactly what you changed. When a document plausibly covers the area,
open the section and read it.

## Accuracy: what you write is a claim

Both modes. A doc is a set of assertions about the code, and a sweep can introduce
errors as easily as it removes them — a confidently-worded wrong sentence outlives
the stale one it replaced, because it looks freshly maintained.

- **No claim from recall.** Every factual sentence comes from something you read
  this session. If you're describing what an endpoint does, open the handler.
- **Enumerate from the source of truth.** Endpoints from the router file, scripts
  from listing the directory, packages from the manifest, flags from the arg
  parser. Don't rebuild a list from memory and spot-check it — build it from the
  source and let it be complete by construction.
- **Re-read your own doc diff against the code** before committing, with the same
  scrutiny you'd give a code hunk. This is where a wrong claim gets caught.

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

Accumulate entries under `[Unreleased]` as changes land. Writing the entries is this
skill's work even when they must be reconstructed from git history — read the log
since the last tag, drop trivial commits (merges, typo fixes), and translate the rest
into user-perspective entries under the sections above. Hand off only the release
mechanics (version choice, tagging, publish automation) to `release-management`.

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
- **YAGNI**: Don't write architecture docs for a 200-line script. Match documentation depth to project complexity. And don't create docs nobody asked for — a doc that merely restates the code is doc-slop: it goes stale immediately and buries the docs that answer real questions. Every document must answer a question someone actually has.
