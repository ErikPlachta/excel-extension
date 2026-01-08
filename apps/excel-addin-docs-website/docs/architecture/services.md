---
sidebar_position: 4
title: Service Architecture
---

# Service Architecture

Angular 21 task-pane add-in for Excel. Standalone components, Office.js wrapper, data-driven config.

<!-- SERVICES_START -->
## Services

| Service | Library | Description |
|---------|---------|-------------|
| `AuthApiMockService` | core/auth | Auth API Mock Service |
| `AuthApiService` | core/auth | Auth API Service |
| `AuthService` | core/auth | Authentication Service |
| `JwtHelperService` | core/auth | JWT Helper Service |
| `ExcelService` | core/excel | Angular service that wraps the Office.js Excel APIs. |
| `FormulaScannerService` | core/excel | Scans workbook formulas for table/column dependencies. |
| `WorkbookService` | core/excel | Provides a typed, feature-friendly abstraction over workb... |
| `SettingsService` | core/settings | Settings Service |
| `AppContextService` | core/telemetry | App Context Service |
| `TelemetryService` | core/telemetry | Centralized telemetry service for application operations ... |
| `ApiCatalogService` | data/api | API Catalog Service |
| `ApiConfigService` | data/api | Service for building API URLs. |
| `AppConfigService` | data/api | AppConfig Service |
| `ConfigValidatorService` | data/api | Config Validator Service |
| `OperationsApiMockService` | data/api | Operations API Mock Service |
| `OperationsApiService` | data/api | Operations API Service |
| `QueryApiMockService` | data/api | Mock API service for local development and testing. |
| `QueryValidationService` | data/api | Query Validation Service |
| `QueryConfigurationService` | data/query | Simple local-storage backed store for named query configu... |
| `QueryQueueService` | data/query | Simple in-memory execution queue for `QueryConfigurationI... |
| `QueryStateService` | data/query | Per-query Run checkbox state used for batch execution. |
| `BackupRestoreService` | data/storage | Backup/Restore Service |
| `IndexedDBService` | data/storage | IndexedDB Service |
| `StorageBaseService` | data/storage | Storage Base Service |
| `StorageHelperService` | data/storage | Storage Helper Service |
| `UserKeyedStorageService` | data/storage | User-Keyed Storage Service |
<!-- SERVICES_END -->

## Core Services

### ExcelService (`apps/excel-addin/src/app/core/excel.service.ts`)

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

**Performance Optimizations (Phase 6):**
- `writeRowsInChunks(ctx, table, rows, chunkSize, backoffMs, onChunkWritten?)` – Chunked writes for large datasets
- Configurable chunk size (default 1000 rows) and backoff (default 100ms) via `SettingsService.queryExecution`
- Automatically used by `writeQueryTableData()` to stay within Office.js ~5MB payload limit
- Telemetry for chunk progress and completion

**Formula Management (Phase 8):**
- `setCalculationMode(mode: 'Automatic' | 'Manual')` – Suspend/resume formula recalculation
- `getCalculationMode()` – Get current calculation mode
- `CalculationMode` static constant for mode values
- Returns typed `ExcelOperationResult` with previous/current mode info
- Used by QueriesComponent to disable formulas during query execution
- Setting: `queryExecution.disableFormulasDuringRun` (default: true)

### FormulaScannerService (`apps/excel-addin/src/app/core/formula-scanner.service.ts`) - Phase 9

**Formula dependency detection and impact assessment**

**Core Operations:**
- `scanWorkbook(forceRefresh?)` – Scan all worksheets for formula dependencies (cached 5min)
- `parseTableColumnReferences(formula)` – Extract Table[Column] references from formula string
- `checkQueryImpact(queryId, tableName, columns?)` – Assess query update impact on formulas
- `getTableDependencies()` – Group all dependencies by table name
- `generateReportCsv(dependencies)` – Export dependencies to CSV format
- `clearCache()` – Clear cached scan results

**Structured Reference Parsing:**
- Handles: `Table1[Column]`, `Table1[@Column]`, `Table1[[Column]]`
- Skips: `#Headers`, `#All`, `#Data`, `#Totals` special items
- Supports column names with spaces

