# Pre-Deploy Gates

## Gate 1: Code Review Complete

Before any deployment, the code must have been reviewed by at least one other engineer. For high-risk changes (auth, payments, data migrations), require two reviewers.

**What reviewers look for:**
- Logic correctness and edge cases
- Security issues (injection, auth gaps, secret exposure)
- Test coverage for new behavior
- Migration safety (see below)

## Gate 2: Schema Migration Safety

Database migrations are the most common source of deployment failures. Verify before deploying:

**Safe migrations (backwards-compatible):**
- Adding a nullable column
- Adding a new table
- Adding an index (use `CREATE INDEX CONCURRENTLY` in Postgres)
- Renaming a column in a phased approach (add new → backfill → remove old)

**Unsafe migrations (require coordination):**
- Dropping a column that old code still reads
- Renaming a column in a single migration
- Adding a NOT NULL constraint without a default on an existing table
- Changing a column type (may lock table)

**Migration checklist:**
- [ ] Migration is reversible (has a `down` method or equivalent)
- [ ] Migration runs in under 30 seconds on production-sized data (or is marked non-locking)
- [ ] Old application code is compatible with the new schema
- [ ] Migration has been tested on a recent production data snapshot

## Gate 3: Secrets and Configuration

**Verify:**
- [ ] All new environment variables are set in target environment(s) before deploying
- [ ] New secrets are stored in the secrets manager (not in `.env` files checked in)
- [ ] No credentials appear in code diff, logs, or error messages
- [ ] Feature flags required for this release are in the correct state

**Common failure mode:** Deploying code that reads a new env var before the var is set. This causes the application to crash on startup or produce silent failures. Always set the variable first, then deploy the code that reads it.

## Gate 4: Rollback Triggers

Define these before deploying. If any trigger fires, roll back immediately without waiting for investigation:

| Metric | Rollback threshold |
|--------|-------------------|
| Error rate | > 1% of requests (or 2x baseline, whichever is lower) |
| P99 latency | > 3x baseline |
| 5xx rate | Any spike above noise floor |
| Queue depth | Backlog growing for > 5 minutes |
| Business metric | Checkout rate, signup rate drops > 10% |

Set up monitoring dashboards before deploying. If you can't see the metrics, you can't detect the trigger.

## Per-Environment Checklist

### Development / Local
- Tests pass
- No lint errors
- Feature works manually

### Staging
All development checks, plus:
- Integration tests pass against staging services
- Migration runs successfully on staging database
- New env vars are configured in staging
- Manual smoke test of critical paths

### Production
All staging checks, plus:
- Rollback plan documented and tested
- On-call engineer aware of deployment
- Monitoring dashboard open
- Deployment window appropriate (avoid Friday afternoon, peak traffic hours)
- Runbook updated if operational behavior changed

## Secrets Rotation Procedures

When rotating a secret that is actively used:

1. **Generate new secret** — create the new value without deleting the old one
2. **Add to application** — update the application to accept both old and new values (if possible) or to use the new value
3. **Deploy** — deploy the application update
4. **Verify** — confirm the application is using the new secret correctly
5. **Revoke old secret** — only after confirming new secret works

For API keys that can't be dual-accepted: schedule a maintenance window, update key and redeploy atomically, verify immediately, keep old key available for 24 hours before revoking.
