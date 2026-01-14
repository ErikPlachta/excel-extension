# Plan: Large Dataset Handling Quality Controls

## Problem Summary
The codebase lacks critical quality controls for handling large datasets (5k-25k rows). Key gaps:
- No error recovery for partial chunk failures
- No transaction safety (partial writes leave orphaned data)
- No timeouts (operations can hang indefinitely)
- No post-write validation
- No rate limiting on concurrent API requests

## Critical Issues Found

| Severity | Issue | Location |
|----------|-------|----------|
| CRITICAL | Partial write not rolled back on error | excel.service.ts:282 |
| CRITICAL | `writeRowsInChunks` has no per-chunk error handling | excel.service.ts:535-576 |
| CRITICAL | `recordOwnership()` called after potential partial write | excel.service.ts:305 |
| HIGH | `fetchSyntheticExpansion()` creates 25k rows but limit is 10k | query-api-mock.service.ts:648 |
| HIGH | `Promise.all()` on API calls - no rate limiting | query-api-mock.service.ts:449-451 |
| HIGH | No timeout on `Excel.run()` or `fetch()` calls | Multiple files |
| MEDIUM | Silent truncation to maxRows with only telemetry warning | query-api-mock.service.ts:171-185 |

## Recommended Implementation

### Phase 1: Critical Safety (Priority 1)

#### 1.1 Add Per-Chunk Error Recovery
**File:** `libs/core/excel/src/lib/excel.service.ts`

Wrap each chunk write in try-catch within `writeRowsInChunks()`:
- Track which chunks succeeded
- On failure: log failed chunk range, attempt cleanup of partial data
- Return detailed result object with success/failure per chunk

#### 1.2 Add Transaction Safety
**File:** `libs/core/excel/src/lib/excel.service.ts`

Move `recordOwnership()` inside `writeQueryTableData()` AFTER all chunks complete:
- Only record ownership if ALL chunks succeed
- On partial failure: delete the partial table data
- Return `partial_failure` status instead of `ok`

#### 1.3 Add Post-Write Validation
**File:** `libs/core/excel/src/lib/excel.service.ts`

After final `ctx.sync()`:
- Load table row count
- Verify it matches expected count
- Log discrepancy as error if mismatch

#### 1.4 Add Timeout Guards
**Files:** `libs/core/excel/src/lib/excel.service.ts`, `libs/data/api/src/lib/query-api-mock.service.ts`

- Wrap `Excel.run()` with Promise.race() timeout (30s default)
- Add AbortController to fetch calls with timeout
- Fail cleanly with specific timeout error

### Phase 2: High Priority Improvements

#### 2.1 Fix Synthetic Expansion Row Count
**File:** `libs/data/api/src/lib/query-api-mock.service.ts`

- Enforce 10k limit BEFORE expansion
- Or return error if expansion would exceed limit
- Add validation that output respects maxRows

#### 2.2 Rate-Limit Concurrent API Requests
**File:** `libs/data/api/src/lib/query-api-mock.service.ts`

- Add promise queue (pLimit pattern) to limit concurrent fetches to ≤10
- Apply to `fetchLargeDataset()`, `fetchMixedDataset()`, etc.

#### 2.3 Add Pre-Write Shape Validation
**File:** `libs/core/excel/src/lib/excel.service.ts`

Before writing:
- Validate all rows have same column count
- Check cell values don't exceed 32k char limit
- Fail fast with specific error if validation fails

### Phase 3: Quality Improvements

#### 3.1 Add Operation Timeout Settings
**File:** `libs/shared/types/src/lib/settings.types.ts`

- Add `maxExecutionTimeMs` setting (default: 120000)
- Add `fetchTimeoutMs` setting (default: 30000)

#### 3.2 Improve Error Classification
**File:** `libs/core/excel/src/lib/excel.service.ts`

Distinguish between:
- Transient errors (timeout, Excel busy) → can retry
- Permanent errors (bad data, payload too large) → fail fast
- Resource errors (memory, Excel limits) → reduce batch size

## Files to Modify

| File | Changes |
|------|---------|
| `libs/core/excel/src/lib/excel.service.ts` | Error recovery, transaction safety, validation, timeouts |
| `libs/data/api/src/lib/query-api-mock.service.ts` | Row limits, rate limiting, fetch timeouts |
| `libs/shared/types/src/lib/settings.types.ts` | Timeout settings |
| `libs/shared/types/src/lib/excel.types.ts` | Result types with partial_failure status |

## Verification

1. **Chunk failure recovery**: Simulate failure mid-write, verify partial data cleaned up
2. **Timeout behavior**: Test with slow network, verify clean timeout error
3. **Row validation**: Test with 25k synthetic-expansion, verify proper handling
4. **Rate limiting**: Monitor concurrent requests, verify ≤10 simultaneous

## Implementation Order

1. [x] Add timeout guards (prevents hangs - immediate safety)
2. [x] Add per-chunk error recovery with cleanup
3. [x] Move recordOwnership inside writeQueryTableData
4. [x] Add post-write row count validation
5. [x] Fix synthetic expansion row limit (made configurable)
6. [x] Add rate limiting to API fetches
7. [x] Add pre-write shape validation
8. [x] Add timeout settings to configuration

## Implemented Decisions

- Timeout values: 30s for fetches, 120s for total operation (configurable via settings)
- Partial failures auto-cleanup by default (configurable via cleanupOnPartialFailure)
- Row limit is configurable via maxRowsPerQuery setting
- Synthetic expansion now auto-adjusts base rows to stay within limits
