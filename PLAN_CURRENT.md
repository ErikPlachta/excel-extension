# Phase 6: Performance & Large Datasets

**Branch:** `feat/performance-large-datasets`
**Depends On:** Phase 5 (Auth/Settings/Telemetry refactor)
**Priority:** HIGH (production readiness for large datasets)
**Status:** ✅ COMPLETED

## Goals

1. Handle large datasets (10k+ rows) efficiently without Excel crashes
2. Stay within Office.js ~5MB payload limit per operation
3. User-configurable performance settings (chunk size, row limits, backoff)
4. Comprehensive documentation for large dataset handling
5. Telemetry for performance monitoring

## Success Criteria

- [x] Chunked Excel writes (default 1000 rows, configurable)
- [x] Row limit enforcement (default 10k, configurable)
- [x] User-configurable settings in UI (maxRows, chunkSize, backoff)
- [x] Telemetry for chunk progress and row limit warnings
- [x] PERFORMANCE.md documentation (Excel limits, strategies, testing)
- [x] Settings UI for Query Execution configuration
- [x] All tests passing (184/184)
- [x] Documentation updated (ARCHITECTURE.md, CLAUDE.md, README.md)

## Implementation Summary

### Core Services Modified

**ExcelService** (`src/app/core/excel.service.ts`)
- Added `writeRowsInChunks()` method with configurable chunk size and backoff
- Integrated with `SettingsService` for configuration
- Telemetry for chunk progress
- Automatically used by `writeQueryTableData()` for all query writes

**QueryApiMockService** (`src/app/shared/query-api-mock.service.ts`)
- Enforces `maxRowsPerQuery` limit from settings
- Truncates results exceeding limit with telemetry warning
- Integrated with `SettingsService` and `TelemetryService`

**SettingsService** (`src/app/core/settings.service.ts`)
- Added `QueryExecutionSettings` interface to settings types
- Deep merge support for queryExecution updates
- Defaults: maxRowsPerQuery=10000, chunkSize=1000, chunkBackoffMs=100

### User Interface

**Settings Component** (`src/app/features/settings/`)
- Query Execution section with user controls:
  - Max rows per query (number input, 100-100000)
  - Chunk size for Excel writes (number input, 100-5000)
  - Enable progressive loading (checkbox, placeholder for future)
- Changes persist to localStorage immediately
- Telemetry logged for all setting changes

### Documentation

**Created:**
- `.claude/PERFORMANCE.md` - Comprehensive guide covering:
  - Excel resource limits (~5MB payload, ~1M cells, proxy object management)
  - Chunked write strategy and implementation details
  - User-configurable limits and settings
  - Testing strategies for large datasets
  - Failure modes and fixes
  - Manual testing procedures
  - Configuration reference

**Updated:**
- `.claude/ARCHITECTURE.md` - Added Phase 6 details to service descriptions
- `.claude/CLAUDE.md` - Added Performance & Large Datasets section
- `.claude/README.md` - Added PERFORMANCE.md to file list
- `README.md` - Added Performance and large datasets section

## Technical Details

### Chunked Writes

```typescript
// ExcelService.writeRowsInChunks()
private async writeRowsInChunks(
  ctx: any,
  table: any,
  rows: unknown[][],
  chunkSize: number = 1000,
  backoffMs: number = 100,
  onChunkWritten?: (chunkIndex: number, totalChunks: number) => void
): Promise<void>
```

- Breaks data into configurable batches (default 1000 rows)
- Syncs after each batch to stay within Office.js payload limit
- Configurable backoff between chunks (default 100ms) to prevent throttling
- Telemetry for each chunk with context (chunkIndex, totalChunks, rowCount)
- Progress callback for UI updates

### Row Limit Enforcement

```typescript
// QueryApiMockService.executeApiUncached()
const maxRows = this.settings.value.queryExecution?.maxRowsPerQuery ?? 10000;
if (rows.length > maxRows) {
  this.telemetry.logEvent({
    category: 'query',
    name: 'executeApi:rowLimitExceeded',
    severity: 'warn',
    context: { apiId, rowCount: rows.length, maxRows, truncated: true }
  });
  return rows.slice(0, maxRows);
}
```

### Settings Schema

```typescript
interface QueryExecutionSettings {
  maxRowsPerQuery: number;        // Default: 10000
  chunkSize: number;              // Default: 1000
  enableProgressiveLoading: boolean; // Default: true (placeholder)
  apiPageSize: number;            // Default: 1000 (for future pagination)
  chunkBackoffMs: number;         // Default: 100
}
```

## Testing

**Test Results:**
- Unit tests: 184/184 passing ✅
- Build: Successful ✅

**Manual Testing:**
- Test with `large-dataset` query (10k rows × 30 columns)
- Test with `synthetic-expansion` query (25k rows, truncated to 10k)
- Verify Settings UI updates persist
- Verify telemetry logs chunk progress
- Verify row limit warnings appear

## Files Modified (8)

**Core Implementation:**
- `src/app/types/settings.types.ts` - Added QueryExecutionSettings interface
- `src/app/core/settings.service.ts` - Added defaults, deep merge
- `src/app/core/excel.service.ts` - Added writeRowsInChunks(), SettingsService injection
- `src/app/shared/query-api-mock.service.ts` - Added row limit enforcement

**UI:**
- `src/app/features/settings/settings.component.html` - Query Execution section
- `src/app/features/settings/settings.component.ts` - Event handlers

**Tests:**
- `src/app/core/excel.service.spec.ts` - Mock SettingsService

**Documentation:**
- `.claude/PERFORMANCE.md` (NEW)
- `.claude/ARCHITECTURE.md`
- `.claude/CLAUDE.md`
- `.claude/README.md`
- `README.md`
- `PLAN_CURRENT.md`

## Future Enhancements

Deferred to future phases:
- [ ] Progressive loading implementation (show first chunk immediately, queue rest)
- [ ] API pagination with `executeApiPaginated()` generator
- [ ] Proxy object untracking for memory optimization
- [ ] Adaptive chunking based on column count
- [ ] Background queue for non-blocking writes
- [ ] Memory budget tracking via telemetry

## Exit Criteria

All criteria met ✅:
- [x] Chunked writes implemented and tested
- [x] Row limits enforced with telemetry
- [x] Settings UI functional and persistent
- [x] Comprehensive documentation created
- [x] All tests passing (184/184)
- [x] Build successful
- [x] Architecture docs updated
- [x] Ready for commit and merge
