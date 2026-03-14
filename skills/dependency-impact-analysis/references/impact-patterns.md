# Impact Patterns

## API Versioning Strategies

### URL versioning
```
/api/v1/users/{id}
/api/v2/users/{id}
```
Simplest to implement. Consumers explicitly opt into the new version. Old version remains accessible until deprecated.

**When to use**: Public APIs with external consumers. Breaking changes are unavoidable.

**Deprecation process**:
1. Announce deprecation with sunset date (minimum 6 months for external consumers)
2. Add `Deprecation` header to responses: `Deprecation: Sat, 01 Jan 2026 00:00:00 GMT`
3. Monitor v1 traffic to track migration progress
4. Sunset v1 after deadline

### Header versioning
```
Accept: application/vnd.myapi.v2+json
```
Cleaner URLs. More complex routing. Use when URL versioning breaks REST resource semantics.

### Query parameter versioning
```
GET /api/users/{id}?version=2
```
Easy to test in browser. Explicit but verbose. Common for internal APIs with few consumers.

### No versioning (evolve in place)
Only works if all changes are additive. Works well for internal services where you control all consumers and can coordinate deploys.

---

## Database Migration Coordination

### Single-service database
All reads and writes go through one service that owns the schema. Migration coordination is just within that service.

**Safe upgrade sequence**:
1. Deploy migration (schema change)
2. Deploy application code that uses new schema

**Rollback**: reverse migration + revert code deploy.

### Shared database (multiple services read the same tables)
The most dangerous architecture for migrations. Any schema change can break other services.

**Rules for shared database migrations**:
1. **Never drop a column** without verifying no other service reads it
2. **Never rename a column** without an expand-contract migration
3. **Adding NOT NULL constraints** on existing columns requires a default value or coordinated deploy
4. Always search all service codebases for references to the table/column before migrating

**Migrate shared tables using expand-contract**:
```
Step 1: Add new_column alongside old_column (both present)
Step 2: Deploy service A to write to both columns, read from old_column
Step 3: Deploy all other services to read from new_column
Step 4: Deploy service A to write only to new_column
Step 5: Drop old_column
```

### Zero-downtime migrations
For large tables where schema changes lock the table:

**Postgres**: Use `ALTER TABLE ... ADD COLUMN ... DEFAULT NULL` (instant) then backfill asynchronously. Adding a default value to a new column in Postgres 11+ is instant.

**Avoid in production**:
- `ALTER TABLE ... ADD COLUMN ... NOT NULL` (requires table scan + lock pre-Postgres 11)
- `CREATE INDEX` without `CONCURRENTLY` (locks entire table)
- `ALTER TABLE ... SET NOT NULL` on a column that may contain nulls

---

## Event Schema Evolution

### Backwards-compatible event changes
- Adding new optional fields
- Adding new event types (consumers ignore unknown types)
- Loosening validation (accepting more values)

### Breaking event changes
- Removing fields consumers depend on
- Changing field semantics (same name, different meaning)
- Tightening validation (rejecting previously-valid values)
- Changing the primary identifier field

### Schema registry approach (for Kafka/event streaming)
Use a schema registry (Confluent Schema Registry, AWS Glue) to enforce compatibility:

- **BACKWARD**: New schema can read data written by old schema (consumer can be updated first)
- **FORWARD**: Old schema can read data written by new schema (producer can be updated first)
- **FULL**: Both backward and forward compatible (safest; most restrictive)

### Consumer-first pattern (no schema registry)
For breaking changes without a schema registry:
1. Deploy consumers that handle both old and new schema (check for field presence before using it)
2. Deploy producers using new schema
3. Remove old schema handling from consumers once all producers are updated

---

## Shared Library Change Coordination

### Semantic versioning
- **PATCH** (1.0.x): Bug fixes, no API changes. Consumers upgrade safely.
- **MINOR** (1.x.0): New additive features. Old code still works. Consumers can upgrade when ready.
- **MAJOR** (x.0.0): Breaking changes. Consumers must update their code to use the new version.

### Monorepo vs. multi-repo impact
**Monorepo**: All dependents are visible. Tooling (Nx, Turborepo, Bazel) can identify which services are affected. Breaking library change requires updating all consumers in the same PR/release.

**Multi-repo**: Consumers are on different release cycles. Use semantic versioning + deprecation period. Old major version must be maintained until all consumers migrate.

### Lock files and version pinning
Consumers with pinned versions won't receive the change automatically. Must explicitly update their dependency. This provides safety (can choose when to migrate) but also means old versions can persist indefinitely.

---

## Finding Dependents Quickly

### Grep patterns for common dependency types

**REST endpoint consumers:**
```bash
grep -r "GET /api/users" --include="*.{ts,js,py,go,rb}" .
grep -r "POST /api/orders" --include="*.{ts,js,py,go,rb}" .
```

**Database column references:**
```bash
grep -r "\.email\b" --include="*.{ts,js,py,go}" .
grep -r "\"email\"" --include="*.{ts,js,py,go}" .
grep -r "users\.email" --include="*.{sql}" .
```

**Function/class references (TypeScript/JavaScript):**
```bash
grep -r "import.*UserService" --include="*.ts" .
grep -r "from.*user-service" --include="*.ts" .
```

**Package imports:**
```bash
grep -r "require.*my-shared-lib" --include="*.js" .
grep -r "from my_shared_lib" --include="*.py" .
```
