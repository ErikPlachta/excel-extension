# Changelog: feat/finalize-concept Architecture Refactor

**Branch:** `feat/finalize-concept` → `feat/phase-3-4-service-refactor`
**Completed:** 2025-11-26
**Merged to:** develop
**PR:** #27

---

## Summary

All 9 phases of the architecture refactor completed successfully. This refactor established clear service boundaries, data-driven configuration, and comprehensive storage/caching architecture.

| Phase | Name                         | Status |
| ----- | ---------------------------- | ------ |
| 1     | API/Query Separation         | ✅     |
| 2     | Config-Driven Completion     | ✅     |
| 3     | Excel/Workbook Refactor      | ✅     |
| 4     | Query Services + Storage     | ✅     |
| 5     | Auth/Settings/Telemetry      | ✅     |
| 6     | Performance & Large Datasets | ✅     |
| 7     | JWT Authentication           | ✅     |
| 8     | Formula Management           | ✅     |
| 9     | Formula-Column Detection     | ✅     |

---

## Phase 1: API/Query Separation

**Commits:** `94fcdb5`, `a449035`

- Created `api.types.ts` with `ApiDefinition`, `ApiParameter`, `ApiColumnDefinition`
- Created `api-catalog.service.ts` with sync + observable methods, loads from AppConfig
- Deprecated `QueryDefinition` - use `ApiDefinition` for catalog entries
- `QueryInstance` defines execution config with target sheet/table

---

## Phase 2: Config-Driven Completion

- `DEFAULT_APP_CONFIG` already had `apiCatalog` and `text`
- `ConfigValidatorService` already existed
- Deleted dead `app-text.ts` file (not imported anywhere)

---

## Phase 3: Excel/Workbook Refactor

**Commit:** `9b48dae`

### Implementation

| Component                              | Change                                                   |
| -------------------------------------- | -------------------------------------------------------- |
| `WorkbookService.resolveTableTarget()` | New method - ownership lookup + conflict resolution      |
| `WorkbookService.recordOwnership()`    | Delegates to ExcelService.writeOwnershipRecord           |
| `WorkbookService.updateOwnership()`    | Delegates to ExcelService.writeOwnershipRecord           |
| `WorkbookService.deleteOwnership()`    | Delegates to ExcelService.deleteOwnershipRecord          |
| `ExcelService.upsertQueryTable`        | Simplified - trusts passed target (no inline lookup)     |
| `QueriesComponent`                     | Calls `resolveTableTarget()` before `upsertQueryTable()` |

### Deviation from Plan

- **Planned:** `getOrCreateManagedTableTarget()` called by ExcelService
- **Actual:** `resolveTableTarget()` called by QueriesComponent
- **Reason:** Avoids circular dependency (ExcelService ← WorkbookService only)

---

## Phase 4: Query Services + Storage

### Before Phase 4

All persistence used localStorage directly:

| Service                   | Storage Key     | Data Size | Use Case                           |
| ------------------------- | --------------- | --------- | ---------------------------------- |
| AuthService               | `auth-state`    | < 1 KB    | User auth state, roles             |
| SettingsService           | `settings`      | < 5 KB    | User preferences, telemetry config |
| QueryStateService         | `query-state`   | < 10 KB   | Global parameters, run state       |
| QueryConfigurationService | `query-configs` | < 50 KB   | Saved query configurations         |

**Limitations:**
- No caching of large query results (10k+ rows)
- No offline support beyond localStorage persistence
- No backup/restore functionality
- Direct localStorage usage scattered across services

### After Phase 4

**Multi-Tiered Storage:**
- Tier 1: localStorage (< 100 KB) - Settings, auth, UI state
- Tier 2: IndexedDB (100 KB+) - Query results, cached data
- Tier 3: Cache API (Future) - HTTP response caching

### Services Created

| Service                | Key Methods                                                     |
| ---------------------- | --------------------------------------------------------------- |
| StorageHelperService   | getItem, setItem, getLargeItem, setLargeItem, clearExpiredCache |
| IndexedDBService       | cacheQueryResult, getCachedQueryResult, clearExpiredCache       |
| BackupRestoreService   | exportBackup, importBackup (with version validation)            |
| QueryValidationService | validateConfiguration, validateParameters                       |

