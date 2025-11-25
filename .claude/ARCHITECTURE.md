# Architecture

Angular 20 task-pane add-in for Excel. Standalone components, Office.js wrapper, data-driven config.

## Core Services

### ExcelService (`src/app/core/excel.service.ts`)
**Low-level Office.js wrapper**

**Core Operations:**
- `isExcel` – Guard for Excel host detection
- `upsertQueryTable(query, rows, locationHint?)` – Create/update tables, returns `ExcelOperationResult<QueryRunLocation>`
- `activateQueryLocation(location)` – Navigate to worksheet/table
- `purgeExtensionManagedContent()` – Dev-only reset

**Ownership Low-Level Helpers (Phase 3):**
- `writeOwnershipRecord(info)` – Write/update ownership metadata row in `_Extension_Ownership`
- `deleteOwnershipRecord(info)` – Remove ownership metadata row
- Low-level operations called by `WorkbookService`, not features

**Helper Methods (Phase 3):**
- `computeHeaderAndValues(rows)` – Transform query result rows to Excel format
- `writeQueryTableData(ctx, sheet, tableName, header, values, queryId)` – Handle table creation/update logic

**Design:**
- All methods gated by `isExcel`, return typed results (no throws)
- Office.js types remain `any` at boundary
- Focuses on Office.js API calls, delegates ownership decisions to `WorkbookService`

### WorkbookService (`src/app/core/workbook.service.ts`)
**Workbook abstraction & ownership model**

**Read Operations:**
- `getSheets()` → `string[]`
- `getTables()` → `WorkbookTableInfo[]`
- `getTableByName(name)` → `WorkbookTableInfo | undefined`
- `getOwnership()` → `WorkbookOwnershipInfo[]`
- `isExtensionManagedTable(table)` → `boolean`
- `getManagedTablesForQuery(queryId)` → `WorkbookTableInfo[]`
- `getManagedTableForQuery(queryId)` → `WorkbookTableInfo | undefined`
- `getOrCreateManagedTableTarget(query)` → `{sheetName, tableName, existing?} | null`

**Write Operations (Phase 3):**
- `recordOwnership(info)` – Create/update ownership record for a table
- `updateOwnership(queryId, sheetName, tableName)` – Update `lastTouchedUtc` timestamp
- `deleteOwnership(queryId, sheetName, tableName)` – Remove ownership record

**Design:**
- Features call `WorkbookService` for ownership decisions, then pass results to `ExcelService`
- All write operations delegate to `ExcelService` low-level helpers
- Centralizes ownership business logic (conflict resolution, target selection)

**Ownership:** Metadata stored in hidden `_Extension_Ownership` sheet. Extension only mutates managed tables. User table name conflicts → create suffixed alternate.

### AuthService (`src/app/core/auth.service.ts`)
**Mocked SSO & role management**

- `isAuthenticated`, `user`, `roles`
- `signInAsAnalyst()`, `signInAsAdmin()`, `signOut()`
- `hasRole(role)`, `hasAnyRole(roles)`
- `localStorage` persistence

### TelemetryService (`src/app/core/telemetry.service.ts`)
**Centralized logging**

- Console + optional in-workbook table
- Config via `SettingsService` → `TelemetrySettings`
- Enriches events with session ID, host status, auth summary
- `normalizeError()` for Excel operations → `ExcelOperationResult`

### SettingsService (`src/app/core/settings.service.ts`)
**App-wide settings**

- `AppSettings.telemetry` → `TelemetrySettings`
- Console logging, workbook logging, log sheet/table names
- `localStorage` persistence with defaults merge

### AppContextService (`src/app/core/app-context.service.ts`)
**Host & auth context**

- `hostStatus` → `{isExcel, isOnline}`
- `getAuthSummary()` → `{isAuthenticated, displayName, roles}`

## API vs Query Architecture (Phase 1)

**Key Distinction:**
- **ApiDefinition** (`src/app/types/api.types.ts`) = Catalog entry describing available data source
- **QueryInstance** (`src/app/types/query.types.ts`) = Configured instance with specific parameters + Excel target
- **QueryConfiguration** (`src/app/types/query-configuration.types.ts`) = Collection of QueryInstances (saved report)

**Flow:**
1. User browses **API Catalog** (available data sources)
2. User creates **Query Instance** from API with specific parameters
3. User optionally saves multiple instances as **Query Configuration** (reusable report)

## Excel/Workbook Service Boundaries (Phase 3)

**Architectural Pattern:**

**ExcelService** = Low-level Office.js wrapper
- Wraps Office.js API calls with `isExcel` guards
- Returns typed `ExcelOperationResult<T>` instead of throwing
- Provides low-level helpers: `writeOwnershipRecord()`, `deleteOwnershipRecord()`
- Extracted helpers: `computeHeaderAndValues()`, `writeQueryTableData()`
- **Responsibility:** Office.js API execution only

