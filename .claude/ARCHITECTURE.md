# Architecture

Angular 20 task-pane add-in for Excel. Standalone components, Office.js wrapper, data-driven config.

## Core Services

### ExcelService (`src/app/core/excel.service.ts`)
**Low-level Office.js wrapper**

- `isExcel` – Guard for Excel host detection
- `upsertQueryTable(query, rows, params)` – Create/update tables, returns `ExcelOperationResult<QueryRunLocation>`
- `activateQueryLocation(location)` – Navigate to worksheet/table
- `purgeExtensionManagedContent()` – Dev-only reset
- All methods gated by `isExcel`, return typed results (no throws)
- Office.js types remain `any` at boundary

### WorkbookService (`src/app/core/workbook.service.ts`)
**Workbook abstraction & ownership model**

- `getSheets()` → `WorkbookTabInfo[]`
- `getTables()` → `WorkbookTableInfo[]`
- `getTableByName(name)` → `WorkbookTableInfo | null`
- `getOwnership()` → `WorkbookOwnershipInfo[]`
- `isExtensionManagedTable(table)` → `boolean`
- `getManagedTablesForQuery(queryId)` → `WorkbookTableInfo[]`

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
- In-process mock data, no HTTP
- Injected `ApiCatalogService` for validation

### QueryStateService (`src/app/shared/query-state.service.ts`)
**Parameters & runs**

- `globalParams` – Shared parameters (StartDate, EndDate, Group, SubGroup)
- `queryParams[queryId]` – Per-query overrides
- `queryRunFlags[queryId]` – Run checkbox state
- `getEffectiveParams(queryId, mode)` – Compute params for execution
- `getLastRun(queryId)` → `QueryRun | null`
- `setLastRun(queryId, run)` – Store location/metadata
- `localStorage` persistence

### QueryConfigurationService (`src/app/shared/query-configuration.service.ts`)
**Reusable configurations**

- `QueryConfiguration` – Named config with selected queries, parameter snapshots, workbook identity
- `QueryConfigurationItem` – Selected query instance (apiId, params, target sheet/table)
- CRUD operations, `localStorage` keyed by user + workbook
- **Phase 1:** Validates apiIds against `ApiCatalogService` on save

### QueryQueueService (`src/app/shared/query-queue.service.ts`)
**Sequential execution**

- Runs queries one at a time (prevent resource contention)
- Integrates with telemetry for queue events
- Pagination/resource management

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
