# API Endpoint Reference

> For Claude AI context in frontend repos. Generated from databricks-api codebase.

## Base URLs

| Environment | Gateway (Azure Function) | Internal (Databricks) |
|-------------|--------------------------|------------------------|
| Local | `http://localhost:7071` | `http://localhost:8001` |
| Dev | `https://{app}-dev.azurewebsites.net` | internal |
| Prod | `https://{app}.azurewebsites.net` | internal |

---

## Authentication

All authenticated endpoints require `Authorization: Bearer <access_token>` header.

### POST `/auth/signin`
Exchange Azure AD token for JWT pair.

```typescript
// Request
{ azure_token: string }

// Response
{
  access: { token: string, expiresAt: string },
  refresh: { token: string, expiresAt: string }
}
```

### POST `/auth/refresh`
Rotate refresh token.

```typescript
// Request
{ refresh_token: string }

// Response - same as signin
```

### GET `/auth/profile`
Get current user profile. Requires auth.

```typescript
// Response
{
  id: string,
  email: string,
  displayName: string,
  roles: string[]  // e.g. ["admin", "analyst"]
}
```

### POST `/auth/signout`
Blacklist current access token. Requires auth.

### POST `/auth/revoke`
Revoke specific refresh token.

```typescript
// Request
{ refresh_token: string }
```

---

## Operations

### GET `/api/catalog`
List available operations for current user (role-filtered). Requires auth.

```typescript
// Response
{
  operations: Array<{
    id: string,              // e.g. "get_customer_detail_v1"
    name: string,
    description: string | null,
    allowedRoles: string[] | null,
    parameters: Array<{
      name: string,
      type: string,
      required: boolean,
      description: string | null
    }>,
    responseSchema: object | null
  }>,
  roles: string[]  // user's roles
}
```

### POST `/operations/{operation_name}`
Execute an operation. Requires auth + RBAC.

```typescript
// Request
{
  payload: {
    meta: { request_id: string },
    data: { /* operation-specific params */ }
  },
  metadata?: { execution_id?: string }
}

// Response (wrapped in ApiEnvelope)
{
  status: "success" | "error",
  data: {
    status: string,
    data: { /* operation result */ },
    meta: { execution_time_ms: number, config_hash: string }
  },
  hash: string,  // SHA-256 integrity
  warnings: string[]
}
```

---

## Available Operations

### `get_customer_detail_v1`
Retrieve customer details by ID.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `customer_id` | string | yes | Customer identifier |

**Allowed roles:** admin, analyst

```typescript
// Request payload.data
{ customer_id: string }

// Response data.rows[]
{
  customer_id: string,
  name: string,
  status: string,
  created_at: string,  // ISO 8601
  risk_score?: number
}
```

### `run_risk_report_v1`
Execute risk report for portfolio. Async operation.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `portfolio_id` | string | yes | Portfolio identifier |
| `scenario_set` | string | no | Scenario set name |

**Allowed roles:** admin, automation

```typescript
// Request payload.data
{ portfolio_id: string, scenario_set?: string }

// Response data.risk_summary
{
  portfolio_id: string,
  scenario_set: string,
  var_95: number,
  var_99: number
}
```

---

## User Settings & Configurations

### GET `/api/users/me/settings`
Get user settings. Requires auth.

### PATCH `/api/users/me/settings`
Deep-merge update settings. Requires auth.

### PUT `/api/users/me/settings`
Replace all settings. Requires auth.

### Saved Configurations

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/users/me/configurations` | List saved configs |
| GET | `/api/users/me/configurations/{id}` | Get specific config |
| POST | `/api/users/me/configurations` | Create config |
| PUT | `/api/users/me/configurations/{id}` | Update config |
| DELETE | `/api/users/me/configurations/{id}` | Delete config |

### Query Runs

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/users/me/query-runs` | List query run history |
| POST | `/api/users/me/query-runs` | Record new query run |

---

## Schemas

### GET `/schemas/{resource}`
Retrieve JSON schema by name.

```typescript
// Example: GET /schemas/operations/get_customer_detail.request
// Returns: JSON Schema object
```

---

## Health

### GET `/health`
Health check (no auth required).

```typescript
// Response
{
  status: "healthy" | "degraded" | "unhealthy",
  gateway: { status: string },
  downstream?: { status: string }
}
```

---

## Standard Response Envelope

All gateway responses wrapped in:

```typescript
interface ApiEnvelope<T> {
  status: "success" | "error";
  data: T | null;
  hash: string | null;    // SHA-256 of data
  warnings: string[];
}
```

---

## Error Responses

```typescript
// 400 Bad Request - validation error
{ status: "error", data: null, warnings: ["field X required"] }

// 401 Unauthorized - missing/invalid token
{ status: "error", data: null, warnings: ["token expired"] }

// 403 Forbidden - RBAC denied
{ status: "error", data: null, warnings: ["role not authorized for operation"] }

// 429 Too Many Requests - rate limited
{ status: "error", data: null, warnings: ["rate limit exceeded"] }

// 500 Internal Server Error
{ status: "error", data: null, warnings: ["internal error"] }
```

---

## Rate Limits

| Operation | Max RPS | Max Concurrent |
|-----------|---------|----------------|
| Default | 10 | 20 |
| `get_customer_detail_v1` | 5 | 10 |
| `run_risk_report_v1` | 1 | 2 |

---

## CORS

Allowed origins:
- Dev: `localhost:3000`, `localhost:4200`
- Prod: Office Add-in origins

---

## TypeScript Types (for frontend)

```typescript
// Auth
interface TokenPair {
  access: { token: string; expiresAt: string };
  refresh: { token: string; expiresAt: string };
}

interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
}

// Operations
interface OperationRequest<T = Record<string, unknown>> {
  payload: {
    meta: { request_id: string };
    data: T;
  };
  metadata?: { execution_id?: string };
}

interface OperationResponse<T = Record<string, unknown>> {
  status: string;
  data: T | null;
  meta: { execution_time_ms: number; config_hash: string } | null;
}

// Catalog
interface ApiParameter {
  name: string;
  type: string;
  required: boolean;
  description: string | null;
}

interface ApiDefinition {
  id: string;
  name: string;
  description: string | null;
  allowedRoles: string[] | null;
  parameters: ApiParameter[];
  responseSchema: Record<string, unknown> | null;
}

interface CatalogResponse {
  operations: ApiDefinition[];
  roles: string[];
}
```