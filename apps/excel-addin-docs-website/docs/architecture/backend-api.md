---
sidebar_position: 5
title: Backend API
---

# Backend API

Reference for the Databricks-based backend API. Covers architecture, authentication, endpoints, and data structures.

## Architecture Overview

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Frontend  │────▶│  Azure Function  │────▶│  Databricks API │
│ (Excel Add) │     │    (Gateway)     │     │    (Backend)    │
└─────────────┘     └──────────────────┘     └─────────────────┘
       │                    │                        │
       │                    │                        ▼
       ▼                    ▼                  ┌───────────┐
  ┌─────────┐         ┌──────────┐            │   Delta   │
  │Azure AD │         │ JWT Auth │            │   Lake    │
  │  (SSO)  │         │ + RBAC   │            └───────────┘
  └─────────┘         └──────────┘
```

| Component | Technology                | Purpose                           |
| --------- | ------------------------- | --------------------------------- |
| Frontend  | Angular 20 Excel Add-in   | User interface                    |
| Gateway   | Azure Functions + FastAPI | Auth, rate limiting, routing      |
| Backend   | Databricks + FastAPI      | Operation execution, data access  |
| Storage   | Delta Lake                | Users, tokens, configs, telemetry |

## Base URLs

| Environment | Gateway (Azure Function)              | Internal (Databricks)   |
| ----------- | ------------------------------------- | ----------------------- |
| Local       | `http://localhost:7071`               | `http://localhost:8001` |
| Dev         | `https://{app}-dev.azurewebsites.net` | internal                |
| Prod        | `https://{app}.azurewebsites.net`     | internal                |

## Authentication

All authenticated endpoints require `Authorization: Bearer <access_token>` header.

### Auth Flow

```
1. Frontend initiates Azure AD SSO login
2. Azure AD returns identity token to frontend
3. Frontend sends Azure AD token to POST /auth/signin
4. Backend validates Azure AD token
5. Backend resolves user roles (Azure AD groups + Delta overrides)
6. Backend issues JWT pair (access 15min + refresh 7day)
7. Frontend uses access token for API calls
8. Frontend uses refresh token before access expiry
```

### JWT Token Structure

```typescript
// Access Token (short-lived: 15 min)
interface AccessToken {
  token: string; // base64url encoded JWT
  expiresAt: number; // Unix ms timestamp
}

// Refresh Token (long-lived: 7 days)
interface RefreshToken {
  token: string;
  expiresAt: number;
}

// Token Pair (returned from signin/refresh)
interface TokenPair {
  access: AccessToken;
  refresh: RefreshToken;
}

// JWT Payload Claims
interface TokenPayload {
  sub: string; // User ID (UUID)
  email: string;
  roles: string[]; // ["analyst"] or ["admin"] or ["analyst","admin"]
  iat: number; // Issued at (Unix seconds)
  exp: number; // Expires at (Unix seconds)
  jti: string; // JWT ID - unique identifier for revocation
  aud: string; // Audience: "databricks-api"
  iss: string; // Issuer: backend URL
}
```

### Auth Endpoints

| Method | Endpoint        | Body                       | Response                              |
| ------ | --------------- | -------------------------- | ------------------------------------- |
| `POST` | `/auth/signin`  | `{ azureAdToken: string }` | `TokenPair`                           |
| `POST` | `/auth/refresh` | `{ refreshToken: string }` | `TokenPair` (rotated)                 |
| `GET`  | `/auth/profile` | -                          | `UserProfile` (requires Bearer token) |
| `POST` | `/auth/signout` | -                          | `{ success: boolean }`                |
| `POST` | `/auth/revoke`  | `{ refreshToken: string }` | `{ success: boolean }`                |

### User Profile Response

```typescript
interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  roles: RoleId[];
}
```

### Roles

```typescript
type RoleId = "analyst" | "admin" | "automation";

const ROLES = [
  { id: "analyst", label: "Analyst", description: "Query access" },
  { id: "admin", label: "Admin", description: "Full access" },
  { id: "automation", label: "Automation", description: "Service account access" },
];
```

### Role Resolution (Hybrid)

