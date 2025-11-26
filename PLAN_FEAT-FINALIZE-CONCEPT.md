# Refactoring Plan: Finalize Concept Architecture

**Branch:** `feat/finalize-concept`
**Created:** 2025-11-24
**Status:** Planning Phase

---

## Executive Summary

This plan outlines a sequential, phased approach to refactor the Excel Add-In Angular SPA toward a production-ready, data-driven architecture. The refactor addresses nine critical areas identified through codebase analysis and user requirements:

1. **API/Query Separation** – Split mixed types into API catalog + query configurations
2. **Config-Driven Completion** – Move all content into central configuration system
3. **Excel/Workbook Service Cleanup** – Clear ownership and responsibility boundaries
4. **Query Services Refactor + Storage/Caching Strategy** – Clear boundaries for query services, browser storage investigation, IndexedDB for large datasets, backup/restore functionality
5. **Auth/Settings/Telemetry Refactor** – Clear boundaries for state management services
6. **Performance & Large Datasets** – Handle 10k+ row queries without Excel crashes
7. **JWT Authentication** – Real auth flow with token management (mocked implementation)
8. **Formula Management** – Safe query execution with formula disable/enable
9. **Formula-Column Detection** – Detect breaking changes before query updates

### Current State Snapshot

**Branch:** `feat/add-query-config` (240 files changed, +121k lines)
**TODO Status:** Section 12 (Queries Refactor) Phases 0-4 complete, Phase 5 pending
**Maturity Scores:**

- Data-Driven Config: **80%** (nav, roles, UI config-driven; queries, text still hardcoded, shared ui components no fully used)
- API/Query Separation: **40%** (types mixed, `ApiDefinition` is just alias)
- Excel/Workbook Services: **70%** (good separation, ownership logic misplaced)
- Large Dataset Handling: **40%** (no chunking, memory issues, Excel crashes on 10k+ rows)

### Strategic Approach

**Sequential execution** across nine phases, each in a dedicated sub-branch:

**Core Architecture (Phases 1-2)**

1. **Phase 1:** API/Query Separation (foundation for everything else)
2. **Phase 2:** Config-Driven Completion (enables dynamic content)

**Incremental Service Refactor (Phases 3-5)** 3. **Phase 3:** Excel/Workbook Refactor (Excel/Workbook service boundaries) 4. **Phase 4:** Query Services Refactor + Storage/Caching Strategy (Query\* service boundaries, browser storage investigation, IndexedDB integration, backup/restore) - NEW 5. **Phase 5:** Auth/Settings/Telemetry Refactor (State management service boundaries) - COMPLETED 2025-11-26

**Performance (Phase 6)** ✅ 6. **Phase 6:** Performance Optimization (production-scale data handling) - COMPLETED 2025-11-25

**Advanced Features (Phases 7-9)** ✅ 7. **Phase 7:** JWT Authentication (real auth flow, mocked) - COMPLETED 2025-11-25 8. **Phase 8:** Formula Management (disable/enable during queries) - COMPLETED 2025-11-25 9. **Phase 9:** Formula-Column Detection (detect breaking changes) - COMPLETED 2025-11-25

**Rationale:** API/Query separation unblocks config-driven design. Config completion enables dynamic behavior. Incremental service refactor establishes clear boundaries before performance work. Performance builds on stable foundation. Advanced features add production readiness and safety.

---

## Current State Analysis

### 1. Data-Driven Config Architecture

**Maturity:** 80% (Advanced)

**What's Config-Driven:**

- Navigation items (`app-config.default.ts:19-108`) with role-based access, action types
- User roles (`app-config.default.ts:117-128`) with labels, descriptions
- UI configuration (`app-config.default.ts:129-141`) with per-view layout hints
- Root DOM classes/IDs (`app-config.default.ts:109-116`)

**What's Hardcoded:**

- Query definitions (still in `QueryApiMockService`, not config-loaded)
- Text/messages (separate `app-text.ts`, not unified with config)
- Config loading (has TODOs for validation, remote loading, centralization)

**Architecture:**

- Config defaults: `src/app/shared/app-config.default.ts` (142 lines)
- Config service: `src/app/core/config.services.ts` (62 lines)
- Types: `src/app/types/app-config.types.ts`
- Shell consumption: `AppComponent` fully config-driven via `AppConfigService`

**Strengths:**

- Clear separation: defaults → service → types → consumption
- Easy to swap configs without touching component code
- Nav items include `actionType` for data-driven behavior

**Gaps:**

- Queries not config-loadable (still service-defined)
- Text catalog not merged with config
- No remote config loading
- No config validation layer

---

### 2. API/Query Separation

**Maturity:** 40% (Transitional)

**Problem:** `QueryDefinition` mixes API catalog concerns with execution configuration.

**Current Structure** (`src/app/types/query.types.ts:37-74`):

```typescript
interface QueryDefinition {
  id: string;
  name: string;
  description?: string;
  allowedRoles?: string[]; // ⚠️ API-level concern
  parameters: QueryParameter[]; // ⚠️ API schema
  defaultSheetName: string; // ❌ Execution config, not API
  defaultTableName: string; // ❌ Execution config, not API
  writeMode?: QueryWriteMode; // ❌ Execution behavior
  uiConfig?: QueryUiConfig; // ⚠️ Mixed: catalog display + instance UI
}
```

**Issues:**

- `defaultSheetName`/`defaultTableName` belong to execution, not API definition
- `writeMode` is about how to run query, not what API provides
- `allowedRoles` could be API-level but currently query-bound
- No separation between "what APIs exist" vs "which queries are configured"

**Existing Alias** (`src/app/shared/query-model.ts:14`):

```typescript
export type ApiDefinition = import("../types").QueryDefinition;
```

This is conceptual only – maps 1:1 to `QueryDefinition`, no real separation.

**What Needs to Change:**

**API Definition Should Only Contain:**

- API endpoint/identifier
- Required parameters (schema, types)
- Response schema/columns
- Documentation
- Access control (allowedRoles)

**Query Configuration Should Contain:**

- Reference to API (apiId)
- Parameter values/bindings
- Target sheet/table names
- Write mode (overwrite/append)
- Display overrides

**Services Affected:**

- `QueryApiMockService` (940 lines) – needs split into API catalog vs mock executor
- `QueryStateService` (257 lines) – stores query configs, not API defs
- `QueryConfigurationService` (93 lines) – manages config CRUD, needs API reference
- `QueryHomeComponent` (483 lines) – UI shows mixed catalog + instances

---

### 3. Excel vs Workbook Service Separation

**Maturity:** 70% (Good but needs refinement)

**Current Responsibilities:**

**ExcelService** (`src/app/core/excel.service.ts`, 841 lines):

- Low-level Office.js wrapper
- Methods: `getWorksheets()`, `getTables()`, `getWorkbookTables()`, `getWorkbookOwnership()`
- **Problem:** `upsertQueryTable()` (220+ lines) does ownership lookups directly
- **Problem:** `recordOwnership()` is private, not exposed to WorkbookService

**WorkbookService** (`src/app/core/workbook.service.ts`, 159 lines):

- Feature-friendly workbook abstraction
- Methods: `getSheets()`, `getTables()`, `getTableByName()`, `getOwnership()`
- Methods: `isExtensionManagedTable()`, `getManagedTablesForQuery()`, `getOrCreateManagedTableTarget()`
- **Gap:** No write helpers for ownership (`recordOwnership`, `updateOwnership`, `deleteOwnership`)
- **Gap:** Delegates to ExcelService for reads but can't manage ownership lifecycle

**Overlap Example** (`excel.service.ts:357-370`):

```typescript
// ❌ ExcelService doing ownership lookups directly
const [tables, ownership] = await Promise.all([
  this.getWorkbookTables(),
  this.getWorkbookOwnership(),
]);

const existingManaged = tables.find((t) =>
  ownership.some(
    (o) =>
      o.isManaged && o.queryId === query.id && o.tableName === t.name && o.sheetName === t.worksheet
  )
);
// This logic duplicates WorkbookService.getManagedTableForQuery
```

**What Should Move:**

**ExcelService (Office.js boundary):**

- Wrap Office.js calls (`Excel.run`, context management)
- Low-level CRUD (create sheet, table, write cells)
- Error handling → typed results
- Keep all `any` types contained at boundary

**WorkbookService (feature abstraction):**

- Own ALL ownership logic (read + write)
- Validate table conflicts before Excel operations
- Track table metadata (last modified, row counts)
- Provide transaction-like operations (create + record ownership atomically)
- Expose `recordOwnership()`, `updateOwnership()`, `deleteOwnership()`

**Missing Safeguards:**

- No rollback for partially created tables
- No ownership sync validation
- No error recovery for failed deletes
- _(Deferred to polish phase per user decision)_

---

### 4. Large Dataset Handling

**Maturity:** 40% (Basic Pagination)

**Current Implementation:**

**Problem Query:** `large-dataset` (10k rows × 30 columns = 300k cells)

**Fetch** (`query-api-mock.service.ts:517-565`):

```typescript
// ⚠️ Loads ALL 10k rows into memory before returning
const allData = await Promise.all([
  fetch("https://randomuser.me/api/?results=5000&seed=a"),
  fetch("https://randomuser.me/api/?results=5000&seed=b"),
]);
return allData.flatMap((data) =>
  data.results.map((u) => ({
    /* 30 columns */
  }))
);
```

**Excel Write** (`excel.service.ts:505-517`):

```typescript
// ⚠️ Single call, all rows – exceeds Office.js payload limit
table.rows.add(null, effectiveValues); // 10k rows in one operation
```

**Error Observed:**

```
[Error] RequestPayloadSizeLimitExceeded: The request payload size has exceeded the limit.
```

**Problems:**

1. **No Chunking** – All rows written in single Office.js call (payload limit ~5MB)
2. **Memory Loading** – All rows loaded into memory before write starts
3. **No Resource Limits** – `QueryQueueService.maxRowsPerItem` declared but not enforced
4. **No Throttling** – Parallel API fetches can overwhelm network

**What's Missing:**

**Chunking Strategy** (User selected):

- Chunk Excel writes (1000 rows per batch with `ctx.sync()` between)
- User-configurable limits (max rows per query in Settings)
- Progressive loading (write first 1000 immediately, queue rest)
- API pagination (stream from API to Excel without full memory load)

**Implementation Gaps:**

- No `writeRowsInChunks()` helper in ExcelService
- No `maxRows` enforcement in `executeQuery()` before Excel write
- No memory budget tracking or circuit breaker
- No docs referencing Excel resource limits

**User Note:** Need to review Excel documentation for best practices. May affect approach above.

---

## Gap Analysis

### Critical Gaps (Blocking Production)

1. **API/Query Type Confusion** (Priority: HIGHEST)
   - Cannot build true API catalog without separating types
   - Current alias approach prevents proper configuration management
   - Blocks Phase 2 (config-driven queries)

2. **Excel Crash on Large Queries** (Priority: HIGH)
   - 10k+ row queries fail with payload limit error
   - No chunking/batching in place
   - Memory issues on client side

3. **Ownership Logic Misplaced** (Priority: MEDIUM)
   - ExcelService does ownership lookups instead of delegating
   - WorkbookService has no write helpers
   - Hard to maintain transaction semantics

### Non-Critical Gaps (Polish Phase)

4. **Config System 80% Complete** (Priority: MEDIUM)
   - Queries/text not config-loadable yet
   - No remote config support
   - No validation layer

5. **No Rollback/Safeguards** (Priority: LOW – deferred)
   - Partial operations can leave workbook in bad state
   - No transaction-like guarantees
   - Error recovery is "best effort"

---

## Phase 1: API/Query Separation

**Sub-Branch:** `feat/api-query-separation` (from `feat/finalize-concept`)
**Depends On:** None (foundation phase)
**Estimated Effort:** 3-5 days
**Priority:** HIGHEST (blocks all other phases)

### Goals

1. Create true `ApiDefinition` type (catalog entry)
2. Create `QueryConfiguration` type (execution instance)
3. Split `QueryApiMockService` into API catalog + mock executor
4. Update UI to show API catalog + selected queries
5. Maintain backward compatibility during migration

### Success Criteria

- [ ] All `QueryDefinition` references replaced with `ApiDefinition` or `QueryConfiguration`
- [ ] API catalog browsable in UI (separate from configured queries)
- [ ] Tests pass (unit + integration)
- [ ] `queries-old` component still works (regression check)
- [ ] TSDoc updated for all new types

### Technical Approach

#### 1.1: Define New Types

**Create:** `src/app/types/api.types.ts`

```typescript
/**
 * API Definition - Catalog entry describing a data source endpoint.
 *
 * Represents what the API provides, not how it's used.
 */
export interface ApiDefinition {
  /** Unique API identifier (e.g., "sales-summary-api") */
  id: string;

  /** Display name for API catalog */
  name: string;

  /** Description of what data this API provides */
  description?: string;

  /** Who can access this API */
  allowedRoles?: RoleId[];

  /** Parameters this API requires */
  parameters: ApiParameter[];

  /** Expected response schema (columns, types) */
  responseSchema?: ApiColumnDefinition[];

  /** UI display configuration for catalog */
  catalogUiConfig?: ApiCatalogUiConfig;
}

/**
 * API Parameter - Describes a parameter the API requires.
 */
export interface ApiParameter {
  key: string;
  type: "string" | "number" | "date" | "boolean";
  required: boolean;
  description?: string;
  defaultValue?: any;
}

/**
 * API Column Definition - Describes a column in the API response.
 */
export interface ApiColumnDefinition {
  key: string;
  name: string;
  dataType: "string" | "number" | "date" | "boolean";
  isKey?: boolean;
  isForeignKey?: boolean;
  relatedTo?: string;
  aliases?: string[];
  description?: string;
}
```

