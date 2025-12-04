# Plan 15: Local API Server Integration

**Date**: 2025-12-04
**Branch**: `feat/local-api-integration`
**Priority**: HIGH
**Backend**: `http://127.0.0.1:8000`

---

## Summary

Configure frontend to connect to local API server at `http://127.0.0.1:8000`. Currently:
- Mock services exist but DI tokens not wired
- No environment configuration
- No proxy for CORS
- Auth interceptor not registered

---

## Objectives

1. Create environment configuration for backend URL toggle
2. Wire DI tokens for Auth and Operations services
3. Register auth interceptor
4. Configure Angular proxy for local development
5. Create integration test script

---

## Phase 1: Environment Configuration

### 1.1 Create Environment Files

**File**: `apps/excel-addin/src/environments/environment.ts` (development)

```typescript
export const environment = {
  production: false,
  useRealBackend: true,  // Toggle: true = real API, false = mocks
  backendUrl: 'http://127.0.0.1:8000',
  apiPrefix: '',  // No prefix needed for local
};
```

**File**: `apps/excel-addin/src/environments/environment.prod.ts`

```typescript
export const environment = {
  production: true,
  useRealBackend: true,
  backendUrl: '',  // Empty = same origin (Azure deployment)
  apiPrefix: '',
};
```

**File**: `apps/excel-addin/src/environments/environment.mock.ts`

```typescript
export const environment = {
  production: false,
  useRealBackend: false,  // Use mock services
  backendUrl: '',
  apiPrefix: '',
};
```

### 1.2 Update angular.json

Add file replacements for environment builds:

```json
{
  "configurations": {
    "production": {
      "fileReplacements": [{
        "replace": "src/environments/environment.ts",
        "with": "src/environments/environment.prod.ts"
      }]
    },
    "mock": {
      "fileReplacements": [{
        "replace": "src/environments/environment.ts",
        "with": "src/environments/environment.mock.ts"
      }]
    }
  }
}
```

---

## Phase 2: DI Token Wiring

### 2.1 Update app.config.ts

**File**: `apps/excel-addin/src/app/app.config.ts`

```typescript
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { AUTH_API_TOKEN } from '@excel-platform/core/auth';
import { OPERATIONS_API_TOKEN } from '@excel-platform/data/api';
import { AuthApiService, AuthApiMockService, authInterceptor } from '@excel-platform/core/auth';
import { OperationsApiService, OperationsApiMockService } from '@excel-platform/data/api';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(withInterceptors([authInterceptor])),

    // Auth API - real or mock based on environment
    {
      provide: AUTH_API_TOKEN,
      useClass: environment.useRealBackend ? AuthApiService : AuthApiMockService,
    },

    // Operations API - real or mock based on environment
    {
      provide: OPERATIONS_API_TOKEN,
      useClass: environment.useRealBackend ? OperationsApiService : OperationsApiMockService,
    },
  ],
};
```

### 2.2 Export Services from Barrels

Ensure exports in:
- `libs/core/auth/src/index.ts`: Export `AuthApiService`, `AuthApiMockService`, `authInterceptor`
- `libs/data/api/src/index.ts`: Export `OperationsApiService`, `OperationsApiMockService`

---

## Phase 3: API Base URL Configuration

### 3.1 Create API Config Service

**File**: `libs/data/api/src/lib/api-config.service.ts`

```typescript
import { Injectable } from '@angular/core';
import { environment } from '@env/environment';

@Injectable({ providedIn: 'root' })
export class ApiConfigService {
  readonly backendUrl = environment.backendUrl;
  readonly useRealBackend = environment.useRealBackend;

  /**
   * Build full URL for API endpoint.
   */
  buildUrl(path: string): string {
    if (!this.backendUrl) {
      return path;  // Relative path for same-origin
    }
    return `${this.backendUrl}${path}`;
  }
}
```

### 3.2 Update HTTP Services

**AuthApiService** - inject ApiConfigService, use `buildUrl()`:

```typescript
constructor(
  private http: HttpClient,
  private apiConfig: ApiConfigService
) {}

signIn(azureAdToken: string): Promise<TokenPair> {
  return firstValueFrom(
    this.http.post<TokenPair>(
      this.apiConfig.buildUrl('/auth/signin'),
      { azure_token: azureAdToken }
    )
  );
}
```

---

## Phase 4: Angular Proxy Configuration

### 4.1 Create Proxy Config

**File**: `apps/excel-addin/proxy.conf.json`

```json
{
  "/auth/*": {
    "target": "http://127.0.0.1:8000",
    "secure": false,
    "changeOrigin": true,
    "logLevel": "debug"
  },
  "/operations/*": {
    "target": "http://127.0.0.1:8000",
    "secure": false,
    "changeOrigin": true,
    "logLevel": "debug"
  },
  "/api/*": {
    "target": "http://127.0.0.1:8000",
    "secure": false,
    "changeOrigin": true,
    "logLevel": "debug"
  },
  "/health": {
    "target": "http://127.0.0.1:8000",
    "secure": false,
    "changeOrigin": true
  }
}
```

