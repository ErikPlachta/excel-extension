# Changelog: feat/finalize-concept Architecture Refactor

**Branch:** `feat/finalize-concept` → `feat/phase-3-4-service-refactor`
**Completed:** 2025-11-26
**Merged to:** develop
**PR:** #27

---

## Summary

All 9 phases of the architecture refactor completed successfully. This refactor established clear service boundaries, data-driven configuration, and comprehensive storage/caching architecture.

| Phase | Name | Status |
|-------|------|--------|
| 1 | API/Query Separation | ✅ |
| 2 | Config-Driven Completion | ✅ |
| 3 | Excel/Workbook Refactor | ✅ |
| 4 | Query Services + Storage | ✅ |
| 5 | Auth/Settings/Telemetry | ✅ |
| 6 | Performance & Large Datasets | ✅ |
| 7 | JWT Authentication | ✅ |
| 8 | Formula Management | ✅ |
| 9 | Formula-Column Detection | ✅ |

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

| Component | Change |
|-----------|--------|
| `WorkbookService.resolveTableTarget()` | New method - ownership lookup + conflict resolution |
| `WorkbookService.recordOwnership()` | Delegates to ExcelService.writeOwnershipRecord |
| `WorkbookService.updateOwnership()` | Delegates to ExcelService.writeOwnershipRecord |
| `WorkbookService.deleteOwnership()` | Delegates to ExcelService.deleteOwnershipRecord |
| `ExcelService.upsertQueryTable` | Simplified - trusts passed target (no inline lookup) |
| `QueriesComponent` | Calls `resolveTableTarget()` before `upsertQueryTable()` |

### Deviation from Plan

- **Planned:** `getOrCreateManagedTableTarget()` called by ExcelService
- **Actual:** `resolveTableTarget()` called by QueriesComponent
- **Reason:** Avoids circular dependency (ExcelService ← WorkbookService only)

---

## Phase 4: Query Services + Storage

### Services Created

| Service | Key Methods |
|---------|-------------|
| StorageHelperService | getItem, setItem, getLargeItem, setLargeItem, clearExpiredCache |
| IndexedDBService | cacheQueryResult, getCachedQueryResult, clearExpiredCache |
| BackupRestoreService | exportBackup, importBackup (with version validation) |
| QueryValidationService | validateConfiguration, validateParameters |

### Integrations

- QueryStateService → StorageHelperService
- QueryApiMockService → IndexedDB caching
- Settings component → Backup/Restore UI
- AppComponent → clearExpiredCache on init

### Documentation

- `.claude/STORAGE-ARCHITECTURE.md` - comprehensive storage strategy + Excel Desktop vs Online differences

---

## Phase 5: Auth/Settings/Telemetry Refactor

**Commit:** `080cd98`

- Created `StorageBaseService` (zero-dependency localStorage wrapper)
- Broke circular dependency: TelemetryService → SettingsService → StorageHelperService → TelemetryService
- SettingsService uses StorageBaseService (no telemetry)
- StorageHelperService delegates to StorageBaseService

---

## Phase 6: Performance & Large Datasets

- Implemented chunked Excel writes (default 1000 rows, 100ms backoff)
- Enforced row limits in QueryApiMockService with telemetry warnings
- Added Settings UI for Query Execution config (maxRows, chunkSize, progressive loading)
- Created comprehensive `.claude/PERFORMANCE.md` documentation

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
