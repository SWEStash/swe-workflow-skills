---
name: deployment-checklist
description: Pre-deployment verification and release safety checks to ensure production readiness. Use when the user is preparing to deploy, release, or ship code to production or staging. Triggers on phrases like "deploy", "release", "ship it", "push to production", "go live", "pre-deploy check", "is this ready to deploy", "merge to main", "release checklist", or when the user has completed implementation and is ready to ship.
---

# Deployment Checklist

Ensure code is production-ready before deploying. This skill runs through a structured verification process that catches common deployment failures before they reach users.

## Workflow

### Step 1: Assess the Change

Understand the scope and risk of what's being deployed:

- **What changed?** Review the diff against the deployment target branch
- **Change type?** Feature / bugfix / hotfix / infrastructure / dependency update
- **Risk level?** Low (cosmetic), Medium (logic change), High (data migration, auth, payments)
- **Rollback plan?** Can this be reverted with a simple deploy, or does it require data migration reversal?

### Step 2: Run the Checklist

Walk through each section. Check items by reading code, running commands, and verifying artifacts.

#### Code Quality
- [ ] All tests pass (`npm test`, `pytest`, or project-specific command)
- [ ] No linting errors or warnings
- [ ] No `TODO` or `FIXME` items related to this change left unaddressed
- [ ] No debugging code (console.log, debugger, print statements) left in
- [ ] No commented-out code blocks

#### Testing
- [ ] New behavior has corresponding tests
- [ ] Edge cases and error paths are tested
- [ ] Integration tests pass against a clean environment
- [ ] If applicable: manual testing completed on staging

#### Security
- [ ] No hardcoded secrets, API keys, or credentials
- [ ] No new endpoints without authentication/authorization
- [ ] User input is validated and sanitized
- [ ] Dependencies have no known critical vulnerabilities (`npm audit`, `pip audit`)

#### Database & Data
- [ ] Migrations are forwards-compatible (old code works with new schema)
- [ ] Migrations are reversible
- [ ] Large data changes have been tested on production-sized data
- [ ] No destructive operations without confirmation (DROP, DELETE without WHERE)
- [ ] Backfill scripts are idempotent (safe to run multiple times)

#### Configuration & Environment
- [ ] New environment variables are documented and set in all target environments
- [ ] Feature flags are in the correct state for this release
- [ ] No environment-specific hardcoding (localhost URLs, test credentials)

#### Observability
- [ ] Errors are logged with sufficient context for debugging
- [ ] New endpoints/operations have appropriate metrics or monitoring
- [ ] Alert thresholds are reviewed for new functionality

#### Documentation
- [ ] README updated if setup steps changed
- [ ] API documentation updated for new/changed endpoints
- [ ] CHANGELOG updated (if project uses one)
- [ ] Breaking changes are clearly communicated

### Step 3: Report

Summarize the checklist results:

- **Ready to deploy**: All checks pass
- **Needs attention**: List specific items that need fixing
- **Blocked**: Critical issues that must be resolved (data loss risk, security gap, failing tests)

### Step 4: Deploy Safely

Based on the change risk level:

- **Low risk**: Deploy directly, monitor for 15 minutes
- **Medium risk**: Deploy to staging first, verify, then production. Monitor for 1 hour
- **High risk**: Deploy behind a feature flag, canary to a small percentage, monitor, then roll out gradually

## Quick Reference

For urgent hotfixes where the full checklist feels heavy, run at minimum:
1. Tests pass
2. No secrets in code
3. Migrations are reversible
4. Rollback plan exists

Everything else can be addressed in a follow-up, but these four prevent the worst outcomes.

## Principles Applied

- **KISS**: The simplest deploy that can safely reach production. Avoid adding complexity (new flags, new services) in the same deployment as the feature.
- **Defense in depth**: Validate at every gate — tests, staging, canary — not just once. Each gate catches a different class of failure.
- **Fail fast**: If a check fails, stop and fix before proceeding. A blocked deploy is far cheaper than a production incident.
- **YAGNI**: Don't deploy speculative configuration or unused feature flags. Unused config is future confusion.

See [references/pre-deploy-gates.md](references/pre-deploy-gates.md) for environment-specific checklists, schema migration safety, and rollback trigger criteria.

## Cross-Skill References

- `rollback-strategy` — design the rollback plan before deploying (required for High-risk changes)
- `configuration-strategy` — verify all environment variables and feature flags are configured correctly
- `incident-response` — use if the deployment causes a production incident
