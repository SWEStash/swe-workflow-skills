# Rollback Patterns by Component

## Database Schema Changes

### Safe to deploy without a rollback plan
- **New nullable column**: Old code ignores it. If you roll back the code, the column sits unused — no harm.
- **New table**: Old code doesn't know about it. Drop it if truly unnecessary after rollback.
- **New index**: Can be dropped. Concurrent index creation avoids locking.

### Requires a rollback migration
- **NOT NULL constraint added to existing column**: Old code may insert nulls; rollback requires removing the constraint.
- **Column type change**: Data may be lost in conversion. Write a reverse migration and test it.
- **Column rename**: Requires the reverse rename. The safest approach: add new column → backfill → switch reads/writes → remove old column (4 deploys, fully reversible at each step).

### Requires careful coordination or is irreversible
- **Column dropped**: Must add back and re-populate from backups or recalculate. Avoid dropping columns in the same deploy as removing references to them — deploy the code change first, verify the column is unused, then drop in a separate deploy.
- **Data deleted**: If rows are deleted, rollback means restoring from backup. Always make a point-in-time backup before destructive migrations.
- **Data backfilled or transformed**: Write the reverse transformation before deploying. Test on a copy of production data.

### Schema migration rollback pattern
```sql
-- Forward migration: add_status_to_orders
ALTER TABLE orders ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'pending';

-- Reverse migration (write before deploying forward):
ALTER TABLE orders DROP COLUMN status;
```

For long-running migrations on large tables, test timing on production data size before deploying.

---

## Feature Flags

Feature flags are the simplest rollback mechanism. They decouple deployment from release.

### Rollback with feature flags
1. Disable the flag (turn off the feature)
2. Verify the application is in the expected "off" state
3. No code revert needed — old behavior is restored immediately

### Canary rollout and rollback
```
0%  → 5%  → 25%  → 100%
     ↑
     Monitor here: error rate, latency, conversion metrics
     If metrics degrade: roll back to 0% before proceeding
```

### What to test before deploying a flagged feature
- The "flag off" state works correctly (not just "flag on")
- Flag state changes propagate in under 1 minute
- The feature works correctly when the flag is enabled mid-session for a user

---

## API Changes

### Backwards-compatible (rollback-safe)
- Adding new optional fields to response
- Adding new endpoints
- Adding new optional request parameters with documented defaults
- Deprecating fields (keep returning them, add deprecation notice)

### Breaking changes (require versioning or coordination)
- Removing fields from response
- Changing field types or semantics
- Removing endpoints
- Making optional fields required

### Breaking change rollback strategy: API versioning
Deploy v2 alongside v1. Route clients to v2 incrementally. If v2 has issues, route back to v1. Remove v1 once v2 is stable and all clients have migrated.

### Breaking change rollback strategy: Expand-contract
1. **Expand**: Add new behavior alongside old (both old and new work)
2. **Migrate**: Move clients to new behavior
3. **Contract**: Remove old behavior once all clients have migrated

Rollback is possible at every step of expand-contract. Skip to step 3 without step 2 and rollback becomes risky.

---

## Cache Invalidation

If a rollback changes what valid cached data looks like:

- **Application-level cache**: Clear the cache as part of rollback
- **CDN cache**: Purge or set a short TTL before deploying so stale content expires quickly
- **Client-side cache**: Use cache-busting keys (content hash in asset filenames) so old clients don't cache new assets across deploys

---

## Event-Driven / Message Queue Changes

### Message schema changes
- **Additive fields**: Consumers ignore unknown fields in most message formats (protobuf, JSON with lenient parsers)
- **Removing fields**: Deploy consumers that handle missing fields before deploying producers that omit them
- **Consumer-first pattern**: For breaking changes, always deploy the consumer change first, then the producer change

### Message replay
If a bad deploy produced bad messages in a queue, rollback may require:
- Stopping consumers
- Dead-lettering or discarding the bad messages
- Rolling back code
- Replaying from a known-good point in the event log

---

## Infrastructure Changes

### Rollback for infrastructure-as-code
Always use version control for IaC. Rollback = apply the previous version of the Terraform/CloudFormation/Pulumi code.

**Before destructive infrastructure changes:**
- `terraform plan` and review what will be destroyed
- For stateful resources (databases, queues), add lifecycle rules: `prevent_destroy = true`
- Take a snapshot of stateful resources before making changes

### Blue-green deployment rollback
Maintain the previous environment ("blue") until the new environment ("green") is verified stable. Rollback = switch traffic back to blue.

**Prerequisites:**
- Load balancer or DNS supports instant traffic switching
- "Blue" environment remains live and healthy during deployment (don't recycle it immediately)
- Both environments can connect to the same database (or database is compatible with both)
