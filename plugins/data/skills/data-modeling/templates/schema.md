# Database Schema Templates

PostgreSQL-focused. MySQL notes marked inline. Copy, rename, and remove the columns you don't need.

---

## Table Template

```sql
CREATE TABLE orders (
  -- Primary key: use BIGSERIAL for high-volume tables, UUID for distributed/exposed IDs
  id          BIGSERIAL    PRIMARY KEY,
  -- id       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),  -- UUID alternative

  -- Foreign keys: explicit names, explicit ON DELETE behavior
  user_id     BIGINT       NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status      TEXT         NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'confirmed', 'cancelled', 'refunded')),
  total_cents BIGINT       NOT NULL CHECK (total_cents >= 0),  -- store money as integer cents
  notes       TEXT,                                            -- nullable: OK for optional fields

  -- Audit timestamps: always include, always have defaults
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  -- MySQL equivalent: DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- updated_at trigger (PostgreSQL)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;
CREATE TRIGGER orders_set_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

---

## Index Conventions

```sql
-- Foreign key indexes: idx_<table>_<column>
CREATE INDEX idx_orders_user_id ON orders (user_id);

-- Composite index: match the query's WHERE + ORDER BY column order
CREATE INDEX idx_orders_user_status ON orders (user_id, status);

-- Partial index: index only the rows the query targets
CREATE INDEX idx_orders_pending ON orders (created_at)
  WHERE status = 'pending';

-- Unique constraint (preferred over CREATE UNIQUE INDEX for constraints)
ALTER TABLE orders ADD CONSTRAINT uq_orders_external_id UNIQUE (external_id);
```

> **Naming pattern:** `idx_<table>_<columns>` for regular indexes, `uq_<table>_<columns>` for unique constraints, `fk_<table>_<referenced_table>` for named FK constraints.

---

## Enum Patterns

**Option A — PostgreSQL enum type** (fast, type-safe; hard to add values without migration):

```sql
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'cancelled', 'refunded');
ALTER TABLE orders ADD COLUMN status order_status NOT NULL DEFAULT 'pending';

-- Adding a value later: ALTER TYPE order_status ADD VALUE 'on_hold';  (irreversible)
```

**Option B — Constrained VARCHAR** (flexible; tradeoff: constraint must be updated for new values):

```sql
ALTER TABLE orders ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending', 'confirmed', 'cancelled', 'refunded'));
-- To add a value: ALTER TABLE orders DROP CONSTRAINT <constraint_name>, ADD CONSTRAINT ...
```

> **Rule of thumb:** Use Option A when the set is truly fixed (e.g., gender: M/F/other). Use Option B when the list may grow over time (e.g., order status, notification type).

---

## Migration File Template

```sql
-- migrations/20240315120000_add_orders_table.up.sql

BEGIN;

CREATE TABLE orders (
  id         BIGSERIAL    PRIMARY KEY,
  user_id    BIGINT       NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status     TEXT         NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  total_cents BIGINT      NOT NULL CHECK (total_cents >= 0),
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_user_id ON orders (user_id);

COMMIT;
```

```sql
-- migrations/20240315120000_add_orders_table.down.sql

BEGIN;

DROP TABLE IF EXISTS orders;

COMMIT;
```

> **Migration rules:**
> - Filename: `<timestamp>_<description>.up.sql` / `.down.sql` — timestamp prefix ensures ordered application.
> - Wrap in `BEGIN`/`COMMIT` so partial failures roll back.
> - Down migration must completely undo the up migration.
> - Backwards-compatible changes (ADD COLUMN with default) are safe to apply before deploying code. Breaking changes (DROP COLUMN, rename) require expand-contract: add new → migrate data → remove old.