**WorkbookService** = High-level ownership & business logic
- Ownership decisions: `getOrCreateManagedTableTarget()`
- Ownership write operations: `recordOwnership()`, `updateOwnership()`, `deleteOwnership()`
- Delegates low-level operations to `ExcelService`
- **Responsibility:** Ownership model, conflict resolution, target selection

**Proper Usage Pattern:**
```typescript
// Features call WorkbookService for ownership decisions
const target = await this.workbook.getOrCreateManagedTableTarget(query);
if (!target) return;

// Then pass result to ExcelService for execution
const result = await this.excel.upsertQueryTable(query, rows, {
  sheetName: target.sheetName,
  tableName: target.tableName,
});
```

**Phase 3 Improvements:**
- ✅ Added `WorkbookService` ownership write methods (`recordOwnership`, `updateOwnership`, `deleteOwnership`)
- ✅ Added `ExcelService` low-level helpers (`writeOwnershipRecord`, `deleteOwnershipRecord`)
- ✅ Extracted `ExcelService` helper methods (`computeHeaderAndValues`, `writeQueryTableData`)
- ✅ Clear service boundary documentation
- ✅ 6 new tests added (73 total tests passing)
- 🔜 **TODO (Phase 4):** Extract ownership decision logic from `upsertQueryTable` (see TSDoc note)

## Query Services

### ApiCatalogService (`src/app/shared/api-catalog.service.ts`) - NEW Phase 1
**API catalog management**

- `getApis()` → `ApiDefinition[]` (all available APIs)
- `getApiById(id)` → `ApiDefinition | undefined`
- `getApisByRole(roles)` → `ApiDefinition[]` (filtered by user roles)
- Read-only catalog, hardcoded in Phase 1 (Phase 2: loads from config)
- Separates API definitions from execution logic

### QueryApiMockService (`src/app/shared/query-api-mock.service.ts`)
**API execution (mock implementation)**

- `executeApi(apiId, params)` → `Promise<any[]>` **[NEW Phase 1]**
- `executeQuery(id, params)` → `Promise<{query, rows}>` **[DEPRECATED - use executeApi]**
- `getQueries()`, `getQueryById()` **[DEPRECATED - use ApiCatalogService]**
- **Phase 4:** Integrated IndexedDB caching - checks cache before generating mocks
- In-process mock data, no HTTP
- Injected `ApiCatalogService` for validation, `IndexedDBService` for caching

### QueryStateService (`src/app/shared/query-state.service.ts`)
**Parameters & runs**

- `globalParams` – Shared parameters (StartDate, EndDate, Group, SubGroup)
- `queryParams[queryId]` – Per-query overrides
- `queryRunFlags[queryId]` – Run checkbox state
- `getEffectiveParams(queryId, mode)` – Compute params for execution
- `getLastRun(queryId)` → `QueryRun | null`
- `setLastRun(queryId, run)` – Store location/metadata
- **Phase 4:** Uses `StorageHelperService` instead of direct `localStorage`

### QueryConfigurationService (`src/app/shared/query-configuration.service.ts`)
**Reusable configurations**

- `QueryConfiguration` – Named config with selected queries, parameter snapshots, workbook identity
- `QueryConfigurationItem` – Selected query instance (apiId, params, target sheet/table)
- CRUD operations keyed by user + workbook
- **Phase 1:** Validates apiIds against `ApiCatalogService` on save
- **Phase 4:** Uses `StorageHelperService` + `QueryValidationService` for validation

### QueryQueueService (`src/app/shared/query-queue.service.ts`)
**Sequential execution**

- Runs queries one at a time (prevent resource contention)
- Integrates with telemetry for queue events
- Pagination/resource management

## Storage Services (Phase 4)

### StorageHelperService (`src/app/shared/storage-helper.service.ts`)
**Multi-backend storage abstraction**

**Tier 1 (localStorage):**
- `getItem<T>(key, defaultValue)` – Type-safe localStorage read
- `setItem<T>(key, value)` – Type-safe localStorage write
- `removeItem(key)` – Remove key
- `clear()` – Clear all (use cautiously)

**Tier 2 (IndexedDB):**
- `getLargeItem<T>(key)` – Async read from IndexedDB
- `setLargeItem<T>(key, value, ttl?)` – Async write with TTL
- `clearExpiredCache()` – Remove expired entries

**Design:**
- All services use StorageHelperService instead of direct storage access
- Centralized error handling with telemetry integration
- Type safety with generics
- Future-proof for new storage APIs

### IndexedDBService (`src/app/shared/indexeddb.service.ts`)
**Query result caching with TTL**

**Operations:**
- `init()` – Initialize DB connection (auto on first use)
- `cacheQueryResult(queryId, rows, ttl?)` – Cache with expiration
- `getCachedQueryResult(queryId)` – Get most recent non-expired cache
- `clearExpiredCache()` – Cleanup (called on app init)
- `clearAllCache()` – Manual reset (Settings UI)