**Update:** `src/app/types/query.types.ts`

```typescript
/**
 * Query Configuration - Execution instance of an API.
 *
 * Represents a configured query that uses an API to populate Excel.
 */
export interface QueryConfiguration {
  /** Unique instance identifier */
  id: string;

  /** Reference to API definition */
  apiId: string;

  /** Display name override (defaults to API name) */
  displayName?: string;

  /** Parameter values for this instance */
  parameterValues: Record<string, any>;

  /** Target Excel sheet name */
  targetSheetName: string;

  /** Target Excel table name */
  targetTableName: string;

  /** How to write data (overwrite/append) */
  writeMode: "overwrite" | "append";

  /** Include in batch runs */
  includeInBatch: boolean;

  /** UI configuration for query list */
  uiConfig?: QueryUiConfig;

  /** Metadata */
  createdAt: number;
  modifiedAt: number;
}
```

#### 1.2: Refactor Services

**Create:** `src/app/shared/api-catalog.service.ts`

```typescript
/**
 * API Catalog Service - Manages available API definitions.
 *
 * Provides read-only access to API catalog. In future, can load from remote config.
 */
@Injectable({ providedIn: "root" })
export class ApiCatalogService {
  private apis: ApiDefinition[] = [
    {
      id: "sales-summary-api",
      name: "Sales Summary API",
      description: "Aggregated sales data by region and period",
      allowedRoles: ["analyst", "admin"],
      parameters: [
        { key: "StartDate", type: "date", required: true },
        { key: "EndDate", type: "date", required: true },
        { key: "Group", type: "string", required: false },
      ],
      responseSchema: [
        { key: "region", name: "Region", dataType: "string" },
        { key: "totalSales", name: "Total Sales", dataType: "number" },
        // ...
      ],
    },
    // ... migrate other queries
  ];

  getApis(): ApiDefinition[] {
    return this.apis;
  }

  getApiById(id: string): ApiDefinition | undefined {
    return this.apis.find((a) => a.id === id);
  }

  getApisByRole(roles: RoleId[]): ApiDefinition[] {
    return this.apis.filter(
      (api) => !api.allowedRoles || api.allowedRoles.some((r) => roles.includes(r))
    );
  }
}
```

**Update:** `src/app/shared/query-api-mock.service.ts`

```typescript
/**
 * Query API Mock Service - Executes API calls and returns mock data.
 *
 * Separated from catalog. This service knows how to execute APIs, not define them.
 */
@Injectable({ providedIn: "root" })
export class QueryApiMockService {
  constructor(private apiCatalog: ApiCatalogService) {}

  /**
   * Execute an API with given parameters.
   *
   * @param apiId - API definition ID from catalog
   * @param params - Parameter values
   * @returns Promise of result rows
   */
  async executeApi(apiId: string, params: Record<string, any>): Promise<any[]> {
    const api = this.apiCatalog.getApiById(apiId);
    if (!api) throw new Error(`API not found: ${apiId}`);

    // Existing mock logic, keyed by apiId
    switch (apiId) {
      case "sales-summary-api":
        return this.fetchSalesSummary(params);
      case "top-customers-api":
        return this.fetchTopCustomers(params);
      // ...
      default:
        return [];
    }
  }

  // Existing private fetch methods unchanged
  private async fetchSalesSummary(params: Record<string, any>): Promise<any[]> {
    // ...
  }
}
```

**Update:** `src/app/shared/query-configuration.service.ts`

```typescript
/**
 * Query Configuration Service - CRUD operations on query configs.
 *
 * Now works with QueryConfiguration (instances) instead of QueryDefinition.
 */
@Injectable({ providedIn: "root" })
export class QueryConfigurationService {
  // Update methods to use QueryConfiguration type
  // Add apiId validation against ApiCatalogService

  saveConfiguration(config: QueryConfiguration): void {
    // Validate apiId exists in catalog
    const api = this.apiCatalog.getApiById(config.apiId);
    if (!api) throw new Error(`Invalid apiId: ${config.apiId}`);

    // Save to localStorage
    // ...
  }

  // ... other CRUD methods
}
```

#### 1.3: Update UI

**Update:** `src/app/features/queries/queries.component.ts`

Add two sections:

1. **API Catalog** (browse available APIs, filterable by role)
2. **Selected Queries** (configured instances for this workbook)

```typescript
export class QueriesComponent {
  // API Catalog
  availableApis: ApiDefinition[] = [];

  // Selected Queries (instances)
  selectedQueries: QueryConfiguration[] = [];

  ngOnInit() {
    // Load API catalog
    this.availableApis = this.apiCatalog.getApisByRole(this.auth.roles);

    // Load selected queries for this workbook
    this.selectedQueries = this.queryConfig.getConfigurations();
  }

  addQueryFromApi(api: ApiDefinition) {
    // Show form to create QueryConfiguration from API
    const newQuery: QueryConfiguration = {
      id: crypto.randomUUID(),
      apiId: api.id,
      displayName: api.name,
      parameterValues: this.getDefaultParams(api),
      targetSheetName: `${api.name}_Data`,
      targetTableName: `tbl_${api.id}`,
      writeMode: "overwrite",
      includeInBatch: true,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    };

    this.queryConfig.saveConfiguration(newQuery);
    this.selectedQueries.push(newQuery);
  }

  runQuery(query: QueryConfiguration) {
    const api = this.apiCatalog.getApiById(query.apiId);
    if (!api) return;

    const rows = await this.queryApi.executeApi(api.id, query.parameterValues);
    const result = await this.excel.upsertQueryTable(query, rows, query.parameterValues);
    // ...
  }
}
```

**Template Updates:**

```html
<!-- API Catalog Section -->
<app-section title="Available APIs" variant="default">
  <app-table [columns]="apiColumns" [rows]="availableApis" (rowAction)="handleApiAction($event)">
  </app-table>
</app-section>

<!-- Selected Queries Section -->
<app-section title="Selected Queries" variant="default">
  <app-table
    [columns]="queryColumns"
    [rows]="selectedQueries"
    (rowAction)="handleQueryAction($event)"
  >
  </app-table>
</app-section>
```

### File Changes

**New Files:**

- `src/app/types/api.types.ts` (API definitions, parameters, columns)
- `src/app/shared/api-catalog.service.ts` (API catalog management)
- `src/app/shared/api-catalog.service.spec.ts` (tests)

**Modified Files:**

- `src/app/types/query.types.ts` (update `QueryConfiguration`, deprecate mixed fields)
- `src/app/shared/query-api-mock.service.ts` (rename methods, inject catalog)
- `src/app/shared/query-configuration.service.ts` (use `QueryConfiguration`, validate `apiId`)
- `src/app/shared/query-state.service.ts` (update references)
- `src/app/features/queries/queries.component.ts` (two-section UI)
- `src/app/features/queries/queries.component.html` (catalog + instances)
- `src/app/features/queries/queries.component.spec.ts` (update tests)

**Updated Documentation:**

- `.claude/ARCHITECTURE.md` (add API vs Query distinction)
- `.claude/QUERIES.md` (update with new flow)
- `CONTEXT-SESSION.md` (update query section)

### Testing Strategy

**Unit Tests:**

- `ApiCatalogService.spec.ts` - getApis, getApiById, role filtering
- `QueryApiMockService.spec.ts` - executeApi with valid/invalid apiId
- `QueryConfigurationService.spec.ts` - CRUD with apiId validation
- `QueriesComponent.spec.ts` - addQueryFromApi, runQuery with new types

**Integration Tests:**

- End-to-end: Browse API catalog → Add query → Run → Verify Excel table
- Backward compatibility: `queries-old` component still works

**Manual Tests:**

- Load app in Excel
- Sign in as analyst, verify API catalog shows only allowed APIs
- Add query from API, configure parameters
- Run query, verify table created
- Sign in as admin, verify admin-only APIs visible

### Migration Strategy

**Step 1:** Create new types/services without breaking existing code
**Step 2:** Update one component at a time (start with `queries.component.ts`)
**Step 3:** Run tests after each service update
**Step 4:** Update `.claude/` docs when component is stable
**Step 5:** Mark Phase 1 complete when `queries-old` parity achieved

### Rollback Plan

If Phase 1 causes issues:

- Revert `feat/api-query-separation` branch
- Keep working from `feat/finalize-concept` base
- `queries-old` component provides working baseline

### Exit Criteria

- [ ] `ApiDefinition` type fully defined with TSDoc
- [ ] `QueryConfiguration` type separates execution from catalog
- [ ] `ApiCatalogService` provides catalog access
- [ ] `QueryApiMockService.executeApi()` works with apiId
- [ ] `QueriesComponent` shows two sections (catalog + selected)
- [ ] All unit tests pass (100% for new services)
- [ ] Integration test: Add query from API → Run → Table created
- [ ] `queries-old` still functional (regression safety)
- [ ] Documentation updated (`.claude/ARCHITECTURE.md`, `QUERIES.md`)

---

## Phase 2: Config-Driven Completion

**Sub-Branch:** `feat/config-finalization` (from `feat/finalize-concept`)
**Depends On:** Phase 1 (API/Query separation)
**Estimated Effort:** 2-3 days
**Priority:** HIGH (enables dynamic content)

### Goals

1. Move API definitions into config system (load from config, not hardcoded in service)
2. Unify text catalog with app-config (single source of truth)
3. Add remote config loading capability during auth login API execution (mock right now, but designed as if server exists).
4. Implement config validation layer
5. Make config hot-reloadable (update without restart)

### Success Criteria

- [ ] API catalog loadable from config file/endpoint
- [ ] Text merged into `AppConfig.text` structure
- [ ] Remote config fetching works (with fallback to defaults)
- [ ] Config validation catches malformed configs
- [ ] Zero hardcoded content in services (except defaults loaded in from config)
- [ ] TSDoc updated for config loading

### Technical Approach

#### 2.1: Config-Loadable API Catalog

**Update:** `src/app/shared/app-config.default.ts`

```typescript
export const DEFAULT_APP_CONFIG: AppConfig = {
  // ... existing nav, roles, ui

  /**
   * API Catalog - Defines available data source APIs.
   */
  apiCatalog: [
    {
      id: "sales-summary-api",
      name: "Sales Summary API",
      description: "Aggregated sales data",
      allowedRoles: ["analyst", "admin"],
      parameters: [
        { key: "StartDate", type: "date", required: true },
        { key: "EndDate", type: "date", required: true },
      ],
      responseSchema: [
        { key: "region", name: "Region", dataType: "string" },
        { key: "totalSales", name: "Total Sales", dataType: "number" },
      ],
    },
    // ... all APIs from ApiCatalogService
  ],

  /**
   * Text Catalog - All UI strings.
   */
  text: {
    nav: {
      ssoHome: "SSO Home",
      queries: "Queries",
      // ... merged from app-text.ts
    },
    query: {
      addFromApi: "Add Query",
      run: "Run",
      // ...
    },
    // ...
  },
};
```

**Update:** `src/app/core/config.services.ts`

```typescript
@Injectable({ providedIn: "root" })
export class AppConfigService {
  private config$ = new BehaviorSubject<AppConfig>(DEFAULT_APP_CONFIG);

  constructor(private http: HttpClient) {
    this.loadRemoteConfig();
  }

  /**
   * Load config from remote endpoint with fallback to defaults.
   */
  private async loadRemoteConfig(): Promise<void> {
    try {
      const remoteConfig = await this.http.get<AppConfig>("/api/config").toPromise();

      // Validate config
      const validated = this.validateConfig(remoteConfig);

      // Merge with defaults
      const merged = this.mergeConfigs(DEFAULT_APP_CONFIG, validated);

      this.config$.next(merged);
    } catch (error) {
      console.warn("Failed to load remote config, using defaults", error);
      // Keep DEFAULT_APP_CONFIG
    }
  }

  /**
   * Validate config structure and required fields.
   */
  private validateConfig(config: any): AppConfig {
    // Check required fields
    if (!config.navItems || !Array.isArray(config.navItems)) {
      throw new Error("Invalid config: navItems required");
    }

    if (config.apiCatalog) {
      for (const api of config.apiCatalog) {
        if (!api.id || !api.name) {
          throw new Error(`Invalid API definition: ${JSON.stringify(api)}`);
        }
      }
    }

    return config as AppConfig;
  }

  /**
   * Deep merge remote config over defaults.
   */
  private mergeConfigs(defaults: AppConfig, remote: Partial<AppConfig>): AppConfig {
    // Deep merge logic
    return { ...defaults, ...remote };
  }

  getConfig(): Observable<AppConfig> {
    return this.config$.asObservable();
  }

  reloadConfig(): Promise<void> {
    return this.loadRemoteConfig();
  }
}
```

**Update:** `src/app/shared/api-catalog.service.ts`

```typescript
@Injectable({ providedIn: "root" })
export class ApiCatalogService {
  private apis$ = new BehaviorSubject<ApiDefinition[]>([]);

  constructor(private configService: AppConfigService) {
    // Load APIs from config, not hardcoded
    this.configService.getConfig().subscribe((config) => {
      this.apis$.next(config.apiCatalog || []);
    });
  }

  getApis(): Observable<ApiDefinition[]> {
    return this.apis$.asObservable();
  }

  // ... other methods updated to use observable
}
```

#### 2.2: Unified Text Catalog

**Migrate:** `src/app/shared/app-text.ts` → `src/app/shared/app-config.default.ts`