### Integrations

- QueryStateService → StorageHelperService
- QueryApiMockService → IndexedDB caching
- Settings component → Backup/Restore UI
- AppComponent → clearExpiredCache on init

### Implementation Checklist (Completed)

- [x] IndexedDBService (query result caching)
- [x] StorageHelperService (multi-backend abstraction)
- [x] BackupRestoreService (export/import app state)
- [x] Refactor all services to use StorageHelperService
- [x] Integrate IndexedDB caching in QueryApiMockService
- [x] Backup/Restore UI in Settings view
- [x] Cache cleanup on app init

**Reference:** See `.claude/STORAGE-ARCHITECTURE.md` for storage API comparison and schema details

---

## Phase 5: Auth/Settings/Telemetry Refactor

**Commit:** `080cd98`

- Created `StorageBaseService` (zero-dependency localStorage wrapper)
- Broke circular dependency: TelemetryService → SettingsService → StorageHelperService → TelemetryService
- SettingsService uses StorageBaseService (no telemetry)
- StorageHelperService delegates to StorageBaseService

---

## Phase 6: Performance & Large Datasets

### Problem

Excel Office.js has resource limits:
- ~5MB payload per Office.js call
- ~1 million cells per operation recommendation
- Proxy objects accumulate in memory

### Solution

**Chunked Writes:** `ExcelService.writeRowsInChunks()`
- Default chunk size: 1000 rows
- Default backoff: 100ms between chunks
- Configurable via `SettingsService.queryExecution`

**Row Limits:** `QueryApiMockService.executeApiUncached()`
- Default max rows: 10,000
- Truncates with telemetry warning when exceeded

### User-Configurable Settings

```typescript
queryExecution: {
  maxRowsPerQuery: 10000,    // Hard limit
  chunkSize: 1000,           // Rows per batch
  enableProgressiveLoading: true,
  chunkBackoffMs: 100,       // Delay between chunks
}
```

### Test Queries

- `large-dataset` (10k rows × 30 columns) - tests chunking
- `synthetic-expansion` (25k rows × 40 columns) - tests row limit enforcement

### Implementation Checklist (Completed)

- [x] Chunked writes in ExcelService
- [x] Row limit enforcement in QueryApiMockService
- [x] Settings UI for Query Execution config
- [x] Telemetry for chunk progress and warnings

**Reference:** See `.claude/PERFORMANCE.md` for Excel limits, testing guide, and performance tips

---

## Phase 7: JWT Authentication

- Mock JWT token generation for development
- Token encoding/decoding with Base64
- Expiration checking and refresh logic
- Bearer token header in AppConfigService

---

## Phase 8: Formula Management

- Added `disableFormulasDuringRun` setting (default: true)
- Implemented `ExcelService.setCalculationMode()` to suspend/resume
- Query execution wrapped in try/finally for formula restoration
- UI shows formula status during runs

---

## Phase 9: Formula-Column Detection

- Scans workbook formulas for table/column dependencies (5-min cache)
- Parses Table[Column], [@Column], [[Column]] structured references
- `checkQueryImpact()` assesses formula dependencies before query execution
- Non-blocking warning display in queries UI
- CSV report export for formula dependencies

---

## Key Files Modified

### New Services

- `src/app/shared/storage-base.service.ts`
- `src/app/shared/storage-helper.service.ts`
- `src/app/shared/indexeddb.service.ts`
- `src/app/shared/backup-restore.service.ts`
- `src/app/shared/query-validation.service.ts`
- `src/app/shared/api-catalog.service.ts`
- `src/app/core/formula-scanner.service.ts`
- `src/app/core/jwt-helper.service.ts`

### Modified Services

- `src/app/core/excel.service.ts`
- `src/app/core/workbook.service.ts`
- `src/app/core/settings.service.ts`
- `src/app/core/auth.service.ts`
- `src/app/shared/query-state.service.ts`
- `src/app/shared/query-api-mock.service.ts`

### Documentation

- `.claude/STORAGE-ARCHITECTURE.md`
- `.claude/PERFORMANCE.md`
- `.claude/CLAUDE.md` (updated)
