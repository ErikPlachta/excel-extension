# Phase 1: API/Query Separation

**Sub-Branch:** `feat/api-query-separation`
**Depends On:** None (foundation phase)
**Priority:** HIGHEST (blocks all other phases)
**Status:** PENDING

---

## Goals

1. Create true `ApiDefinition` type (catalog entry)
2. Create `QueryConfiguration` type (execution instance)
3. Split `QueryApiMockService` into API catalog + mock executor
4. Update UI to show API catalog + selected queries
5. Maintain backward compatibility during migration

## Success Criteria

- [ ] All `QueryDefinition` references replaced with `ApiDefinition` or `QueryConfiguration`
- [ ] API catalog browsable in UI (separate from configured queries)
- [ ] Tests pass (unit + integration)
- [ ] `queries-old` component still works (regression check)
- [ ] TSDoc updated for all new types

---

## Technical Approach

### 1.1: Define New Types

**Create:** `src/app/types/api.types.ts`

```typescript
/**
 * API Definition - Catalog entry describing a data source endpoint.
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

export interface ApiParameter {
  key: string;
  type: "string" | "number" | "date" | "boolean";
  required: boolean;
  description?: string;
  defaultValue?: any;
}

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

### 1.2: Refactor Services

**Create:** `src/app/shared/api-catalog.service.ts`

```typescript
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
@Injectable({ providedIn: "root" })
export class QueryApiMockService {
  constructor(private apiCatalog: ApiCatalogService) {}

  async executeApi(apiId: string, params: Record<string, any>): Promise<any[]> {
    const api = this.apiCatalog.getApiById(apiId);
    if (!api) throw new Error(`API not found: ${apiId}`);

    switch (apiId) {
      case "sales-summary-api":
        return this.fetchSalesSummary(params);
      case "top-customers-api":
        return this.fetchTopCustomers(params);
      default:
        return [];
    }
  }
}
```

**Update:** `src/app/shared/query-configuration.service.ts`

```typescript
@Injectable({ providedIn: "root" })
export class QueryConfigurationService {
  saveConfiguration(config: QueryConfiguration): void {
    const api = this.apiCatalog.getApiById(config.apiId);
    if (!api) throw new Error(`Invalid apiId: ${config.apiId}`);
    // Save to localStorage
  }
}
```

### 1.3: Update UI

**Update:** `src/app/features/queries/queries.component.ts`

Two sections:
1. **API Catalog** (browse available APIs, filterable by role)
2. **Selected Queries** (configured instances for this workbook)

```typescript
export class QueriesComponent {
  availableApis: ApiDefinition[] = [];
  selectedQueries: QueryConfiguration[] = [];

  ngOnInit() {
    this.availableApis = this.apiCatalog.getApisByRole(this.auth.roles);
    this.selectedQueries = this.queryConfig.getConfigurations();
  }

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

  async runQuery(query: QueryConfiguration) {
    const api = this.apiCatalog.getApiById(query.apiId);
    if (!api) return;
    const rows = await this.queryApi.executeApi(api.id, query.parameterValues);
    await this.excel.upsertQueryTable(query, rows, query.parameterValues);
  }
}
```

---

## File Changes

**New Files:**
- `src/app/types/api.types.ts`
- `src/app/shared/api-catalog.service.ts`
- `src/app/shared/api-catalog.service.spec.ts`

**Modified Files:**
- `src/app/types/query.types.ts`
- `src/app/shared/query-api-mock.service.ts`
- `src/app/shared/query-configuration.service.ts`
- `src/app/shared/query-state.service.ts`
- `src/app/features/queries/queries.component.ts`
- `src/app/features/queries/queries.component.html`
- `src/app/features/queries/queries.component.spec.ts`

---

## Testing Strategy

**Unit Tests:**
- `ApiCatalogService.spec.ts` - getApis, getApiById, role filtering
- `QueryApiMockService.spec.ts` - executeApi with valid/invalid apiId
- `QueryConfigurationService.spec.ts` - CRUD with apiId validation
- `QueriesComponent.spec.ts` - addQueryFromApi, runQuery with new types

**Integration Tests:**
- Browse API catalog → Add query → Run → Verify Excel table
- Backward compatibility: `queries-old` component still works

---

## Migration Strategy

1. Create new types/services without breaking existing code
2. Update one component at a time (start with `queries.component.ts`)
3. Run tests after each service update
4. Update `.claude/` docs when component is stable
5. Mark Phase 1 complete when `queries-old` parity achieved

## Rollback Plan

If issues arise:
- Revert `feat/api-query-separation` branch
- `queries-old` component provides working baseline

## Exit Criteria

- [ ] All `QueryDefinition` references replaced
- [ ] API catalog browsable in UI
- [ ] Tests pass (unit + integration)
- [ ] TSDoc updated for all new types