**Schema:**
```typescript
interface QueryResultCache {
  id: string;           // PK: `${queryId}-${timestamp}`
  queryId: string;      // Index
  rows: any[];
  timestamp: number;    // Index
  expiresAt: number;    // TTL
}
```

**Cache Invalidation:**
- TTL-based (default 1 hour, configurable)
- Manual clear via Settings
- Auto cleanup on app init

### BackupRestoreService (`src/app/shared/backup-restore.service.ts`)
**Export/import app state**

**Operations:**
- `exportBackup()` – Download JSON snapshot
- `importBackup(file)` – Restore from JSON (validates version, reloads app)

**Schema:**
```typescript
interface AppStateBackup {
  version: string;      // "1.0.0" (semantic versioning)
  timestamp: string;    // ISO 8601
  authState: any;
  settings: any;
  queryConfigs: any[];
  queryState: any;
}
```

**Version Compatibility:**
- Major mismatch: Reject (v2.x.x → v1.x.x)
- Minor mismatch: Allow with warning (v1.2.0 → v1.1.0)
- Patch mismatch: Allow silently (v1.0.1 → v1.0.0)

### QueryValidationService (`src/app/shared/query-validation.service.ts`)
**Configuration and parameter validation**

**Operations:**
- `validateConfiguration(config)` → `ValidationResult`
- `validateConfigurationItem(item, params?)` → `ValidationResult`
- `validateParameters(api, params)` → `ValidationResult`
- `apiExists(apiId)` → `boolean`

**Validation Checks:**
- API exists in catalog
- Required parameters present
- Parameter types match (date, number, string, boolean)
- Returns detailed error messages

**Usage:**
```typescript
const result = validator.validateConfiguration(config);
if (!result.valid) {
  throw new Error(result.errors.join(', '));
}
```

## Data Flow

```
User → QueryHomeComponent
  ↓
  QueryStateService (params, run flags)
  ↓
  QueryApiMockService.executeQuery(id, params) → rows
  ↓
  ExcelService.upsertQueryTable(query, rows, params)
    ↓
    WorkbookService (ownership checks)
    ↓
    Office.js (Excel.run)
    ↓
    TelemetryService (log success/error)
  ↓
  QueryRunLocation returned
  ↓
  QueryStateService.setLastRun(queryId, location)
```

## Navigation

State-based in `AppComponent`:
- `currentView: ViewId` – No URL changes in Excel
- Routes in `src/app/core/app.routes.ts` for browser usage
- Nav driven by `AppConfig.navItems` from `src/app/shared/app-config.default.ts`

## UI Primitives

`src/app/shared/ui/`:
- `ButtonComponent` – `variant`, `size`, `iconName`
- `StatusBannerComponent` – `type`, `title`, `message`
- `TableComponent` – `columns: UiTableColumnDef[]`, `rows: T[]`
- `ListComponent` – `items: UiListItem[]`
- `SectionComponent` – `title`, `variant` (default/dense), collapsible
- `CardComponent` – `title`, `subtitle`, `iconName`, `variant`
- `DropdownComponent` – `items: UiDropdownItem[]`, `value`
- `IconComponent` – `name: UiIconName`

## Data-Driven Config

### AppConfig (`src/app/shared/app-config.default.ts`)
- `navItems: NavItemConfig[]` – Nav structure, roles, actions
- `defaultViewId` – Initial view
- `rootIdsAndClasses` – DOM IDs/classes for shell elements
- `ui.viewLayout` – Per-view layout hints

### APP_TEXT (`src/app/shared/app-text.ts`)
- `nav` – Nav labels
- `auth` – Sign-in/out button text
- `userBanner` – User banner fallback
- `hostStatus` – Excel detection messages

## Types

`src/app/types/`:
- `auth.types.ts` – `AuthState`, role types
- `query.types.ts` – `QueryDefinition`, `QueryParameter`, `QueryRun`, `QueryRunLocation`
- `app-config.types.ts` – `AppConfig`, `NavItemConfig`, `RoleDefinition`, `ViewId`, `RoleId`
- `ui/primitives.types.ts` – Button/banner/table/list types
- `workbook.types.ts` – `WorkbookTabInfo`, `WorkbookTableInfo`, `WorkbookOwnershipInfo`
- `telemetry.types.ts` – `AppTelemetryEvent`, `ExcelOperationResult`, `ExcelErrorInfo`

## Office.js Integration

**Pattern:**
```typescript
async ngOnInit() {
  if (!this.excel.isExcel) return;
  const result = await this.excel.upsertQueryTable(query, rows, params);
  if (!result.ok) {
    console.error(result.error.message);
  }
}
```

**Rules:**
- Always gate on `ExcelService.isExcel`
- Prefer `WorkbookService` for workbook operations
- Use `Excel.run(ctx => ...)` with `ctx.sync()` after `load()`
- Keep Office types `any` at boundary, map to strong types internally
