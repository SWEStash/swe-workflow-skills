# API Specification Template

```markdown
# [Service Name] API Specification

**Version**: v1
**Base URL**: `https://api.example.com/api/v1`
**Authentication**: Bearer token (JWT)

## Overview

[Brief description of what this API provides and who consumes it.]

## Authentication

All endpoints except those marked as **Public** require a valid JWT in the Authorization header:

```
Authorization: Bearer <token>
```

## Common Conventions

- All timestamps are ISO 8601 in UTC
- All IDs are [format: UUID/ULID/integer]
- Pagination uses cursor-based paging with `cursor` and `limit` parameters
- Errors follow the standard error response format

## Error Format

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description",
    "details": []
  }
}
```

---

## [Resource Name]

### List [Resources]

`GET /[resources]`

**Authentication**: Required
**Authorization**: [roles/permissions]

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `cursor` | string | No | Pagination cursor |
| `limit` | integer | No | Items per page (default: 20, max: 100) |
| `status` | string | No | Filter by status |

**Response**: `200 OK`
```json
{
  "data": [
    {
      "id": "res_abc123",
      "field": "value",
      "created_at": "2025-03-05T14:30:00Z"
    }
  ],
  "pagination": {
    "next_cursor": "eyJpZCI6MTAwfQ",
    "has_more": true
  }
}
```

---

### Get [Resource]

`GET /[resources]/:id`

**Authentication**: Required

**Response**: `200 OK`
```json
{
  "data": {
    "id": "res_abc123",
    "field": "value",
    "created_at": "2025-03-05T14:30:00Z"
  }
}
```

**Errors**: `404 Not Found`

---

### Create [Resource]

`POST /[resources]`

**Authentication**: Required
**Authorization**: [roles/permissions]

**Request Body:**
```json
{
  "field": "value",
  "other_field": "value"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `field` | string | Yes | Max 255 characters |
| `other_field` | string | No | Must be one of: [values] |

**Response**: `201 Created`

**Errors**: `400 Validation Error`, `409 Conflict`

---

### Update [Resource]

`PATCH /[resources]/:id`

**Authentication**: Required
**Authorization**: [Owner or Admin]

**Request Body:** (partial — only include fields to update)
```json
{
  "field": "new value"
}
```

**Response**: `200 OK`

**Errors**: `400 Validation Error`, `404 Not Found`

---

### Delete [Resource]

`DELETE /[resources]/:id`

**Authentication**: Required
**Authorization**: [Owner or Admin]

**Response**: `204 No Content`

**Errors**: `404 Not Found`
```
