# Common Patterns

## Adding a Nav Item

1. **Update config** (`src/app/shared/app-config.default.ts`):

```typescript
{
  id: 'foo',
  labelKey: 'nav.foo',
  viewId: 'foo',
  actionType: 'select-view',
  requiresAuth: true,
  requiredRoles: ['analyst', 'admin'],
  buttonConfig: { variant: 'default', size: 'medium' }
}
```

2. **Add text** (`src/app/shared/app-text.ts`):

```typescript
nav: {
  // ...
  foo: "Foo View";
}
```

3. **Create component** (`src/app/features/foo/foo.component.ts`):

```typescript
import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-foo",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./foo.component.html",
  styleUrl: "./foo.component.css",
})
export class FooComponent {}
```

4. **Wire to shell** (`src/app/core/app.component.ts`):
   Add case to `selectView()` switch or template.

## Adding a Routed View

1. Create standalone component with `templateUrl`/`styleUrl`
2. Add route to `src/app/core/app.routes.ts`:

```typescript
{ path: 'foo', component: FooComponent }
```

3. Link via `<a routerLink="/foo">Foo</a>`

## Excel Operations

### Safe Query Execution

```typescript
async runQuery(query: QueryDefinition) {
  if (!this.excel.isExcel) {
    console.warn('Excel not detected');
    return;
  }

  const params = this.queryState.getEffectiveParams(query.id, 'global');
  const rows = await this.queryApi.executeQuery(query.id, params);

  const result = await this.excel.upsertQueryTable(query, rows, params);
  if (result.ok) {
    this.queryState.setLastRun(query.id, {
      timestamp: Date.now(),
      location: result.value,
      rowCount: rows.length
    });
  } else {
    console.error('Query failed:', result.error.message);
  }
}
```

### Navigation

```typescript
async goToTable(queryId: string) {
  if (!this.excel.isExcel) return;

  const lastRun = this.queryState.getLastRun(queryId);
  if (!lastRun?.location) return;

  await this.excel.activateQueryLocation(lastRun.location);
}
```

## Telemetry

### Log Event

```typescript
this.telemetry.logEvent({
  category: "query",
  name: "run",
  severity: "info",
  message: `Query ${query.id} executed successfully`,
  context: {
    queryId: query.id,
    rowCount: rows.length,
    mode: "global",
  },
});
```

### Error Normalization

```typescript
try {
  // Excel operation
} catch (error) {
  const result = this.telemetry.normalizeError(error, "upsertQueryTable", { queryId: query.id });
  console.error(result.error.message);
}
```

## UI Primitives

### Button

```typescript
<app-button
  [label]="text.nav.queries"
  [variant]="'primary'"
  [size]="'medium'"
  [disabled]="!canRun"
  [iconName]="'play'"
  (clicked)="runQuery(query)">
</app-button>
```

### Table

```typescript
columns: UiTableColumnDef[] = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'status', label: 'Status' }
];

<app-table
  [columns]="columns"
  [rows]="queries"
  [rowKey]="'id'">
</app-table>
```

### Section

```typescript
<app-section
  [title]="'Global Parameters'"
  [variant]="'default'">
  <!-- Content -->
</app-section>
```

### Status Banner

```typescript
<app-status-banner
  [type]="'warning'"
  [title]="'Excel Not Detected'"
  [message]="text.hostStatus.excelNotDetected">
</app-status-banner>
```

## Role Checks

### Component

```typescript
ngOnInit() {
  this.canRun = this.auth.hasAnyRole(['analyst', 'admin']);
}
```

### Template

```html
<div *ngIf="auth.hasRole('admin')">
  <!-- Admin-only content -->
</div>
```

## Parameter Management

### Global Parameters

```typescript
// Get
const global = this.queryState.getGlobalParams();

// Set
this.queryState.setGlobalParams({
  StartDate: "2025-01-01",
  EndDate: "2025-01-31",
  Group: "Sales",
  SubGroup: "West",
});
```

### Per-Query Overrides

