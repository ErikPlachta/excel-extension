---
sidebar_position: 3
title: Performance & Large Datasets
---

# Performance & Large Datasets

Reference guide for handling large datasets in Excel add-ins.

## Excel Resource Limits

**Reference:** [Microsoft Docs - Resource limits and performance optimization](https://learn.microsoft.com/en-us/office/dev/add-ins/concepts/resource-limits-and-performance-optimization#excel-add-ins)

### Key Limits

- **Payload Size:** ~5MB per Office.js call
  - Exceeding this causes `RichApi.Error` (payload too large)
  - Applies to both data writes and reads

- **Cell Count:** ~1 million cells per operation (recommendation)
  - 10k rows × 100 columns = 1M cells (at limit)
  - Exceeding this degrades Excel performance

- **Memory:** Proxy objects accumulate in memory
  - Each Office.js object creates a proxy
  - Use `context.trackedObjects.remove()` or `obj.untrack()` to release
  - Memory leaks cause Excel slowdowns over time

- **Concurrent Requests:** Limit to 1-2 concurrent `Excel.run()` calls
  - Too many concurrent calls overwhelm Excel's runtime
  - Queue operations sequentially for large workloads

### Recommended Strategies

#### 1. Chunk Large Writes

Break data into manageable batches and sync between chunks:

```typescript
// BAD: Write 10k rows at once (hits payload limit)
table.rows.add(null, allRows);

// GOOD: Write in 1000-row chunks
for (let i = 0; i < allRows.length; i += 1000) {
  const chunk = allRows.slice(i, i + 1000);
  table.rows.add(null, chunk);
  await ctx.sync();
  await sleep(100); // Backoff to prevent throttling
}
```

**Implementation:** See `ExcelService.writeRowsInChunks()`

#### 2. Untrack Proxy Objects

After reading/modifying Office.js objects, release them from tracking:

```typescript
const table = ctx.workbook.tables.getItem("MyTable");
table.load("name,rowCount");
await ctx.sync();

// Use table...
console.log(table.name, table.rowCount);

// Untrack when done
table.untrack();
// or: ctx.trackedObjects.remove(table);
```

**Status:** Not yet implemented (future optimization)

#### 3. API Pagination

Fetch data in pages from API to reduce memory footprint:

```typescript
// Stream large dataset in pages
for await (const page of queryApi.executeApiPaginated(apiId, params, 1000)) {
  // Process each page (1000 rows)
  await writeToExcel(page);
}
```

**Implementation:** `executeApiPaginated()` available in QueryApiMockService

#### 4. Progressive Loading

Show first chunk immediately, queue rest for background write:

```typescript
// User sees first 1000 rows instantly
const firstChunk = rows.slice(0, 1000);
await excel.upsertQueryTable(query, firstChunk);

// Queue remaining rows for background processing
const remaining = rows.slice(1000);
// TODO: Background queue implementation
```

**Status:** Deferred (requires append mode or background queue)

## Testing Large Datasets

### Test Queries

**Available in QueryApiMockService:**

- **`large-dataset`** (10k rows × 30 columns)
  - Tests chunking logic with realistic dataset
  - Should complete in ~10 seconds with 10 chunks

- **`synthetic-expansion`** (25k rows × 40 columns)
  - Tests row limit enforcement (truncates to 10k by default)
  - Useful for stress testing chunking

### Expected Behavior

**10k rows (default maxRows):**

- Completes without errors
- Telemetry shows 10 chunks written
- Each chunk sync takes ~100-200ms
- Total time ~10-15 seconds

**25k rows (exceeds maxRows):**

- QueryApiMockService truncates to 10k rows
- Warning logged: `executeApi:rowLimitExceeded`
- User sees first 10k rows only
- Telemetry context shows `{rowCount: 25000, maxRows: 10000, truncated: true}`

**Chunk size = 500:**

- 10k rows → 20 chunks instead of 10
- Slower total time (~20 seconds) but safer for Excel Online

### Failure Modes & Fixes

**Error: `RichApi.Error` (Payload too large)**

- **Cause:** Chunk size too large for dataset width
- **Fix:** Reduce `chunkSize` in Settings (try 500 or 250)

**Excel becomes unresponsive during write**

- **Cause:** Insufficient backoff between chunks
- **Fix:** Increase `chunkBackoffMs` in Settings (try 200-500ms)

**Memory errors or Excel crash**

- **Cause:** Too many rows or proxy object accumulation
- **Fix:** Reduce `maxRowsPerQuery` in Settings (try 5000)
- **Future:** Implement proxy untracking

## Manual Testing

### Excel Desktop (macOS/Windows)

1. Sideload add-in: `npm run start:dev` → Upload `dev-manifest.xml`
2. Go to **Settings** → verify Query Execution section visible
3. Set **maxRows=5000**, **chunkSize=500**
4. Navigate to **Queries** view
5. Run **`large-dataset`** query
6. **Expected:** 5000 rows in Excel, 10 chunks logged to console
7. Check telemetry logs: `writeRowsInChunks:chunk` events
8. Run **`synthetic-expansion`** query
9. **Expected:** Truncated to 5000 rows, warning in console

### Excel Online (Chrome)

1. Sideload add-in to Office 365 account
2. Open workbook in Excel Online
3. Repeat steps 2-9 from Desktop testing
4. **Note:** Excel Online may be slower than Desktop (increase backoff if needed)

### Performance Monitoring

Check browser DevTools console for telemetry:

```
[excel] writeRowsInChunks:chunk
  chunkIndex: 0, totalChunks: 10, chunkSize: 500, totalRows: 5000

[excel] writeQueryTableData:progress
  chunk: 1, total: 10, rowsWritten: 500, totalRows: 5000

[query] executeApi:rowLimitExceeded
  apiId: "synthetic-expansion", rowCount: 25000, maxRows: 5000
```

## Performance Tips

### For Large Datasets (10k+ rows)

1. **Reduce column count** if possible (fewer columns = smaller payload)
2. **Use smaller chunk size** (500-750) for safety
3. **Enable only essential columns** in query results
4. **Consider pagination** for 50k+ row datasets (stream to Excel)

### For Wide Datasets (50+ columns)

1. **Reduce chunk size** to 250-500 rows
2. **Increase backoff** to 200-300ms
3. **Monitor payload size** in telemetry context
4. **Consider splitting** into multiple queries if >100 columns

### For Excel Online

1. **Use smaller chunks** (500 vs 1000) - network overhead higher
2. **Increase backoff** (200-300ms) - cloud Excel slower than Desktop
3. **Limit to 5k rows** for optimal UX - network latency compounds
4. **Test on real Office 365** - localhost testing doesn't reflect production

## Configuration Reference

### QueryExecutionSettings

**File:** `src/app/types/settings.types.ts`

```typescript
interface QueryExecutionSettings {
  maxRowsPerQuery: number; // Default: 10000
  chunkSize: number; // Default: 1000
  enableProgressiveLoading: boolean; // Default: true
  apiPageSize: number; // Default: 1000
  chunkBackoffMs: number; // Default: 100
}
```

### Defaults

**File:** `src/app/core/settings.service.ts`

```typescript
queryExecution: {
  maxRowsPerQuery: 10000,    // 10k row hard limit
  chunkSize: 1000,           // 1k rows per chunk
  enableProgressiveLoading: true,
  apiPageSize: 1000,         // API pagination size
  chunkBackoffMs: 100,       // 100ms delay between chunks
}
```

### User Overrides

Users can customize via Settings UI:

- Settings → Query Execution section
- All changes persist to localStorage
- Takes effect immediately for new query runs

## Future Enhancements

- Proxy object untracking (reduce memory)
- Progressive loading implementation (fast perceived performance)
- API pagination in query execution (stream large datasets)
- Memory budget tracking (telemetry for memory usage)
- Adaptive chunking (adjust chunk size based on column count)
- Background queue for non-blocking writes (append mode)
