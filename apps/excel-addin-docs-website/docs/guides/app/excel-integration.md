---
sidebar_position: 4
title: Excel Integration
---

# Excel Integration

Working with Office.js and Excel APIs in the add-in.

## Core Services

### ExcelService

Primary interface for Excel operations. Wraps Office.js with safety guards.

```typescript
import { ExcelService } from "../../core/excel.service";

@Component({...})
export class MyComponent {
  private excel = inject(ExcelService);

  async writeData() {
    // Always check host first
    if (!this.excel.isExcel) {
      console.warn('Not in Excel');
      return;
    }

    const result = await this.excel.upsertQueryTable(apiId, target, rows);
    if (result.ok) {
      console.log('Success:', result.value.sheetName);
    } else {
      console.error('Error:', result.error.message);
    }
  }
}
```

### WorkbookService

Workbook-level operations: sheets, tables, ownership.

```typescript
import { WorkbookService } from "../../core/workbook.service";

// List all sheets
const sheets = await this.workbook.getSheets();

// List all tables
const tables = await this.workbook.getTables();

// Get specific table
const table = await this.workbook.getTableByName('tbl_Sales');

// Check if extension manages a table
const isManaged = await this.workbook.isExtensionManagedTable('tbl_Sales');
```

## Office.js Pattern

### Excel.run() Context

All Excel operations require a context:

```typescript
await Excel.run(async (ctx) => {
  // Load properties you need
  const sheet = ctx.workbook.worksheets.getActiveWorksheet();
  sheet.load("name");
  await ctx.sync();

  // Use loaded properties
  console.log(sheet.name);

  // Make changes
  sheet.getRange("A1").values = [["Hello"]];
  await ctx.sync();
});
```

### Load Pattern

Always load properties before accessing them:

```typescript
// BAD: Property not loaded
const table = ctx.workbook.tables.getItem("MyTable");
console.log(table.name); // Error!

// GOOD: Load then sync
const table = ctx.workbook.tables.getItem("MyTable");
table.load("name,rowCount");
await ctx.sync();
console.log(table.name); // Works!
```

### Batch Operations

Minimize syncs by batching operations:

```typescript
await Excel.run(async (ctx) => {
  const sheet = ctx.workbook.worksheets.getActiveWorksheet();
  
  // Queue multiple operations
  sheet.getRange("A1").values = [["Header 1"]];
  sheet.getRange("B1").values = [["Header 2"]];
  sheet.getRange("A2:B2").values = [["Value 1", "Value 2"]];
  
  // Single sync for all
  await ctx.sync();
});
```

## Query Table Operations

### Writing Query Results

```typescript
const target = {
  sheetName: 'SalesData',
  tableName: 'tbl_Sales'
};

const result = await this.excel.upsertQueryTable(apiId, target, rows);
if (result.ok) {
  const location = result.value;
  // location.sheetName, location.tableName, location.address
}
```

### Navigating to Results

```typescript
const location = this.queryState.getLastRun(queryId)?.location;
if (location) {
  await this.excel.activateQueryLocation(location);
}
```

## Ownership Model

The extension tracks which tables it manages to avoid overwriting user data.

### Metadata Storage

Hidden `_Extension_Ownership` sheet stores:

| sheetName | tableName | queryId | isManaged | lastTouchedUtc |
|-----------|-----------|---------|-----------|----------------|
| SalesData | tbl_Sales | sales-1 | true | 2025-01-15... |

### Ownership Rules

1. **First run:** Creates table, records ownership
2. **Rerun:** Finds managed table, overwrites data
3. **User conflict:** Creates suffixed table (`tbl_Sales_Query_sales-1`)

### Checking Ownership

```typescript
// Is this our table?
const isManaged = await this.workbook.isExtensionManagedTable('tbl_Sales');

// Get all tables we manage for a query
const tables = await this.workbook.getManagedTablesForQuery('sales-summary');
```

## Error Handling

### ExcelOperationResult

All Excel operations return typed results:

```typescript
interface ExcelOperationResult<T> {
  ok: boolean;
  value?: T;
  error?: {
    message: string;
    code: string;
    details?: unknown;
  };
}
```

### Common Error Codes

| Code | Meaning | Fix |
|------|---------|-----|
| `NOT_IN_EXCEL` | No Excel context | Check `isExcel` first |
| `TABLE_NOT_FOUND` | Table doesn't exist | Verify name or create |
| `CONFLICT` | Name collision | Use suffixed name |
| `PAYLOAD_TOO_LARGE` | Too much data | Reduce chunk size |

### Error Pattern

```typescript
const result = await this.excel.someOperation();
if (!result.ok) {
  switch (result.error.code) {
    case 'NOT_IN_EXCEL':
      // Show "open in Excel" message
      break;
    case 'CONFLICT':
      // Offer alternative name
      break;
    default:
      // Log and show generic error
      this.telemetry.logError(result.error);
  }
}
```

## Performance

### Chunked Writes

Large datasets are written in chunks:

```typescript
// Default: 1000 rows per chunk
// Configurable via Settings
await this.excel.upsertQueryTable(apiId, target, largeDataset);
// Internally calls writeRowsInChunks()
```

### Settings

Users can configure in Settings UI:

- `maxRowsPerQuery`: Maximum rows (default 10,000)
- `chunkSize`: Rows per write (default 1,000)
- `chunkBackoffMs`: Delay between chunks (default 100ms)

### Large Dataset Tips

- Reduce columns if possible
- Use smaller chunks for Excel Online
- Monitor telemetry for timing

## Testing

### Mocking ExcelService

```typescript
describe('MyComponent', () => {
  let excelSpy: jasmine.SpyObj<ExcelService>;

  beforeEach(() => {
    excelSpy = jasmine.createSpyObj('ExcelService', [
      'upsertQueryTable',
      'activateQueryLocation'
    ]);
    excelSpy.isExcel = false;

    TestBed.configureTestingModule({
      providers: [{ provide: ExcelService, useValue: excelSpy }]
    });
  });

  it('should skip when not in Excel', () => {
    excelSpy.isExcel = false;
    component.writeData();
    expect(excelSpy.upsertQueryTable).not.toHaveBeenCalled();
  });
});
```

## References

- [Office.js API Reference](https://learn.microsoft.com/en-us/javascript/api/excel)
- [Performance Optimization](https://learn.microsoft.com/en-us/office/dev/add-ins/concepts/resource-limits-and-performance-optimization)
- [Architecture: Performance](../../architecture/performance)
