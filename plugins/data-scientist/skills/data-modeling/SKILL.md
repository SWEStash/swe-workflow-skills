---
name: data-modeling
description: "Design database schemas, relationships, indexes, and migration strategies — relational and document stores. Triggers: data model, schema design, ER diagram, database schema, table design, foreign key, index strategy, normalization, denormalization, migration plan, document model, partition key."
model: sonnet
allowed-tools: Read, Grep, Glob, Write, Edit
---

# Data Modeling

Guide the user through designing data models that are normalized, consistent, and evolvable. Good data models make the right things easy and the wrong things hard.

## Workflow

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