```typescript
// app-config.default.ts now includes text
export const DEFAULT_APP_CONFIG: AppConfig = {
  // ...
  text: {
    nav: {
      ssoHome: "SSO Home",
      home: "Home",
      queries: "Queries",
      worksheets: "Worksheets",
      tables: "Tables",
      user: "User",
      settings: "Settings",
      signInAnalyst: "Sign in as analyst",
      signInAdmin: "Sign in as admin",
      signOut: "Sign out",
    },
    auth: {
      signedInAs: "Signed in as",
    },
    query: {
      addFromApi: "Add Query from API",
      run: "Run",
      goToTable: "Go to Table",
      details: "Details",
      // ...
    },
    // ... all strings from app-text.ts
  },
};
```

**Delete:** `src/app/shared/app-text.ts` (merged into config)

**Update Components:**

```typescript
// Before
import { APP_TEXT } from '../../shared/app-text';
this.buttonLabel = APP_TEXT.query.run;

// After
constructor(private configService: AppConfigService) {}
ngOnInit() {
  this.configService.getConfig().subscribe(config => {
    this.buttonLabel = config.text.query.run;
  });
}
```

#### 2.3: Config Validation Layer

**Create:** `src/app/core/config-validator.service.ts`

```typescript
@Injectable({ providedIn: "root" })
export class ConfigValidatorService {
  /**
   * Validate AppConfig structure and constraints.
   */
  validate(config: any): ValidationResult {
    const errors: string[] = [];

    // Required fields
    if (!config.navItems) errors.push("navItems is required");
    if (!config.defaultViewId) errors.push("defaultViewId is required");

    // Nav items validation
    if (config.navItems) {
      for (const item of config.navItems) {
        if (!item.id) errors.push(`Nav item missing id: ${JSON.stringify(item)}`);
        if (!item.labelKey) errors.push(`Nav item missing labelKey: ${item.id}`);
        if (!item.viewId && item.actionType === "select-view") {
          errors.push(`Nav item ${item.id} has actionType=select-view but no viewId`);
        }
      }
    }

    // API catalog validation
    if (config.apiCatalog) {
      for (const api of config.apiCatalog) {
        if (!api.id) errors.push(`API missing id: ${JSON.stringify(api)}`);
        if (!api.name) errors.push(`API missing name: ${api.id}`);
        if (api.parameters) {
          for (const param of api.parameters) {
            if (!param.key) errors.push(`API ${api.id} has parameter missing key`);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}
```

### File Changes

**New Files:**

- `src/app/core/config-validator.service.ts` (validation logic)
- `src/app/core/config-validator.service.spec.ts` (tests)

**Modified Files:**

- `src/app/shared/app-config.default.ts` (add `apiCatalog`, `text`)
- `src/app/types/app-config.types.ts` (add `apiCatalog?: ApiDefinition[]`, `text?: TextCatalog`)
- `src/app/core/config.services.ts` (add remote loading, validation, merge)
- `src/app/shared/api-catalog.service.ts` (load from config observable)
- All components using `APP_TEXT` → use `AppConfigService.getConfig()`

**Deleted Files:**

- `src/app/shared/app-text.ts` (merged into config)

**Updated Documentation:**

- `.claude/ARCHITECTURE.md` (add config loading flow)
- `CONTEXT-SESSION.md` (update data-driven section)

### Testing Strategy

**Unit Tests:**

- `ConfigValidatorService.spec.ts` - validate valid/invalid configs
- `AppConfigService.spec.ts` - remote loading, merge, validation
- `ApiCatalogService.spec.ts` - update for observable APIs

**Integration Tests:**

- Mock HTTP config endpoint, verify app loads with remote config
- Invalid config → falls back to defaults
- Config reload (hot-reload) updates API catalog in UI

**Manual Tests:**

- Start app with remote config endpoint
- Modify remote config (add new API), reload, verify new API appears
- Break remote config, verify fallback to defaults

### Exit Criteria

- [ ] API catalog loaded from `AppConfig.apiCatalog`
- [ ] Text catalog merged into `AppConfig.text`
- [ ] `app-text.ts` deleted
- [ ] `ConfigValidatorService` validates configs
- [ ] Remote config loading works with fallback
- [ ] Config hot-reload updates UI
- [ ] All components use `AppConfigService` for text
- [ ] Tests pass (100% for new services)
- [ ] Documentation updated

---

## Phase 3: Excel/Workbook Refactor

**Sub-Branch:** `feat/excel-workbook-cleanup` (from `feat/finalize-concept`)
**Depends On:** Phase 2 (config-driven)
**Estimated Effort:** 2-3 days
**Priority:** MEDIUM (cleanup, not blocking)

### Goals

1. Move ALL ownership logic to `WorkbookService`
2. Extract `upsertQueryTable` complexity into focused helpers
3. Define clear service boundaries (Excel = Office.js, Workbook = state/ownership)
4. Expose ownership write helpers in `WorkbookService`
5. Remove ownership code from `ExcelService`

### Success Criteria

- [ ] `ExcelService` has zero ownership lookups (delegates to `WorkbookService`)
- [ ] `WorkbookService` has `recordOwnership()`, `updateOwnership()`, `deleteOwnership()` methods
- [ ] `upsertQueryTable()` uses `WorkbookService` for all ownership decisions
- [ ] No `getWorkbookOwnership()` calls in `ExcelService` outside read helpers
- [ ] Tests pass (ownership helpers unit tested)
- [ ] TSDoc updated for service boundaries

### Technical Approach

#### 3.1: Expose Ownership Write Helpers

**Update:** `src/app/core/workbook.service.ts`

```typescript
@Injectable({ providedIn: "root" })
export class WorkbookService {
  constructor(private excel: ExcelService) {}

  // ... existing read methods (getSheets, getTables, getOwnership)

  /**
   * Record ownership for a managed table.
   *
   * Creates or updates a row in _Extension_Ownership sheet.
   */
  async recordOwnership(info: {
    queryId: string;
    sheetName: string;
    tableName: string;
  }): Promise<void> {
    const record: WorkbookOwnershipInfo = {
      sheetName: info.sheetName,
      tableName: info.tableName,
      queryId: info.queryId,
      isManaged: true,
      lastTouchedUtc: new Date().toISOString(),
    };

    // Delegate to ExcelService for low-level write
    await this.excel.writeOwnershipRecord(record);
  }

  /**
   * Update ownership last touched time.
   */
  async updateOwnership(queryId: string, sheetName: string, tableName: string): Promise<void> {
    const ownership = await this.getOwnership();
    const existing = ownership.find(
      (o) => o.queryId === queryId && o.sheetName === sheetName && o.tableName === tableName
    );

    if (existing) {
      existing.lastTouchedUtc = new Date().toISOString();
      await this.excel.writeOwnershipRecord(existing);
    }
  }

  /**
   * Delete ownership record.
   */
  async deleteOwnership(queryId: string, sheetName: string, tableName: string): Promise<void> {
    await this.excel.deleteOwnershipRecord(queryId, sheetName, tableName);
  }

  /**
   * Get or create safe target for query, checking ownership and conflicts.
   */
  async getOrCreateManagedTableTarget(query: QueryConfiguration): Promise<{
    sheetName: string;
    tableName: string;
    isNew: boolean;
  }> {
    const tables = await this.getTables();
    const ownership = await this.getOwnership();

    // Check if query already has a managed table
    const existingManaged = tables.find((t) =>
      ownership.some(
        (o) =>
          o.isManaged &&
          o.queryId === query.apiId &&
          o.tableName === t.name &&
          o.sheetName === t.worksheet
      )
    );

    if (existingManaged) {
      return {
        sheetName: existingManaged.worksheet,
        tableName: existingManaged.name,
        isNew: false,
      };
    }

    // Check for user table conflict
    const conflictingTable = tables.find(
      (t) => t.name === query.targetTableName && t.worksheet === query.targetSheetName
    );

    if (conflictingTable) {
      // Create suffixed alternate
      const suffix = `_Query_${query.apiId}`;
      return {
        sheetName: query.targetSheetName,
        tableName: `${query.targetTableName}${suffix}`,
        isNew: true,
      };
    }

    // Use query's target names
    return {
      sheetName: query.targetSheetName,
      tableName: query.targetTableName,
      isNew: true,
    };
  }
}
```

**Update:** `src/app/core/excel.service.ts`

Add low-level write helpers (delegates):

```typescript
/**
 * Write ownership record to _Extension_Ownership sheet.
 *
 * Low-level helper. Callers should use WorkbookService.recordOwnership().
 */
async writeOwnershipRecord(record: WorkbookOwnershipInfo): Promise<void> {
  if (!this.isExcel) return;

  await Excel.run(async (ctx) => {
    const sheet = this.getOrCreateOwnershipSheet(ctx);
    const table = this.getOrCreateOwnershipTable(ctx, sheet);

    // Find existing row or add new
    const rows = table.rows.load('items');
    await ctx.sync();

    const existingIndex = rows.items.findIndex(row =>
      row.values[0][0] === record.sheetName &&
      row.values[0][1] === record.tableName &&
      row.values[0][2] === record.queryId
    );

    const rowData = [
      record.sheetName,
      record.tableName,
      record.queryId,
      record.isManaged.toString(),
      record.lastTouchedUtc,
    ];

    if (existingIndex >= 0) {
      rows.items[existingIndex].values = [rowData];
    } else {
      table.rows.add(null, [rowData]);
    }

    await ctx.sync();
  });
}

/**
 * Delete ownership record from _Extension_Ownership sheet.
 */
async deleteOwnershipRecord(queryId: string, sheetName: string, tableName: string): Promise<void> {
  // Low-level delete logic
}
```

#### 3.2: Refactor `upsertQueryTable`

**Update:** `src/app/core/excel.service.ts`

Extract ownership logic to WorkbookService:

```typescript
async upsertQueryTable(
  query: QueryConfiguration,
  rows: any[],
  params: ExecuteQueryParams
): Promise<ExcelOperationResult<QueryRunLocation>> {
  if (!this.isExcel) {
    return {
      ok: false,
      error: { message: 'Excel not detected', code: 'NO_EXCEL' },
    };
  }

  try {
    // 1. Delegate to WorkbookService for target resolution
    const target = await this.workbook.getOrCreateManagedTableTarget(query);

    // 2. Compute header/values from rows (existing logic, extracted to helper)
    const [effectiveHeader, effectiveValues] = this.computeHeaderAndValues(rows);

    // 3. Low-level Excel write (existing logic, focused)
    const location = await this.writeTableData(
      target.sheetName,
      target.tableName,
      effectiveHeader,
      effectiveValues,
      target.isNew
    );

    // 4. Delegate to WorkbookService for ownership tracking
    if (target.isNew) {
      await this.workbook.recordOwnership({
        queryId: query.apiId,
        sheetName: target.sheetName,
        tableName: target.tableName,
      });
    } else {
      await this.workbook.updateOwnership(
        query.apiId,
        target.sheetName,
        target.tableName
      );
    }

    // 5. Telemetry
    this.telemetry.logEvent({
      category: 'excel',
      name: 'upsertQueryTable:success',
      severity: 'info',
      context: {
        queryId: query.id,
        apiId: query.apiId,
        rowCount: rows.length,
        isNew: target.isNew,
      },
    });

    return {
      ok: true,
      value: location,
    };
  } catch (error) {
    return this.telemetry.normalizeError(error, 'upsertQueryTable', {
      queryId: query.id,
      apiId: query.apiId,
    });
  }
}

/**
 * Compute header and values from rows.
 *
 * Private helper extracted from upsertQueryTable.
 */
private computeHeaderAndValues(rows: any[]): [string[], any[][]] {
  if (rows.length === 0) return [[], []];

  const header = Object.keys(rows[0]);
  const values = rows.map(row => header.map(key => row[key]));

  return [header, values];
}

/**
 * Write table data to Excel.
 *
 * Private helper extracted from upsertQueryTable.
 */
private async writeTableData(
  sheetName: string,
  tableName: string,
  header: string[],
  values: any[][],
  isNew: boolean
): Promise<QueryRunLocation> {
  // Existing Excel.run logic for create/overwrite
  // ...
  return { sheetName, tableName, cellAddress: 'A1' };
}
```

#### 3.3: Remove Ownership Code from ExcelService

**Search and replace:**

- `this.getWorkbookOwnership()` in `ExcelService` → delegate to `WorkbookService.getOwnership()`
- `this.recordOwnership()` private method → remove (now in `WorkbookService`)
- Any ownership filtering logic → move to `WorkbookService` methods

### File Changes

**Modified Files:**

- `src/app/core/workbook.service.ts` (add write helpers, getOrCreateManagedTableTarget)
- `src/app/core/excel.service.ts` (refactor upsertQueryTable, add write delegates, remove ownership code)
- `src/app/core/workbook.service.spec.ts` (test new methods)
- `src/app/core/excel.service.spec.ts` (update for new flow)

**Updated Documentation:**

- `.claude/ARCHITECTURE.md` (update service boundaries)
- `CONTEXT-SESSION.md` (update Excel/Workbook section)

### Testing Strategy

**Unit Tests:**

- `WorkbookService.spec.ts` - recordOwnership, updateOwnership, deleteOwnership, getOrCreateManagedTableTarget
- `ExcelService.spec.ts` - upsertQueryTable delegates to WorkbookService

**Integration Tests:**

- Create query, run, verify ownership recorded in WorkbookService
- Rerun query, verify ownership updated (not duplicated)
- User table conflict, verify suffixed alternate created

**Manual Tests:**

- Run query in Excel, check `_Extension_Ownership` sheet
- Rerun query, verify last touched time updated
- Create user table with conflicting name, run query, verify alternate table created

### Exit Criteria