Roles are resolved from two sources:

1. **Azure AD Groups** - Group membership maps to roles
2. **Delta Table Overrides** - Per-user role assignments

Priority: Delta overrides > Azure AD groups

## Operations

### Execute Operation

```
POST /operations/{operation_name}
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "payload": {
    "customer_id": "C001",
    "start_date": "2024-01-01",
    "end_date": "2024-01-31"
  },
  "metadata": {
    "request_id": "uuid",
    "debug": false
  }
}
```

### Success Response (200)

```typescript
interface ExecutionResponse {
  status: "success" | "error";
  data: {
    rows: Record<string, any>[];
    metrics: {
      row_count: number;
      duration_ms: number;
    };
  };
  meta: {
    execution_id: string;
    operation: string;
    timestamp_utc: string;
    integrity_hash: string;
  };
}
```

### Error Response (4xx/5xx)

```typescript
interface ApiError {
  error: string; // Error code
  message: string; // Human-readable message
  details?: string[]; // Validation errors
}
```

### Pagination Headers

When results are truncated:

```
X-Total-Count: 50000
X-Page: 1
X-Page-Size: 1000
X-Truncated: true
```

## API Catalog

### Endpoint

```
GET /api/catalog
Authorization: Bearer {accessToken}

Response: ApiDefinition[]
```

Returns operations filtered by user's roles.

### API Definition Schema

```typescript
interface ApiDefinition {
  id: string;
  name: string;
  description?: string;
  allowedRoles?: RoleId[];
  parameters: ApiParameter[];
  responseSchema?: ApiColumnDefinition[];
}

interface ApiParameter {
  key: string;
  type: "string" | "number" | "date" | "boolean" | "array";
  required: boolean;
  defaultValue?: any;
  label?: string;
  description?: string;
}

interface ApiColumnDefinition {
  key: string;
  name: string;
  dataType: "string" | "number" | "date" | "boolean";
}
```

### Available Operations

| Operation ID             | Name            | Required Params          | Allowed Roles     |
| ------------------------ | --------------- | ------------------------ | ----------------- |
| `get_customer_detail_v1` | Customer Detail | `customer_id`            | analyst, admin    |
| `run_risk_report_v1`     | Risk Report     | `start_date`, `end_date` | admin, automation |

## User Data Endpoints

### Query Configurations (Saved Reports)

```typescript
interface QueryConfiguration {
  id: string;
  name: string;
  description?: string;
  items: QueryConfigurationItem[];
  parameterPresets?: {
    global: Record<string, any>;
    perQuery: Record<string, Record<string, any>>;
  };
  writeModeDefaults?: "overwrite" | "append";
  workbookHints?: {
    workbookId?: string;
    workbookName?: string;
  };
}

interface QueryConfigurationItem {
  id: string;
  operationId: string;
  displayName: string;
  parameters: Record<string, any>;
  targetSheetName: string;
  targetTableName: string;
  writeMode: "overwrite" | "append";
  includeInBatch: boolean;
}
```

| Method   | Endpoint                                       | Description        |
| -------- | ---------------------------------------------- | ------------------ |
| `GET`    | `/api/users/me/configurations`                 | List all configs   |
| `GET`    | `/api/users/me/configurations?workbookId={id}` | Filter by workbook |
| `GET`    | `/api/users/me/configurations/{id}`            | Get single config  |
| `POST`   | `/api/users/me/configurations`                 | Create config      |
| `PUT`    | `/api/users/me/configurations/{id}`            | Update config      |
| `DELETE` | `/api/users/me/configurations/{id}`            | Delete config      |

### User Settings

```typescript
interface AppSettings {
  telemetry: TelemetrySettings;
  queryExecution?: QueryExecutionSettings;
}

interface TelemetrySettings {
  enableWorkbookLogging: boolean;
  enableConsoleLogging: boolean;
  sessionStrategy?: "per-load" | "per-workbook" | "custom";
  logWorksheetName?: string;
  logTableName?: string;
}

interface QueryExecutionSettings {
  maxRowsPerQuery: number; // default: 10000
  chunkSize: number; // default: 1000
  enableProgressiveLoading: boolean;
  apiPageSize: number; // default: 1000
  chunkBackoffMs: number; // default: 100
  disableFormulasDuringRun: boolean;
}
```

