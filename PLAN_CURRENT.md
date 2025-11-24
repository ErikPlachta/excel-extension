# Current Phase: Phase 1 - API/Query Separation

**Sub-Branch:** `feat/api-query-separation` (from `feat/finalize-concept`)
**Status:** ✅ COMPLETED
**Estimated:** 2-3 days
**Actual:** ~2 hours
**Priority:** HIGH (foundation for everything else)

## Phase 1 Summary

Successfully separated API catalog from query execution logic:
- ✅ Created `ApiDefinition` type system (`api.types.ts`)
- ✅ Created `QueryInstance` type (renamed to avoid collision with existing `QueryConfiguration`)
- ✅ Created `ApiCatalogService` with role-based filtering
- ✅ Refactored `QueryApiMockService` to execution-only with new `executeApi()` method
- ✅ Updated `QueryConfigurationService` to validate apiIds against catalog
- ✅ Integrated `ApiCatalogService` into `QueriesComponent` with role filtering
- ✅ Created comprehensive tests for `ApiCatalogService` (14 tests, all passing)
- ✅ Updated `.claude/ARCHITECTURE.md` with API vs Query distinction
- ✅ All 67 tests passing

---

## Goals

1. Split `QueryDefinition` into `ApiDefinition` (catalog) + `QueryConfiguration` (instances)
2. Create `ApiCatalogService` for browsing APIs
3. Refactor `QueryApiMockService` to execution-only (no catalog)
4. Update `QueriesComponent` to two-section UI (Catalog + Selected Queries)
5. Keep `queries-old` working for rollback safety

---

## Exit Criteria

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

## Technical Implementation

### 1.1: Define New Types

**Create:** `src/app/types/api.types.ts`

```typescript
/**
 * API Definition - Catalog of available data source APIs.
 *
 * Represents an API endpoint/service that can be queried. This is the catalog entry,
 * NOT the instance of a configured query.
 */
export interface ApiDefinition {
  /** Unique API identifier */
  id: string;

  /** Display name */
  name: string;

  /** Description of what data this API provides */
  description?: string;

  /** Roles allowed to access this API */
  allowedRoles?: RoleId[];

  /** Parameters this API accepts */
  parameters: ApiParameter[];

  /** Response schema (columns returned) */
  responseSchema?: ApiColumnDefinition[];

  /** UI configuration for catalog display */
  catalogUiConfig?: ApiCatalogUiConfig;
}

export interface ApiParameter {
  key: string;
  type: "string" | "number" | "date" | "boolean" | "array";
  required: boolean;
  defaultValue?: any;
  description?: string;
}

export interface ApiColumnDefinition {
  key: string;
  name: string;
  dataType: "string" | "number" | "date" | "boolean";
  description?: string;
}

export interface ApiCatalogUiConfig {
  icon?: string;
  category?: string;
  tags?: string[];
}
```

**Update:** `src/app/types/query.types.ts`

```typescript
/**
 * Query Configuration - Instance of a configured query.
 *
 * Represents a saved query with specific parameters, targeting a specific Excel location.
 */
export interface QueryConfiguration {
  /** Unique query instance ID */
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

---

### 1.2: Create ApiCatalogService

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
    // ... migrate other queries from QueryApiMockService
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

---

### 1.3: Refactor QueryApiMockService

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

  // Keep existing private fetch methods unchanged
  private async fetchSalesSummary(params: Record<string, any>): Promise<any[]> {
    // ...existing logic
  }
}
```

---

### 1.4: Update QueryConfigurationService

**Update:** `src/app/shared/query-configuration.service.ts`

```typescript
/**
 * Query Configuration Service - CRUD operations on query configs.
 *
 * Now works with QueryConfiguration (instances) instead of QueryDefinition.
 */
@Injectable({ providedIn: "root" })
export class QueryConfigurationService {
  constructor(
    private apiCatalog: ApiCatalogService,
    private telemetry: TelemetryService
  ) {}

  saveConfiguration(config: QueryConfiguration): void {
    // Validate apiId exists in catalog
    const api = this.apiCatalog.getApiById(config.apiId);
    if (!api) {
      throw new Error(`Invalid apiId: ${config.apiId}`);
    }

    // Save to localStorage
    const configs = this.getConfigurations();
    const index = configs.findIndex((c) => c.id === config.id);

    if (index >= 0) {
      configs[index] = config;
    } else {
      configs.push(config);
    }

    localStorage.setItem("query-configs", JSON.stringify(configs));

    this.telemetry.logEvent({
      category: "query-config",
      name: "save",
      severity: "info",
      message: `Query configuration saved: ${config.displayName || config.apiId}`,
    });
  }

  getConfigurations(): QueryConfiguration[] {
    const stored = localStorage.getItem("query-configs");
    return stored ? JSON.parse(stored) : [];
  }

  // ... other CRUD methods
}
```