- [ ] `WorkbookService` has ownership write helpers
- [ ] `ExcelService.upsertQueryTable` delegates to `WorkbookService`
- [ ] No ownership lookups in `ExcelService` outside read helpers
- [ ] `getOrCreateManagedTableTarget` encapsulates conflict resolution
- [ ] Tests pass (100% for ownership helpers)
- [ ] Documentation updated

---

## Phase 4: Query Services Refactor + Storage/Caching Strategy

**Sub-Branch:** `feat/query-services-refactor` (from `feat/finalize-concept`)
**Depends On:** Phase 3 (Excel/Workbook cleanup)
**Estimated Effort:** 3-5 days
**Priority:** HIGH (clear service boundaries + critical storage architecture)

### Goals

1. Review ALL query-related services for responsibility boundaries
2. Ensure each service has single, clear responsibility
3. Extract shared helpers (parameter validation, storage persistence)
4. **Investigate comprehensive storage/caching strategy** (localStorage vs IndexedDB vs Cache API)
5. **Design backup/restore functionality for data persistence**
6. **Evaluate service workers for offline support**
7. **Document Excel Desktop vs Online storage differences**
8. Clear service contracts with comprehensive TSDoc
9. No overlapping concerns between services

### Success Criteria

- [ ] Each query service has single responsibility
- [ ] No shared state management logic
- [ ] Shared helpers extracted (validation, persistence)
- [ ] **Storage strategy evaluated and documented** (localStorage vs IndexedDB vs Cache API)
- [ ] **Excel Desktop vs Online storage differences documented**
- [ ] **Service worker feasibility assessed and documented**
- [ ] **Backup/restore design completed with implementation plan**
- [ ] **StorageHelperService abstraction supports multiple backends**
- [ ] All public methods TSDoc'd with contracts
- [ ] Tests pass (100% for refactored services)
- [ ] Documentation updated with storage architecture

### Services in Scope

**QueryApiMockService** (`src/app/shared/query-api-mock.service.ts`, 940 lines)

- **Current:** Mixed catalog + execution logic
- **Target:** Execution only (API calls, mock data generation)
- **Extract:** Catalog to `ApiCatalogService` (done in Phase 1)

**QueryStateService** (`src/app/shared/query-state.service.ts`, 257 lines)

- **Current:** Parameters, run state, localStorage
- **Target:** Parameter/run state management only
- **Extract:** localStorage to `StorageHelperService`

**QueryConfigurationService** (`src/app/shared/query-configuration.service.ts`, 93 lines)

- **Current:** CRUD on configs, apiId validation, localStorage
- **Target:** CRUD operations only
- **Extract:** Validation to `ConfigValidatorService`, localStorage to `StorageHelperService`

**QueryQueueService** (`src/app/shared/query-queue.service.ts`, 176 lines)

- **Current:** Queue management, execution coordination
- **Target:** Queue/execution coordination only (good as-is, verify no state leakage)

### Technical Approach

#### 4.0: Storage/Caching Strategy Investigation

**Goal:** Evaluate browser storage options and design comprehensive caching strategy to minimize Excel strain and enable offline support.

**Investigation Areas:**

1. **Browser Storage Options Comparison**

| Storage Type       | Max Size                 | Performance                | Offline | Use Case                                             |
| ------------------ | ------------------------ | -------------------------- | ------- | ---------------------------------------------------- |
| **localStorage**   | ~5-10MB                  | Fast sync API              | ✓       | Small key-value (current: user settings, auth state) |
| **IndexedDB**      | ~50MB-1GB+               | Async, fast for large data | ✓       | Large datasets (query results, cached API responses) |
| **Cache API**      | Quota-based (~50MB-1GB+) | Async, optimized for HTTP  | ✓       | API response caching (HTTP-based mock APIs)          |
| **Service Worker** | N/A (uses Cache API)     | N/A                        | ✓       | Offline support, background sync                     |

**Current State:**

- All persistence uses `localStorage` (AuthService, SettingsService, QueryStateService, QueryConfigurationService)
- No large dataset caching
- No offline support
- No backup/restore functionality

**Target State:**

- **localStorage:** User settings, auth tokens, UI state (< 1MB total)
- **IndexedDB:** Query result caching, large datasets (10k+ rows), backup snapshots
- **Cache API:** Mock API response caching (if moving to HTTP-based mocks)
- **Service Worker:** Considered for future offline support (deferred if complex)

2. **Excel Desktop vs Online Storage Differences**

**Action:** Research and document via:

- Office.js documentation review
- Test sideloading in Excel Desktop (macOS/Windows) and Excel Online
- Verify storage persistence across hosts
- Document any quota differences

**Expected Findings:**

- Both hosts run Angular in browser context (Chromium-based for Desktop, browser engine for Online)
- Browser storage APIs (localStorage, IndexedDB) should work identically
- Network connectivity may differ (Desktop = localhost dev server, Online = HTTPS GitHub Pages)
- Service worker support may differ (HTTPS requirement for Online)

**Deliverable:** `.claude/STORAGE-ARCHITECTURE.md` documenting findings

3. **Service Worker Evaluation**

**Feasibility Assessment:**

- **Pros:** Offline support, background sync, cache management
- **Cons:** HTTPS requirement, complexity, debugging difficulty
- **Decision Criteria:**
  - Is offline support critical for MVP? (likely NO for mock data phase)
  - Does HTTPS requirement work with dev sideloading? (investigate)
  - Can defer to post-MVP if adds significant complexity? (likely YES)

**Recommendation:** Document service worker design but defer implementation to Phase 10+ (post-formula features)

4. **Backup/Restore Functionality Design**

**Requirements:**

- Export all app state (configs, parameters, settings) to JSON file
- Import JSON file to restore state
- Automatic backup on critical operations (query runs, config saves)
- Periodic backup reminder (configurable)

**Technical Design:**

```typescript
/**
 * Backup/Restore Service - Export/import app state for data persistence.
 */
@Injectable({ providedIn: "root" })
export class BackupRestoreService {
  constructor(
    private storage: StorageHelperService,
    private telemetry: TelemetryService
  ) {}

  /**
   * Export all app state to downloadable JSON file.
   */
  async exportBackup(): Promise<void> {
    const backup: AppStateBackup = {
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      authState: this.storage.getItem("auth-state", null),
      settings: this.storage.getItem("settings", null),
      queryConfigs: this.storage.getItem("query-configs", []),
      queryState: this.storage.getItem("query-state", null),
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `excel-extension-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    this.telemetry.logEvent({
      category: "backup",
      name: "export-success",
      severity: "info",
      message: "Backup exported successfully",
    });
  }

  /**
   * Import app state from JSON file.
   */
  async importBackup(file: File): Promise<void> {
    const text = await file.text();
    const backup: AppStateBackup = JSON.parse(text);

    // Validate version compatibility
    if (!this.isCompatibleVersion(backup.version)) {
      throw new Error(`Incompatible backup version: ${backup.version}`);
    }

    // Restore state to localStorage
    if (backup.authState) this.storage.setItem("auth-state", backup.authState);
    if (backup.settings) this.storage.setItem("settings", backup.settings);
    if (backup.queryConfigs) this.storage.setItem("query-configs", backup.queryConfigs);
    if (backup.queryState) this.storage.setItem("query-state", backup.queryState);

    this.telemetry.logEvent({
      category: "backup",
      name: "import-success",
      severity: "info",
      message: "Backup restored successfully",
    });

    // Reload app to apply restored state
    window.location.reload();
  }

  private isCompatibleVersion(version: string): boolean {
    // Semantic versioning compatibility check
    const [major] = version.split(".");
    return major === "1";
  }
}

export interface AppStateBackup {
  version: string;
  timestamp: string;
  authState: any;
  settings: any;
  queryConfigs: any[];
  queryState: any;
}
```

**UI Integration:**

- Add "Backup/Restore" section in User/Settings view
- Export button triggers download
- Import file picker triggers restore with confirmation dialog
- Show last backup timestamp
- Periodic backup reminder (default: weekly, configurable)

5. **IndexedDB Integration for Large Datasets**

**Use Case:** Cache query results (10k+ rows) to reduce API calls and enable offline review

**Technical Design:**

```typescript
/**
 * IndexedDB Service - Large dataset storage for query result caching.
 */
@Injectable({ providedIn: "root" })
export class IndexedDBService {
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = "ExcelExtensionDB";
  private readonly DB_VERSION = 1;
  private readonly STORE_NAME = "queryResults";

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, { keyPath: "id" });
          store.createIndex("queryId", "queryId", { unique: false });
          store.createIndex("timestamp", "timestamp", { unique: false });
        }
      };
    });
  }

  async cacheQueryResult(
    queryId: string,
    rows: any[],
    expiresIn: number = 3600000 // 1 hour default
  ): Promise<void> {
    if (!this.db) await this.init();

    const record: QueryResultCache = {
      id: `${queryId}-${Date.now()}`,
      queryId,
      rows,
      timestamp: Date.now(),
      expiresAt: Date.now() + expiresIn,
    };

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([this.STORE_NAME], "readwrite");
      const store = tx.objectStore(this.STORE_NAME);
      const request = store.put(record);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getCachedQueryResult(queryId: string): Promise<any[] | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([this.STORE_NAME], "readonly");
      const store = tx.objectStore(this.STORE_NAME);
      const index = store.index("queryId");
      const request = index.getAll(queryId);

      request.onsuccess = () => {
        const results = request.result as QueryResultCache[];
        if (!results.length) {
          resolve(null);
          return;
        }

        // Get most recent non-expired result
        const validResults = results
          .filter((r) => r.expiresAt > Date.now())
          .sort((a, b) => b.timestamp - a.timestamp);

        resolve(validResults.length > 0 ? validResults[0].rows : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async clearExpiredCache(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([this.STORE_NAME], "readwrite");
      const store = tx.objectStore(this.STORE_NAME);
      const index = store.index("timestamp");
      const request = index.openCursor();

      request.onsuccess = (event: any) => {
        const cursor = event.target.result;
        if (cursor) {
          const record = cursor.value as QueryResultCache;
          if (record.expiresAt < Date.now()) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }
}

interface QueryResultCache {
  id: string;
  queryId: string;
  rows: any[];
  timestamp: number;
  expiresAt: number;
}
```

**Integration Points:**

- QueryApiMockService checks IndexedDB cache before generating mock data
- QueryQueueService caches results after successful runs
- Settings: cache TTL configurable (default: 1 hour)
- Periodic cleanup job on app init

#### 4.1: Extract Storage Helpers with Multi-Backend Support

**Create:** `src/app/shared/storage-helper.service.ts`

```typescript
/**
 * Storage Helper Service - Centralized storage operations with multi-backend support.
 *
 * Provides abstraction over localStorage (small data) and IndexedDB (large data).
 * All services should use this instead of direct storage access.
 */
@Injectable({ providedIn: "root" })
export class StorageHelperService {
  constructor(
    private indexedDB: IndexedDBService,
    private telemetry: TelemetryService
  ) {}

  /**
   * Get item from localStorage with type safety.
   * Use for small data (< 100KB): settings, auth tokens, UI state.
   */
  getItem<T>(key: string, defaultValue: T): T {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;

    try {
      return JSON.parse(item) as T;
    } catch (error) {
      this.telemetry.logEvent({
        category: "storage",
        name: "parse-error",
        severity: "error",
        message: `Failed to parse storage key: ${key}`,
        context: { error },
      });
      return defaultValue;
    }
  }

  /**
   * Set item in localStorage with type safety.
   * Use for small data (< 100KB): settings, auth tokens, UI state.
   */
  setItem<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      this.telemetry.logEvent({
        category: "storage",
        name: "write-error",
        severity: "error",
        message: `Failed to write storage key: ${key}`,
        context: { error },
      });
    }
  }

  /**
   * Get item from IndexedDB for large datasets.
   * Use for large data (> 100KB): query results, cached API responses.
   */
  async getLargeItem<T>(key: string): Promise<T | null> {
    try {
      return await this.indexedDB.getCachedQueryResult(key);
    } catch (error) {
      this.telemetry.logEvent({
        category: "storage",
        name: "indexeddb-read-error",
        severity: "error",
        message: `Failed to read from IndexedDB: ${key}`,
        context: { error },
      });
      return null;
    }
  }

  /**
   * Set item in IndexedDB for large datasets.
   * Use for large data (> 100KB): query results, cached API responses.
   */
  async setLargeItem<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      await this.indexedDB.cacheQueryResult(key, value as any, ttl);
    } catch (error) {
      this.telemetry.logEvent({
        category: "storage",
        name: "indexeddb-write-error",
        severity: "error",
        message: `Failed to write to IndexedDB: ${key}`,
        context: { error },
      });
    }
  }

  /**
   * Remove item from localStorage.
   */
  removeItem(key: string): void {
    localStorage.removeItem(key);
  }

  /**
   * Clear all localStorage (use cautiously).
   */
  clear(): void {
    localStorage.clear();
  }

  /**
   * Clear expired IndexedDB cache.
   */
  async clearExpiredCache(): Promise<void> {
    try {
      await this.indexedDB.clearExpiredCache();
    } catch (error) {
      this.telemetry.logEvent({
        category: "storage",
        name: "cache-cleanup-error",
        severity: "error",
        message: "Failed to clear expired cache",
        context: { error },
      });
    }
  }
}
```

#### 4.2: Refactor QueryStateService

**Update:** `src/app/shared/query-state.service.ts`

```typescript
@Injectable({ providedIn: "root" })
export class QueryStateService {
  constructor(
    private storage: StorageHelperService,
    private telemetry: TelemetryService
  ) {
    this.hydrate();
  }

