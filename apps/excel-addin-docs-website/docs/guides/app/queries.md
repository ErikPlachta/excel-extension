---
sidebar_position: 2
title: Query System
---

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

From `libs/data/api/src/lib/query-api-mock.service.ts`:

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

## Best Practices

1. **Always use `QueryStateService` for parameters** – Don't manage params in components
2. **Always check `ExcelService.isExcel`** – Guard all Excel operations
3. **Always consume `ExcelOperationResult`** – No throws, handle errors gracefully
4. **Always use `WorkbookService` for ownership** – Don't assume table names
5. **Always log to `TelemetryService`** – Centralized observability
6. **Use queue for batch runs** – Prevent resource contention
7. **Store last run location** – Enable "Go to table" navigation
