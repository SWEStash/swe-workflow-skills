---
name: api-design
description: "Design RESTful and GraphQL APIs — endpoint naming, request/response contracts, error handling, pagination, versioning, auth patterns, OpenAPI specs. Triggers: design the API, API contract, REST API, GraphQL schema, error response format, pagination, API versioning, OpenAPI, swagger, endpoints. Use architecture-design for REST-vs-GraphQL or monolith-vs-microservices decisions."
allowed-tools: Read, Grep, Glob, Write, Edit
---

# API Design

Design APIs that are consistent, predictable, and easy to consume. A well-designed API is intuitive to use without reading documentation — but has great documentation anyway.

## Scope Boundary

This skill designs the **contract** (endpoints, request/response shapes, error formats, pagination). For higher-level decisions (REST vs GraphQL, API gateway, authentication strategy), use the `architecture-design` skill first, then return here to design the specifics.

## The Deliverable

An API design is not finished until it carries **all six** of these. A list of endpoints is a
third of an answer:

1. **Resources and endpoints** — URLs, methods, and how relationships are expressed
2. **Request/response schemas** — field names, types, and the response envelope
3. **The error format** — one shape for every error, plus the status-code mapping
4. **The pagination contract** — parameters and response shape for every list endpoint
5. **Auth per endpoint** — scheme, who may call it, and which endpoints are public
6. **The written spec** — markdown or OpenAPI, using [templates/api-spec.md](templates/api-spec.md)

Deliver all six **in the same response**. Where a choice is genuinely open, pick the default
this skill recommends, say you picked it, and keep going — never return a design as a list of
questions.

## Workflow

### Step 1: Identify Resources and Operations

Start from the domain model, not the UI:

- **What are the resources?** (nouns: users, orders, products, comments)
- **What operations exist?** (CRUD + domain-specific: archive, publish, approve)
- **What are the relationships?** (user has orders, order contains items)
- **Who consumes this API?** (web app, mobile app, third-party, internal service)

Map each resource to its operations before choosing URLs or methods.

### Step 2: Design Endpoints

Apply RESTful naming conventions — see [references/rest-conventions.md](references/rest-conventions.md):

```
GET    /api/v1/users          → List users
POST   /api/v1/users          → Create user
GET    /api/v1/users/:id      → Get user
PATCH  /api/v1/users/:id      → Update user (partial)
DELETE /api/v1/users/:id      → Delete user

# Nested resources (when the child only makes sense in parent context)
GET    /api/v1/users/:id/orders    → List user's orders
POST   /api/v1/users/:id/orders    → Create order for user

# Actions that don't map to CRUD
POST   /api/v1/orders/:id/cancel   → Cancel an order
POST   /api/v1/users/:id/verify    → Verify a user's email
```

Present the endpoint list, then **design the schemas in the same response** — the list is a checkpoint, not a stopping point. Invite correction on the naming while delivering the rest.

### Step 3: Define Request/Response Schemas

For each endpoint, define:

**Request**: Query parameters (for filtering/pagination), path parameters, request body with field types and validation rules.

**Response**: Status code, response body shape, included relationships.

Use consistent patterns across all endpoints — see [references/rest-conventions.md](references/rest-conventions.md) for standard shapes.

Decisions to make **now**, with a stated default rather than a question — flag them for
correction and move on:
- **ID format**: default ULID (sortable, no coordination); integer or UUID if the stack forces it
- **Date format**: ISO 8601 always (`2025-03-05T14:30:00Z`) — not a decision
- **Null vs absent**: default omit absent fields, return `null` only for a known-empty value
- **Envelope or not**: default `{ data, pagination }` on collections, flat on single resources

### Step 4: Standardize Error Responses

Every API error should use the same shape. Recommend this format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description for developers",
    "details": [
      {
        "field": "email",
        "message": "Must be a valid email address"
      }
    ]
  }
}
```

Map HTTP status codes consistently:
- `400` — Client sent invalid data (validation errors)
- `401` — Authentication required or invalid
- `403` — Authenticated but not authorized for this action
- `404` — Resource not found
- `409` — Conflict (duplicate, state violation)
- `422` — Valid syntax but semantically invalid (business rule violation)
- `429` — Rate limited
- `500` — Server error (never expose internals)

### Step 5: Design Pagination, Filtering, Sorting

For any list endpoint that could return many results:

**Pagination** (recommend cursor-based for most cases):
```
GET /api/v1/orders?cursor=abc123&limit=20

Response:
{
  "data": [...],
  "pagination": {
    "next_cursor": "def456",
    "has_more": true
  }
}
```

**Filtering**: Use query parameters with clear naming:
```
GET /api/v1/orders?status=pending&created_after=2025-01-01
```

**Sorting**: Use a `sort` parameter with `-` prefix for descending:
```
GET /api/v1/orders?sort=-created_at,total
```

### Step 6: Define Authentication and Authorization

For each endpoint, specify:
- **Authentication**: Required? What scheme? (Bearer token, API key, session)
- **Authorization**: What roles/permissions can access this? Document per-endpoint.
- **Public endpoints**: Explicitly mark which endpoints don't require auth.

### Step 7: Produce the Specification

Output the API design as one of:
- **Markdown document** — for internal APIs and quick designs
- **OpenAPI 3.x spec** — for formal APIs, enables codegen and tooling

Use the template at [templates/api-spec.md](templates/api-spec.md) for markdown output.

## Principles Applied

- **KISS**: Prefer flat resource URLs over deeply nested ones. `/orders?user_id=123` is simpler than `/users/123/orders/456/items/789`.
- **DRY**: Standardize error format, pagination, and envelope structure once. Don't reinvent per-endpoint.
- **YAGNI**: Don't add filtering or sorting until a list endpoint actually needs them. Pagination is not in this category — any collection that can grow ships with the pagination contract from day one, because adding it later is a breaking change for every consumer.
- **Functional Independence**: Each endpoint should do one thing. Avoid "Swiss army knife" endpoints that change behavior based on query parameters.
