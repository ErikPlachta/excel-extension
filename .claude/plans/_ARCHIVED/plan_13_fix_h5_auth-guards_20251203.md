# Plan: H5 - Full Auth Guards & Server-Side Token Validation

**Date**: 2025-12-03
**Branch**: `fix/h5-auth-guards`
**Priority**: HIGH (Security Critical)
**Depends On**: H4 (Config Architecture) - must be merged first

---

## Problem Statement

Current authentication is **purely client-side mock** with critical security gaps:

1. **No token validation** - Tokens never validated, only client-side expiry check
2. **No route protection** - UI hiding only, easily bypassed
3. **No API authorization** - Requests don't include auth headers
4. **No token revocation** - Old tokens persist after new sign-in
5. **No user isolation** - Storage keys shared across users on same device
6. **Role spoofing** - Users can claim any role via `signInWithJwt()`

### Attack Scenarios

1. **Cross-user data access**: User A signs out, User B signs in, User B accesses User A's cached query results (same cache key)
2. **Stale token abuse**: Old token in localStorage still "works" because no server validates it
3. **Role escalation**: `auth.signInWithJwt('attacker@x.com', '', ['admin'])` grants admin access
4. **Direct navigation**: Type `/queries` in browser, bypass UI role checks

---

## Solution Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Angular App                               │
├─────────────────────────────────────────────────────────────────┤
│  Route Guards                    │  HTTP Interceptor             │
│  ├─ AuthGuard (isAuthenticated)  │  ├─ Adds Authorization header │
│  └─ RoleGuard (hasRole)          │  └─ Handles 401 → sign out    │
├──────────────────────────────────┴──────────────────────────────┤
│                    TokenValidationService                        │
│  ├─ validTokens: Map<userId, Set<tokenId>>                      │
│  ├─ issueToken(userId, token) → adds to map                     │
│  ├─ revokeToken(token) → removes from map                       │
│  ├─ revokeAllForUser(userId) → purge on new sign-in             │
│  └─ validateToken(token) → checks map + expiry + signature      │
├─────────────────────────────────────────────────────────────────┤
│                    AuthService (updated)                         │
│  ├─ signInWithJwt() → calls issueToken(), purges old tokens     │
│  └─ signOut() → calls revokeToken()                             │
├─────────────────────────────────────────────────────────────────┤
│                    QueryApiMockService (updated)                 │
│  └─ validateToken() before returning any data                   │
│  └─ Returns 401 Unauthorized if invalid                         │
├─────────────────────────────────────────────────────────────────┤
│                    Storage Services (updated)                    │
│  └─ All keys include userId: `${prefix}:${userId}:${key}`       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: TokenValidationService (Simulated Server)

**Create**: `libs/core/auth/src/lib/token-validation.service.ts`

```typescript
/**
 * Simulates server-side token validation.
 *
 * In production, replace with real backend calls.
 * This service maintains an in-memory "valid tokens" registry
 * that simulates what a server session store would do.
 */
@Injectable({ providedIn: "root" })
export class TokenValidationService {
  /** Map of userId → Set of valid token IDs */
  private readonly validTokens = new Map<string, Set<string>>();

  /**
   * Issue a new token for user.
   * Automatically revokes all previous tokens for this user.
   */
  issueToken(userId: string, tokenId: string): void;

  /**
   * Revoke a specific token.
   */
  revokeToken(tokenId: string): void;

  /**
   * Revoke all tokens for a user (called on new sign-in).
   */
  revokeAllForUser(userId: string): void;

  /**
   * Validate token: in registry + not expired + valid signature.
   */
  validateToken(token: string): TokenValidationResult;
}

interface TokenValidationResult {
  valid: boolean;
  reason?: "expired" | "revoked" | "invalid_signature" | "not_found";
  userId?: string;
  roles?: string[];
}
```

**Tests**: `libs/core/auth/src/lib/token-validation.service.spec.ts`

- Token issuance adds to registry
- New sign-in purges old tokens
- Revoked tokens fail validation
- Expired tokens fail validation
- Invalid signatures fail validation

---

### Phase 2: Update AuthService

**Modify**: `libs/core/auth/src/lib/auth.service.ts`

Changes:

1. Inject `TokenValidationService`
2. `signInWithJwt()`:
   - Call `tokenValidation.revokeAllForUser(userId)` before issuing new token
   - Call `tokenValidation.issueToken(userId, tokenId)` after generating token
3. `signOut()`:
   - Call `tokenValidation.revokeToken(currentTokenId)`