**Impact Assessment:**
- Severity levels: `none`, `low` (≤5 refs), `high` (>5 refs)
- Returns `QueryImpactAssessment` with affected formulas and columns
- Non-blocking warning (doesn't prevent query execution)

**Design:**
- Returns `ExcelOperationResult<T>` for all async methods
- Gated by `ExcelService.isExcel`
- 5-minute TTL cache to avoid expensive re-scans
- Injected dependencies: `ExcelService`, `TelemetryService`

**(ExcelService) Design:**
- All methods gated by `isExcel`, return typed results (no throws)
- Office.js types remain `any` at boundary
- Focuses on Office.js API calls, delegates ownership decisions to `WorkbookService`
- Injected dependencies: `TelemetryService`, `SettingsService`

### WorkbookService (`apps/excel-addin/src/app/core/workbook.service.ts`)

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

### AuthService (`apps/excel-addin/src/app/core/auth.service.ts`)

**JWT Authentication & role management (Phase 7)**

**Core State:**
- `isAuthenticated`, `user`, `roles`
- `state$: Observable<AuthState>` – Reactive auth state stream
- `tokens$: Observable<TokenPair | null>` – JWT token changes

**JWT Authentication (Phase 7):**
- `signInWithJwt(email, password, roles)` – Generate mock JWT tokens, update state
- `refreshAccessToken()` – Refresh access token using refresh token
- `getAccessToken()` – Get current access token (null if expired/unauthenticated)
- `isAccessTokenExpiringSoon()` – Check if token expires within threshold
- Auto-refresh timer (checks every 60s, refreshes 5min before expiry)

**Token Configuration (`JWT_CONFIG`):**
- Access token: 15-minute lifetime
- Refresh token: 7-day lifetime
- Refresh threshold: 5 minutes before expiry
- Token check interval: 60 seconds

**Legacy SSO Methods (deprecated):**
- `signInAsAnalyst()`, `signInAsAdmin()`, `signIn()` – Mock SSO flows
- `signOut()` – Clears both JWT tokens and legacy auth state

**Role Management:**
- `hasRole(role)`, `hasAnyRole(roles)`

**Persistence:**
- Uses StorageHelperService for auth state and JWT tokens
- Hydrates from storage on init
- Persists on state changes

### JwtHelperService (`apps/excel-addin/src/app/core/jwt-helper.service.ts`) - Phase 7

**Mock JWT token generation and validation**

**Token Generation:**
- `generateMockTokenPair(email, roles)` – Create access + refresh token pair
- `refreshMockTokenPair(refreshToken)` – Generate new access token from refresh

**Token Validation:**
- `decodeMockToken(token)` – Decode payload from base64url
- `validateToken(token)` – Check signature, structure, and expiration
- `isTokenExpired(token)` – Check if past expiration time
- `isTokenExpiringSoon(token, thresholdMs?)` – Check if within threshold

**Mock Implementation:**
- Uses base64url encoding (not cryptographic signing)
- Deterministic for testing (timestamp-based)
- Production-ready structure (swap encoding for real JWT library)

### SettingsService (`apps/excel-addin/src/app/core/settings.service.ts`)

**App-wide settings**

- `AppSettings.telemetry` → `TelemetrySettings`
- `AppSettings.queryExecution` → `QueryExecutionSettings` **[Phase 6]**
  - `maxRowsPerQuery` (default 10000) – Prevent Excel crashes
  - `chunkSize` (default 1000) – Rows per batch for Excel writes
  - `enableProgressiveLoading` (default true) – Show first chunk immediately
  - `apiPageSize` (default 1000) – API pagination size
  - `chunkBackoffMs` (default 100) – Delay between chunks to avoid throttling
- Console logging, workbook logging, log sheet/table names
- **Uses direct localStorage** (not StorageHelperService to avoid circular dependency with TelemetryService)
- Deep merge for partial updates (telemetry + queryExecution)
- Comprehensive TSDoc coverage

### TelemetryService (`apps/excel-addin/src/app/core/telemetry.service.ts`)

**Centralized logging**

- Console + optional in-workbook table
- Config via `SettingsService` → `TelemetrySettings`
- Enriches events with session ID, host status, auth summary
- `normalizeError()` for Excel operations → `ExcelOperationResult`
- Comprehensive TSDoc coverage

### AppContextService (`apps/excel-addin/src/app/core/app-context.service.ts`)

**Host & auth context**

- `hostStatus` → `{isExcel, isOnline}` (captured at init)
- `getAuthSummary()` → `{isAuthenticated, displayName, roles}` (derived from AuthService)
- Provides centralized context for telemetry enrichment
- Comprehensive TSDoc coverage

### AppConfigService (`apps/excel-addin/src/app/core/app-config.service.ts`) - Phase 2 + Phase 7

**Observable config management with remote loading**

- `config$: Observable<AppConfig>` – Reactive config stream (BehaviorSubject)
- `getConfig()` → `AppConfig` – Synchronous snapshot
- `setConfig(config)` – Replace entire config
- `mergeConfig(partial)` – Shallow merge partial config
- `loadRemoteConfig(url)` → `Promise<boolean>` – HTTP fetch + validate + merge
- `reloadConfig(url)` → `Promise<boolean>` – Hot-reload from remote endpoint

**Features:**
- Validates config via `ConfigValidatorService` before applying
- Deep merges nested structures (apiCatalog, text)
- Falls back to defaults on fetch/validation failure
- Enables hot-reload without app restart
- All services subscribe to `config$` for reactive updates
- **Phase 7:** JWT bearer token authentication for remote config loading
  - Automatically adds `Authorization: Bearer <token>` header when authenticated
  - Uses lazy injection to avoid circular dependency with AuthService

### ConfigValidatorService (`apps/excel-addin/src/app/core/config-validator.service.ts`) - Phase 2

**Config validation**

- `validate(config)` → `ValidationResult` – Check required fields + structure
- `validateOrThrow(config)` – Fail-fast validation

**Validates:**
- Required fields: `defaultViewId`, `navItems`, `roles`, `rootIdsAndClasses`
- NavItems structure: `id`, `labelKey`, `actionType` present
- ApiCatalog structure: `id`, `name`, `parameters[]` present
- Text catalog structure: required sections exist

## API vs Query Architecture (Phase 1)

**Key Distinction:**

- **ApiDefinition** (`libs/shared/types/src/lib/api.types.ts`) = Catalog entry describing available data source
- **QueryInstance** (`libs/shared/types/src/lib/query.types.ts`) = Configured instance with specific parameters + Excel target
- **QueryConfiguration** (`libs/shared/types/src/lib/query-configuration.types.ts`) = Collection of QueryInstances (saved report)

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
- Added `WorkbookService` ownership write methods (`recordOwnership`, `updateOwnership`, `deleteOwnership`)
- Added `ExcelService` low-level helpers (`writeOwnershipRecord`, `deleteOwnershipRecord`)
- Extracted `ExcelService` helper methods (`computeHeaderAndValues`, `writeQueryTableData`)
- Clear service boundary documentation
- 6 new tests added (73 total tests passing)

## Query Services

### ApiCatalogService (`apps/excel-addin/src/app/shared/api-catalog.service.ts`) - Phase 1 + Phase 2

**API catalog management (config-driven)**

- `apis$: Observable<ApiDefinition[]>` – Reactive API stream from config **[Phase 2]**
- `getApis()` → `ApiDefinition[]` – Synchronous snapshot from config **[Phase 2]**
- `getApiById(id)` → `ApiDefinition | undefined` – Lookup by ID
- `getApisByRole(roles)` → `ApiDefinition[]` – Filter by user roles (synchronous)
- `getApisByRole$(roles)` → `Observable<ApiDefinition[]>` – Filter by roles (reactive) **[Phase 2]**

**Phase 2 changes:**
- Loads APIs from `AppConfigService.config$.apiCatalog` instead of hardcoded array
- Reactive updates when config changes (hot-reload support)
- Kept synchronous methods for backward compatibility

### QueryApiMockService (`apps/excel-addin/src/app/shared/query-api-mock.service.ts`)

**API execution (mock implementation)**

- `executeApi(apiId, params)` → `Promise<any[]>` **[Phase 1]**
- `executeQuery(id, params)` → `Promise<{query, rows}>` **[DEPRECATED - use executeApi]**
- `getQueries()`, `getQueryById()` **[DEPRECATED - use ApiCatalogService]**
- **Phase 4:** Integrated IndexedDB caching - checks cache before generating mocks
- **Phase 6:** Enforces `maxRowsPerQuery` limit from `SettingsService.queryExecution`
  - Truncates results exceeding limit
  - Logs warning telemetry with `executeApi:rowLimitExceeded`
- In-process mock data, no HTTP
- Injected `ApiCatalogService` for validation, `IndexedDBService` for caching, `SettingsService`, `TelemetryService`

### QueryStateService (`apps/excel-addin/src/app/shared/query-state.service.ts`)

**Parameters & runs**

- `globalParams` – Shared parameters (StartDate, EndDate, Group, SubGroup)
- `queryParams[queryId]` – Per-query overrides
- `queryRunFlags[queryId]` – Run checkbox state
- `getEffectiveParams(queryId, mode)` – Compute params for execution
- `getLastRun(queryId)` → `QueryRun | null`
- `setLastRun(queryId, run)` – Store location/metadata
- **Phase 4:** Uses `StorageHelperService` instead of direct `localStorage`

### QueryConfigurationService (`apps/excel-addin/src/app/shared/query-configuration.service.ts`)

**Reusable configurations**

- `QueryConfiguration` – Named config with selected queries, parameter snapshots, workbook identity
- `QueryConfigurationItem` – Selected query instance (apiId, params, target sheet/table)
- CRUD operations keyed by user + workbook
- **Phase 1:** Validates apiIds against `ApiCatalogService` on save
- **Phase 4:** Uses `StorageHelperService` + `QueryValidationService` for validation

### QueryQueueService (`apps/excel-addin/src/app/shared/query-queue.service.ts`)

**Sequential execution**

- Runs queries one at a time (prevent resource contention)
- Integrates with telemetry for queue events
- Pagination/resource management

## Storage Services (Phase 4)

### StorageHelperService (`apps/excel-addin/src/app/shared/storage-helper.service.ts`)
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

### IndexedDBService (`apps/excel-addin/src/app/shared/indexeddb.service.ts`)
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

### BackupRestoreService (`apps/excel-addin/src/app/shared/backup-restore.service.ts`)
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

### QueryValidationService (`apps/excel-addin/src/app/shared/query-validation.service.ts`)
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
- Routes in `apps/excel-addin/src/app/core/app.routes.ts` for browser usage
- Nav driven by `AppConfig.navItems` from `libs/data/api/src/lib/app-config.default.ts`

## UI Primitives

`libs/shared/ui/src/lib/`:

- `ButtonComponent` – `variant`, `size`, `iconName`
- `StatusBannerComponent` – `type`, `title`, `message`
- `TableComponent` – `columns: UiTableColumnDef[]`, `rows: T[]`
- `ListComponent` – `items: UiListItem[]`
- `SectionComponent` – `title`, `variant` (default/dense), collapsible
- `CardComponent` – `title`, `subtitle`, `iconName`, `variant`
- `DropdownComponent` – `items: UiDropdownItem[]`, `value`
- `IconComponent` – `name: UiIconName`

## Data-Driven Config

### AppConfig (`libs/data/api/src/lib/app-config.default.ts`) - Phase 2 Enhanced

**Structure-driven shell configuration:**

- `navItems: NavItemConfig[]` – Nav structure, roles, actions
- `defaultViewId` – Initial view
- `rootIdsAndClasses` – DOM IDs/classes for shell elements
- `ui.viewLayout` – Per-view layout hints
- `apiCatalog?: ApiDefinition[]` – Available APIs for queries **[Phase 2]**
- `text?: TextCatalog` – All UI strings **[Phase 2]**

**Phase 2: Text Catalog (`AppConfig.text`)**

Replaced standalone `APP_TEXT` with nested config structure:

- `text.nav` – Nav labels (e.g., "ssoHome", "worksheets")
- `text.auth` – Sign-in/out button text
- `text.query`, `text.worksheet`, `text.table`, `text.user` – Feature-specific text
- `text.hostStatus` – Excel detection messages
- `text.userBanner` – User banner fallback
- `text.role` – Role definitions (analyst, admin)
- `text.ui` – General UI text

**Access:** Components use `AppConfigService.getConfig().text` instead of importing `APP_TEXT`

## Types

`libs/shared/types/src/lib/`:

- `auth.types.ts` – `AuthState`, role types
- `jwt.types.ts` – `TokenPair`, `AccessToken`, `RefreshToken`, `TokenPayload`, `TokenValidationResult`, `JWT_CONFIG` **[Phase 7]**
- `query.types.ts` – `QueryDefinition`, `QueryParameter`, `QueryRun`, `QueryRunLocation`
- `app-config.types.ts` – `AppConfig`, `NavItemConfig`, `RoleDefinition`, `ViewId`, `RoleId`
- `ui/primitives.types.ts` – Button/banner/table/list types
- `workbook.types.ts` – `WorkbookTabInfo`, `WorkbookTableInfo`, `WorkbookOwnershipInfo`
- `telemetry.types.ts` – `AppTelemetryEvent`, `ExcelOperationResult`, `ExcelErrorInfo`, `TelemetryCategory` (includes "formula")
- `formula.types.ts` – `FormulaDependency`, `FormulaScanResult`, `QueryImpactAssessment`, `TableColumnReference` **[Phase 9]**

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
