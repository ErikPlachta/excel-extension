# Changelog: H5 Auth Guards & Backend-Aligned Token Validation

**Date**: 2025-12-04
**Plan**: `plan_13_fix_h5_auth-guards_20251203.md` (mossy-chasing-hopcroft.md)
**Branch**: `fix/h5-auth-guards`
**Merged To**: `develop`

---

## Summary

Implemented comprehensive auth security aligned with BACKEND-API-SPEC.md. Added route guards, HTTP interceptor, backend-aligned JWT tokens, operations API, user-keyed storage, and API-level token validation.

---

## Actions Completed

| Phase | Description | Files Created | Files Modified |
|-------|-------------|---------------|----------------|
| 1 | Auth types & interfaces | auth-api.types.ts | api.types.ts, jwt.types.ts |
| 2 | Auth API services (real + mock) | auth-api.service.ts, auth-api-mock.service.ts, auth.tokens.ts | - |
| 3 | Memory-only access tokens | - | auth.service.ts |
| 4 | Angular route guards | auth.guard.ts, role.guard.ts, guards/index.ts | - |
| 5 | HTTP interceptor (401/403) | auth.interceptor.ts | - |
| 6 | Operations API service | operations-api.service.ts, operations-api-mock.service.ts, operations-api.tokens.ts, operations-api.types.ts | - |
| 7 | User-keyed storage | visitor-id.ts, user-keyed-storage.service.ts | - |
| 8 | Gap fixes (test coverage) | - | user-keyed-storage.service.spec.ts |
| 9 | API token validation | - | query-api-mock.service.ts, operations-api-mock.service.ts |

---

## Key Files Created

### Auth Library (`libs/core/auth/`)
- `auth-api.service.ts` - Real backend HTTP implementation
- `auth-api-mock.service.ts` - Mock with JTI blacklist
- `auth.tokens.ts` - AUTH_API_TOKEN injection token
- `auth.interceptor.ts` - Adds Authorization header, handles 401/403
- `guards/auth.guard.ts` - Authentication check
- `guards/role.guard.ts` - Role-based access control

### Types (`libs/shared/types/`)
- `auth-api.types.ts` - TokenPair, TokenPayload, IAuthApiService
- `operations-api.types.ts` - ExecutionResponse, ExecutionMetrics, ExecutionMeta

### Operations API (`libs/data/api/`)
- `operations-api.service.ts` - POST /operations/{name}
- `operations-api-mock.service.ts` - Wraps QueryApiMockService
- `operations-api.tokens.ts` - OPERATIONS_API_TOKEN

### Storage (`libs/data/storage/`, `libs/shared/util/`)
- `visitor-id.ts` - getVisitorId, buildUserKey, buildDeviceKey
- `user-keyed-storage.service.ts` - Per-user data isolation

---

## Metrics

| Metric | Value |
|--------|-------|
| Files Created | 22 |
| Files Modified | 13 |
| Lines Added | ~3,850 |
| Test Files | 11 |
| Total Tests | 133 |
| Auth Tests | 98 |

---

## Security Improvements

| Threat | Before | After |
|--------|--------|-------|
| Stale token reuse | ❌ Works forever | ✅ Rejected at API + interceptor |
| Cross-user data | ❌ Shared keys | ✅ User-keyed storage |
| Direct URL access | ❌ UI hiding only | ✅ Route guards |
| API without auth | ❌ No headers | ✅ Interceptor + API validation |
| Token in storage | ❌ localStorage | ✅ Memory-only access token |

---

## Commits

```
c229f7b Merge branch 'fix/h5-auth-guards' into develop
7b3cab9 feat(api): H5 phases 6-9 - operations API & token validation
2efb626 feat(auth): H5 phases 1-5 - auth guards & backend-aligned tokens
```

---

## Backend Alignment

Per `docs/architecture/BACKEND-API-SPEC.md`:
- ✅ JWT with jti, aud, iss claims
- ✅ RoleId includes `automation`
- ✅ Response format: `{ status, data: { rows, metrics }, meta }`
- ✅ Auth endpoints match contract
- ✅ Memory-only access tokens
- ✅ Token validation on every API request