```typescript
// Get effective params (global + overrides)
const params = this.queryState.getEffectiveParams(queryId, "unique");

// Set override
this.queryState.setQueryParams(queryId, {
  StartDate: "2025-02-01",
});
```

## Configuration Management

### Create Configuration

```typescript
const config: QueryConfiguration = {
  id: crypto.randomUUID(),
  name: "Monthly Sales Report",
  description: "Sales queries for monthly review",
  selectedQueries: [
    {
      id: crypto.randomUUID(),
      apiId: "sales-summary",
      name: "Sales Summary",
      parameters: { Group: "Sales" },
      targetSheet: "SalesData",
      targetTable: "tbl_Sales",
      writeMode: "overwrite",
      includeInBatch: true,
    },
  ],
  globalParameters: this.queryState.getGlobalParams(),
  workbookIdentity: "monthly-report.xlsx",
  createdAt: Date.now(),
  modifiedAt: Date.now(),
};

this.configService.saveConfiguration(config);
```

### Load Configuration

```typescript
const configs = this.configService.getConfigurations();
const config = configs.find((c) => c.id === configId);
if (config) {
  // Apply to state
  this.queryState.setGlobalParams(config.globalParameters);
}
```

## Storage Patterns (Phase 4)

### Multi-Tier Storage

**Tier 1 (localStorage) - Small Data (< 100 KB)**
```typescript
// Read
const settings = this.storage.getItem<Settings>('settings', DEFAULT_SETTINGS);

// Write
this.storage.setItem('settings', updatedSettings);

// Remove
this.storage.removeItem('settings');
```

**Tier 2 (IndexedDB) - Large Data (100 KB+)**
```typescript
// Read (async)
const cached = await this.storage.getLargeItem<any[]>('query-results-sales');

// Write (async with TTL)
await this.storage.setLargeItem('query-results-sales', rows, 3600000); // 1 hour

// Clear expired
await this.storage.clearExpiredCache();
```

### Backup/Restore

**Export**
```typescript
exportBackup(): void {
  this.backupRestore.exportBackup();
  // Downloads: excel-extension-backup-{timestamp}.json
}
```

**Import**
```typescript
async onFileSelected(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;

  const file = input.files[0];
  try {
    await this.backupRestore.importBackup(file);
    // App reloads to apply restored state
  } catch (error) {
    console.error('Import failed:', error.message);
  }
  input.value = ''; // Reset for re-selection
}
```

### Configuration Validation

```typescript
// Validate before save
const result = this.validator.validateConfiguration(config);
if (!result.valid) {
  throw new Error(`Invalid config: ${result.errors.join(', ')}`);
}

// QueryConfigurationService validates automatically on save
this.configService.save(config);
```

### Cache Check Pattern

```typescript
// Check cache before expensive operation
async executeApi(apiId: string, params: ExecuteQueryParams): Promise<any[]> {
  const cacheKey = this.generateCacheKey(apiId, params);

  // Try cache first
  const cached = await this.indexedDB.getCachedQueryResult(cacheKey);
  if (cached) {
    return cached; // Use cached data
  }

  // Perform operation and cache result
  const rows = await this.generateData(apiId, params);
  await this.indexedDB.cacheQueryResult(cacheKey, rows, 3600000); // 1 hour TTL
  return rows;
}
```

## TSDoc Standards

````typescript
/**
 * Executes a query and writes results to Excel table.
 *
 * @param query - Query definition from catalog
 * @param rows - Data rows to write
 * @param params - Execution parameters
 * @returns Operation result with location or error
 *
 * @remarks
 * - Gated by `isExcel` check
 * - Uses workbook ownership for safe target selection
 * - Logs to telemetry on success/failure
 *
 * @example
 * ```typescript
 * const result = await excel.upsertQueryTable(query, rows, params);
 * if (result.ok) {
 *   console.log('Written to:', result.value.sheetName);
 * }
 * ```
 */
async upsertQueryTable(
  query: QueryDefinition,
  rows: any[],
  params: ExecuteQueryParams
): Promise<ExcelOperationResult<QueryRunLocation>>
````
