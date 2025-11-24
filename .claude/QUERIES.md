# Query System

Deep dive into the query architecture: parameters, configurations, queue, execution.

## Overview

Queries are data-driven with multiple layers:

1. **API Catalog** – `QueryDefinition` (alias `ApiDefinition`) from `QueryApiMockService`
2. **Parameters** – Global + per-query via `QueryStateService`
3. **Configurations** – Reusable named configs via `QueryConfigurationService`
4. **Execution** – Queued runs via `QueryQueueService`
5. **Results** – Written to Excel via `ExcelService` + `WorkbookService`

## API Catalog

### QueryDefinition / ApiDefinition

From `src/app/shared/query-api-mock.service.ts`:

```typescript
interface QueryDefinition {
  id: string;
  name: string;
  description: string;
  parameters: QueryParameter[];
  defaultSheetName: string;
  defaultTableName: string;
  allowedRoles?: RoleId[];
  uiConfig?: QueryUiConfig;
}
```

**Examples:**

- `sales-summary` – Sales data
- `top-customers` – Customer rankings
- `inventory-status` – Stock levels
- `user-audit` – Admin-only user/role data
- `jsonapi-example` – Live HTTP call to JSONPlaceholder

### Execution

```typescript
const rows = await queryApi.executeQuery(queryId, params);
```

Returns `any[]` (mock data or HTTP response mapped to rows).

## Parameters

### Types

```typescript
type QueryParameterKey = "StartDate" | "EndDate" | "Group" | "SubGroup";

interface QueryParameterValues {
  StartDate?: string;
  EndDate?: string;
  Group?: string;
  SubGroup?: string;
}
```

### Global Parameters

Shared across all queries. Set via top-level panel in `QueryHomeComponent`.

```typescript
// Get
const global = queryState.getGlobalParams();

// Set
queryState.setGlobalParams({
  StartDate: "2025-01-01",
  EndDate: "2025-01-31",
  Group: "Sales",
  SubGroup: "West",
});
```

### Per-Query Overrides

Override global params for individual queries.

```typescript
// Set
queryState.setQueryParams(queryId, {
  StartDate: "2025-02-01", // Override global StartDate
});

// Get effective (global + overrides)
const params = queryState.getEffectiveParams(queryId, "unique");
```

### Modes

- **Global** – Use `globalParams` for all selected queries
- **Unique** – Use `globalParams` + per-query `queryParams` overrides

### UI

- **Global panel** – Date inputs, dropdowns for Group/SubGroup
- **Per-query details** – Same inputs, per-query overrides
- **Run checkboxes** – Select queries for batch run
- **Batch buttons** – "Run – Use Global Params" / "Run – Use Unique Parameters"

## Configurations

### QueryConfiguration

Reusable named configuration:

```typescript
interface QueryConfiguration {
  id: string;
  name: string;
  description: string;
  selectedQueries: QueryConfigurationItem[];
  globalParameters: QueryParameterValues;
  workbookIdentity?: string;
  createdAt: number;
  modifiedAt: number;
  isDeleted?: boolean;
}
```

### QueryConfigurationItem

Selected query instance:

```typescript
interface QueryConfigurationItem {
  id: string; // Unique instance ID
  apiId: string; // Links to QueryDefinition
  name: string; // Display name
  parameters: QueryParameterValues;
  targetSheet: string;
  targetTable: string;
  writeMode: "overwrite" | "append";
  includeInBatch: boolean;
}
```

### Usage

```typescript
// Save
const config: QueryConfiguration = {
  id: crypto.randomUUID(),
  name: "Monthly Sales Report",
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
  globalParameters: { StartDate: "2025-01-01", EndDate: "2025-01-31" },
  createdAt: Date.now(),
  modifiedAt: Date.now(),
};

configService.saveConfiguration(config);

// Load
const configs = configService.getConfigurations();
const config = configs[0];

// Apply
queryState.setGlobalParams(config.globalParameters);
```

Storage: `localStorage`, keyed by user + workbook context.

## Queue

### QueryQueueService

Sequential execution to prevent resource contention.

```typescript
interface QueueItem {
  queryId: string;
  params: ExecuteQueryParams;
  priority?: number;
}

queueService.enqueue(item);
queueService.start();
```

### Behavior

