# Phase 3: Excel/Workbook Refactor

**Sub-Branch:** `feat/excel-workbook-cleanup`
**Depends On:** Phase 2 (config-driven)
**Priority:** MEDIUM (cleanup, not blocking)
**Status:** PENDING

---

## Goals

1. Move ALL ownership logic to `WorkbookService`
2. Extract `upsertQueryTable` complexity into focused helpers
3. Define clear service boundaries (Excel = Office.js, Workbook = state/ownership)
4. Expose ownership write helpers in `WorkbookService`
5. Remove ownership code from `ExcelService`

## Success Criteria

- [ ] `ExcelService` has zero ownership lookups (delegates to `WorkbookService`)
- [ ] `WorkbookService` has `recordOwnership()`, `updateOwnership()`, `deleteOwnership()` methods
- [ ] `upsertQueryTable()` uses `WorkbookService` for all ownership decisions
- [ ] No `getWorkbookOwnership()` calls in `ExcelService` outside read helpers
- [ ] Tests pass (ownership helpers unit tested)
- [ ] TSDoc updated for service boundaries

---

## Technical Approach

### 3.1: Expose Ownership Write Helpers

**Update:** `src/app/core/workbook.service.ts`

```typescript
@Injectable({ providedIn: "root" })
export class WorkbookService {
  constructor(private excel: ExcelService) {}

  /**
   * Record ownership for a managed table.
   */
  async recordOwnership(info: {
    queryId: string;
    sheetName: string;
    tableName: string;
  }): Promise<void> {
    const record: WorkbookOwnershipInfo = {
      sheetName: info.sheetName,
      tableName: info.tableName,
      queryId: info.queryId,
      isManaged: true,
      lastTouchedUtc: new Date().toISOString(),
    };
    await this.excel.writeOwnershipRecord(record);
  }

  /**
   * Update ownership last touched time.
   */
  async updateOwnership(queryId: string, sheetName: string, tableName: string): Promise<void> {
    const ownership = await this.getOwnership();
    const existing = ownership.find(
      (o) => o.queryId === queryId && o.sheetName === sheetName && o.tableName === tableName
    );
    if (existing) {
      existing.lastTouchedUtc = new Date().toISOString();
      await this.excel.writeOwnershipRecord(existing);
    }
  }

  /**
   * Delete ownership record.
   */
  async deleteOwnership(queryId: string, sheetName: string, tableName: string): Promise<void> {
    await this.excel.deleteOwnershipRecord(queryId, sheetName, tableName);
  }

  /**
   * Get or create safe target for query, checking ownership and conflicts.
   */
  async getOrCreateManagedTableTarget(query: QueryConfiguration): Promise<{
    sheetName: string;
    tableName: string;
    isNew: boolean;
  }> {
    const tables = await this.getTables();
    const ownership = await this.getOwnership();

    // Check if query already has a managed table
    const existingManaged = tables.find((t) =>
      ownership.some(
        (o) => o.isManaged && o.queryId === query.apiId &&
               o.tableName === t.name && o.sheetName === t.worksheet
      )
    );

    if (existingManaged) {
      return {
        sheetName: existingManaged.worksheet,
        tableName: existingManaged.name,
        isNew: false,
      };
    }

    // Check for user table conflict
    const conflictingTable = tables.find(
      (t) => t.name === query.targetTableName && t.worksheet === query.targetSheetName
    );

    if (conflictingTable) {
      const suffix = `_Query_${query.apiId}`;
      return {
        sheetName: query.targetSheetName,
        tableName: `${query.targetTableName}${suffix}`,
        isNew: true,
      };
    }

    return {
      sheetName: query.targetSheetName,
      tableName: query.targetTableName,
      isNew: true,
    };
  }
}
```

### 3.2: Add Low-Level Write Helpers to ExcelService

**Update:** `src/app/core/excel.service.ts`