| Method  | Endpoint                 | Description                 |
| ------- | ------------------------ | --------------------------- |
| `GET`   | `/api/users/me/settings` | Get user settings           |
| `PATCH` | `/api/users/me/settings` | Partial update (deep merge) |
| `PUT`   | `/api/users/me/settings` | Full replace                |

### Query Run History

```typescript
interface QueryRun {
  id: string;
  operationId: string;
  completedAt: string;
  rowCount: number;
  status: "success" | "error";
  location?: {
    sheetName: string;
    tableName: string;
  };
}
```

| Method | Endpoint                                   | Description     |
| ------ | ------------------------------------------ | --------------- |
| `GET`  | `/api/users/me/query-runs?workbookId={id}` | Get run history |
| `POST` | `/api/users/me/query-runs`                 | Log a run       |

## Data Storage (Delta Lake)

| Table                  | Path                          | Purpose                                            |
| ---------------------- | ----------------------------- | -------------------------------------------------- |
| `users`                | `delta:/users/core`           | User profiles (id, email, display_name, azure_oid) |
| `user_roles`           | `delta:/users/roles`          | Role overrides from Azure AD                       |
| `refresh_tokens`       | `delta:/auth/refresh_tokens`  | Active refresh tokens                              |
| `token_blacklist`      | `delta:/auth/token_blacklist` | Revoked JTIs                                       |
| `user_settings`        | `delta:/users/settings`       | User preferences                                   |
| `query_configurations` | `delta:/users/configurations` | Saved reports                                      |
| `query_runs`           | `delta:/audit/query_runs`     | Execution history                                  |

## Security

| Requirement      | Implementation                           |
| ---------------- | ---------------------------------------- |
| HTTPS Only       | Reject all non-TLS connections           |
| JWT Signing      | RS256 (prod) or HS256 (dev)              |
| Token Revocation | JTI blacklist checked on every request   |
| Refresh Rotation | New refresh token issued on each refresh |
| CORS             | Allow Office Add-in origins only         |
| Rate Limiting    | 10 req/min auth, 100 req/min data        |

### CORS Allowed Origins

```
https://*.officeapps.live.com
https://*.office.com
https://*.sharepoint.com
http://localhost:* (dev only)
```

### Rate Limits

| Operation                | Max RPS | Max Concurrent |
| ------------------------ | ------- | -------------- |
| Default                  | 10      | 20             |
| `get_customer_detail_v1` | 5       | 10             |
| `run_risk_report_v1`     | 1       | 2              |

## Health Check

```
GET /health
```

No auth required.

```typescript
// Response
{
  status: "healthy" | "degraded" | "unhealthy",
  gateway: { status: string },
  downstream?: { status: string }
}
```

## Standard Response Envelope

All gateway responses wrapped in:

```typescript
interface ApiEnvelope<T> {
  status: "success" | "error";
  data: T | null;
  hash: string | null; // SHA-256 of data
  warnings: string[];
}
```

## Error Codes

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

## TypeScript Types (Frontend)

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

## Frontend Implementation Checklist

**Auth & Security:**

- [ ] Azure AD SSO login integration
- [ ] Store access token (memory only, not localStorage)
- [ ] Store refresh token (secure storage)
- [ ] Auto-refresh before access token expiry
- [ ] Handle 401 responses (token expired/invalid)
- [ ] Handle 403 responses (insufficient permissions)
- [ ] Signout clears tokens and calls /auth/signout

**Operation Execution:**

- [ ] Call `POST /operations/{name}` with Bearer token
- [ ] Handle pagination via X-Truncated header
- [ ] Display loading state during execution
- [ ] Handle and display error responses

**User Data:**

- [ ] Load/save query configurations
- [ ] Filter configurations by workbookId
- [ ] Load/update user settings
- [ ] Log query runs for history

**API Discovery:**

- [ ] Call `GET /api/catalog` on load
- [ ] Filter UI by available operations
- [ ] Cache catalog (refresh on 401)