- One query at a time
- Telemetry for queue events (`query.queue.enqueued`, `started`, `completed`, `failed`)
- Pagination/resource management (max rows per run)

### Integration

Batch run flows use queue:

```typescript
async runBatch(mode: 'global' | 'unique') {
  const selectedQueries = this.queries.filter(q => this.runFlags[q.id]);

  for (const query of selectedQueries) {
    const params = this.queryState.getEffectiveParams(query.id, mode);
    this.queueService.enqueue({ queryId: query.id, params });
  }

  this.queueService.start();
}
```

## Execution Flow

```
1. User clicks "Run" (single or batch)
2. QueryHomeComponent.runQuery() or runBatch()
3. Get effective parameters (global + overrides, mode-dependent)
4. QueryApiMockService.executeQuery(id, params) → rows
5. ExcelService.upsertQueryTable(query, rows, params)
   a. WorkbookService checks ownership
   b. Create/update table in Excel
   c. TelemetryService logs operation
6. QueryRunLocation returned
7. QueryStateService.setLastRun(queryId, { location, timestamp, rowCount })
8. UI updates (last run time, success/failure badge)
```

## Excel Integration

### upsertQueryTable

```typescript
const result = await excelService.upsertQueryTable(query, rows, params);

if (result.ok) {
  const location: QueryRunLocation = result.value;
  console.log("Written to:", location.sheetName, location.tableName);
} else {
  console.error("Failed:", result.error.message);
}
```

### Ownership

- First run: Creates managed table, records in `_Extension_Ownership`
- Rerun: Finds managed table, overwrites data (header stays)
- User table conflict: Creates suffixed alternate (`tbl_Sales_Query_sales-summary`)

### Write Modes

**Currently: Overwrite only**

- Header row written once (creation)
- Rerun: Clear data body rows, write new rows
- Header stays anchored
- Append mode removed (too brittle, may revisit)

### Navigation

```typescript
const lastRun = queryState.getLastRun(queryId);
if (lastRun?.location) {
  await excelService.activateQueryLocation(lastRun.location);
}
```

## Telemetry

### Events

- `query.run.requested` – Single query run
- `query.run.completed` – Success (queryId, rowCount, mode)
- `query.run.failed` – Error (queryId, error message)
- `query.batch.run.requested` – Batch run (mode, selected query IDs)
- `query.batch.run.completed` – Batch complete (successes, failures)
- `query.queue.enqueued` / `started` / `completed` / `failed` – Queue events

### Context

Events include:

- `queryId`
- `mode` ('global' / 'unique')
- `rowCount`
- `parameters` (summarized)
- `sessionId`
- `hostStatus` (isExcel, isOnline)
- `authSummary` (user, roles)

### Workbook Logging

When enabled in Settings, events written to `_Extension_Log` table:

- Timestamp
- Level (info/error)
- Operation (query.run, etc.)
- Message
- Session ID
- Correlation ID

## UI Config

### QueryUiConfig

Per-query UI behavior:

```typescript
interface QueryUiConfig {
  badgeLabelKey?: string;
  actions?: QueryUiActionConfig[];
}

interface QueryUiActionConfig {
  type: "run-query" | "go-to-table" | "show-details";
  labelKey: string;
  iconName?: UiIconName;
  variant?: UiButtonVariant;
}
```

### Example

```typescript
const query: QueryDefinition = {
  id: "sales-summary",
  // ...
  uiConfig: {
    badgeLabelKey: "query.badge.adminOnly",
    actions: [
      { type: "run-query", labelKey: "query.action.run", variant: "primary" },
      { type: "go-to-table", labelKey: "query.action.goToTable", variant: "default" },
      { type: "show-details", labelKey: "query.action.details", variant: "default" },
    ],
  },
};
```

Buttons rendered from config, dispatcher routes `type` to methods.

## Best Practices

1. **Always use `QueryStateService` for parameters** – Don't manage params in components
2. **Always check `ExcelService.isExcel`** – Guard all Excel operations
3. **Always consume `ExcelOperationResult`** – No throws, handle errors gracefully
4. **Always use `WorkbookService` for ownership** – Don't assume table names
5. **Always log to `TelemetryService`** – Centralized observability
6. **Use queue for batch runs** – Prevent resource contention
7. **Store last run location** – Enable "Go to table" navigation
8. **TSDoc all new types/methods** – Strict documentation standards
