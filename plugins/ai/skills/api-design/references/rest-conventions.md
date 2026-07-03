# REST API Conventions

## Contents
- URL naming rules
- HTTP methods mapping
- Standard response shapes
- Pagination patterns
- Versioning strategies
- HATEOAS (when to use it)

## URL Naming Rules

- Use **plural nouns** for resources: `/users`, `/orders`, `/products`
- Use **kebab-case** for multi-word resources: `/order-items`, `/payment-methods`
- Use **path parameters** for identity: `/users/:id`
- Use **query parameters** for filtering: `/users?role=admin`
- Use **verbs only for actions** that aren't CRUD: `/orders/:id/cancel`, `/reports/generate`
- **Max 2 levels** of nesting: `/users/:id/orders` is fine, `/users/:id/orders/:oid/items/:iid/comments` is too deep — flatten it

## HTTP Methods Mapping

| Method | Meaning | Idempotent | Safe | Request Body |
|--------|---------|------------|------|-------------|
| GET | Read resource(s) | Yes | Yes | No |
| POST | Create resource or trigger action | No | No | Yes |
| PUT | Full replace of resource | Yes | No | Yes |
| PATCH | Partial update of resource | Yes | No | Yes (partial) |
| DELETE | Remove resource | Yes | No | No (usually) |

**PUT vs PATCH**: PUT replaces the entire resource (client sends all fields). PATCH updates only the fields provided. For most APIs, PATCH is more practical and less error-prone. Use PUT only when the client genuinely manages the full state.

## Standard Response Shapes

### Single resource
```json
{
  "data": {
    "id": "usr_abc123",
    "type": "user",
    "name": "Jane Smith",
    "email": "jane@example.com",
    "created_at": "2025-03-05T14:30:00Z"
  }
}
```

### Collection
```json
{
  "data": [
    { "id": "usr_abc123", "name": "Jane Smith" },
    { "id": "usr_def456", "name": "Bob Jones" }
  ],
  "pagination": {
    "next_cursor": "eyJpZCI6MTAwfQ",
    "has_more": true,
    "total_count": 342
  }
}
```

### Created resource (201)
```json
{
  "data": {
    "id": "usr_ghi789",
    "name": "New User",
    "created_at": "2025-03-05T15:00:00Z"
  }
}
```

With `Location` header: `Location: /api/v1/users/usr_ghi789`

### Deleted (204)
No body. Status 204 No Content.

### Error
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "User with id 'usr_xyz' not found"
  }
}
```

## Pagination Patterns

### Cursor-based (recommended for most cases)

Client sends: `?cursor=abc&limit=20`
Server returns: `{ pagination: { next_cursor: "def", has_more: true } }`

Advantages: Stable under inserts/deletes, efficient with indexes.
Disadvantage: Can't jump to page N directly.

Cursor is usually a base64-encoded identifier (e.g., `btoa(JSON.stringify({id: lastId}))`). Treat it as opaque — clients should never construct cursors.

### Offset-based (for simple cases)

Client sends: `?page=3&per_page=20`
Server returns: `{ pagination: { page: 3, per_page: 20, total_count: 342, total_pages: 18 } }`

Advantages: Can jump to any page, easy to implement.
Disadvantage: Unstable when data changes between pages, slow for large offsets.

Use offset only when the dataset is small/stable and users need random page access.

## Versioning Strategies

| Strategy | Example | When to Use |
|----------|---------|-------------|
| URL path | `/api/v1/users` | Default. Clear, cacheable, easy to route. |
| Header | `Accept: application/vnd.api+json;version=2` | When URL path isn't desirable (rare). |
| Query param | `/api/users?version=1` | Avoid. Caching and routing are harder. |

Recommended: URL path versioning (`/api/v1/`). Only create v2 when breaking changes are necessary. Additive changes (new fields, new endpoints) don't require a new version.

**Breaking changes** that require a new version:
- Removing or renaming a field
- Changing a field's type
- Changing the meaning of a status code
- Removing an endpoint

**Non-breaking changes** (safe within same version):
- Adding a new field to a response
- Adding a new endpoint
- Adding a new query parameter
- Adding a new optional field to a request body

## HATEOAS

Hypermedia (links in responses) is useful for discoverability in public APIs:

```json
{
  "data": { "id": "ord_123", "status": "pending" },
  "links": {
    "self": "/api/v1/orders/ord_123",
    "cancel": "/api/v1/orders/ord_123/cancel",
    "items": "/api/v1/orders/ord_123/items"
  }
}
```

For internal APIs: skip it — your clients already know the URL structure. For public APIs: consider it — it makes the API more self-documenting.