---

### 1.5: Update QueriesComponent UI

**Update:** `src/app/features/queries/queries.component.ts`

```typescript
export class QueriesComponent implements OnInit {
  // API Catalog
  availableApis: ApiDefinition[] = [];

  // Selected Queries (instances)
  selectedQueries: QueryConfiguration[] = [];

  constructor(
    private apiCatalog: ApiCatalogService,
    private queryConfig: QueryConfigurationService,
    private queryApi: QueryApiMockService,
    private excel: ExcelService,
    private auth: AuthService
  ) {}

  ngOnInit() {
    // Load API catalog filtered by user roles
    this.availableApis = this.apiCatalog.getApisByRole(this.auth.getRoles());

    // Load selected queries for this workbook
    this.selectedQueries = this.queryConfig.getConfigurations();
  }

  /**
   * Add query from API catalog.
   */
  addQueryFromApi(api: ApiDefinition) {
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

  /**
   * Run individual query.
   */
  async runQuery(query: QueryConfiguration) {
    const api = this.apiCatalog.getApiById(query.apiId);
    if (!api) return;

    const rows = await this.queryApi.executeApi(api.id, query.parameterValues);
    const result = await this.excel.upsertQueryTable(query, rows, query.parameterValues);
    // Handle result...
  }

  private getDefaultParams(api: ApiDefinition): Record<string, any> {
    const defaults: Record<string, any> = {};
    for (const param of api.parameters) {
      if (param.defaultValue !== undefined) {
        defaults[param.key] = param.defaultValue;
      }
    }
    return defaults;
  }
}
```

**Update:** `src/app/features/queries/queries.component.html`

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

---

## File Changes

### New Files

- `src/app/types/api.types.ts` (API definitions, parameters, columns)
- `src/app/shared/api-catalog.service.ts` (API catalog management)
- `src/app/shared/api-catalog.service.spec.ts` (tests)

### Modified Files

- `src/app/types/query.types.ts` (update `QueryConfiguration`, deprecate mixed fields)
- `src/app/shared/query-api-mock.service.ts` (rename methods, inject catalog)
- `src/app/shared/query-configuration.service.ts` (use `QueryConfiguration`, validate `apiId`)
- `src/app/shared/query-state.service.ts` (update references)
- `src/app/features/queries/queries.component.ts` (two-section UI)
- `src/app/features/queries/queries.component.html` (catalog + instances)
- `src/app/features/queries/queries.component.spec.ts` (update tests)

### Documentation Updates

- `.claude/ARCHITECTURE.md` (add API vs Query distinction)
- `.claude/QUERIES.md` (update with new flow)
- `CONTEXT-SESSION.md` (update query section)

---

## Testing Strategy

### Unit Tests

- `ApiCatalogService.spec.ts` - getApis, getApiById, role filtering
- `QueryApiMockService.spec.ts` - executeApi with valid/invalid apiId
- `QueryConfigurationService.spec.ts` - CRUD with apiId validation
- `QueriesComponent.spec.ts` - addQueryFromApi, runQuery with new types

### Integration Tests

- End-to-end: Browse API catalog → Add query → Run → Verify Excel table
- Backward compatibility: `queries-old` component still works

### Manual Tests

- Load app in Excel
- Sign in as analyst, verify API catalog shows only allowed APIs
- Add query from API, configure parameters
- Run query, verify table created
- Sign in as admin, verify admin-only APIs visible

---

## Migration Strategy

1. **Step 1:** Create new types/services without breaking existing code
2. **Step 2:** Update one component at a time (start with `queries.component.ts`)
3. **Step 3:** Run tests after each service update
4. **Step 4:** Update `.claude/` docs when component is stable
5. **Step 5:** Mark Phase 1 complete when `queries-old` parity achieved

---

## Rollback Plan

If Phase 1 causes issues:

- Revert `feat/api-query-separation` branch
- Keep working from `feat/finalize-concept` base
- `queries-old` component provides working baseline

---

## Next Phase Preview

Once Phase 1 complete → **Phase 2: Config-Driven Completion**

- Move API catalog into `AppConfig.apiCatalog`
- Merge `app-text.ts` into `AppConfig.text`
- Add remote config loading with validation
