# Phase 4: Query Services Refactor + Storage/Caching Strategy

**Branch:** `feat/update-query-services-and-storage-caching-strategy`
**Depends On:** Phase 3 (Excel/Workbook cleanup) 
**Priority:** HIGH (clear service boundaries + critical storage architecture)

## Goals

1. Clear service responsibility boundaries (single responsibility)
2. Extract shared helpers (storage, validation)
3. **Comprehensive storage/caching strategy** (localStorage vs IndexedDB vs Cache API)
4. **Backup/restore functionality** for data persistence
5. **Service worker evaluation** for offline support
6. **Excel Desktop vs Online storage differences** documented

## Success Criteria

- [ ] Each query service has single responsibility
- [ ] StorageHelperService abstracts localStorage + IndexedDB
- [ ] IndexedDBService caches large datasets (query results)
- [ ] BackupRestoreService exports/imports app state
- [ ] QueryValidationService validates configs
- [ ] Storage strategy evaluated and documented
- [ ] Excel Desktop vs Online storage differences documented in `.claude/STORAGE-ARCHITECTURE.md`
- [ ] Service worker feasibility assessed
- [ ] Backup/Restore UI in User/Settings view
- [ ] Query result caching integrated (check cache before mock generation)
- [ ] Expired cache cleanup on app init
- [ ] All public methods TSDoc'd
- [ ] Tests pass (100% for new/refactored services)

## Services in Scope

**QueryStateService** (`src/app/shared/query-state.service.ts`)
- **Current:** Parameters, run state, direct localStorage
- **Target:** State management only
- **Extract:** localStorage ’ StorageHelperService

**QueryConfigurationService** (`src/app/shared/query-configuration.service.ts`)
- **Current:** CRUD on configs, apiId validation, direct localStorage
- **Target:** CRUD operations only
- **Extract:** Validation ’ QueryValidationService, localStorage ’ StorageHelperService

**QueryApiMockService** (`src/app/shared/query-api-mock.service.ts`)
- **Current:** Mock data generation
- **Target:** Check IndexedDB cache before generating mocks
- **Add:** Cache integration via IndexedDBService

**QueryQueueService** (`src/app/shared/query-queue.service.ts`)
- **Current:** Queue management, execution coordination
- **Target:** Add result caching to IndexedDB after runs
- **Verify:** No state leakage

## Technical Approach

### 4.0: Storage/Caching Strategy Investigation

**Browser Storage Comparison:**

| Storage Type | Max Size | Performance | Offline | Use Case |
|--------------|----------|-------------|---------|----------|
| localStorage | ~5-10MB | Fast sync |  | Small key-value (settings, auth) |
| IndexedDB | ~50MB-1GB+ | Async, fast for large data |  | Query results, cached API responses |
| Cache API | ~50MB-1GB+ | Async, HTTP-optimized |  | API response caching |
| Service Worker | N/A | N/A |  | Offline support, background sync |

**Current State:** All persistence uses localStorage
**Target State:**
- localStorage: Settings, auth, UI state (< 1MB)
- IndexedDB: Query results, large datasets (10k+ rows)
- Service Worker: Deferred to post-MVP (Phase 10+)

**Deliverable:** `.claude/STORAGE-ARCHITECTURE.md` documenting findings + Excel host differences

### 4.1: Extract Storage Helpers

**Create:** `src/app/shared/storage-helper.service.ts`
- Multi-backend abstraction (localStorage + IndexedDB)
- Methods: `getItem`, `setItem`, `getLargeItem`, `setLargeItem`, `removeItem`, `clear`, `clearExpiredCache`
- All services use this instead of direct storage access

### 4.2: Create IndexedDB Service

**Create:** `src/app/shared/indexeddb.service.ts`
- Large dataset storage for query result caching
- Methods: `init`, `cacheQueryResult`, `getCachedQueryResult`, `clearExpiredCache`
- Schema: `{ id, queryId, rows, timestamp, expiresAt }`
- Default TTL: 1 hour (configurable)

### 4.3: Create Backup/Restore Service

**Create:** `src/app/shared/backup-restore.service.ts`
- Export all app state to JSON file (download)
- Import JSON file to restore state (with version compatibility check)
- Backup schema: `{ version, timestamp, authState, settings, queryConfigs, queryState }`
- Triggers app reload after restore

**UI Integration:** User/Settings view with Export/Import buttons

### 4.4: Create Validation Service

**Create:** `src/app/shared/query-validation.service.ts`
- Validate QueryConfiguration against ApiDefinition
- Check required parameters, parameter types
- Return: `{ valid: boolean, errors: string[] }`

### 4.5: Refactor Existing Services

**QueryStateService:** Use StorageHelperService for hydrate/persist
**QueryConfigurationService:** Use StorageHelperService + QueryValidationService
**QueryApiMockService:** Check IndexedDB cache before generating mocks
**QueryQueueService:** Cache results to IndexedDB after successful runs
**AppComponent:** Call `clearExpiredCache()` on init

## File Changes

**New Files:**
- `src/app/shared/storage-helper.service.ts` + `.spec.ts`
- `src/app/shared/indexeddb.service.ts` + `.spec.ts`
- `src/app/shared/backup-restore.service.ts` + `.spec.ts`
- `src/app/shared/query-validation.service.ts` + `.spec.ts`
- `.claude/STORAGE-ARCHITECTURE.md` (NEW)

**Modified Files:**
- `src/app/shared/query-state.service.ts` + `.spec.ts`
- `src/app/shared/query-configuration.service.ts` + `.spec.ts`
- `src/app/shared/query-api-mock.service.ts` + `.spec.ts`
- `src/app/shared/query-queue.service.ts` + `.spec.ts`
- `src/app/features/user/user.component.html` + `.ts`
- `src/app/core/app.component.ts`
- `.claude/ARCHITECTURE.md` (service responsibilities)

## Testing Strategy

**Unit Tests:**
- StorageHelperService: getItem, setItem, getLargeItem, setLargeItem, error handling
- IndexedDBService: init, cache/get, clearExpired, TTL expiration
- BackupRestoreService: export/import, version compatibility
- QueryValidationService: validate configs with missing/invalid params
- Updated services: verify use storage/validation helpers

**Integration Tests:**
- Save config ’ reload ’ verify persistence (localStorage)
- Cache large result ’ get cached ’ verify returned (IndexedDB)
- Cache with TTL ’ wait ’ clearExpired ’ verify removed
- Export ’ import ’ verify state restored
- Invalid config ’ verify validation errors

**Manual Verification:**
- Sideload in Excel Desktop ’ verify localStorage persistence
- Sideload in Excel Online ’ verify IndexedDB persistence
- Document quota/behavior differences in `.claude/STORAGE-ARCHITECTURE.md`

## Exit Criteria

- [ ] StorageHelperService created, tested, documented
- [ ] IndexedDBService created, tested, documented
- [ ] BackupRestoreService created, tested, documented
- [ ] QueryValidationService created, tested, documented
- [ ] All query services use StorageHelperService (no direct localStorage)
- [ ] All config operations validate via QueryValidationService
- [ ] Query result caching integrated (IndexedDB)
- [ ] Expired cache cleanup on app init
- [ ] Backup/Restore UI in User/Settings view
- [ ] `.claude/STORAGE-ARCHITECTURE.md` documents strategy + Excel host differences
- [ ] Service worker evaluation documented (defer to Phase 10+)
- [ ] Each service has single, documented responsibility
- [ ] Tests pass (100% for helpers + updated services)
- [ ] `.claude/ARCHITECTURE.md` updated with service responsibilities
