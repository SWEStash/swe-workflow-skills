# Data Modeling Conventions

## Contents
- Naming conventions
- Primary key strategies
- Common column types
- Index naming
- Migration best practices

## Naming Conventions

- **Tables**: plural, snake_case (`users`, `order_items`, `payment_methods`)
- **Columns**: singular, snake_case (`email`, `created_at`, `user_id`)
- **Foreign keys**: `{referenced_table_singular}_id` (e.g., `user_id`, `order_id`)
- **Join tables**: alphabetical concatenation (`product_tags`, `role_users`)
- **Boolean columns**: prefix with `is_` or `has_` (`is_active`, `has_verified_email`)
- **Timestamps**: suffix with `_at` (`created_at`, `deleted_at`, `last_login_at`)

## Primary Key Strategies

| Strategy | Use When | Avoid When |
|----------|----------|------------|
| Auto-increment integer | Single-database apps, simple CRUD | Distributed systems, public-facing IDs |
| UUID v4 | Distributed generation needed, merge safety | Storage-sensitive, need sortable IDs |
| ULID / UUID v7 | Need sortable + distributed + compact | Legacy systems that expect integers |
| Natural key | Data has a true natural identifier | Natural key might change |

Default recommendation: auto-increment for internal apps, ULID for APIs and distributed systems.

## Common Column Patterns

**Soft deletes**: Add `deleted_at TIMESTAMP NULL` instead of physically deleting rows. Add a partial index: `CREATE INDEX idx_active_users ON users(id) WHERE deleted_at IS NULL;`

**Polymorphic associations**: Prefer dedicated join tables over `type`/`id` column pairs. Polymorphic columns lose foreign key enforcement.

**JSON columns**: Use for truly schemaless data (user preferences, external API payloads). Never for data you query by — that data belongs in proper columns with indexes.

**Enums**: Prefer check constraints or reference tables over database-level enums. Enums are hard to modify in most databases.

## Index Naming

Pattern: `idx_{table}_{columns}_{type}`

- `idx_users_email_unique`
- `idx_orders_user_id_created_at`
- `idx_products_name_gin` (for full-text search)

## Migration Best Practices

1. **One concern per migration**: Don't mix schema changes with data changes
2. **Always reversible**: Every `up` must have a corresponding `down`
3. **Expand-contract for breaking changes**:
   - Migration 1: Add new column, backfill data
   - Deploy: Update code to write to both old and new columns
   - Migration 2: Remove old column
4. **Test migrations on production-like data**: A migration that works on 100 rows might lock the table on 10 million rows
5. **Avoid renaming columns in production**: Add new column, migrate data, drop old column