  /**
   * Hydrate state from storage on init.
   */
  private hydrate(): void {
    const snapshot = this.storage.getItem<QueryStateSnapshot>(
      "query-state",
      this.getDefaultSnapshot()
    );
    this.state$.next(snapshot);
  }

  /**
   * Persist state to storage on change.
   */
  private persist(): void {
    this.storage.setItem("query-state", this.state$.value);
  }

  // ... rest of service uses storage helper
}
```

#### 4.3: Extract Validation Helpers

**Create:** `src/app/shared/query-validation.service.ts`

```typescript
/**
 * Query Validation Service - Validate query configurations and parameters.
 */
@Injectable({ providedIn: "root" })
export class QueryValidationService {
  /**
   * Validate QueryConfiguration against ApiDefinition.
   */
  validateConfiguration(config: QueryConfiguration, api: ApiDefinition): ValidationResult {
    const errors: string[] = [];

    // Validate apiId exists
    if (!api) {
      errors.push(`API not found: ${config.apiId}`);
      return { valid: false, errors };
    }

    // Validate required parameters
    for (const param of api.parameters) {
      if (param.required && !config.parameterValues[param.key]) {
        errors.push(`Missing required parameter: ${param.key}`);
      }
    }

    // Validate parameter types
    // ... type checking logic

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
```

#### 4.4: Update QueryConfigurationService

**Update:** `src/app/shared/query-configuration.service.ts`

```typescript
@Injectable({ providedIn: "root" })
export class QueryConfigurationService {
  constructor(
    private storage: StorageHelperService,
    private apiCatalog: ApiCatalogService,
    private validation: QueryValidationService
  ) {}

  saveConfiguration(config: QueryConfiguration): void {
    // Validate using validation service
    const api = this.apiCatalog.getApiById(config.apiId);
    const validationResult = this.validation.validateConfiguration(config, api);

    if (!validationResult.valid) {
      throw new Error(`Invalid configuration: ${validationResult.errors.join(", ")}`);
    }

    // Use storage helper
    const configs = this.storage.getItem<QueryConfiguration[]>("query-configs", []);
    const index = configs.findIndex((c) => c.id === config.id);

    if (index >= 0) {
      configs[index] = config;
    } else {
      configs.push(config);
    }

    this.storage.setItem("query-configs", configs);
  }

  // ... other CRUD methods use storage helper
}
```

### File Changes

**New Files:**

- `src/app/shared/storage-helper.service.ts` (multi-backend storage abstraction)
- `src/app/shared/storage-helper.service.spec.ts` (tests)
- `src/app/shared/indexeddb.service.ts` (IndexedDB wrapper for large datasets)
- `src/app/shared/indexeddb.service.spec.ts` (tests)
- `src/app/shared/backup-restore.service.ts` (export/import app state)
- `src/app/shared/backup-restore.service.spec.ts` (tests)
- `src/app/shared/query-validation.service.ts` (validation logic)
- `src/app/shared/query-validation.service.spec.ts` (tests)

**Modified Files:**

- `src/app/shared/query-state.service.ts` (use storage helper)
- `src/app/shared/query-configuration.service.ts` (use storage + validation helpers)
- `src/app/shared/query-api-mock.service.ts` (check IndexedDB cache before generating mocks)
- `src/app/shared/query-queue.service.ts` (cache results to IndexedDB after runs)
- `src/app/features/user/user.component.html` (add Backup/Restore UI)
- `src/app/features/user/user.component.ts` (integrate BackupRestoreService)
- `src/app/core/app.component.ts` (call clearExpiredCache on init)
- All specs for updated services

**Updated Documentation:**

- `.claude/ARCHITECTURE.md` (add service responsibilities section)
- `.claude/STORAGE-ARCHITECTURE.md` (NEW - storage strategy, Excel host differences)
- `CONTEXT-SESSION.md` (update query services section)

### Testing Strategy

**Unit Tests:**

- `StorageHelperService.spec.ts` - getItem, setItem, getLargeItem, setLargeItem, error handling
- `IndexedDBService.spec.ts` - init, cacheQueryResult, getCachedQueryResult, clearExpiredCache, TTL expiration
- `BackupRestoreService.spec.ts` - exportBackup (download triggered), importBackup (state restored), version compatibility
- `QueryValidationService.spec.ts` - validate configs with missing/invalid params
- `QueryStateService.spec.ts` - verify uses storage helper correctly
- `QueryConfigurationService.spec.ts` - verify uses validation helper

**Integration Tests:**

- Save config → reload page → verify config persists (localStorage)
- Cache large query result → getCachedQueryResult → verify returned (IndexedDB)
- Cache query result with TTL → wait for expiration → clearExpiredCache → verify removed
- Export backup → import backup → verify state restored
- Invalid config → verify validation errors surfaced
- Storage full → verify error handling

**Manual Verification:**

- Sideload in Excel Desktop → verify localStorage persistence across sessions
- Sideload in Excel Online → verify IndexedDB persistence across sessions
- Document any quota or behavior differences in `.claude/STORAGE-ARCHITECTURE.md`

### Exit Criteria

- [ ] `StorageHelperService` created and tested (multi-backend support)
- [ ] `IndexedDBService` created and tested
- [ ] `BackupRestoreService` created and tested
- [ ] `QueryValidationService` created and tested
- [ ] All query services use storage helper (no direct localStorage)
- [ ] All config operations validate via validation service
- [ ] Storage strategy evaluated and documented (localStorage vs IndexedDB vs Cache API)
- [ ] Excel Desktop vs Online storage differences documented in `.claude/STORAGE-ARCHITECTURE.md`
- [ ] Service worker feasibility assessed and documented
- [ ] Backup/Restore UI added to User/Settings view
- [ ] Query result caching integrated (check IndexedDB before mock generation)
- [ ] Expired cache cleanup on app init
- [ ] Each service has single, documented responsibility
- [ ] Tests pass (100% for helpers + updated services)
- [ ] Documentation updated

---

## Phase 5: Auth/Settings/Telemetry Refactor

**Sub-Branch:** `feat/auth-settings-telemetry-refactor` (from `feat/finalize-concept`)
**Depends On:** Phase 4 (Query services refactor)
**Estimated Effort:** 2-3 days
**Priority:** MEDIUM (clear service boundaries)
**Status:** ✅ COMPLETED (2025-11-26)

**Completion Notes:**

- Created `StorageBaseService` (zero-dependency localStorage wrapper) to break circular dependency
- Dependency cycle was: TelemetryService → SettingsService → StorageHelperService → TelemetryService
- Solution: SettingsService uses StorageBaseService (no telemetry), others use StorageHelperService
- StorageHelperService now delegates to StorageBaseService for localStorage operations
- All 451 tests passing, build successful

### Goals

1. Separate state management from business logic
2. Extract shared localStorage persistence
3. Clear service contracts with TSDoc
4. No overlapping concerns

### Success Criteria

- [ ] Each service has single responsibility
- [ ] All use `StorageHelperService` (from Phase 4)
- [ ] All public methods TSDoc'd
- [ ] Tests pass (100% for refactored services)
- [ ] Documentation updated

### Services in Scope

**AuthService** (`src/app/core/auth.service.ts`)

- **Current:** Auth state, SSO mock, role checks, localStorage
- **Target:** Auth state management + role checks only
- **Extract:** localStorage to `StorageHelperService`

**SettingsService** (`src/app/core/settings.service.ts`)

- **Current:** Settings CRUD, defaults merge, localStorage
- **Target:** Settings state management only
- **Extract:** localStorage to `StorageHelperService`, validation to helper

**TelemetryService** (`src/app/core/telemetry.service.ts`)

- **Current:** Logging, workbook writes, error normalization, enrichment
- **Target:** Logging + enrichment only
- **Extract:** Workbook writes remain (Excel-specific, OK here)

**AppContextService** (`src/app/core/app-context.service.ts`)

- **Current:** Host status aggregation, auth summary
- **Target:** Context aggregation only (good as-is)

### Technical Approach

#### 5.1: Refactor AuthService

**Update:** `src/app/core/auth.service.ts`

```typescript
@Injectable({ providedIn: "root" })
export class AuthService {
  private authState$ = new BehaviorSubject<AuthState>({
    isAuthenticated: false,
    user: null,
    roles: [],
  });

  constructor(
    private storage: StorageHelperService,
    private telemetry: TelemetryService
  ) {
    this.hydrate();
  }

  /**
   * Hydrate auth state from storage.
   */
  private hydrate(): void {
    const state = this.storage.getItem<AuthState>("auth-state", {
      isAuthenticated: false,
      user: null,
      roles: [],
    });
    this.authState$.next(state);
  }

  /**
   * Persist auth state to storage.
   */
  private persist(): void {
    this.storage.setItem("auth-state", this.authState$.value);
  }

  // ... role check methods (no changes needed)
}
```

#### 5.2: Refactor SettingsService

**Update:** `src/app/core/settings.service.ts`

```typescript
@Injectable({ providedIn: "root" })
export class SettingsService {
  constructor(
    private storage: StorageHelperService,
    private validation: ConfigValidatorService
  ) {
    this.hydrate();
  }

  /**
   * Hydrate settings from storage with defaults merge.
   */
  private hydrate(): void {
    const stored = this.storage.getItem<Partial<AppSettings>>("app-settings", {});
    const merged = this.mergeWithDefaults(this.getDefaultSettings(), stored);

    // Validate merged settings
    const validationResult = this.validation.validateSettings(merged);
    if (!validationResult.valid) {
      console.warn("Invalid settings, using defaults", validationResult.errors);
      this.settings$.next(this.getDefaultSettings());
    } else {
      this.settings$.next(merged);
    }
  }

  // ... rest uses storage helper
}
```

### File Changes

**Modified Files:**

- `src/app/core/auth.service.ts` (use storage helper)
- `src/app/core/settings.service.ts` (use storage + validation helpers)
- `src/app/core/telemetry.service.ts` (verify responsibility, extract if needed)
- `src/app/core/app-context.service.ts` (verify aggregation-only)
- All specs for updated services

**Updated Documentation:**

- `.claude/ARCHITECTURE.md` (update service responsibilities)
- `CONTEXT-SESSION.md` (update state management section)

### Testing Strategy

**Unit Tests:**

- `AuthService.spec.ts` - verify uses storage helper
- `SettingsService.spec.ts` - verify validation + storage
- `TelemetryService.spec.ts` - verify no state leakage

**Integration Tests:**

- Sign in → reload → verify auth persists
- Change settings → reload → verify settings persist

### Exit Criteria

- [ ] All services use `StorageHelperService`
- [ ] Settings validation via `ConfigValidatorService`
- [ ] Each service has single, documented responsibility
- [ ] Tests pass (100%)
- [ ] Documentation updated

---

## Phase 6: Performance & Large Datasets

**Sub-Branch:** `feat/performance-large-datasets` (from `feat/finalize-concept`)
**Depends On:** Phase 5 (Auth/Settings/Telemetry refactor)
**Estimated Effort:** 3-4 days
**Priority:** MEDIUM (production-scale requirement)
**Status:** ✅ COMPLETED (2025-11-25)

**Completion Notes:**

- Implemented chunked Excel writes with configurable settings (default 1000 rows, 100ms backoff)
- Enforced row limits in QueryApiMockService with telemetry warnings
- Added Settings UI for Query Execution configuration (maxRows, chunkSize, progressive loading)
- Created comprehensive PERFORMANCE.md documentation
- Updated all architecture documentation
- All tests passing (184/184), build successful

### Goals

1. Implement chunked Excel writes (1000 rows per batch)
2. Add user-configurable row limits in Settings
3. Implement progressive loading (first 1000 immediate, rest queued)
4. Add API pagination support (stream data to Excel)
5. Review and document Excel resource limits
6. Add memory budget tracking

### Success Criteria

- [ ] 100k row queries succeed without Excel crashes
- [ ] User can set max rows per query in Settings
- [ ] Progressive loading shows partial results immediately
- [ ] API pagination reduces memory footprint
- [ ] Documentation references Microsoft Excel resource limits
- [ ] Telemetry tracks chunk writes and memory usage
- [ ] Tests verify chunking logic

### Technical Approach

#### 4.1: Chunked Excel Writes

**Update:** `src/app/core/excel.service.ts`

```typescript
/**
 * Write table rows in chunks to avoid Excel payload limits.
 *
 * @param table - Excel table object
 * @param rows - All rows to write
 * @param chunkSize - Rows per batch (default 1000)
 * @param onChunkWritten - Optional callback for progress tracking
 */
private async writeRowsInChunks(
  ctx: Excel.RequestContext,
  table: Excel.Table,
  rows: any[][],
  chunkSize: number = 1000,
  onChunkWritten?: (chunkIndex: number, totalChunks: number) => void
): Promise<void> {
  const totalChunks = Math.ceil(rows.length / chunkSize);

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);

    // Write chunk
    table.rows.add(null, chunk);
    await ctx.sync();

    // Telemetry
    this.telemetry.logEvent({
      category: 'excel',
      name: 'writeRowsInChunks:chunk',
      severity: 'debug',
      context: {
        chunkIndex: Math.floor(i / chunkSize),
        totalChunks,
        chunkSize: chunk.length,
      },
    });

    // Optional progress callback
    if (onChunkWritten) {
      onChunkWritten(Math.floor(i / chunkSize), totalChunks);
    }

    // Optional: backoff between chunks (100ms)
    await this.sleep(100);
  }
}

/**
 * Sleep helper for throttling.
 */
private sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

**Update:** `writeTableData` in `ExcelService`

