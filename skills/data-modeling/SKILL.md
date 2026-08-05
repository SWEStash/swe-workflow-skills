---
name: data-modeling
description: "Design database schemas, relationships, indexes, and migration strategies — relational and document stores. Triggers: data model, schema design, ER diagram, database schema, table design, foreign key, index strategy, normalization, denormalization, migration plan, document model, partition key."
allowed-tools: Read, Grep, Glob, Write, Edit, Bash
---

# Data Modeling

Guide the user through designing data models that are normalized, consistent, and evolvable. Good data models make the right things easy and the wrong things hard.

## Workflow

### Step 0: Inventory What Already Exists

If any database exists, establish what it already holds before proposing a
single new table, column, or index. Inspect the current schema **directly** —
don't infer it from the requirements, the ORM models, or memory. Dump it from
the live database where you can reach one, otherwise read the migration history
end to end.

Cover both:

- **Artifacts** — existing tables, columns, and indexes that hold, or could
  hold, the fact in question. Grep for the concept by name and by synonym; the
  right table is often named for a different concern than the one you're serving.
- **Written decisions** — ADRs, schema conventions, and prior audit findings
  that already constrain the shape.

**Exit condition** — one line, then keep going in the same response:
*"`<existing table>` already stores `<fact>`; it does / does not serve this
because `<reason>`."*

**This step is not a gate on delivering.** Greenfield — no database yet, or none
you can reach — closes it in one line: say so and go straight to Step 1. When
you can't inspect (no repo access, a conversational answer), name what you would
check and continue under stated assumptions. Never answer a schema request with
inventory and questions alone; produce the model in the same reply.

This constrains the input, not the choice. A new table is a fine outcome; an
unexamined one isn't — and a second home for the same fact is duplication
however well it's named.

### Step 1: Understand the Domain

Before touching schemas, understand the business domain:

- **What are the core entities?** (nouns in the requirements: User, Order, Product)
- **What are the relationships?** (verbs: User *places* Order, Order *contains* Products)
- **What are the cardinalities?** (one-to-one, one-to-many, many-to-many)
- **What are the access patterns?** (how will the data be queried most often)
- **What are the invariants?** (rules that must always hold: "an order must have at least one item")

If the user describes a feature rather than a domain, extract the entities from the feature description first.

### Step 2: Design the Conceptual Model

Produce an entity-relationship description listing:

- Each entity with its key attributes
- Relationships with cardinality (1:1, 1:N, M:N)
- Business rules that constrain the model

Present this as a structured list or ASCII diagram. Don't jump to SQL yet — validate the conceptual model with the user first.

### Step 3: Apply Normalization

Design tables following normalization principles:

- **1NF**: No repeating groups; every column holds atomic values
- **2NF**: Every non-key column depends on the whole primary key
- **3NF**: No transitive dependencies (non-key → non-key)

Denormalize only with explicit justification (specific read performance requirement with measured data). Document every denormalization decision and the access pattern it serves.

### Step 4: Define the Physical Schema

Produce SQL DDL or ORM model definitions. For each table include:

- Primary key strategy (auto-increment, UUID, ULID — justify the choice)
- Foreign keys with ON DELETE/ON UPDATE behavior
- Indexes based on identified access patterns
- Constraints (NOT NULL, UNIQUE, CHECK) that enforce business rules
- Timestamps (created_at, updated_at) as appropriate

Use [templates/schema.md](templates/schema.md) as a starting point for table DDL, index naming, enum patterns, and migration file structure.

### Step 5: Plan the Migration

If modifying an existing schema:

- **Backwards-compatible changes**: Add columns with defaults, add tables, add indexes
- **Breaking changes**: Require a migration strategy (expand-contract pattern)
- **Data backfills**: Script them, don't do them manually

Produce migration files appropriate to the ORM/framework in use. Each migration should be independently reversible.

### Step 6: Validate

Cross-check the schema against:

- [ ] Every acceptance criterion from the feature plan can be served by the schema
- [ ] Every identified access pattern has an appropriate index
- [ ] Every business invariant is enforced by constraints
- [ ] No data can be orphaned (foreign keys and cascades are correct)
- [ ] The migration is reversible

## Principles Applied

- **DRY**: Single source of truth for each piece of data
- **KISS**: Start normalized; denormalize only when measured performance demands it
- **Functional Independence**: Each table represents one concept
- **YAGNI**: Don't add columns or tables "just in case"
