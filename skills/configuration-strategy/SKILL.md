---
name: configuration-strategy
description: "Design environment configuration, secrets management, and feature-flag hierarchy for a service or feature. Triggers: config strategy, environment variables, .env, secrets management, feature flag, config hierarchy, config precedence, twelve-factor config, environment-specific settings."
model: haiku
allowed-tools: Read, Grep, Glob, Write, Edit
---

# Configuration Strategy

Design configuration that is safe, auditable, and easy to change. Most configuration problems (hardcoded secrets, production config in dev, feature flags with no off-switch) come from not designing the system upfront.

## Step 1: Identify All Configuration Needed

List every piece of configuration the feature or service requires:

- **Service endpoints**: URLs for external APIs, internal services, databases
- **Credentials and secrets**: API keys, database passwords, signing keys, certificates
- **Behavior toggles**: Feature flags, A/B test parameters, rate limits, timeouts
- **Static config**: Timeouts, retry counts, pagination defaults, log levels
- **Environment-specific values**: Different database URLs for dev/staging/prod

Don't leave any implicit. "We'll hard-code the staging URL for now" is the start of a production incident.

## Step 2: Classify Each Configuration Item

For each item, determine:

**Sensitivity:**
- **Secret**: Must never appear in logs, code, or non-encrypted storage (API keys, passwords, tokens)
- **Sensitive**: Not a secret but not public (internal service URLs, customer IDs)
- **Non-sensitive**: Safe to log, safe in version control (log levels, timeouts, feature flag names)

**Mutability:**
- **Static**: Set at deploy time, doesn't change without a redeploy (database schema version, service name)
- **Runtime-mutable**: Can change without redeploy (feature flags, rate limits, A/B test parameters)

**Scope:**
- **Global**: Same value in all environments (timeout constants, algorithm parameters)
- **Environment-specific**: Different per env (database URLs, API endpoints, log levels)
- **Per-tenant/per-user**: Different per customer (feature entitlements, custom limits)

## Step 3: Design the Configuration Hierarchy

Based on classification, assign each item to the right storage:

| Storage | For | Examples |
|---------|-----|---------|
| Environment variables | Environment-specific non-secrets | DATABASE_URL, SERVICE_ENV, LOG_LEVEL |
| Secrets manager | All secrets | Database passwords, API keys, signing keys |
| Feature flag service | Runtime-mutable toggles | Feature flags, A/B variants, rollout percentages |
| Config file in repo | Non-sensitive static config | Timeout constants, retry policies, allowed values |
| Database (config table) | Per-tenant/per-user config | Customer-specific rate limits, feature entitlements |

**Hierarchy principle**: More specific overrides less specific. Per-tenant overrides environment which overrides global default.

See [references/config-patterns.md](references/config-patterns.md) for feature flag design patterns and secrets management tool guidance.

## Step 4: Plan Safe Config Rollout

Configuration changes can cause outages just like code changes. Plan rollout for each type:

**Secrets rotation:**
1. Generate new secret while old one remains valid
2. Deploy application with new secret
3. Verify application uses new secret correctly
4. Revoke old secret (after 24-hour overlap window)

**Feature flag rollout:**
1. Start at 0% — verify flag infrastructure works
2. Enable for internal users — catch obvious breakage
3. Enable for small percentage (5-10%) — monitor metrics
4. Ramp up gradually — verify metrics hold at each step
5. Full rollout — verify, then clean up the flag

**Environment variable changes:**
- New variables: set in target environment *before* deploying code that reads them
- Changed values: consider backward compatibility with old code during rolling deploys
- Removed variables: remove from code *before* removing from environment config

## Step 5: Audit Existing Code for Anti-patterns

Review the codebase for common configuration mistakes:

**Hardcoded values to find and fix:**
- IP addresses, hostnames, port numbers (search: `localhost`, `127.0.0.1`, regex for IP patterns)
- Credentials (search: `password`, `secret`, `api_key`, `token` in string literals)
- Environment-specific constants (search for strings that differ between environments)
- Magic numbers that should be configurable (search for hardcoded timeouts, limits, batch sizes)

**Config anti-patterns:**
- Feature flags that have been "on" everywhere for 6+ months (dead code risk — remove the flag)
- Config values read but never validated (add startup validation that fails fast on missing config)
- Different config loading paths for test vs production (leads to "works in tests but not prod")
- Secrets passed via command-line arguments (visible in process lists)

## Principles Applied

- **DRY**: Single source of truth for each config value. If the same value appears in multiple places, it will drift.
- **KISS**: Flat config beats deeply nested config. Environment variables beat custom config DSLs.
- **Least privilege**: Services should only have access to the secrets they need. Database credentials shouldn't be shared across services.
- **YAGNI**: Don't create config variables for things that will never change. Hard-code what's truly constant.
- **Fail fast**: Validate all required config on startup. A crash at startup is better than a mysterious failure 10 minutes in.

## Cross-Skill References

- `feature-planning` — decide which behaviors will be feature-flagged during planning, before implementation
- `security-audit` — review secrets handling and access control as part of security review
- `deployment-checklist` — verify all config is set before deploying
- `rollback-strategy` — feature flags are the simplest rollback mechanism; design them accordingly