```typescript
/**
 * Write ownership record to _Extension_Ownership sheet.
 * Low-level helper. Callers should use WorkbookService.recordOwnership().
 */
async writeOwnershipRecord(record: WorkbookOwnershipInfo): Promise<void> {
  if (!this.isExcel) return;

  await Excel.run(async (ctx) => {
    const sheet = this.getOrCreateOwnershipSheet(ctx);
    const table = this.getOrCreateOwnershipTable(ctx, sheet);
    const rows = table.rows.load('items');
    await ctx.sync();

    const existingIndex = rows.items.findIndex(row =>
      row.values[0][0] === record.sheetName &&
      row.values[0][1] === record.tableName &&
      row.values[0][2] === record.queryId
    );

    const rowData = [
      record.sheetName,
      record.tableName,
      record.queryId,
      record.isManaged.toString(),
      record.lastTouchedUtc,
    ];

    if (existingIndex >= 0) {
      rows.items[existingIndex].values = [rowData];
    } else {
      table.rows.add(null, [rowData]);
    }

    await ctx.sync();
  });
}

async deleteOwnershipRecord(queryId: string, sheetName: string, tableName: string): Promise<void> {
  // Low-level delete logic
}
```

### 3.3: Refactor `upsertQueryTable`

```typescript
async upsertQueryTable(
  query: QueryConfiguration,
  rows: any[],
  params: ExecuteQueryParams
): Promise<ExcelOperationResult<QueryRunLocation>> {
  if (!this.isExcel) {
    return { ok: false, error: { message: 'Excel not detected', code: 'NO_EXCEL' } };
  }

  try {
    // 1. Delegate to WorkbookService for target resolution
    const target = await this.workbook.getOrCreateManagedTableTarget(query);

    // 2. Compute header/values
    const [effectiveHeader, effectiveValues] = this.computeHeaderAndValues(rows);

    // 3. Low-level Excel write
    const location = await this.writeTableData(
      target.sheetName, target.tableName,
      effectiveHeader, effectiveValues, target.isNew
    );

    // 4. Delegate ownership tracking
    if (target.isNew) {
      await this.workbook.recordOwnership({
        queryId: query.apiId,
        sheetName: target.sheetName,
        tableName: target.tableName,
      });
    } else {
      await this.workbook.updateOwnership(query.apiId, target.sheetName, target.tableName);
    }

    // 5. Telemetry
    this.telemetry.logEvent({
      category: 'excel',
      name: 'upsertQueryTable:success',
      severity: 'info',
      context: { queryId: query.id, apiId: query.apiId, rowCount: rows.length, isNew: target.isNew },
    });

    return { ok: true, value: location };
  } catch (error) {
    return this.telemetry.normalizeError(error, 'upsertQueryTable', { queryId: query.id });
  }
}

private computeHeaderAndValues(rows: any[]): [string[], any[][]] {
  if (rows.length === 0) return [[], []];
  const header = Object.keys(rows[0]);
  const values = rows.map(row => header.map(key => row[key]));
  return [header, values];
}
```

---

## File Changes

**Modified Files:**
- `src/app/core/workbook.service.ts` (add write helpers, getOrCreateManagedTableTarget)
- `src/app/core/excel.service.ts` (refactor upsertQueryTable, add write delegates)
- `src/app/core/workbook.service.spec.ts`
- `src/app/core/excel.service.spec.ts`

---

## Testing Strategy

**Unit Tests:**
- `WorkbookService.spec.ts` - recordOwnership, updateOwnership, deleteOwnership, getOrCreateManagedTableTarget
- `ExcelService.spec.ts` - upsertQueryTable delegates to WorkbookService

**Integration Tests:**
- Create query, run, verify ownership recorded
- Rerun query, verify ownership updated (not duplicated)
- User table conflict, verify suffixed alternate created

---

## Exit Criteria

- [ ] `WorkbookService` has ownership write helpers
- [ ] `ExcelService.upsertQueryTable` delegates to `WorkbookService`
- [ ] No ownership lookups in `ExcelService` outside read helpers
- [ ] `getOrCreateManagedTableTarget` encapsulates conflict resolution
- [ ] Tests pass (100% for ownership helpers)