```typescript
private async writeTableData(
  sheetName: string,
  tableName: string,
  header: string[],
  values: any[][],
  isNew: boolean
): Promise<QueryRunLocation> {
  return await Excel.run(async (ctx) => {
    const sheet = this.getOrCreateWorksheet(ctx, sheetName);
    const table = isNew
      ? this.createTable(ctx, sheet, tableName, header)
      : this.getTable(ctx, sheet, tableName);

    if (isNew) {
      // Write header (always small, single call OK)
      const headerRange = table.getHeaderRowRange();
      headerRange.values = [header];
      await ctx.sync();
    }

    // Write data in chunks
    await this.writeRowsInChunks(ctx, table, values, 1000, (chunk, total) => {
      // Progress telemetry
      this.telemetry.logEvent({
        category: 'excel',
        name: 'writeTableData:progress',
        severity: 'debug',
        context: { chunk, total },
      });
    });

    return { sheetName, tableName, cellAddress: 'A1' };
  });
}
```

#### 4.2: User-Configurable Row Limits

**Update:** `src/app/types/settings.types.ts`

```typescript
export interface AppSettings {
  telemetry: TelemetrySettings;

  /**
   * Query execution settings.
   */
  queryExecution?: QueryExecutionSettings;
}

export interface QueryExecutionSettings {
  /** Max rows per query (default 10000) */
  maxRowsPerQuery: number;

  /** Chunk size for Excel writes (default 1000) */
  chunkSize: number;

  /** Enable progressive loading (default true) */
  enableProgressiveLoading: boolean;

  /** API pagination page size (default 1000) */
  apiPageSize: number;
}
```

**Update:** `src/app/core/settings.service.ts`

```typescript
private getDefaultSettings(): AppSettings {
  return {
    telemetry: { /* ... */ },
    queryExecution: {
      maxRowsPerQuery: 10000,
      chunkSize: 1000,
      enableProgressiveLoading: true,
      apiPageSize: 1000,
    },
  };
}
```

**Update:** `src/app/features/settings/settings.component.ts`

Add section:

```html
<app-section title="Query Execution" variant="default">
  <label>
    Max rows per query:
    <input type="number" [(ngModel)]="settings.queryExecution.maxRowsPerQuery" />
  </label>

  <label>
    Chunk size (Excel writes):
    <input type="number" [(ngModel)]="settings.queryExecution.chunkSize" />
  </label>

  <label>
    <input type="checkbox" [(ngModel)]="settings.queryExecution.enableProgressiveLoading" />
    Enable progressive loading
  </label>

  <button (click)="saveSettings()">Save</button>
</app-section>
```

**Update:** `src/app/shared/query-api-mock.service.ts`

Enforce limit before returning rows:

```typescript
async executeApi(apiId: string, params: Record<string, any>): Promise<any[]> {
  const maxRows = this.settings.getSettings().queryExecution?.maxRowsPerQuery || 10000;

  const rows = await this.fetchApiData(apiId, params);

  if (rows.length > maxRows) {
    this.telemetry.logEvent({
      category: 'query',
      name: 'executeApi:rowLimitExceeded',
      severity: 'warn',
      context: {
        apiId,
        rowCount: rows.length,
        maxRows,
      },
    });

    return rows.slice(0, maxRows);  // Truncate
  }

  return rows;
}
```

#### 4.3: Progressive Loading

**Update:** `src/app/features/queries/queries.component.ts`

```typescript
async runQuery(query: QueryConfiguration) {
  const settings = this.settings.getSettings().queryExecution;
  const enableProgressive = settings?.enableProgressiveLoading ?? true;
  const chunkSize = settings?.chunkSize ?? 1000;

  // Fetch data
  const rows = await this.queryApi.executeApi(query.apiId, query.parameterValues);

  if (!enableProgressive || rows.length <= chunkSize) {
    // Write all at once (small dataset)
    const result = await this.excel.upsertQueryTable(query, rows, query.parameterValues);
    this.handleQueryResult(query, result, rows.length);
    return;
  }

  // Progressive: write first chunk immediately
  const firstChunk = rows.slice(0, chunkSize);
  const result = await this.excel.upsertQueryTable(query, firstChunk, query.parameterValues);

  if (result.ok) {
    // Show partial results in UI
    this.showPartialResults(query, firstChunk.length, rows.length);

    // Queue remaining chunks
    const remainingRows = rows.slice(chunkSize);
    this.queueRemainingRows(query, remainingRows, result.value);
  } else {
    this.handleQueryResult(query, result, 0);
  }
}

/**
 * Queue remaining rows for background write.
 */
private queueRemainingRows(
  query: QueryConfiguration,
  rows: any[],
  location: QueryRunLocation
): void {
  // Use QueryQueueService to append rows in background
  this.queryQueue.enqueue({
    queryId: query.id,
    apiId: query.apiId,
    rows,
    location,
    mode: 'append',  // Append to existing table
  });
}

/**
 * Show UI feedback for partial results.
 */
private showPartialResults(query: QueryConfiguration, loaded: number, total: number): void {
  const message = `Loaded ${loaded} of ${total} rows. Remaining rows queued.`;
  // Show banner or toast
  this.telemetry.logEvent({
    category: 'query',
    name: 'runQuery:progressiveLoading',
    severity: 'info',
    context: { queryId: query.id, loaded, total },
  });
}
```

#### 4.4: API Pagination

**Update:** `src/app/shared/query-api-mock.service.ts`

Add pagination support for large datasets:

```typescript
/**
 * Execute API with pagination support.
 *
 * Streams pages from API and yields them incrementally.
 */
async *executeApiPaginated(
  apiId: string,
  params: Record<string, any>,
  pageSize: number = 1000
): AsyncGenerator<any[], void, unknown> {
  const settings = this.settings.getSettings().queryExecution;
  const maxRows = settings?.maxRowsPerQuery || 10000;
  let totalFetched = 0;

  // Mock pagination (replace with real API pagination)
  const allRows = await this.fetchApiData(apiId, params);

  for (let offset = 0; offset < allRows.length; offset += pageSize) {
    if (totalFetched >= maxRows) {
      this.telemetry.logEvent({
        category: 'query',
        name: 'executeApiPaginated:maxRowsReached',
        severity: 'warn',
        context: { apiId, totalFetched, maxRows },
      });
      break;
    }

    const page = allRows.slice(offset, offset + pageSize);
    totalFetched += page.length;

    yield page;
  }
}
```

**Update:** `QueriesComponent` to use paginated API:

```typescript
async runQueryPaginated(query: QueryConfiguration) {
  const settings = this.settings.getSettings().queryExecution;
  const pageSize = settings?.apiPageSize ?? 1000;

  let isFirstPage = true;
  let location: QueryRunLocation | null = null;

  for await (const page of this.queryApi.executeApiPaginated(query.apiId, query.parameterValues, pageSize)) {
    if (isFirstPage) {
      // Create table with first page
      const result = await this.excel.upsertQueryTable(query, page, query.parameterValues);
      if (!result.ok) {
        this.handleQueryResult(query, result, 0);
        return;
      }
      location = result.value;
      isFirstPage = false;
    } else {
      // Append subsequent pages
      await this.excel.appendRowsToTable(location!, page);
    }

    // Progress telemetry
    this.telemetry.logEvent({
      category: 'query',
      name: 'runQueryPaginated:pageWritten',
      severity: 'debug',
      context: { queryId: query.id, pageSize: page.length },
    });
  }
}
```

#### 4.5: Excel Resource Limits Documentation

**Create:** `.claude/PERFORMANCE.md`

```markdown
# Performance & Large Datasets

## Excel Resource Limits

**Reference:** [Microsoft Docs - Resource limits and performance optimization](https://learn.microsoft.com/en-us/office/dev/add-ins/concepts/resource-limits-and-performance-optimization#excel-add-ins)

### Key Limits

- **Payload Size:** ~5MB per Office.js call
- **Cell Count:** ~1 million cells per operation (recommendation)
- **Memory:** Proxy objects accumulate, use `context.trackedObjects.remove()` to untrack
- **Concurrent Requests:** Limit to 1-2 concurrent Excel.run() calls

### Recommended Strategies

1. **Chunk Large Writes**
   - Break data into 1000-row batches
   - Call `context.sync()` between batches
   - Add backoff (100ms) between chunks

2. **Untrack Proxy Objects**
   - After reading table rows, call `table.untrack()` or `context.trackedObjects.remove(table)`
   - Prevents memory accumulation in long-running operations

3. **Pagination**
   - Fetch data in pages from API
   - Write each page incrementally to Excel
   - Show progress in UI

4. **Progressive Loading**
   - Write first 1000 rows immediately (user sees results)
   - Queue remaining rows for background write
   - Reduces perceived latency

## Implementation

### Chunked Writes

See `ExcelService.writeRowsInChunks()` for implementation.

### User Limits

Configurable in Settings:

- Max rows per query (default 10,000)
- Chunk size (default 1,000)
- API page size (default 1,000)

### Memory Management

TODO: Implement proxy object untracking in ExcelService helpers.

## Testing Large Datasets

**Test Queries:**

- `large-dataset` (10k rows × 30 columns)
- `very-large-dataset` (100k rows × 30 columns) – add in Phase 4

**Expected Behavior:**

- 10k rows: ~10 seconds, chunked writes, no errors
- 100k rows: ~1-2 minutes, progressive loading, max row limit enforced (if set)

**Failure Modes:**

- Payload limit error → reduce chunk size
- Excel unresponsive → add backoff between chunks
- Memory issues → implement proxy untracking
```

### File Changes

**New Files:**

- `.claude/PERFORMANCE.md` (Excel limits, strategies, testing)

**Modified Files:**

- `src/app/core/excel.service.ts` (add writeRowsInChunks, sleep, update writeTableData)
- `src/app/types/settings.types.ts` (add QueryExecutionSettings)
- `src/app/core/settings.service.ts` (add defaults for queryExecution)
- `src/app/features/settings/settings.component.ts` (add query execution section)
- `src/app/shared/query-api-mock.service.ts` (add executeApiPaginated, enforce maxRows)
- `src/app/features/queries/queries.component.ts` (add runQueryPaginated, progressive loading)
- `src/app/shared/query-queue.service.ts` (update to support append mode)

**Updated Documentation:**

- `.claude/ARCHITECTURE.md` (add performance section)
- `CONTEXT-SESSION.md` (update large dataset handling section)

### Testing Strategy

**Unit Tests:**

- `ExcelService.spec.ts` - writeRowsInChunks with various sizes
- `QueryApiMockService.spec.ts` - executeApiPaginated yields pages
- `SettingsService.spec.ts` - queryExecution defaults

**Integration Tests:**

- Mock large dataset (10k rows), run query, verify chunked writes
- Set max rows to 5000, run 10k row query, verify truncation
- Progressive loading: verify first chunk immediate, rest queued

**Manual Tests:**

- Run `large-dataset` query in Excel, verify no payload errors
- Add `very-large-dataset` query (100k rows), run with progressive loading
- Monitor Excel memory usage, CPU during large writes
- Test Settings: change chunk size, max rows, verify behavior

### Exit Criteria

- [ ] `writeRowsInChunks` implemented and tested
- [ ] User-configurable row limits in Settings
- [ ] Progressive loading for queries >1000 rows
- [ ] API pagination support (executeApiPaginated)
- [ ] `.claude/PERFORMANCE.md` created with Excel docs
- [ ] 100k row test query succeeds
- [ ] Telemetry tracks chunk writes and limits
- [ ] Tests pass (100% for new helpers)
- [ ] Documentation updated

---

## Phase 7: JWT Authentication

**Sub-Branch:** `feat/jwt-authentication` (from `feat/finalize-concept`)
**Depends On:** Phase 6 (Performance optimization)
**Estimated Effort:** 3-4 days
**Priority:** HIGH (production auth requirement)
**Status:** ✅ COMPLETED (2025-11-25)

**Completion Notes:**

- Created JwtHelperService for mock JWT token generation/validation
- Updated AuthService with signInWithJwt(), refreshAccessToken(), getAccessToken()
- Auto-refresh timer (60s check, refresh 5min before expiry)
- AppConfigService uses Bearer token for remote config loading
- JWT types: TokenPair, AccessToken, RefreshToken, TokenPayload
- All tests passing (207/207), build successful

### Goals

1. Design JWT token flow (mock implementation, real-ready structure)
2. Update `AuthService` for token management (access token, refresh token)
3. Integrate JWT with config loading (Phase 2 backend API endpoint)
4. Mock SSO → JWT transition path
5. Token refresh/expiry handling

### Success Criteria

- [ ] JWT token types defined (`AccessToken`, `RefreshToken`, `TokenPayload`)
- [ ] `AuthService` manages token lifecycle (store, refresh, clear)
- [ ] Mock JWT generation/validation (deterministic for testing)
- [ ] Config loading uses JWT bearer token (when auth succeeds)
- [ ] Token expiry triggers re-auth flow
- [ ] Tests pass (token lifecycle, refresh, expiry)
- [ ] Documentation updated

### Technical Approach

#### 7.1: Define JWT Types

**Create:** `src/app/types/jwt.types.ts`

```typescript
/**
 * JWT Access Token - Short-lived token for API requests.
 */
export interface AccessToken {
  token: string;
  expiresAt: number; // Unix timestamp
}

/**
 * JWT Refresh Token - Long-lived token for obtaining new access tokens.
 */
export interface RefreshToken {
  token: string;
  expiresAt: number;
}

/**
 * JWT Token Payload - Decoded token claims.
 */
export interface TokenPayload {
  sub: string; // User ID
  email: string;
  roles: RoleId[];
  iat: number; // Issued at
  exp: number; // Expires at
}

/**
 * JWT Token Pair - Access + refresh tokens.
 */
export interface TokenPair {
  access: AccessToken;
  refresh: RefreshToken;
}
```

