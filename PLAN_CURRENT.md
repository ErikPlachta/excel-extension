# Current Phase: Phase 3 - Excel/Workbook Refactor

**Sub-Branch:** `feat/excel-workbook-cleanup` (from `feat/finalize-concept`)
**Status:** Starting
**Estimated:** 2-3 days
**Priority:** MEDIUM (cleanup, not blocking)
**Depends On:** Phase 2 (config-driven) ✅

---

## Goals

1. Move ALL ownership logic to `WorkbookService`
2. Extract `upsertQueryTable` complexity into focused helpers
3. Define clear service boundaries (Excel = Office.js, Workbook = state/ownership)
4. Expose ownership write helpers in `WorkbookService`
5. Remove ownership code from `ExcelService`

---

## Success Criteria

- [ ] `ExcelService` has zero ownership lookups (delegates to `WorkbookService`)
- [ ] `WorkbookService` has `recordOwnership()`, `updateOwnership()`, `deleteOwnership()` methods
- [ ] `upsertQueryTable()` uses `WorkbookService` for all ownership decisions
- [ ] No `getWorkbookOwnership()` calls in `ExcelService` outside read helpers
- [ ] Tests pass (ownership helpers unit tested)
- [ ] TSDoc updated for service boundaries

---

## Implementation Steps

### Step 1: Add Ownership Write Helpers to WorkbookService
- Add `recordOwnership(info)` → Creates/updates row in _Extension_Ownership
- Add `updateOwnership(queryId, sheet, table)` → Updates lastTouchedUtc
- Add `deleteOwnership(queryId, sheet, table)` → Removes ownership record
- Add `getOrCreateManagedTableTarget(query)` → Returns safe target with conflict resolution

### Step 2: Add Low-Level Ownership Helpers to ExcelService
- Add `writeOwnershipRecord(record)` → Low-level write to ownership table
- Add `deleteOwnershipRecord(queryId, sheet, table)` → Low-level delete
- Mark as low-level, callers should use WorkbookService

### Step 3: Extract Helper Methods in ExcelService
- Extract `computeHeaderAndValues(rows)` from upsertQueryTable
- Extract `writeTableData(sheet, table, header, values, isNew)` from upsertQueryTable
- Keep focused, single-responsibility methods

### Step 4: Refactor upsertQueryTable
- Use `workbook.getOrCreateManagedTableTarget(query)` for target resolution
- Use extracted `computeHeaderAndValues(rows)` for data prep
- Use extracted `writeTableData()` for Excel write
- Use `workbook.recordOwnership()` or `updateOwnership()` for tracking
- Remove all inline ownership logic

### Step 5: Update Tests
- Add WorkbookService ownership tests
- Update ExcelService tests to verify delegation
- Ensure all tests pass

### Step 6: Update Documentation
- Update TSDoc for service boundaries
- Update .claude/ARCHITECTURE.md with ownership flow

---

## File Changes

### Modified
- `src/app/core/workbook.service.ts` - Add ownership write methods + target resolution
- `src/app/core/excel.service.ts` - Add low-level helpers, refactor upsertQueryTable
- `src/app/core/workbook.service.spec.ts` - Add ownership write tests
- `src/app/core/excel.service.spec.ts` - Update for delegation
- `.claude/ARCHITECTURE.md` - Document service boundaries

### No New Files
All changes are refactors/enhancements to existing services

---

## Service Boundaries (Target State)

### ExcelService
**Responsibility:** Low-level Office.js wrapper
- Excel host detection
- Office.js Excel.run() operations
- Table/sheet creation/updates
- Low-level ownership writes (writeOwnershipRecord)
- **NO** ownership decisions or business logic

### WorkbookService
**Responsibility:** Workbook state & ownership management
- Read workbook structure (sheets, tables)
- Manage ownership tracking
- Resolve table targets with conflict handling
- Make ownership decisions
- Delegate to ExcelService for actual writes

---

## Next Phase

Phase 4: Storage & Caching (IndexedDB, backup/restore)
