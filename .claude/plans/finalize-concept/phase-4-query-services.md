# Phase 4: Query Services Refactor + Storage/Caching Strategy

**Sub-Branch:** `feat/query-services-refactor`
**Depends On:** Phase 3 (Excel/Workbook cleanup)
**Priority:** HIGH (service boundaries + storage architecture)
**Status:** PENDING

---

## Goals

1. Review ALL query-related services for responsibility boundaries
2. Ensure each service has single, clear responsibility
3. Extract shared helpers (parameter validation, storage persistence)
4. **Investigate comprehensive storage/caching strategy** (localStorage vs IndexedDB)
5. **Design backup/restore functionality**
6. **Evaluate service workers for offline support**
7. **Document Excel Desktop vs Online storage differences**
8. Clear service contracts with comprehensive TSDoc

## Success Criteria

- [ ] Each query service has single responsibility
- [ ] No shared state management logic
- [ ] Shared helpers extracted (validation, persistence)
- [ ] Storage strategy evaluated and documented
- [ ] Excel Desktop vs Online storage differences documented
- [ ] Service worker feasibility assessed
- [ ] Backup/restore design completed
- [ ] StorageHelperService supports multiple backends
- [ ] All public methods TSDoc'd
- [ ] Tests pass (100% for refactored services)

---

## Services in Scope

| Service | Current State | Target State | Extract |
|---------|--------------|--------------|---------|
| QueryApiMockService | Mixed catalog + execution | Execution only | Catalog to ApiCatalogService (Phase 1) |
| QueryStateService | Parameters, run state, localStorage | Parameter/run state only | localStorage to StorageHelperService |
| QueryConfigurationService | CRUD, validation, localStorage | CRUD only | Validation + localStorage to helpers |
| QueryQueueService | Queue/execution coordination | Good as-is | Verify no state leakage |

---

## Technical Approach

### 4.0: Storage/Caching Strategy

**Browser Storage Comparison:**

| Type | Max Size | Performance | Offline | Use Case |
|------|----------|-------------|---------|----------|
| localStorage | ~5-10MB | Fast sync | Yes | Small key-value (settings, auth) |
| IndexedDB | ~50MB-1GB+ | Async | Yes | Large datasets (query results) |
| Cache API | Quota-based | Async | Yes | HTTP response caching |

**Current State:**
- All persistence uses localStorage
- No large dataset caching
- No offline support

**Target State:**
- localStorage: Settings, auth tokens, UI state (< 1MB)
- IndexedDB: Query results, large datasets, backups
- Service Worker: Deferred to post-MVP

### 4.1: IndexedDB Service

```typescript
@Injectable({ providedIn: "root" })
export class IndexedDBService {
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = "ExcelExtensionDB";
  private readonly STORE_NAME = "queryResults";

  async cacheQueryResult(queryId: string, rows: any[], expiresIn = 3600000): Promise<void> {
    // Store with TTL
  }

  async getCachedQueryResult(queryId: string): Promise<any[] | null> {
    // Return most recent non-expired result
  }

  async clearExpiredCache(): Promise<void> {
    // Remove expired entries
  }
}
```

### 4.2: Storage Helper Service

```typescript
@Injectable({ providedIn: "root" })
export class StorageHelperService {
  constructor(private indexedDB: IndexedDBService, private telemetry: TelemetryService) {}

  // localStorage (small data < 100KB)
  getItem<T>(key: string, defaultValue: T): T
  setItem<T>(key: string, value: T): void
  removeItem(key: string): void

  // IndexedDB (large data > 100KB)
  async getLargeItem<T>(key: string): Promise<T | null>
  async setLargeItem<T>(key: string, value: T, ttl?: number): Promise<void>
  async clearExpiredCache(): Promise<void>
}
```

### 4.3: Backup/Restore Service

```typescript
@Injectable({ providedIn: "root" })
export class BackupRestoreService {
  async exportBackup(): Promise<void> {
    const backup: AppStateBackup = {
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      authState: this.storage.getItem("auth-state", null),
      settings: this.storage.getItem("settings", null),
      queryConfigs: this.storage.getItem("query-configs", []),
      queryState: this.storage.getItem("query-state", null),
    };
    // Download as JSON file
  }

  async importBackup(file: File): Promise<void> {
    // Validate version, restore state, reload app
  }
}

interface AppStateBackup {
  version: string;
  timestamp: string;
  authState: any;
  settings: any;
  queryConfigs: any[];
  queryState: any;
}
```

### 4.4: Query Validation Service

```typescript
@Injectable({ providedIn: "root" })
export class QueryValidationService {
  validateConfiguration(config: QueryConfiguration, api: ApiDefinition): ValidationResult {
    const errors: string[] = [];

    if (!api) {
      errors.push(`API not found: ${config.apiId}`);
      return { valid: false, errors };
    }

    for (const param of api.parameters) {
      if (param.required && !config.parameterValues[param.key]) {
        errors.push(`Missing required parameter: ${param.key}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }
}
```

### 4.5: Refactor QueryStateService

```typescript
@Injectable({ providedIn: "root" })
export class QueryStateService {
  constructor(private storage: StorageHelperService) {
    this.hydrate();
  }

  private hydrate(): void {
    const snapshot = this.storage.getItem<QueryStateSnapshot>("query-state", this.getDefaultSnapshot());
    this.state$.next(snapshot);
  }

  private persist(): void {
    this.storage.setItem("query-state", this.state$.value);
  }
}
```

---

## File Changes

**New Files:**
- `src/app/shared/storage-helper.service.ts`
- `src/app/shared/storage-helper.service.spec.ts`
- `src/app/shared/indexeddb.service.ts`
- `src/app/shared/indexeddb.service.spec.ts`
- `src/app/shared/backup-restore.service.ts`
- `src/app/shared/backup-restore.service.spec.ts`
- `src/app/shared/query-validation.service.ts`
- `src/app/shared/query-validation.service.spec.ts`
- `.claude/STORAGE-ARCHITECTURE.md`

**Modified Files:**
- `src/app/shared/query-state.service.ts`
- `src/app/shared/query-configuration.service.ts`
- `src/app/shared/query-api-mock.service.ts` (check IndexedDB cache)
- `src/app/features/user/user.component.*` (Backup/Restore UI)
- `src/app/core/app.component.ts` (clearExpiredCache on init)

---

## Testing Strategy

**Unit Tests:**
- StorageHelperService - getItem, setItem, getLargeItem, setLargeItem
- IndexedDBService - caching, TTL expiration, cleanup
- BackupRestoreService - export/import, version compatibility
- QueryValidationService - required params, type validation

**Integration Tests:**
- Save config → reload → verify persists
- Cache large query → retrieve → verify returned
- Export backup → import → verify restored

**Manual Verification:**
- Sideload Excel Desktop → verify storage persistence
- Sideload Excel Online → verify IndexedDB works
- Document differences in STORAGE-ARCHITECTURE.md

---

## Exit Criteria

- [ ] StorageHelperService created (multi-backend)
- [ ] IndexedDBService created (large data caching)
- [ ] BackupRestoreService created
- [ ] QueryValidationService created
- [ ] All query services use storage helper
- [ ] Storage strategy documented
- [ ] Excel Desktop vs Online differences documented
- [ ] Backup/Restore UI in Settings
- [ ] Query result caching integrated
- [ ] Expired cache cleanup on init
- [ ] Tests pass (100%)