#### 7.2: Update AuthService for JWT

**Update:** `src/app/core/auth.service.ts`

```typescript
@Injectable({ providedIn: "root" })
export class AuthService {
  private tokens$ = new BehaviorSubject<TokenPair | null>(null);

  constructor(
    private storage: StorageHelperService,
    private telemetry: TelemetryService,
    private jwtHelper: JwtHelperService
  ) {
    this.hydrate();
    this.startTokenRefreshTimer();
  }

  /**
   * Sign in with JWT (mock for now).
   */
  async signInWithJwt(email: string, password: string): Promise<void> {
    // Mock JWT generation
    const tokens = this.jwtHelper.generateMockTokenPair({ email, roles: ["analyst"] });

    this.tokens$.next(tokens);
    this.persist();

    this.telemetry.logEvent({
      category: "auth",
      name: "jwt.signin.success",
      severity: "info",
      context: { email },
    });
  }

  /**
   * Refresh access token using refresh token.
   */
  async refreshAccessToken(): Promise<void> {
    const current = this.tokens$.value;
    if (!current) return;

    // Mock refresh (replace with real API call)
    const newTokens = this.jwtHelper.refreshMockTokenPair(current.refresh);

    this.tokens$.next(newTokens);
    this.persist();

    this.telemetry.logEvent({
      category: "auth",
      name: "jwt.token.refreshed",
      severity: "debug",
    });
  }

  /**
   * Start token refresh timer (refresh 5 minutes before expiry).
   */
  private startTokenRefreshTimer(): void {
    interval(60000) // Check every minute
      .pipe(
        filter(() => !!this.tokens$.value),
        switchMap(async () => {
          const tokens = this.tokens$.value!;
          const now = Date.now();
          const expiresIn = tokens.access.expiresAt - now;

          if (expiresIn < 5 * 60 * 1000) {
            // Less than 5 minutes left
            await this.refreshAccessToken();
          }
        })
      )
      .subscribe();
  }

  /**
   * Get current access token (for API calls).
   */
  getAccessToken(): string | null {
    const tokens = this.tokens$.value;
    if (!tokens) return null;

    // Check expiry
    if (Date.now() >= tokens.access.expiresAt) {
      this.signOut();
      return null;
    }

    return tokens.access.token;
  }
}
```

#### 7.3: Create JWT Helper Service

**Create:** `src/app/core/jwt-helper.service.ts`

```typescript
/**
 * JWT Helper Service - Mock JWT generation/validation.
 *
 * Replace with real JWT library (e.g., `jose`) for production.
 */
@Injectable({ providedIn: "root" })
export class JwtHelperService {
  /**
   * Generate mock JWT token pair.
   */
  generateMockTokenPair(payload: { email: string; roles: RoleId[] }): TokenPair {
    const now = Date.now();

    return {
      access: {
        token: `mock_access_${now}_${payload.email}`,
        expiresAt: now + 15 * 60 * 1000, // 15 minutes
      },
      refresh: {
        token: `mock_refresh_${now}_${payload.email}`,
        expiresAt: now + 7 * 24 * 60 * 60 * 1000, // 7 days
      },
    };
  }

  /**
   * Refresh mock token pair.
   */
  refreshMockTokenPair(refreshToken: RefreshToken): TokenPair {
    // Validate refresh token not expired
    if (Date.now() >= refreshToken.expiresAt) {
      throw new Error("Refresh token expired");
    }

    // Generate new access token
    const now = Date.now();
    return {
      access: {
        token: `mock_access_refreshed_${now}`,
        expiresAt: now + 15 * 60 * 1000,
      },
      refresh: refreshToken, // Refresh token stays same
    };
  }

  /**
   * Decode mock JWT token.
   */
  decodeMockToken(token: string): TokenPayload | null {
    // Mock decode (replace with real JWT decode in production)
    return {
      sub: "mock-user-id",
      email: "mock@example.com",
      roles: ["analyst"],
      iat: Date.now() / 1000,
      exp: (Date.now() + 15 * 60 * 1000) / 1000,
    };
  }
}
```

#### 7.4: Integrate JWT with Config Loading

**Update:** `src/app/core/config.services.ts`

```typescript
private async loadRemoteConfig(): Promise<void> {
  try {
    // Get JWT access token
    const token = this.auth.getAccessToken();

    // Make authenticated request
    const headers = token
      ? { Authorization: `Bearer ${token}` }
      : {};

    const remoteConfig = await this.http.get<AppConfig>('/api/config', { headers }).toPromise();

    // ... rest of loading logic
  } catch (error) {
    console.warn('Failed to load remote config, using defaults', error);
  }
}
```

### File Changes

**New Files:**

- `src/app/types/jwt.types.ts` (JWT types)
- `src/app/core/jwt-helper.service.ts` (mock JWT generation/validation)
- `src/app/core/jwt-helper.service.spec.ts` (tests)

**Modified Files:**

- `src/app/core/auth.service.ts` (JWT token management)
- `src/app/core/auth.service.spec.ts` (update for JWT)
- `src/app/core/config.services.ts` (use JWT bearer token)
- `src/app/features/sso-home/sso-home.component.ts` (update sign-in to use JWT)

**Updated Documentation:**

- `.claude/ARCHITECTURE.md` (add JWT authentication section)
- `CONTEXT-SESSION.md` (update auth flow)

### Testing Strategy

**Unit Tests:**

- `JwtHelperService.spec.ts` - generate, refresh, decode tokens
- `AuthService.spec.ts` - JWT sign-in, refresh timer, expiry handling
- `ConfigService.spec.ts` - verify bearer token in headers

**Integration Tests:**

- Sign in → verify tokens stored
- Wait for expiry → verify refresh triggered
- Token expired → verify sign-out triggered
- Config loading with JWT → verify auth header

**Manual Tests:**

- Sign in, verify localStorage has tokens
- Wait 10+ minutes, verify auto-refresh
- Clear tokens, verify config falls back to defaults

### Exit Criteria

- [ ] JWT types defined and TSDoc'd
- [ ] `AuthService` manages token lifecycle
- [ ] Mock JWT generation/validation works
- [ ] Config loading uses JWT bearer token
- [ ] Token refresh timer works
- [ ] Tests pass (100% for JWT services)
- [ ] Documentation updated

---

## Phase 8: Formula Management

**Sub-Branch:** `feat/formula-management` (from `feat/finalize-concept`)
**Depends On:** Phase 7 (JWT authentication)
**Estimated Effort:** 2-3 days
**Priority:** MEDIUM (query safety feature)
**Status:** ✅ COMPLETED (2025-11-25)

**Completion Notes:**

- Added ExcelService.setCalculationMode()/getCalculationMode() methods
- QueriesComponent disables formulas during query execution (try/finally pattern)
- Configurable via queryExecution.disableFormulasDuringRun setting (default: true)
- Inline formula status indicator in queries UI
- Restores previous calculation mode after execution (even on error)
- All tests passing (239/239), build successful

### Goals

1. Add setting: Disable formulas during query execution (default: true)
2. Implement `ExcelService` helper to suspend/resume calculation mode
3. Show formula status in UI during query runs
4. Telemetry for formula disable/enable events
5. Error recovery: re-enable formulas on failures

### Success Criteria

- [ ] Setting added: `queryExecution.disableFormulasD uringRun` (default: true)
- [ ] `ExcelService.setCalculationMode()` implemented
- [ ] Formulas suspended before query write, restored after
- [ ] UI shows "Formulas disabled" during execution
- [ ] Error recovery re-enables formulas
- [ ] Telemetry tracks formula state changes
- [ ] Tests verify formula suspend/resume
- [ ] Documentation updated

### Technical Approach

#### 8.1: Add Setting

**Update:** `src/app/types/settings.types.ts`

```typescript
export interface QueryExecutionSettings {
  maxRowsPerQuery: number;
  chunkSize: number;
  enableProgressiveLoading: boolean;
  apiPageSize: number;

  /** Disable formulas during query execution (default: true) */
  disableFormulasDuringRun: boolean;
}
```

**Update:** `src/app/core/settings.service.ts`

```typescript
private getDefaultSettings(): AppSettings {
  return {
    // ...
    queryExecution: {
      // ...
      disableFormulasDuringRun: true,
    },
  };
}
```

#### 8.2: Implement Formula Suspension

**Update:** `src/app/core/excel.service.ts`

```typescript
/**
 * Set Excel calculation mode.
 *
 * @param mode - Calculation mode (automatic, manual, semiautomatic)
 * @returns Previous mode (for restoration)
 */
async setCalculationMode(
  mode: 'Automatic' | 'Manual' | 'Semiautomatic'
): Promise<string> {
  if (!this.isExcel) return 'Automatic';

  return await Excel.run(async (ctx) => {
    const app = ctx.workbook.application;
    app.load('calculationMode');
    await ctx.sync();

    const previousMode = app.calculationMode;
    app.calculationMode = mode as any;
    await ctx.sync();

    this.telemetry.logEvent({
      category: 'excel',
      name: 'calculationMode.changed',
      severity: 'debug',
      context: { from: previousMode, to: mode },
    });

    return previousMode;
  });
}
```

#### 8.3: Integrate with Query Execution

**Update:** `src/app/features/queries/queries.component.ts`

```typescript
async runQuery(query: QueryConfiguration) {
  const settings = this.settings.getSettings().queryExecution;
  let previousCalcMode: string | null = null;

  try {
    // Disable formulas if setting enabled
    if (settings?.disableFormulasDuringRun) {
      previousCalcMode = await this.excel.setCalculationMode('Manual');
      this.showFormulaStatus('Formulas disabled during query execution');
    }

    // Execute query
    const rows = await this.queryApi.executeApi(query.apiId, query.parameterValues);
    const result = await this.excel.upsertQueryTable(query, rows, query.parameterValues);

    this.handleQueryResult(query, result, rows.length);
  } catch (error) {
    console.error('Query execution failed', error);
  } finally {
    // Restore formulas
    if (previousCalcMode) {
      await this.excel.setCalculationMode(previousCalcMode as any);
      this.showFormulaStatus('Formulas re-enabled');
    }
  }
}

/**
 * Show formula status in UI.
 */
private showFormulaStatus(message: string): void {
  // Use status banner or toast
  this.formulaStatusMessage = message;

  this.telemetry.logEvent({
    category: 'query',
    name: 'formula.status.shown',
    severity: 'debug',
    context: { message },
  });
}
```

#### 8.4: UI Indicator

**Update:** `src/app/features/queries/queries.component.html`

```html
<!-- Formula status banner -->
<app-status-banner *ngIf="formulaStatusMessage" [type]="'info'" [message]="formulaStatusMessage">
</app-status-banner>

<!-- Queries list -->
<!-- ... -->
```

### File Changes

**Modified Files:**

- `src/app/types/settings.types.ts` (add `disableFormulasDuringRun`)
- `src/app/core/settings.service.ts` (add default)
- `src/app/core/excel.service.ts` (add `setCalculationMode`)
- `src/app/features/queries/queries.component.ts` (suspend/resume formulas)
- `src/app/features/queries/queries.component.html` (formula status banner)
- `src/app/features/settings/settings.component.ts` (add setting UI)

**Updated Documentation:**

- `.claude/ARCHITECTURE.md` (add formula management)
- `.claude/PERFORMANCE.md` (note formula impact on large datasets)
- `CONTEXT-SESSION.md` (update query execution flow)

### Testing Strategy

**Unit Tests:**

- `ExcelService.spec.ts` - setCalculationMode returns previous mode
- `QueriesComponent.spec.ts` - formulas suspended/restored on success/error

**Integration Tests:**

- Run query with setting enabled → verify mode changed to Manual
- Query fails → verify mode restored to Automatic
- Setting disabled → verify mode never changed

**Manual Tests:**

- Enable setting, run query, verify Excel shows "Manual" calculation mode
- Query fails, verify calculation mode restored
- Disable setting, run query, verify calculation stays Automatic

### Exit Criteria

- [ ] Setting added and configurable
- [ ] `setCalculationMode()` implemented and tested
- [ ] Formulas suspended during query execution
- [ ] Error recovery restores formulas
- [ ] UI shows formula status
- [ ] Telemetry tracks state changes
- [ ] Tests pass (100%)
- [ ] Documentation updated

---

## Phase 9: Formula-Column Detection

**Sub-Branch:** `feat/formula-column-detection` (from `feat/finalize-concept`)
**Depends On:** Phase 8 (Formula management) - Separate priority
**Estimated Effort:** 3-4 days
**Priority:** LOW (advanced safety feature)
**Status:** ✅ COMPLETED (2025-11-25)

**Completion Notes:**

- Created FormulaScannerService with workbook scanning (5-min cache TTL)
- parseTableColumnReferences() handles Table[Column], [@Column], [[Column]] patterns
- checkQueryImpact() assesses formula dependencies before query execution
- Inline warning banner shows affected formula count (non-blocking)
- CSV export for formula dependency report via "Export formula report" button
- Added "formula" telemetry category
- All tests passing (257/257), build successful

### Goals

1. Command: Scan workbook for formula-referenced columns
2. Identify tables/columns used in formulas
3. Detect breaking changes before query updates
4. UI: Show warnings when query would affect formula columns
5. Report: Generate formula dependency report

### Success Criteria

- [ ] Command scans all worksheets for formulas
- [ ] Identify table/column references in formulas
- [ ] Build dependency graph (formula → table → column)
- [ ] UI warns before query updates formula-dependent columns
- [ ] Report downloadable (CSV or Excel)
- [ ] Tests verify detection logic
- [ ] Documentation updated

