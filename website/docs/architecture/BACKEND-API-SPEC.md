# Backend API Specification

**Version**: 1.0.0
**Last Updated**: 2025-12-03
**Status**: Design Reference

> Reference document for frontend integration. Describes API contracts, authentication flow, and data structures implemented by this Databricks-based backend.

---

## Architecture Overview

```t
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

---

## 1. Authentication System

### Auth Flow

```md
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
  {
    id: "automation",
    label: "Automation",
    description: "Service account access",
  },
];
```

### Role Resolution (Hybrid)

Roles are resolved from two sources:

1. **Azure AD Groups** - Group membership maps to roles
2. **Delta Table Overrides** - Per-user role assignments

Priority: Delta overrides > Azure AD groups

---

## 2. Operation Execution

Operations use the existing endpoint pattern with operation name in URL path.

### Request

```txt
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

```txt
X-Total-Count: 50000
X-Page: 1
X-Page-Size: 1000
X-Truncated: true
```

---

## 3. API Catalog

### Endpoint

```txt
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

---

## 4. User Data Persistence

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

---

## 5. Data Storage (Delta Lake)

All user and auth data stored in Delta Lake tables:

| Table                  | Path                          | Purpose                                            |
| ---------------------- | ----------------------------- | -------------------------------------------------- |
| `users`                | `delta:/users/core`           | User profiles (id, email, display_name, azure_oid) |
| `user_roles`           | `delta:/users/roles`          | Role overrides from Azure AD                       |
| `refresh_tokens`       | `delta:/auth/refresh_tokens`  | Active refresh tokens                              |
| `token_blacklist`      | `delta:/auth/token_blacklist` | Revoked JTIs                                       |
| `user_settings`        | `delta:/users/settings`       | User preferences                                   |
| `query_configurations` | `delta:/users/configurations` | Saved reports                                      |
| `query_runs`           | `delta:/audit/query_runs`     | Execution history                                  |

---

## 6. Security Requirements

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

---

## 7. Performance Settings

| Setting           | Default | Description                       |
| ----------------- | ------- | --------------------------------- |
| `maxRowsPerQuery` | 10,000  | Truncate results exceeding this   |
| `apiPageSize`     | 1,000   | Default pagination size           |
| `chunkBackoffMs`  | 100     | Delay between chunks if streaming |

When results exceed `maxRowsPerQuery`:

- Return truncated data
- Set `X-Truncated: true` header
- Log warning event

---

## 8. Response Examples

### POST /auth/signin

Request:

```json
{ "azureAdToken": "eyJ0eXAiOiJKV1QiLCJhbGci..." }
```

Response:

```json
{
  "access": {
    "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": 1701619200000
  },
  "refresh": {
    "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresAt": 1702224000000
  }
}
```

### POST /operations/get_customer_detail_v1

Request:

```json
{
  "payload": {
    "customer_id": "C001",
    "start_date": "2024-01-01",
    "end_date": "2024-01-31"
  }
}
```

Response:

```json
{
  "status": "success",
  "data": {
    "rows": [
      {
        "customer_id": "C001",
        "name": "Acme Corp",
        "email": "contact@acme.com",
        "created_at": "2023-06-15T10:30:00Z"
      }
    ],
    "metrics": {
      "row_count": 1,
      "duration_ms": 245
    }
  },
  "meta": {
    "execution_id": "550e8400-e29b-41d4-a716-446655440000",
    "operation": "get_customer_detail_v1",
    "timestamp_utc": "2024-12-03T20:15:30Z",
    "integrity_hash": "a1b2c3d4e5f6..."
  }
}
```

### Error Response

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Invalid parameters",
  "details": ["customer_id is required", "start_date must be valid date"]
}
```

---

## 9. Frontend Implementation Checklist

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
