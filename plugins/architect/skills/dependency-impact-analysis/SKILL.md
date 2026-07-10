---
name: dependency-impact-analysis
description: "Map the blast radius of a change before implementing — find dependents, classify breaking vs additive, identify coordination needs, produce a propagation plan. Triggers: what will break if I change this, blast radius, impact analysis, breaking change, who depends on this, downstream impact, safe to rename, shared schema change, dependency graph."
allowed-tools: Read, Grep, Glob, Write, Edit
---

# Dependency Impact Analysis

Understand what will break before breaking it. Changing a shared component without mapping its dependents leads to cascading failures — often discovered in production.

## Step 1: Define the Change

Be precise about what is changing:

- **What is the component?** (API endpoint, database table/column, library function, event schema, shared module)
- **What specifically is changing?** (Field renamed, parameter added, type changed, behavior changed, endpoint removed)
- **What is the deployment boundary?** (Single service, multiple services, public API accessible by external clients)

A vague "I'm changing the user model" is too broad. "I'm renaming the `email` field to `email_address` in the users table and the User API response" is specific enough to analyze.

## Step 2: Map All Dependents

Find everything that depends on the component being changed.

**For API endpoints:**
- Search for the endpoint path across all service repositories
- Check API gateway logs for callers (especially for public APIs)
- Review API documentation and SDKs for external consumers
- Check internal service-to-service call graphs or service mesh metrics

**For database tables/columns:**
- Search all codebases for table name and column name references
- Check ORM models, raw SQL queries, stored procedures, migration files
- Look for database views, triggers, or materialized views that reference the column
- Check reporting tools and data pipelines that read from the table directly

**For shared libraries/packages:**
- Check the package registry or dependency graph for what imports this library
- Search for the specific function/class/type being changed across all consumers
- Check version constraints — which consumers would receive this change automatically?

**For event schemas:**
- Find all producers of this event type
- Find all consumers (subscribers) of this event type
- Check event replay systems or data warehouses that store these events

**For shared modules/types:**
- Search the codebase for all import statements referencing the module
- Check generated clients (OpenAPI codegen, gRPC stubs) that depend on the schema

## Step 3: Classify Impact by Dependent

For each dependent found, classify the impact:

| Impact type | Definition | Action required |
|-------------|-----------|----------------|
| **Breaking** | Dependent will fail or produce wrong results without modification | Must coordinate: update before or simultaneously |
| **Additive** | Change adds capability but doesn't break existing behavior | No action required; dependent can opt in |
| **Internal** | Change is within a single service, no external interface changes | No coordination needed |
| **Latent** | Dependent doesn't use the changed part yet, but may assume current behavior | Monitor; communicate the change |

**Breaking change examples:**
- Renaming a required request field
- Changing a field type
- Removing an endpoint
- Adding a required (non-nullable, no default) column to a table
- Changing event schema to remove a field

**Additive change examples:**
- Adding a new optional field to a response
- Adding a new endpoint
- Adding a nullable column with a default
- Deprecating (but not removing) a field

## Step 4: Produce the Change Propagation Plan

For each breaking change, define the coordination plan:

**Option A: Simultaneous deploy** (for small, closely-coupled services under one team)
- Update all dependents in the same deployment window
- Risk: all services must be deployed together — failure in one blocks all

**Option B: Versioned transition** (recommended for shared APIs)
1. Deploy v2 of the interface alongside v1 (both exist simultaneously)
2. Migrate consumers to v2 one by one
3. Remove v1 once all consumers have migrated

**Option C: Expand-contract** (recommended for database and event schema changes)
1. Expand: add new field/column alongside old (both exist, old still works)
2. Migrate: update consumers to use new field
3. Contract: remove old field after all consumers are migrated

**Communication plan:**
- Which teams own dependent services?
- How will they be notified?
- What is the migration deadline?
- Is there a deprecation period?

## Principles Applied

- **Functional independence**: Minimize blast radius — prefer additive changes over breaking changes when both achieve the same goal
- **KISS**: The simplest propagation plan is the one with the fewest simultaneous moving parts. Prefer sequential migration over big-bang deploys.
- **YAGNI**: Don't change more than necessary. If the change can be made additive (old behavior still works), prefer that over a breaking change.
- **Explicit over implicit**: Undocumented contracts are the most dangerous dependencies — they're discovered when broken, not before

## Cross-Skill References

- `api-design` — design the new API contract after impact is understood
- `feature-planning` — incorporate the dependency coordination into the implementation plan
- `architecture-design` — if analysis reveals excessive coupling, document an ADR for reducing it
- `data-modeling` — use for schema change design once impact is mapped
- `deployment-repo` — when impact crosses repo boundaries in a polyrepo, use the deployment repo's compatibility matrix and contract tests to validate migration paths
