---
name: dependency-management
description: "Evaluate, audit, and upgrade dependencies — whether a library is needed at all or an own module beats it, adoption vetting, CVE audits, major upgrades, conflicts. Run before naming any new library in a plan, ADR or install."
when_to_use: "Triggers: should I use this library, which packages do we need, write our own instead, we use a small part of it, npm audit, dependency vulnerability, upgrade dependencies, outdated packages, lock file, breaking changes in upgrade, is this library maintained, dependency conflict, slopsquatting, does this package exist, AI suggested this library."
---

# Dependency Management

Help make disciplined decisions about project dependencies. Every dependency is a trade-off: functionality gained vs. maintenance burden, security surface, and coupling accepted.

## Core Rule

**Every dependency should earn its place.** Before adding a dependency, ask: "Is this worth the ongoing cost of maintaining, updating, and trusting someone else's code in my project?"

## Workflow: Evaluating a New Dependency

### Step 1: Do You Need It?

Run this for every library you are about to name: one the user asks about, and one you are about to put in a plan, an ADR, or an install command. A candidate list someone hands you (an ADR, a plan, a teammate's pick) is the input to this step, not its result. Compare each candidate with **an own module**, not only with other libraries. Checking that a package exists and is maintained (Steps 2–3) does not answer whether you need it.

For each candidate, fill one row:

| Field | What to write |
|---|---|
| **Used** | The functions or features we would call, against what it ships |
| **Pulls in** | Transitive packages, native builds, and maintainer groups (count groups, not packages) |
| **Already covered** | By the standard library, the platform, or a dependency we already have |
| **Own module** | What it would be, rough line count, and how it is tested |
| **Grows into** | Planned features (roadmap, PRD, open issues) that would use more of it. An own module that would have to regrow the library is not small |
| **Gives beyond code** | Portability, an abstraction, spec conformance, a security track record. Check the claim: one vendor's SDK is not an abstraction over many vendors |

Then give each row a verdict:

- **Own module, or nothing:** we'd use a sliver of it, the own module is small, and nothing planned grows it. Same when the standard library or a current dependency already covers it.
- **Adopt:** we'd use a substantial part of it, or correctness is specialized and costly to get right (cryptographic primitives, timezone math, database drivers, a parser for hostile input). Continue to Steps 2–4.
- **Ask the user:** the rows don't decide it. That covers a mid-size own module, security-critical code, or a call that hinges on the roadmap or on how much code the team is willing to maintain, which you can't see. Present both options with your recommendation and what each costs, and get the user's choice before installing the library or writing the module. This is not a gate on the rest of the answer: deliver the table and the other verdicts in the same response, with the question beside them.

**Security-critical code:** never write your own cryptographic primitives. Thin protocol code over a crypto library you already ship can be owned, for example TOTP, a request signer, or a WebAuthn check that only accepts `none` attestation. Own it only when the user chooses to (ask), with a test per spec step, and with differential tests against the library kept as a dev-only dependency.

**Exit condition:** the table with a verdict per row, in the same response. Steps 2–4 apply only to rows marked Adopt.

### Step 2: Verify the Package Exists (anti-slopsquatting)

Before evaluating anything else, confirm the package is real and is the one you think it is. AI assistants hallucinate plausible package names at a measurable rate (~20% of AI package recommendations reference packages that don't exist), and attackers register those exact names to deliver malware — **slopsquatting**. A hallucinated name passes every traditional typo filter because it collides with nothing.

- **Confirm the exact name exists in the registry** (`npm view <pkg>`, the PyPI project page) and that the registry entry's repository link points to the project you expect.
- **Check adoption history over time** — steady downloads across months, not a package registered last week. A brand-new package with a burst of installs matching an AI-suggested name is the attack signature.
- **Check typo-distance from a popular package.** Hallucinations often shadow a real name (e.g. `unused-imports` vs the real `eslint-plugin-unused-imports`). If a more popular near-neighbor exists, you probably want the neighbor.
- **Treat any AI-suggested package name as unverified input.** Verify it the same way you'd verify a URL from an untrusted source — before it reaches `npm install`.

### Step 3: Evaluate the Library

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
- Identify 2-3 alternatives, including Step 1's own module, and compare on the dimensions above
- A slightly less popular library that's better maintained may be the better choice

See [references/evaluation-checklist.md](references/evaluation-checklist.md) for the structured assessment template.

### Step 4: Present the Recommendation

For the user, summarize:
- **Recommendation**: Use / Own module / Don't use / Consider alternative. When Step 1 marked the row Ask the user, give your recommendation and ask; don't install until they answer
- **Primary reason**: The most compelling argument
- **Risks accepted**: What you're trading off
- **Alternatives considered**: when you compare two or more libraries, a table with one column per candidate covering the Step 3 dimensions. Give numbers: bundle or install size, transitive dependency count, weekly downloads. Then show the same small task (one schema, one call) written in each library, so the ergonomics can be compared rather than asserted

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
2. **What's the severity?** Start with Critical and High, which need immediate action. Many Moderate and Low findings sit in dev-only tooling or in code paths you never call. Those are acceptable risk: say so, record the decision with its reason, and recheck at the next upgrade instead of fixing everything. Fix the rest of the Moderate findings within a sprint.
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

Then run Step 1's table on each remaining direct dependency to find the ones used for only a sliver. Fill **Grows into** before proposing a replacement: a library we use lightly today can be the right choice for a feature on the roadmap.

### Step 4: Produce the Report

Summarize: N vulnerabilities found (X critical, Y high), N unused packages, N used for a sliver (with own-module alternatives and sizes), N significantly outdated.

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
- Before starting, make sure the tests cover the surface the upgrade touches. Write characterization tests where coverage is thin, because the suite is how you will know the upgrade broke nothing
- Create a detailed task list of changes needed
- Changes that work on both the old and the new version can merge to main as they land. The version bump itself runs in isolation (a branch through the full suite, then staging) before it merges
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