### 4.2 Update package.json Scripts

```json
{
  "scripts": {
    "start": "nx serve excel-addin",
    "start:local-api": "nx serve excel-addin --proxy-config apps/excel-addin/proxy.conf.json",
    "start:mock": "nx serve excel-addin --configuration=mock"
  }
}
```

---

## Phase 5: Integration Test Script

### 5.1 Health Check Script

**File**: `scripts/test-local-api.sh`

```bash
#!/bin/bash
# Test connectivity to local API server

API_URL="${1:-http://127.0.0.1:8000}"

echo "Testing API at $API_URL..."

# Health check
echo -n "Health check: "
HEALTH=$(curl -s "$API_URL/health")
if echo "$HEALTH" | grep -q '"status"'; then
  echo "✓ OK"
  echo "$HEALTH" | jq .
else
  echo "✗ FAILED"
  exit 1
fi

# Auth signin (mock Azure token)
echo -n "Auth signin: "
AUTH=$(curl -s -X POST "$API_URL/auth/signin" \
  -H "Content-Type: application/json" \
  -d '{"azure_token": "mock-azure-ad-token"}')
if echo "$AUTH" | grep -q '"access"'; then
  echo "✓ OK"
  ACCESS_TOKEN=$(echo "$AUTH" | jq -r '.access.token')
else
  echo "✗ FAILED"
  echo "$AUTH"
  exit 1
fi

# Catalog (authenticated)
echo -n "Get catalog: "
CATALOG=$(curl -s "$API_URL/api/catalog" \
  -H "Authorization: Bearer $ACCESS_TOKEN")
if echo "$CATALOG" | grep -q '"operations"'; then
  echo "✓ OK"
  echo "$CATALOG" | jq '.operations | length' | xargs -I{} echo "  {} operations available"
else
  echo "✗ FAILED"
  echo "$CATALOG"
  exit 1
fi

echo ""
echo "All tests passed! API is ready."
```

### 5.2 NPM Script

```json
{
  "scripts": {
    "test:api": "bash scripts/test-local-api.sh"
  }
}
```

---

## Phase 6: Update Types to Match Backend

### 6.1 Align with BACKEND-API-ENDPOINTS.md

Verify types in `libs/shared/types/src/lib/` match:

| Type | File | Backend Field |
|------|------|---------------|
| `TokenPair` | auth-api.types.ts | `access.expiresAt` as string |
| `UserProfile` | auth-api.types.ts | Add `displayName` |
| `OperationRequest` | operations-api.types.ts | `payload.meta.request_id` |
| `CatalogResponse` | api.types.ts | NEW - for `/api/catalog` |

### 6.2 Add Catalog Types

```typescript
// api.types.ts

/**
 * Response from GET /api/catalog
 */
export interface CatalogResponse {
  operations: ApiDefinition[];
  roles: RoleId[];
}
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `apps/excel-addin/src/environments/environment.ts` | Dev config (real backend) |
| `apps/excel-addin/src/environments/environment.prod.ts` | Prod config |
| `apps/excel-addin/src/environments/environment.mock.ts` | Mock mode config |
| `apps/excel-addin/proxy.conf.json` | Angular dev server proxy |
| `libs/data/api/src/lib/api-config.service.ts` | Backend URL builder |
| `scripts/test-local-api.sh` | API connectivity test |

## Files to Modify

| File | Changes |
|------|---------|
| `apps/excel-addin/src/app/app.config.ts` | Wire DI tokens, interceptor |
| `apps/excel-addin/project.json` or `angular.json` | Add build configurations |
| `package.json` | Add npm scripts |
| `libs/core/auth/src/lib/auth-api.service.ts` | Use ApiConfigService |
| `libs/data/api/src/lib/operations-api.service.ts` | Use ApiConfigService |
| `libs/core/auth/src/index.ts` | Export services |
| `libs/data/api/src/index.ts` | Export services |
| `libs/shared/types/src/lib/api.types.ts` | Add CatalogResponse |

---

## Success Criteria

- [ ] `npm run start:local-api` starts with proxy to `http://127.0.0.1:8000`
- [ ] `npm run start:mock` uses mock services (no backend needed)
- [ ] `npm run test:api` passes health check
- [ ] Auth flow works: signin → profile → signout
- [ ] Operations work: catalog → execute operation
- [ ] Build passes for all configurations
- [ ] Tests pass

---

## Usage

```bash
# Start local API server (separate terminal)
cd ../databricks-api && uvicorn main:app --port 8000

# Start frontend with proxy
npm run start:local-api

# Or use mock mode (no backend)
npm run start:mock

# Test API connectivity
npm run test:api
```

---

## Rollback

```bash
git checkout develop -- apps/excel-addin/src/app/app.config.ts
git checkout develop -- package.json
rm -rf apps/excel-addin/src/environments/
rm apps/excel-addin/proxy.conf.json
rm scripts/test-local-api.sh
```