### Technical Approach

#### 9.1: Implement Formula Scanner

**Create:** `src/app/core/formula-scanner.service.ts`

```typescript
/**
 * Formula Scanner Service - Detect formula dependencies on tables/columns.
 */
@Injectable({ providedIn: "root" })
export class FormulaScannerService {
  constructor(
    private excel: ExcelService,
    private telemetry: TelemetryService
  ) {}

  /**
   * Scan workbook for formula-referenced tables and columns.
   */
  async scanWorkbook(): Promise<FormulaDependency[]> {
    if (!this.excel.isExcel) return [];

    return await Excel.run(async (ctx) => {
      const sheets = ctx.workbook.worksheets;
      sheets.load("items/name");
      await ctx.sync();

      const dependencies: FormulaDependency[] = [];

      for (const sheet of sheets.items) {
        const usedRange = sheet.getUsedRange();
        usedRange.load("formulas, address");
        await ctx.sync();

        // Parse formulas for table/column references
        for (let i = 0; i < usedRange.formulas.length; i++) {
          for (let j = 0; j < usedRange.formulas[i].length; j++) {
            const formula = usedRange.formulas[i][j];

            if (formula && typeof formula === "string") {
              const refs = this.parseTableColumnReferences(formula);
              for (const ref of refs) {
                dependencies.push({
                  sheetName: sheet.name,
                  cellAddress: `${String.fromCharCode(65 + j)}${i + 1}`,
                  formula: formula,
                  tableName: ref.tableName,
                  columnName: ref.columnName,
                });
              }
            }
          }
        }
      }

      this.telemetry.logEvent({
        category: "formula",
        name: "scan.completed",
        severity: "info",
        context: {
          dependencyCount: dependencies.length,
          sheetsScanned: sheets.items.length,
        },
      });

      return dependencies;
    });
  }

  /**
   * Parse formula for table/column references.
   *
   * Detects patterns like: Table1[Column], Table1[[Column]]
   */
  private parseTableColumnReferences(formula: string): Array<{
    tableName: string;
    columnName: string;
  }> {
    const refs: Array<{ tableName: string; columnName: string }> = [];

    // Regex for Table1[Column] or Table1[[Column]]
    const tableColRegex = /(\w+)\[\[?(\w+)\]?\]/g;
    let match;

    while ((match = tableColRegex.exec(formula)) !== null) {
      refs.push({
        tableName: match[1],
        columnName: match[2],
      });
    }

    return refs;
  }

  /**
   * Check if query would affect formula-dependent columns.
   */
  async checkQueryImpact(query: QueryConfiguration): Promise<FormulaImpactResult> {
    const dependencies = await this.scanWorkbook();
    const affected = dependencies.filter((d) => d.tableName === query.targetTableName);

    return {
      hasImpact: affected.length > 0,
      affectedDependencies: affected,
    };
  }
}

export interface FormulaDependency {
  sheetName: string;
  cellAddress: string;
  formula: string;
  tableName: string;
  columnName: string;
}

export interface FormulaImpactResult {
  hasImpact: boolean;
  affectedDependencies: FormulaDependency[];
}
```

#### 9.2: Integrate with Query Execution

**Update:** `src/app/features/queries/queries.component.ts`

```typescript
async runQuery(query: QueryConfiguration) {
  // Check formula impact
  const impact = await this.formulaScanner.checkQueryImpact(query);

  if (impact.hasImpact) {
    // Show warning dialog
    const proceed = await this.showFormulaImpactWarning(query, impact);
    if (!proceed) return;
  }

  // ... rest of query execution
}

/**
 * Show formula impact warning dialog.
 */
private async showFormulaImpactWarning(
  query: QueryConfiguration,
  impact: FormulaImpactResult
): Promise<boolean> {
  const message = `
    This query will update table "${query.targetTableName}" which is referenced by ${impact.affectedDependencies.length} formula(s).

    Affected cells: ${impact.affectedDependencies.map(d => d.cellAddress).join(', ')}

    Proceed with query?
  `;

  return confirm(message); // Replace with proper modal
}
```

#### 9.3: Generate Dependency Report

**Update:** `src/app/core/formula-scanner.service.ts`

```typescript
/**
 * Generate formula dependency report (CSV format).
 */
generateReport(dependencies: FormulaDependency[]): string {
  const header = 'Sheet,Cell,Formula,Table,Column\n';
  const rows = dependencies.map(d =>
    `${d.sheetName},${d.cellAddress},"${d.formula}",${d.tableName},${d.columnName}`
  ).join('\n');

  return header + rows;
}

/**
 * Download dependency report.
 */
downloadReport(dependencies: FormulaDependency[]): void {
  const csv = this.generateReport(dependencies);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `formula-dependencies_${Date.now()}.csv`;
  link.click();

  URL.revokeObjectURL(url);
}
```

### File Changes

**New Files:**

- `src/app/core/formula-scanner.service.ts` (formula dependency detection)
- `src/app/core/formula-scanner.service.spec.ts` (tests)
- `src/app/types/formula.types.ts` (FormulaDependency, FormulaImpactResult)

**Modified Files:**

- `src/app/features/queries/queries.component.ts` (check impact before run)
- `src/app/features/settings/settings.component.ts` (add "Scan Formulas" button)

**Updated Documentation:**

- `.claude/ARCHITECTURE.md` (add formula detection)
- `CONTEXT-SESSION.md` (add formula safety section)

### Testing Strategy

**Unit Tests:**

- `FormulaScannerService.spec.ts` - parseTableColumnReferences with various formulas
- Mock Excel range with formulas, verify detection
- checkQueryImpact with matching/non-matching tables

**Integration Tests:**

- Create workbook with formulas referencing table
- Run scan, verify dependencies detected
- Run query, verify warning shown

**Manual Tests:**

- Create Excel workbook with `=Table1[Column]` formula
- Scan formulas, verify dependency reported
- Run query on Table1, verify warning dialog
- Download report, verify CSV format

### Exit Criteria

- [ ] Formula scanner implemented and tested
- [ ] Table/column references detected correctly
- [ ] Query impact check warns before execution
- [ ] Dependency report downloadable
- [ ] Tests pass (100%)
- [ ] Documentation updated

---

## Sub-Branch Strategy

### Workflow

1. **Create Phase Branches**

   ```bash
   git checkout feat/finalize-concept
   git checkout -b feat/api-query-separation
   # Work on Phase 1
   git checkout feat/finalize-concept
   git checkout -b feat/config-finalization
   # Work on Phase 2
   # ... etc
   ```

2. **Merge Order**

   ```md
   feat/api-query-separation → feat/finalize-concept (PR)
   feat/config-finalization → feat/finalize-concept (PR)
   feat/excel-workbook-cleanup → feat/finalize-concept (PR)
   feat/query-services-refactor → feat/finalize-concept (PR)
   feat/auth-settings-telemetry-refactor → feat/finalize-concept (PR)
   feat/performance-optimization → feat/finalize-concept (PR)
   feat/jwt-authentication → feat/finalize-concept (PR)
   feat/formula-management → feat/finalize-concept (PR)
   feat/formula-column-detection → feat/finalize-concept (PR)
   feat/finalize-concept → main (Final PR)
   ```

3. **PR Requirements**
   - All tests pass (`npm run test:ci`)
   - Lint clean (`npm run lint`)
   - Build succeeds (`npm run build`)
   - Documentation updated (`.claude/`, `CONTEXT-SESSION.md`)
   - Manual Excel test performed
   - Exit criteria met (checklist in PR description)

### Branch Protection

- Require PR approval for merges to `feat/finalize-concept`
- Require CI pass for all PRs
- Squash commits on merge to keep history clean

### Rollback Strategy

If any phase fails:

- Revert phase branch merge
- Fix issues in new branch from last stable state
- Re-merge when stable

---

## Risk Mitigation

### High Risk: Breaking Changes

**Risk:** API/Query separation breaks existing queries-old functionality.

**Mitigation:**

- Keep `queries-old` component as-is during Phase 1
- Run integration tests comparing old vs new
- Maintain backward compatibility with alias types during transition
- Exit Phase 1 only when parity achieved

### Medium Risk: Config Loading Failures

**Risk:** Remote config endpoint fails, app breaks.

**Mitigation:**

- Validate configs before applying
- Fall back to `DEFAULT_APP_CONFIG` on error
- Log failures to telemetry for monitoring
- Add "Reload Config" button in Settings for manual retry

### Medium Risk: Excel Performance Regressions

**Risk:** Chunking adds overhead, slows down small queries.

**Mitigation:**

- Only chunk when row count >1000
- Make chunk size configurable
- Benchmark before/after Phase 4
- Add telemetry for chunk timing

### Low Risk: Service Boundary Confusion

**Risk:** Developers unsure which service to use (Excel vs Workbook).

**Mitigation:**

- Update `.claude/ARCHITECTURE.md` with clear guidelines
- Add TSDoc to every method explaining boundaries
- Code review all PRs for correct service usage

---

## Open Questions

### 1. Config Loading Endpoint

**Question:** Where should remote config be served from?

**Options:**

- A. Static JSON file on GitHub Pages (simple, no auth)
- B. Backend API endpoint (requires auth, versioning)
- C. Local file override for dev (environment-specific)

**Impact:** Affects `AppConfigService.loadRemoteConfig()` implementation.

**Decision:** This should be provided from backend API Endpoint, when user auth event suceeds. For now we'll be mocking this behavior, but the framework should exist so when not in mock mode expects JWT + realted details.

---

### 2. Progressive Loading UX

**Question:** How should UI communicate progressive loading status?

**Options:**

- A. Status banner at top ("Loading 1000 of 10000 rows...")
- B. Toast notification ("First 1000 rows loaded, rest queued")
- C. Progress bar in query row
- D. All of the above

**Impact:** Affects `QueriesComponent.showPartialResults()` implementation.

**Decision:** We need to create a component that can handle this, which is a modal over-top of the extension until completed. Should indicates current progress of actions, handles error events (like choices to stop, continue to next item, or others depending on scenario), and provide rollback options, etc (be modular so we can do as much as we need). This will be a full phase with lots of details.

---

### 3. Max Row Enforcement

**Question:** When max rows exceeded, should we truncate or fail?

**Options:**

- A. Truncate silently, log warning telemetry
- B. Truncate with user notification (banner/toast)
- C. Fail query, show error in UI
- D. Ask user (dialog: "10000 rows available, max 5000 configured. Truncate or cancel?")

**Impact:** Affects `QueryApiMockService.executeApi()` behavior.

**Decision:** D, Ask User. They should be notified and given the choice. (My primary concern is Excel limits and providing user the option to truncate, revert, etc.)

---

### 4. API Pagination for Real APIs

**Question:** Should we implement cursor-based or offset-based pagination for future real APIs?

**Options:**

- A. Offset-based (`?page=1&limit=1000`) - simpler, less efficient
- B. Cursor-based (`?cursor=abc123&limit=1000`) - more efficient, requires API support
- C. Configurable per API (add `paginationType` to `ApiDefinition`)

**Impact:** Affects `executeApiPaginated()` interface and API definition schema.

**Decision:** C, Configurable per API. Some APIs may only support offset, others cursor. We should allow flexibility in the catalog.

---

### 5. Rollback/Safeguards Scope

**Question:** Confirm safeguards are deferred to polish phase (post-Phase 4)?

**Current Plan:** Focus on architecture/performance, add transaction-like operations later.

**Implications:**

- Partial table creates can leave workbook in inconsistent state
- No automatic rollback on Excel write failures
- Users must manually clean up failed operations

**Confirmation Needed:** Is this acceptable, or should we add basic safeguards in Phase 3/4?

**Decision:** Yes, no problem. We're in development still so long as we document the limitations and have a plan for future improvements, this is acceptable for now.

---

## Next Steps

1. **Review this plan** - Answer open questions above
2. **Approve plan** - Confirm phased approach and priorities
3. **Create Phase 1 branch** - `git checkout -b feat/api-query-separation`
4. **Begin API/Query separation** - Follow Phase 1 technical approach
5. **Daily check-ins** - Review progress, adjust plan as needed

---

## Appendix: Agent Analysis Summary

### Data-Driven Config (80% Mature)

**Strengths:**

- Nav items, roles, UI config fully data-driven
- Clear separation: defaults → service → types → consumption
- Easy to swap configs without component changes

**Gaps:**

- Queries hardcoded in service
- Text catalog separate from config
- No remote loading or validation

### API/Query Separation (40% Mature)

**Problem:**

- `QueryDefinition` mixes API catalog with execution config
- `ApiDefinition` is alias only, no real type

**Solution:**

- Split into `ApiDefinition` (catalog) + `QueryConfiguration` (instances)
- Create `ApiCatalogService`, refactor `QueryApiMockService`
- Update UI to show catalog + selected queries

### Excel/Workbook Services (70% Mature)

**Problem:**

- ExcelService does ownership lookups instead of delegating
- WorkbookService has no write helpers
- `upsertQueryTable` too complex (220+ lines)

**Solution:**

- Move ALL ownership logic to WorkbookService
- Expose recordOwnership, updateOwnership, deleteOwnership
- Extract upsertQueryTable into focused helpers

### Large Dataset Handling (40% Mature)

**Problem:**

- No chunking (all rows in single Office.js call)
- Memory issues (all rows loaded before write)
- No resource limits enforced

**Solution:**

- Chunk Excel writes (1000 rows per batch)
- User-configurable limits in Settings
- Progressive loading (first 1000 immediate, rest queued)
- API pagination support
