---
name: dependency-management
description: "Evaluate, audit, and upgrade project dependencies — assess libraries before adoption, audit CVEs, plan major upgrades, resolve conflicts. Triggers: should I use this library, npm audit, upgrade dependencies, dependency vulnerability, outdated packages, evaluate this package, is this library maintained, dependency conflict, lock file, breaking changes in upgrade."
allowed-tools: Read, Grep, Glob, Write, Edit, WebFetch, WebSearch
---

# Dependency Management

Help make disciplined decisions about project dependencies. Every dependency is a trade-off: functionality gained vs. maintenance burden, security surface, and coupling accepted.

## Core Rule

**Every dependency should earn its place.** Before adding a dependency, ask: "Is this worth the ongoing cost of maintaining, updating, and trusting someone else's code in my project?"

## Workflow: Evaluating a New Dependency

### Step 1: Do You Need It?

Before evaluating any library, check if the need can be met without one:

- **Is this a few lines of code?** Writing `leftPad` yourself is better than importing it.
- **Does the language/framework already provide this?** Check built-in APIs first.
- **Is this a one-time use?** Copy-paste a small utility function instead of adding a dependency.

A dependency is justified when it provides substantial, maintained functionality that would be costly and error-prone to build yourself (e.g., cryptography, date handling with timezones, database drivers, authentication).

### Step 2: Evaluate the Library

For any library under consideration, assess these dimensions:

**Maintenance health:**
- Last commit date (stale > 1 year is a yellow flag)
- Open issues and PR response time
- Number of maintainers (bus factor — 1 maintainer is risky)
- Release frequency and changelog quality

**Adoption signals:**
- Weekly downloads / GitHub stars (not definitive, but signals community trust)
- Used by known projects (check dependents)
- Ecosystem maturity (plugins, integrations, documentation)

**Technical fit:**
- TypeScript support (if applicable)
- Bundle size impact — check on bundlephobia.com or similar
- API quality — is it intuitive, well-documented, consistent?
- Compatibility with your runtime, framework version, and other dependencies

**Security and legal:**
- License compatibility with your project (MIT, Apache-2.0 are permissive; GPL is viral)
- Known vulnerabilities (check npm audit advisory, Snyk, or GitHub advisories)
- Does it have excessive transitive dependencies?

**Alternatives comparison:**
- Identify 2-3 alternatives and compare on the dimensions above
- A slightly less popular library that's better maintained may be the better choice

See [references/evaluation-checklist.md](references/evaluation-checklist.md) for the structured assessment template.

### Step 3: Present the Recommendation

For the user, summarize:
- **Recommendation**: Use / Don't use / Consider alternative
- **Primary reason**: The most compelling argument
- **Risks accepted**: What you're trading off
- **Alternatives considered**: Brief comparison

## Workflow: Auditing Existing Dependencies

### Step 1: Run Vulnerability Scanners

```bash
# JavaScript/TypeScript
npm audit
# For more detail:
npx better-npm-audit audit

# Python
pip audit
# or
safety check

# Go
govulncheck ./...

# Ruby
bundle audit check --update
```

### Step 2: Triage Results

Not all vulnerabilities require action. For each finding:

1. **Is the vulnerable code path actually used in your project?** Many CVEs affect specific features you may not use.
2. **What's the severity?** Critical and High need immediate action. Medium within a sprint. Low can be tracked.
3. **Is a patched version available?** If yes, upgrade. If no, assess mitigation or replacement.
4. **Is it a transitive dependency?** You may need to upgrade the parent package, or use overrides/resolutions.

### Step 3: Find Unused Dependencies

Dead dependencies add attack surface and bloat for zero value.

```bash
# JavaScript — find unused packages
npx depcheck

# Python — find unused imports (suggests unused packages)
pip install vulture
vulture src/ --min-confidence 80
```

Remove unused dependencies. If unsure, comment it out, run tests, and deploy to staging.

### Step 4: Produce the Report

Summarize: N vulnerabilities found (X critical, Y high), N unused packages, N significantly outdated.

## Workflow: Major Version Upgrades

### Step 1: Read the Changelog

Read the changelog and migration guide for the new major version. Identify:
- **Breaking changes**: What will break in your code?
- **Deprecations resolved**: What deprecated APIs were removed?
- **New features**: Anything that simplifies your code?
- **Peer dependency changes**: Does this force other upgrades?

### Step 2: Plan the Upgrade

For low-risk upgrades (well-documented, small surface area):
- Create a branch, bump the version, run tests, fix failures.

For high-risk upgrades (framework major version, ORM, auth library):
- Create a detailed task list of changes needed
- Test in isolation first if possible
- Consider running old and new versions in parallel temporarily (expand-contract)
- Suggest using the `feature-planning` skill to break the upgrade into tasks

### Step 3: Validate

- [ ] All tests pass
- [ ] No deprecation warnings from the upgraded package
- [ ] No new vulnerabilities introduced by the upgrade
- [ ] Lock file is committed and clean
- [ ] Bundle size has not increased unexpectedly

## Quick Reference: Lock File Hygiene

- **Always commit lock files** (`package-lock.json`, `yarn.lock`, `poetry.lock`, `go.sum`)
- **Never edit lock files manually** — let the package manager manage them
- **Use `npm ci` (not `npm install`) in CI** — installs from lock file exactly
- **Review lock file diffs in PRs** — large unexpected changes signal problems
- **Regenerate periodically** if the lock file becomes stale or conflicted

## Principles Applied

- **YAGNI**: Don't add a library for a feature you *might* need. Add it when the need is real and proven.
- **KISS**: Prefer libraries with small, focused APIs over Swiss-army-knife frameworks.
- **DRY**: A well-chosen dependency eliminates duplication across projects — but a bad choice creates maintenance debt across projects.
- **Functional Independence**: Prefer libraries that don't deeply couple to your application architecture. You should be able to swap them out.
- **Boundaries**: Wrap third-party APIs with thin adapter layers — depend on your own abstractions, not on library specifics. This limits blast radius when a dependency changes or is replaced, and keeps your business logic free of third-party types. Only skip wrapping for pervasive infrastructure (e.g., your web framework, your ORM) where the cost of wrapping exceeds the cost of coupling.
