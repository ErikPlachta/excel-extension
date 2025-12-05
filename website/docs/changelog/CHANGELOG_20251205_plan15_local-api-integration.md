# Changelog: Plan 15 - Local API Server Integration

**Date:** 2025-12-05
**Branch:** `feat/local-api-integration`
**PR:** #51

---

## Summary

Configure frontend to connect to local API server at `http://127.0.0.1:8000` via Angular proxy, with environment-based service switching between real and mock implementations.

---

## Actions Completed

| Action | File(s) | Description |
|--------|---------|-------------|
| Create | `environments/environment.ts` | Dev config with proxy mode |
| Create | `environments/environment.prod.ts` | Production config (same-origin) |
| Create | `environments/environment.mock.ts` | Mock services config |
| Create | `proxy.conf.json` | Angular proxy for /auth, /operations, /api, /health |
| Create | `api-config.service.ts` | Centralized URL builder with DI token |
| Create | `scripts/test-local-api.sh` | Backend connectivity test script |
| Modify | `app.config.ts` | Wire AUTH_API_TOKEN, OPERATIONS_API_TOKEN, authInterceptor |
| Modify | `project.json` | Build configs with file replacements |
| Modify | `auth-api.service.ts` | Use ApiConfigService.buildUrl() |
| Modify | `operations-api.service.ts` | Use ApiConfigService.buildUrl() |
| Modify | `libs/data/api/src/index.ts` | Export ApiConfigService, API_CONFIG_TOKEN |
| Modify | `package.json` | Add start:mock, test:api scripts |

---

## Key Files Created

| File | Purpose |
|------|---------|
| `apps/excel-addin/src/environments/environment.ts` | Dev: useRealBackend=true, proxy mode |
| `apps/excel-addin/src/environments/environment.prod.ts` | Prod: same-origin requests |
| `apps/excel-addin/src/environments/environment.mock.ts` | Mock: useRealBackend=false |
| `apps/excel-addin/proxy.conf.json` | Proxy /auth, /operations, /api, /health → 127.0.0.1:8000 |
| `libs/data/api/src/lib/api-config.service.ts` | ApiConfigService + API_CONFIG_TOKEN |
| `scripts/test-local-api.sh` | Health check, auth, operations test |

---

## NPM Scripts Added

```bash
npm start          # Dev with proxy to localhost:8000
npm run start:mock # Mock services (no backend needed)
npm run test:api   # Test backend connectivity
```

---

## Build Configurations

| Config | Environment File | useRealBackend |
|--------|------------------|----------------|
| development | environment.ts | true (proxy) |
| production | environment.prod.ts | true (same-origin) |
| mock | environment.mock.ts | false |

---

## Commits

| Hash | Message |
|------|---------|
| 3807c7c | feat(api): Plan 15 - local API server integration |
| 837bbc6 | fix(proxy): add missing /health endpoint |

---

## Metrics

- Files created: 6
- Files modified: 6
- Total lines changed: ~275
- Tests: 137 passing
- Build: Passing (507 kB bundle)
