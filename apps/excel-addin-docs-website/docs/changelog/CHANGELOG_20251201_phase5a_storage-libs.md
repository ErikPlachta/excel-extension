# Changelog: Phase 5a - Migrate Storage Services

**Branch:** `refactor/storage-libs`
**Completed:** 2025-12-01
**Merged to:** develop
**PR:** #35

---

## Summary

Migrated storage services to `libs/data/storage/`. This resolves temporary relative imports from Phases 3-4 and provides the data persistence layer. Removed TelemetryService dependency from BackupRestoreService to avoid circular dependencies.

---

## Actions Completed

| Action | Result |
| ------ | ------ |
| Create branch | ✅ `refactor/storage-libs` |
| Migrate StorageBaseService | ✅ Zero-dependency localStorage wrapper |
| Migrate StorageHelperService | ✅ Multi-backend abstraction |
| Migrate IndexedDBService | ✅ Large dataset caching with TTL |
| Migrate BackupRestoreService | ✅ Export/import app state |
| Create WINDOW token | ✅ Injection token for testability |
| Fix circular dependency | ✅ Remove TelemetryService from BackupRestoreService |
| Update imports in core libs | ✅ Replace relative imports with alias |
| Update imports in app | ✅ All `@excel-platform/data/storage` |
| Delete original files | ✅ Removed 8 files from `src/app/shared/` |
| Verify build | ✅ Success |
| Verify tests | ✅ 232 tests pass |
| Create PR | ✅ PR #35 merged |

---

## Library Populated

| Library | Path Alias | Contents |
| ------- | ---------- | -------- |
| data-storage | `@excel-platform/data/storage` | StorageBaseService, StorageHelperService, IndexedDBService, BackupRestoreService, WINDOW token |

---

## Key Files Migrated

### Storage Services (`libs/data/storage/src/lib/`)

| File | Lines | Purpose |
| ---- | ----- | ------- |
| `storage-base.service.ts` | ~70 | Zero-dep localStorage wrapper |
| `storage-base.service.spec.ts` | ~100 | StorageBase tests |
| `storage-helper.service.ts` | ~180 | Multi-backend abstraction |
| `storage-helper.service.spec.ts` | ~230 | StorageHelper tests |
| `indexeddb.service.ts` | ~200 | Large dataset caching |
| `indexeddb.service.spec.ts` | ~280 | IndexedDB tests |
| `backup-restore.service.ts` | ~250 | App state export/import |
| `backup-restore.service.spec.ts` | ~140 | BackupRestore tests |
| `window.token.ts` | ~20 | WINDOW injection token |

---

## Exports

```typescript
// libs/data/storage/src/index.ts
export { StorageBaseService } from './lib/storage-base.service';
export { StorageHelperService } from './lib/storage-helper.service';
export { IndexedDBService } from './lib/indexeddb.service';
export type { QueryResultCache } from './lib/indexeddb.service';
export { BackupRestoreService } from './lib/backup-restore.service';
export type { AppStateBackup } from './lib/backup-restore.service';
export { WINDOW } from './lib/window.token';
```

---

## Breaking Change

**BackupRestoreService no longer logs telemetry internally.**

Callers (e.g., SettingsComponent) must handle telemetry logging for import/export operations. This change avoids a circular dependency:

```
data/storage → core/telemetry → core/auth → data/storage
```

---

## Files Updated

### Core Libraries (relative → alias)

- `libs/core/auth/src/lib/auth.service.ts`
- `libs/core/auth/src/lib/auth.service.spec.ts`
- `libs/core/settings/src/lib/settings.service.ts`
- `libs/core/settings/src/lib/settings.service.spec.ts`

### App Services

- `src/app/core/app.component.ts`
- `src/app/core/app.component.spec.ts`
- `src/app/features/settings/settings.component.ts`
- `src/app/features/settings/settings.component.spec.ts`
- `src/app/shared/query-api-mock.service.ts`
- `src/app/shared/query-configuration.service.ts`
- `src/app/shared/query-state.service.ts`

---

## Verification Results

- `npm run lint` - ✅ 0 errors
- `npm run build` - ✅ Success
- `npm run test:ci` - ✅ 232 tests pass

---

## Phase 5 Status

Phase 5 (Data Libs) is **partially complete**. Remaining:

- [ ] Config services → `libs/core/config`
- [ ] API services → `libs/data/api`
- [ ] Query services → `libs/data/query`