4. Add `validateCurrentToken()` method for guards/interceptor

**Tests**: Update `libs/core/auth/src/lib/auth.service.spec.ts`

- New sign-in revokes previous tokens
- Sign-out revokes current token
- Token validation integrates with TokenValidationService

---

### Phase 3: Angular Route Guards

**Create**: `libs/core/auth/src/lib/guards/auth.guard.ts`

```typescript
/**
 * Guard that requires authentication.
 * Redirects to SSO view if not authenticated or token invalid.
 */
export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated || !auth.validateCurrentToken().valid) {
    auth.signOut(); // Clear invalid state
    router.navigate(["/sso"]);
    return false;
  }
  return true;
};
```

**Create**: `libs/core/auth/src/lib/guards/role.guard.ts`

```typescript
/**
 * Guard that requires specific roles.
 * Use with route data: { roles: ['analyst', 'admin'] }
 */
export const roleGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const requiredRoles = route.data["roles"] as string[];

  if (!auth.hasAnyRole(requiredRoles)) {
    router.navigate(["/sso"]);
    return false;
  }
  return true;
};
```

**Apply to routes**: `apps/excel-addin/src/app/app.routes.ts`

```typescript
export const routes: Routes = [
  { path: "sso", component: SsoHomeComponent },
  {
    path: "worksheets",
    component: WorksheetsComponent,
    canActivate: [authGuard],
  },
  {
    path: "queries",
    component: QueriesComponent,
    canActivate: [authGuard, roleGuard],
    data: { roles: ["analyst", "admin"] },
  },
  // ...
];
```

**Tests**: `libs/core/auth/src/lib/guards/auth.guard.spec.ts`

- Allows authenticated users
- Blocks unauthenticated users
- Blocks users with revoked tokens
- Redirects to SSO

**Tests**: `libs/core/auth/src/lib/guards/role.guard.spec.ts`

- Allows users with required role
- Blocks users without required role
- Works with multiple allowed roles

---

### Phase 4: HTTP Interceptor

**Create**: `libs/core/auth/src/lib/auth.interceptor.ts`

```typescript
/**
 * Adds Authorization header to all HTTP requests.
 * Handles 401 responses by signing out and redirecting.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Add Authorization header if authenticated
  const token = auth.getAccessToken();
  if (token) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        auth.signOut();
        router.navigate(["/sso"]);
      }
      return throwError(() => error);
    })
  );
};
```

**Register**: `apps/excel-addin/src/app/app.config.ts`

```typescript
export const appConfig: ApplicationConfig = {
  providers: [provideRouter(routes), provideHttpClient(withInterceptors([authInterceptor]))],
};
```

**Tests**: `libs/core/auth/src/lib/auth.interceptor.spec.ts`

- Adds header when authenticated
- No header when not authenticated
- Handles 401 response
- Passes through other errors

---

### Phase 5: API Token Validation

**Modify**: `libs/data/api/src/lib/query-api-mock.service.ts`

Changes:

1. Inject `TokenValidationService`
2. Add `validateRequest()` method
3. All `executeApi()` calls validate token first
4. Return `{ error: 'Unauthorized', status: 401 }` if invalid

```typescript
private validateRequest(): boolean {
  const validation = this.tokenValidation.validateToken(
    this.auth.getAccessToken() ?? ''
  );
  if (!validation.valid) {
    console.warn(`[API] Request rejected: ${validation.reason}`);
    return false;
  }
  return true;
}

async executeApi(apiId: string, params: Record<string, unknown>): Promise<ExecuteApiResult> {
  if (!this.validateRequest()) {
    return {
      success: false,
      error: { code: 401, message: 'Unauthorized - token invalid or revoked' }
    };
  }
  // ... existing logic
}
```

**Tests**: Update `libs/data/api/src/lib/query-api-mock.service.spec.ts`

- Valid token allows API calls
- Revoked token returns 401
- Expired token returns 401
- No token returns 401

---

### Phase 6: User-Keyed Storage

**Modify storage keys to include userId**:

| Service            | Current Key                  | New Key Pattern                              |
| ------------------ | ---------------------------- | -------------------------------------------- |
| AuthService        | `excel-extension-auth-state` | `excel-ext:auth:${visitorId}` (device-level) |
| SettingsService    | `excel-extension.settings`   | `excel-ext:settings:${userId}`               |
| QueryStateService  | `query-state`                | `excel-ext:query-state:${userId}`            |
| IndexedDBService   | `${queryId}`                 | `${userId}:${queryId}`                       |
| QueryConfigService | Already user-keyed           | No change needed                             |

**Create**: `libs/shared/util/src/lib/visitor-id.ts`

```typescript
/**
 * Generate/retrieve persistent visitor ID for this device.
 * Used to isolate auth state per device (not per user).
 */
export function getVisitorId(): string {
  const key = "excel-ext:visitor-id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}
```

**Tests**: For each modified service

- Storage isolation between users
- Data not accessible after sign-out
- New user doesn't see old user's data

---

## Files to Create

| File                                                      | Purpose                      |
| --------------------------------------------------------- | ---------------------------- |
| `libs/core/auth/src/lib/token-validation.service.ts`      | Simulated server token store |
| `libs/core/auth/src/lib/token-validation.service.spec.ts` | Tests                        |
| `libs/core/auth/src/lib/guards/auth.guard.ts`             | Authentication guard         |
| `libs/core/auth/src/lib/guards/auth.guard.spec.ts`        | Tests                        |
| `libs/core/auth/src/lib/guards/role.guard.ts`             | Role-based guard             |
| `libs/core/auth/src/lib/guards/role.guard.spec.ts`        | Tests                        |
| `libs/core/auth/src/lib/auth.interceptor.ts`              | HTTP interceptor             |
| `libs/core/auth/src/lib/auth.interceptor.spec.ts`         | Tests                        |
| `libs/shared/util/src/lib/visitor-id.ts`                  | Device ID helper             |

## Files to Modify

| File                                                   | Changes                          |
| ------------------------------------------------------ | -------------------------------- |
| `libs/core/auth/src/lib/auth.service.ts`               | Integrate TokenValidationService |
| `libs/core/auth/src/lib/auth.service.spec.ts`          | Update tests                     |
| `libs/core/auth/src/index.ts`                          | Export new services/guards       |
| `libs/data/api/src/lib/query-api-mock.service.ts`      | Add token validation             |
| `libs/data/api/src/lib/query-api-mock.service.spec.ts` | Update tests                     |
| `libs/data/storage/src/lib/indexeddb.service.ts`       | User-keyed cache                 |
| `libs/core/settings/src/lib/settings.service.ts`       | User-keyed settings              |
| `apps/excel-addin/src/app/app.routes.ts`               | Apply guards                     |
| `apps/excel-addin/src/app/app.config.ts`               | Register interceptor             |

---

## Success Criteria

- [ ] TokenValidationService simulates server-side token registry
- [ ] New sign-in purges all previous tokens for user
- [ ] Route guards block unauthorized navigation
- [ ] HTTP interceptor adds Authorization header
- [ ] Mock API validates tokens before returning data
- [ ] Invalid/revoked tokens return 401
- [ ] Storage is user-keyed (no cross-user data leakage)
- [ ] All new code has TSDoc
- [ ] All new code has unit tests
- [ ] All existing tests pass
- [ ] Security scenarios documented in TSDoc

---

## Security Guarantees After Implementation

| Threat            | Before                     | After                                  |
| ----------------- | -------------------------- | -------------------------------------- |
| Stale token reuse | ❌ Works forever           | ✅ Rejected (not in registry)          |
| Cross-user data   | ❌ Shared cache keys       | ✅ User-keyed storage                  |
| Role spoofing     | ❌ Client can set any role | ⚠️ Still possible (needs real backend) |
| Direct URL access | ❌ UI hiding only          | ✅ Route guards enforce                |
| API without auth  | ❌ No headers sent         | ✅ Bearer token required               |
| Session hijacking | ❌ Tokens never expire     | ✅ Validated + revocable               |

**Note**: Role spoofing requires real backend to fully prevent. This implementation simulates server behavior but roles still originate from client `signInWithJwt()` call.

---

## Rollback

```bash
git checkout develop -- libs/core/auth/
git checkout develop -- libs/data/api/src/lib/query-api-mock.service.ts
git checkout develop -- libs/data/storage/
git checkout develop -- apps/excel-addin/src/app/app.routes.ts
git checkout develop -- apps/excel-addin/src/app/app.config.ts
```

---

## Future Enhancements (Post-H5)

1. **Real backend auth** - Replace TokenValidationService with actual API calls
2. **Refresh token rotation** - Issue new refresh token on each use
3. **Device binding** - Tie tokens to device fingerprint
4. **Audit logging** - Log all auth events to telemetry
5. **Rate limiting** - Prevent brute force attacks
