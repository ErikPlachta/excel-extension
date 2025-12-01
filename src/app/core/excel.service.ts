import { Injectable } from "@angular/core";
import { ExecuteQueryResultRow } from "../shared/query-api-mock.service";
import { QueryRunLocation } from "../shared/query-model";
import { ExcelOperationResult, QueryTableTarget, WorkbookOwnershipInfo, WorkbookTableInfo } from "../types";
import { TelemetryService } from "@excel-platform/core/telemetry";
import { SettingsService } from "@excel-platform/core/settings";

/**
 * Low-level wrapper around the Office.js Excel APIs.
 *
 * This service is responsible for:
 *
 * - Detecting when the host is Excel (`isExcel`).
 * - Creating and querying worksheets and tables in the active workbook.
 * - Implementing the core query-table behavior used by the Queries
 *   feature (`upsertQueryTable`), including geometry and ownership
 *   decisions.
 * - Managing workbook-level metadata and log sheets used by
 *   `WorkbookService` and `TelemetryService`.
 *
 * Office.js types are intentionally left as `any` at the boundary so
 * that the rest of the app can work with strongly typed models such
 * as {@link WorkbookTableInfo} and {@link WorkbookOwnershipInfo}
 * without depending on the full Office.js typings.
 */

// Office.js globals are provided at runtime by Excel; we keep them
// as any here and rely on isExcel guards to ensure safe access.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Office: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Excel: any;

/**
 * Angular service that wraps the Office.js Excel APIs.
 *
 * This class intentionally keeps the direct Office.js surface area
 * small and isolates it behind a strongly typed API that the rest of
 * the app can consume safely. It collaborates with:
 *
 * - {@link WorkbookService} (indirectly) by providing
 *   {@link getWorkbookTables} and {@link getWorkbookOwnership}, which
 *   are used to build higher-level workbook abstractions.
 * - {@link TelemetryService}, which normalizes and logs
 *   successes and failures for all Excel operations exposed here.
 */
@Injectable({ providedIn: "root" })
export class ExcelService {
  constructor(
    private readonly telemetry: TelemetryService,
    private readonly settings: SettingsService
  ) {}

  /**
   * Cached promise used to ensure `Office.onReady` has completed
   * before any Excel APIs are invoked. This is only relevant when
   * running inside Excel; outside Excel the guard returns early.
   */
  private officeReadyPromise: Promise<void> | null = null;

  /**
   * Returns true when the current host is Excel and the Office.js
   * runtime is available. All public methods that call into
   * Office.js guard on this property so they become safe no-ops
   * outside Excel.
   */
  get isExcel(): boolean {
    return typeof Office !== "undefined" && Office?.context?.host === Office.HostType.Excel;
  }

  /**
   * Ensures the Office.js runtime has completed its `Office.onReady`
   * initialization handshake before any Excel APIs are used.
   *
   * Outside Excel this resolves immediately.
   */
  /**
   * Waits for the Office.js runtime to finish its `Office.onReady`
   * handshake before attempting to call any Excel APIs.
   *
   * @returns A promise that resolves once Office.js reports it is
   * ready, or immediately when not running inside Excel.
   */
  private async ensureOfficeReady(): Promise<void> {
    if (!this.isExcel) return;

    if (!this.officeReadyPromise) {
      this.officeReadyPromise = new Promise<void>((resolve, reject) => {
        try {
          if (typeof Office !== "undefined" && typeof Office.onReady === "function") {
            Office.onReady(() => resolve());
          } else {
            resolve();
          }
        } catch (err) {
          reject(err);
        }
      });
    }

    return this.officeReadyPromise;
  }

  /**
   * Returns the list of worksheet names in the active workbook.
   *
   * Outside Excel this resolves to an empty array.
   */
  /**
   * Lists the names of all worksheets in the active workbook.
   *
   * @returns An array of worksheet names; returns an empty array when
   * not running inside Excel.
   */
  async getWorksheets(): Promise<string[]> {
    if (!this.isExcel) return [];
    await this.ensureOfficeReady();
    // Excel.run provides an untyped RequestContext from Office.js; we
    // treat it as any here but keep the surface area small.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Excel!.run(async (ctx: any) => {
      const sheets = ctx.workbook.worksheets.load("items/name");
      await ctx.sync();
      return sheets.items.map((s: { name: string }) => s.name);
    });
  }

  /**
   * Returns a lightweight description of all tables in the workbook.
   *
   * Each entry includes the table name, the owning worksheet name and
   * the current data row count. This method is used by
   * {@link WorkbookService} to build {@link WorkbookTableInfo}
   * instances.
   */
  /**
   * Lists all tables in the workbook as simple anonymous objects.
   *
   * This is a thin, untyped projection over Office.js used internally
   * by {@link getWorkbookTables}. Callers should prefer the typed
   * helper instead where possible.
   *
   * @returns A list of tables with their name, owning worksheet name
   * and row count; returns an empty array when not running inside
   * Excel.
   */
  async getTables(): Promise<{ name: string; worksheet: string; rows: number }[]> {
    if (!this.isExcel) return [];
    await this.ensureOfficeReady();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Excel!.run(async (ctx: any) => {
      const tables = ctx.workbook.tables.load("items/name,items/worksheet,items/rows");
      await ctx.sync();

      for (const table of tables.items) {
        table.worksheet.load("name");
        table.rows.load("count");
      }

      await ctx.sync();

      return tables.items.map(
        (t: { name: string; worksheet: { name: string }; rows: { count: number } }) => ({
          name: t.name,
          worksheet: t.worksheet.name,
          rows: t.rows.count,
        })
      );
    });
  }

  /**
   * Returns a lightweight description of all tables in the workbook.
   * This is a typed wrapper around `getTables` for use by
   * `WorkbookService` and features.
   */
  /**
   * Returns a strongly typed view over the workbook's tables for use
   * by {@link WorkbookService} and features.
   *
   * @returns An array of {@link WorkbookTableInfo} describing each
   * table in the workbook.
   */
  async getWorkbookTables(): Promise<WorkbookTableInfo[]> {
    const tables = await this.getTables();
    return tables.map((t) => ({ name: t.name, worksheet: t.worksheet, rows: t.rows }));
  }

  /**
   * Reads ownership metadata for extension-managed tables.
   *
   * Ownership is stored in a hidden worksheet named
   * "_Extension_Ownership" with a simple table layout:
   *
   *   A: sheetName
   *   B: tableName
   *   C: queryId
   *   D: isManaged ("true"/"false")
   *   E: lastTouchedUtc (ISO string)
   *
   * This sheet is created on demand and kept out of the way of
   * normal user content, so the model can be evolved without
   * affecting feature code.
   */
  /**
   * Reads ownership metadata for extension-managed tables from the
   * hidden `_Extension_Ownership` worksheet.
   *
   * Each row in the ownership sheet records the sheet name, table
   * name, optional query id, a managed flag and the last-touched
   * timestamp. This allows workbook features to distinguish
   * extension-managed tables from user tables and make safe geometry
   * decisions.
   */
  /**
   * Reads ownership metadata for extension-managed tables from the
   * hidden `_Extension_Ownership` worksheet.
   *
   * Office.js objects are kept as `any` within the implementation so
   * that the public surface can return strongly typed
   * {@link WorkbookOwnershipInfo} models without leaking Office.js
   * types into the rest of the app.
   *
   * @returns An array of {@link WorkbookOwnershipInfo} entries, or an
   * empty array when ownership has not yet been recorded or when not
   * running inside Excel.
   */
  async getWorkbookOwnership(): Promise<WorkbookOwnershipInfo[]> {
    if (!this.isExcel) return [];
    await this.ensureOfficeReady();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Excel!.run(async (ctx: any) => {
      const sheets = ctx.workbook.worksheets;
      const sheet = sheets.getItemOrNullObject("_Extension_Ownership");
      sheet.load("name");
      await ctx.sync();

      if (sheet.isNullObject) {
        return [];
      }

      const usedRange = sheet.getUsedRangeOrNullObject();
      await ctx.sync();

      if (usedRange.isNullObject) {
        return [];
      }
      usedRange.load("values");
      await ctx.sync();

      const values: unknown[][] = (usedRange.values as unknown[][]) || [];
      if (!values.length) return [];

      const [, ...rows] = values; // skip header row

      const ownership: WorkbookOwnershipInfo[] = rows
        .filter((r) => r && r.length >= 4)
        .map((r) => {
          const [sheetName, tableName, queryId, isManagedRaw, lastTouchedUtc] = r as string[];
          return {
            sheetName: sheetName ?? "",
            tableName: tableName ?? "",
            queryId: queryId || undefined,
            isManaged: String(isManagedRaw).toLowerCase() === "true",
            lastTouchedUtc: lastTouchedUtc || undefined,
          };
        })
        .filter((o) => o.sheetName && o.tableName);

      return ownership;
    });
  }

  /**
   * Creates or updates the Excel table backing a query run.
   *
   * Current behavior is **overwrite-only**:
   *
   * - On first run, a new table is created at a stable anchor (A1)
   *   using the query's default sheet and table names, and a single
   *   header row plus data body is written.
   * - On subsequent runs for the same managed table, the header row
   *   is kept in place, all data rows are deleted, and the new data
   *   rows are appended via `table.rows.add`.
   *
   * Table ownership is tracked in `_Extension_Ownership` so future
   * runs and navigation can safely treat the target as
   * extension-managed without overwriting user tables.
   *
   * Errors are normalized and logged via {@link TelemetryService}.
   */
  /**
   * Creates or overwrites the Excel table that represents the result
   * of a query run.
   *
   * This method currently supports **overwrite-only** semantics: it
   * will either create a new table for the query or reuse an existing
   * extension-managed table, keeping the header anchored and
   * replacing all data body rows on rerun. Append mode is intentionally
   * not supported in this branch.
   *
   * **Phase 1 Migration:**
   * Signature changed from `(query: QueryDefinition, rows, locationHint?)` to
   * `(apiId: string, target: QueryTableTarget, rows, locationHint?)`.
   * This separates the API identifier (for telemetry/ownership) from the
   * execution target (where to write data).
   *
   * Office.js side effects:
   * - May create new worksheets and tables.
   * - May delete and recreate an existing table when the header shape
   *   changes.
   * - Always records/update ownership in `_Extension_Ownership` for
   *   the target table.
   *
   * @param apiId - API identifier for telemetry and ownership tracking.
   * @param target - Target location (sheetName, tableName) for the data.
   * @param rows - The executed query result rows to project into the
   * Excel table.
   * @param locationHint - Optional hint to override target location.
   *
   * @returns An {@link ExcelOperationResult} whose `value`, on
   * success, is the {@link QueryRunLocation} of the table that was
   * written. On failure, `ok` is false and a normalized error (already
   * logged via {@link TelemetryService}) is returned.
   */
  async upsertQueryTable(
    apiId: string,
    target: QueryTableTarget,
    rows: ExecuteQueryResultRow[],
    locationHint?: Partial<QueryRunLocation>
  ): Promise<ExcelOperationResult<QueryRunLocation>> {
    if (!this.isExcel) {
      return {
        ok: false,
        error: {
          operation: "upsertQueryTable",
          message: "Excel is not available in the current host.",
        },
      };
    }
    await this.ensureOfficeReady();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Excel!.run(async (ctx: any) => {
      // Transform query result rows into Excel header/data format
      const { header, values } = this.computeHeaderAndValues(rows);

      const writeMode = "overwrite";

      // Phase 3: Target resolution now delegated to WorkbookService.resolveTableTarget().
      // Caller should call that first, then pass resolved target here.
      // locationHint can still override for specific use cases.
      const sheetName = locationHint?.sheetName ?? target.sheetName;
      const tableName = locationHint?.tableName ?? target.tableName;

      this.telemetry.logEvent({
        category: "excel",
        name: "upsertQueryTable:start",
        severity: "debug",
        context: {
          apiId,
          writeMode,
          headerLength: header.length,
          rowCount: values.length,
          sheetName,
          tableName,
        },
      });

      try {
        const worksheets = ctx.workbook.worksheets;
        let sheet = worksheets.getItemOrNullObject(sheetName);
        sheet.load("name");
        await ctx.sync();

        if (sheet.isNullObject) {
          sheet = worksheets.add(sheetName);
        }

        // Delegate table creation/update to helper
        await this.writeQueryTableData(ctx, sheet, tableName, header, values, apiId);

        await ctx.sync();
        this.telemetry.logEvent({
          category: "excel",
          name: "upsertQueryTable",
          severity: "info",
          message: "ok",
          context: {
            apiId,
            sheetName,
            tableName,
            rowCount: rows.length,
          },
        });
      } catch (err) {
        return this.telemetry.normalizeError<QueryRunLocation>(
          "upsertQueryTable",
          err,
          "Failed to write query results into Excel."
        );
      }

      // Track ownership for the table we just touched so that
      // future runs and navigation can safely treat it as
      // extension-managed. This is a placeholder implementation
      // that records ownership via an in-memory bridge; a future
      // revision can persist this to a hidden sheet or table
      // without changing the call site.
      await this.recordOwnership({ tableName, sheetName, queryId: apiId });

      return {
        ok: true,
        value: {
          sheetName,
          tableName,
        },
      };
    });
  }

  /**
   * Appends a single log entry to the `_Extension_Log` worksheet,
   * creating it on demand. Intended for internal telemetry and
   * diagnostics when workbook logging is enabled.
   */
  /**
   * Appends a single telemetry log entry to the `_Extension_Log`
   * worksheet, creating it on demand.
   *
   * Office.js side effects:
   * - May create the `_Extension_Log` sheet and its header row.
   * - Appends one row per call with the timestamp, level, operation
   *   name and message.
   *
   * @param entry - The structured log entry to append.
   */
  async appendLogEntry(entry: {
    level: "info" | "error";
    operation: string;
    message?: string;
    info?: Record<string, unknown>;
  }): Promise<void> {
    if (!this.isExcel) return;
    await this.ensureOfficeReady();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await Excel!.run(async (ctx: any) => {
      const sheets = ctx.workbook.worksheets;
      let sheet = sheets.getItemOrNullObject("_Extension_Log");
      sheet.load("name");
      await ctx.sync();

      if (sheet.isNullObject) {
        sheet = sheets.add("_Extension_Log");
        const header = [["timestamp", "level", "operation", "message"]];
        const headerRange = sheet.getRange("A1:D1");
        headerRange.values = header;
      }

      const usedRange = sheet.getUsedRangeOrNullObject();
      await ctx.sync();

      const nextRowIndex = usedRange.isNullObject ? 1 : usedRange.getLastRow().rowIndex + 1;
      const range = sheet.getRange(`A${nextRowIndex + 1}:D${nextRowIndex + 1}`);
      range.values = [
        [new Date().toISOString(), entry.level, entry.operation, entry.message ?? ""],
      ];

      await ctx.sync();
    });
  }

  /**
   * Writes or updates an ownership record in the `_Extension_Ownership`
   * worksheet.
   *
   * This low-level helper creates the ownership sheet if needed, then
   * inserts or updates a single row for the given table/query
   * combination. The `lastTouchedUtc` field is always updated to the
   * current timestamp.
   *
   * Office.js side effects:
   * - May create the `_Extension_Ownership` sheet and its header row.
   * - Inserts or updates a single row for the specified
   *   `(sheetName, tableName, queryId)` combination.
   *
   * @param info - Identifiers for the managed table and owning query.
   */
  async writeOwnershipRecord(info: {
    tableName: string;
    sheetName: string;
    queryId: string;
  }): Promise<void> {
    if (!this.isExcel) return;
    await this.ensureOfficeReady();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await Excel!.run(async (ctx: any) => {
      const sheets = ctx.workbook.worksheets;
      let sheet = sheets.getItemOrNullObject("_Extension_Ownership");
      sheet.load("name");
      await ctx.sync();

      if (sheet.isNullObject) {
        sheet = sheets.add("_Extension_Ownership");
        sheet.visibility = Excel.SheetVisibility.veryHidden;

        const header = [["sheetName", "tableName", "queryId", "isManaged", "lastTouchedUtc"]];
        const headerRange = sheet.getRange("A1:E1");
        headerRange.values = header;
      }

      const usedRange = sheet.getUsedRangeOrNullObject();
      await ctx.sync();
      const values: unknown[][] = [];

      if (!usedRange.isNullObject) {
        usedRange.load("values");
        await ctx.sync();
        const raw = (usedRange.values as unknown[][]) || [];
        for (const row of raw) {
          values.push(row);
        }
      }

      const headerOffset = 1; // row index after header
      const now = new Date().toISOString();
      let rowIndex = -1;

      for (let i = headerOffset; i < values.length; i++) {
        const row = values[i];
        if (!row) continue;
        const [sheetName, tableName, queryId] = row as string[];
        if (
          sheetName === info.sheetName &&
          tableName === info.tableName &&
          queryId === info.queryId
        ) {
          rowIndex = i;
          break;
        }
      }

      const targetRow = rowIndex === -1 ? values.length : rowIndex;
      const range = sheet.getRange(`A${targetRow + 1}:E${targetRow + 1}`);
      range.values = [[info.sheetName, info.tableName, info.queryId, "true", now]];

      await ctx.sync();
    });
  }

  /**
   * Deletes an ownership record from the `_Extension_Ownership`
   * worksheet.
   *
   * This low-level helper removes the row matching the given
   * table/query combination. If no matching row exists, this is a
   * no-op.
   *
   * Office.js side effects:
   * - Deletes the row for the specified `(sheetName, tableName,
   *   queryId)` combination if found.
   *
   * @param info - Identifiers for the managed table and owning query.
   */
  async deleteOwnershipRecord(info: {
    tableName: string;
    sheetName: string;
    queryId: string;
  }): Promise<void> {
    if (!this.isExcel) return;
    await this.ensureOfficeReady();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await Excel!.run(async (ctx: any) => {
      const sheets = ctx.workbook.worksheets;
      const sheet = sheets.getItemOrNullObject("_Extension_Ownership");
      sheet.load("name");
      await ctx.sync();

      if (sheet.isNullObject) {
        return; // No ownership sheet means no records to delete
      }

      const usedRange = sheet.getUsedRangeOrNullObject();
      await ctx.sync();

      if (usedRange.isNullObject) {
        return; // No data in ownership sheet
      }

      usedRange.load("values");
      await ctx.sync();

      const values: unknown[][] = (usedRange.values as unknown[][]) || [];
      if (values.length <= 1) {
        return; // Only header row, no data to delete
      }

      const headerOffset = 1;
      let rowIndex = -1;

      for (let i = headerOffset; i < values.length; i++) {
        const row = values[i];
        if (!row) continue;
        const [sheetName, tableName, queryId] = row as string[];
        if (
          sheetName === info.sheetName &&
          tableName === info.tableName &&
          queryId === info.queryId
        ) {
          rowIndex = i;
          break;
        }
      }

      if (rowIndex === -1) {
        return; // No matching record found
      }

      // Delete the row by shifting all rows below up
      const range = sheet.getRange(`A${rowIndex + 1}:E${rowIndex + 1}`);
      range.delete(Excel.DeleteShiftDirection.up);

      await ctx.sync();
    });
  }

  /**
   * @deprecated Use writeOwnershipRecord() instead. This private method
   * is kept for backward compatibility during refactoring.
   */
  private async recordOwnership(info: {
    tableName: string;
    sheetName: string;
    queryId: string;
  }): Promise<void> {
    return this.writeOwnershipRecord(info);
  }

  /**
   * Computes the header row and data values array from query result rows.
   *
   * This helper normalizes empty results to a single-column "Value"
   * table with a null data row, ensuring Excel tables always have at
   * least one column and one data row.
   *
   * @param rows - Query result rows as returned by the mock API.
   * @returns An object with `header` (column names) and `values` (2D
   * array of data rows).
   */
  private computeHeaderAndValues(rows: ExecuteQueryResultRow[]): {
    header: string[];
    values: unknown[][];
  } {
    const header = rows.length ? Object.keys(rows[0]) : [];
    const values = rows.map((r) => header.map((h) => r[h] ?? null));
    const effectiveHeader = header.length ? header : ["Value"];
    const effectiveValues = values.length ? values : [[null]];

    return {
      header: effectiveHeader,
      values: effectiveValues,
    };
  }

  /**
   * Sleep helper for throttling between chunks.
   *
   * @param ms - Milliseconds to sleep
   * @returns Promise that resolves after delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Write table rows in chunks to avoid Excel payload limits.
   *
   * Breaks large datasets into smaller batches and syncs after each batch
   * to stay within Office.js ~5MB payload limit. Adds configurable backoff
   * between chunks to prevent Excel throttling.
   *
   * **Performance:**
   * - Default chunk size: 1000 rows (configurable via SettingsService)
   * - Backoff delay: 100ms between chunks (configurable)
   * - Telemetry logged for each chunk
   *
   * @param ctx - Excel.run context
   * @param table - Excel table object
   * @param rows - All rows to write (2D array)
   * @param chunkSize - Rows per batch (default 1000)
   * @param backoffMs - Delay between chunks in ms (default 100)
   * @param onChunkWritten - Optional progress callback (chunkIndex, totalChunks)
   */
  private async writeRowsInChunks(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ctx: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    table: any,
    rows: unknown[][],
    chunkSize: number = 1000,
    backoffMs: number = 100,
    onChunkWritten?: (chunkIndex: number, totalChunks: number) => void
  ): Promise<void> {
    if (rows.length === 0) return;

    const totalChunks = Math.ceil(rows.length / chunkSize);

    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const chunkIndex = Math.floor(i / chunkSize);

      // Write chunk
      table.rows.add(null, chunk);
      await ctx.sync();

      // Telemetry
      this.telemetry.logEvent({
        category: 'excel',
        name: 'writeRowsInChunks:chunk',
        severity: 'debug',
        context: {
          chunkIndex,
          totalChunks,
          chunkSize: chunk.length,
          totalRows: rows.length,
        },
      });

      // Progress callback
      if (onChunkWritten) {
        onChunkWritten(chunkIndex, totalChunks);
      }

      // Backoff between chunks (prevent throttling)
      if (i + chunkSize < rows.length) {
        await this.sleep(backoffMs);
      }
    }
  }

  /**
   * Writes or overwrites data in an Excel table for a query.
   *
   * This low-level helper encapsulates the complex table creation and
   * update logic. It handles:
   * - Creating new tables at A1 when none exist
   * - Detecting header shape mismatches and recreating tables
   * - Overwriting data rows while preserving the header row
   *
   * @param ctx - Office.js request context.
   * @param sheet - The worksheet where the table should be created.
   * @param tableName - The target table name.
   * @param header - Column names for the table header row.
   * @param values - 2D array of data rows to write.
   * @param queryId - Query ID for telemetry.
   * @returns The Office.js table object after writing data.
   */
  private async writeQueryTableData(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ctx: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sheet: any,
    tableName: string,
    header: string[],
    values: unknown[][],
    queryId: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    let table = ctx.workbook.tables.getItemOrNullObject(tableName);
    table.load("name,worksheet,showHeaders");
    await ctx.sync();

    // Helper: create a new table with header + data starting at A1.
    const createNewTable = () => {
      const startCell = sheet.getRange("A1");
      const totalRowCount = 1 + values.length;
      const totalColumnCount = header.length;
      const dataRange = startCell.getResizedRange(totalRowCount - 1, totalColumnCount - 1);
      dataRange.values = [header, ...values];
      const newTable = ctx.workbook.tables.add(dataRange, true /* hasHeaders */);
      newTable.name = tableName;
      return newTable;
    };

    if (table.isNullObject) {
      this.telemetry.logEvent({
        category: "excel",
        name: "upsertQueryTable:createNewTable",
        severity: "debug",
        context: {
          queryId,
          tableName,
          totalRowCount: 1 + values.length,
          totalColumnCount: header.length,
        },
      });
      table = createNewTable();
    } else {
      // Existing table: work with header and data body using standard
      // Excel patterns: header row stays fixed; overwrite clears and
      // rewrites data rows.
      if (!table.showHeaders) {
        table.showHeaders = true;
      }

      const headerRange = table.getHeaderRowRange();
      headerRange.load("values,columnCount");
      const dataBodyRange = table.getDataBodyRange();
      dataBodyRange.load("rowCount,columnCount");
      await ctx.sync();

      const currentHeaderValues = (headerRange.values as unknown[][])[0] as string[];
      const currentColumnCount = headerRange.columnCount as number;

      // Basic header validation: if the new header shape differs, we fall
      // back to creating a fresh table instead of trying to force a resize
      // that can misalign the existing table.
      const headerShapeMatches =
        currentColumnCount === header.length && currentHeaderValues.length === header.length;

      this.telemetry.logEvent({
        category: "excel",
        name: "upsertQueryTable:headerShape",
        severity: "debug",
        context: {
          queryId,
          currentColumnCount,
          effectiveHeaderLength: header.length,
          currentHeaderLength: currentHeaderValues.length,
          headerShapeMatches,
        },
      });

      if (!headerShapeMatches) {
        this.telemetry.logEvent({
          category: "excel",
          name: "upsertQueryTable:headerMismatch_recreate",
          severity: "debug",
          context: {
            queryId,
            tableName,
          },
        });
        table.delete();
        table = createNewTable();
      } else {
        // Header shape matches: overwrite header text in place so
        // labels stay aligned with the columns, then always
        // overwrite data rows.
        headerRange.values = [header];

        // Overwrite: delete all existing data rows, then add new
        // rows via table.rows.add so the array shape always
        // matches.
        const currentRowCount = dataBodyRange.rowCount;
        if (currentRowCount > 0) {
          const rowsCollection = table.rows;
          rowsCollection.load("count");
          await ctx.sync();

          for (let i = rowsCollection.count - 1; i >= 0; i--) {
            rowsCollection.getItemAt(i).delete();
          }
        }

        if (values.length > 0) {
          const queryExecSettings = this.settings.value.queryExecution;
          const chunkSize = queryExecSettings?.chunkSize ?? 1000;
          const backoffMs = queryExecSettings?.chunkBackoffMs ?? 100;

          this.telemetry.logEvent({
            category: "excel",
            name: "upsertQueryTable:overwrite",
            severity: "debug",
            context: {
              queryId,
              overwriteRowCount: values.length,
              columnCount: header.length,
              chunkSize,
              willChunk: values.length > chunkSize,
            },
          });

          // Use chunked writes for large datasets
          await this.writeRowsInChunks(ctx, table, values, chunkSize, backoffMs, (chunk, total) => {
            this.telemetry.logEvent({
              category: 'excel',
              name: 'writeQueryTableData:progress',
              severity: 'debug',
              context: {
                queryId,
                chunk: chunk + 1,
                total,
                rowsWritten: Math.min((chunk + 1) * chunkSize, values.length),
                totalRows: values.length,
              },
            });
          });
        }
      }
    }

    return table;
  }

  /**
   * Activates the worksheet and selects the range for a previously
   * recorded query location, if running inside Excel.
   */
  /**
   * Activates the worksheet and selects the range for a previously
   * recorded query location.
   *
   * Office.js side effects:
   * - Activates the specified worksheet.
   * - Selects the full range of the target table.
   *
   * @param location - The last known location of the query results. If
   * undefined, null, or not running inside Excel, this is a no-op.
   */
  async activateQueryLocation(location: QueryRunLocation | undefined | null): Promise<void> {
    if (!this.isExcel || !location) return;
    await this.ensureOfficeReady();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await Excel!.run(async (ctx: any) => {
      const sheet = ctx.workbook.worksheets.getItem(location.sheetName);
      sheet.activate();

      const table = ctx.workbook.tables.getItem(location.tableName);
      table.getRange().select();

      await ctx.sync();
    });
  }

  /**
   * Excel calculation mode type.
   * - 'Automatic': Formulas recalculate on every change (default Excel behavior)
   * - 'Manual': Formulas only recalculate when explicitly requested
   */
  static readonly CalculationMode = {
    Automatic: "Automatic",
    Manual: "Manual",
  } as const;

  /**
   * Sets the Excel workbook calculation mode.
   *
   * Use this to temporarily disable formula recalculation during
   * large data writes, then restore afterward. This prevents
   * expensive recalculations after each row/chunk write.
   *
   * @param mode - 'Automatic' (default) or 'Manual'
   * @returns ExcelOperationResult indicating success/failure
   */
  async setCalculationMode(
    mode: "Automatic" | "Manual"
  ): Promise<ExcelOperationResult<{ previousMode: string }>> {
    if (!this.isExcel) {
      return {
        ok: false,
        error: {
          operation: "setCalculationMode",
          message: "Excel is not available in the current host.",
        },
      };
    }

    await this.ensureOfficeReady();

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return await Excel!.run(async (ctx: any) => {
        const application = ctx.workbook.application;
        application.load("calculationMode");
        await ctx.sync();

        const previousMode = application.calculationMode;

        // Map mode string to Excel enum value
        const excelMode =
          mode === "Manual" ? Excel.CalculationMode.manual : Excel.CalculationMode.automatic;

        application.calculationMode = excelMode;
        await ctx.sync();

        this.telemetry.logEvent({
          category: "excel",
          name: "setCalculationMode",
          severity: "info",
          context: {
            previousMode,
            newMode: mode,
          },
        });

        return {
          ok: true,
          value: { previousMode },
        };
      });
    } catch (err) {
      return this.telemetry.normalizeError<{ previousMode: string }>(
        "setCalculationMode",
        err,
        "Failed to set calculation mode."
      );
    }
  }

  /**
   * Gets the current Excel workbook calculation mode.
   *
   * @returns ExcelOperationResult with current mode ('Automatic' | 'Manual')
   */
  async getCalculationMode(): Promise<ExcelOperationResult<{ mode: string }>> {
    if (!this.isExcel) {
      return {
        ok: false,
        error: {
          operation: "getCalculationMode",
          message: "Excel is not available in the current host.",
        },
      };
    }

    await this.ensureOfficeReady();

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return await Excel!.run(async (ctx: any) => {
        const application = ctx.workbook.application;
        application.load("calculationMode");
        await ctx.sync();

        return {
          ok: true,
          value: { mode: application.calculationMode },
        };
      });
    } catch (err) {
      return this.telemetry.normalizeError<{ mode: string }>(
        "getCalculationMode",
        err,
        "Failed to get calculation mode."
      );
    }
  }

  /**
   * Removes all tables and worksheets that are marked as
   * extension-managed in the ownership sheet, then deletes
   * the ownership sheet itself. Intended as a dev-only
   * "clean slate" helper when iterating on table behavior.
   */
  /**
   * Removes all tables and worksheets that are marked as
   * extension-managed in the ownership sheet, then deletes the
   * ownership sheet itself.
   *
   * This is a dev-only "clean slate" helper when iterating on table
   * behavior and is not intended for end users.
   */
  /**
   * Removes all tables and worksheets that are marked as
   * extension-managed in the ownership sheet, then deletes the
   * ownership sheet itself.
   *
   * This is a dev-only "clean slate" helper when iterating on table
   * behavior and is not intended for end users.
   *
   * Office.js side effects:
   * - Deletes extension-managed tables referenced in
   *   `_Extension_Ownership`.
   * - Deletes any now-empty worksheets that previously hosted only
   *   managed tables.
   * - Deletes the `_Extension_Ownership` worksheet.
   */
  async purgeExtensionManagedContent(): Promise<void> {
    if (!this.isExcel) return;
    await this.ensureOfficeReady();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await Excel!.run(async (ctx: any) => {
      const sheets = ctx.workbook.worksheets;
      let ownershipSheet = sheets.getItemOrNullObject("_Extension_Ownership");
      ownershipSheet.load("name");
      await ctx.sync();

      if (ownershipSheet.isNullObject) {
        return;
      }

      const usedRange = ownershipSheet.getUsedRangeOrNullObject();
      await ctx.sync();

      if (usedRange.isNullObject) {
        ownershipSheet.delete();
        await ctx.sync();
        return;
      }

      usedRange.load("values");
      await ctx.sync();

      const values: unknown[][] = (usedRange.values as unknown[][]) || [];
      if (values.length <= 1) {
        ownershipSheet.delete();
        await ctx.sync();
        return;
      }

      const [, ...rows] = values; // skip header
      const managedTargets = rows
        .filter((r) => r && r.length >= 4)
        .map((r) => {
          const [sheetName, tableName, , isManagedRaw] = r as string[];
          return {
            sheetName,
            tableName,
            isManaged: String(isManagedRaw).toLowerCase() === "true",
          };
        })
        .filter((r) => r.sheetName && r.tableName && r.isManaged);

      const tables = ctx.workbook.tables;
      const sheetsToCheck = new Set<string>();

      for (const target of managedTargets) {
        const table = tables.getItemOrNullObject(target.tableName);
        table.load("name,worksheet");
        await ctx.sync();

        if (!table.isNullObject) {
          const ws = table.worksheet;
          ws.load("name");
          await ctx.sync();

          sheetsToCheck.add(ws.name);
          table.delete();
          await ctx.sync();
        }
      }

      for (const sheetName of sheetsToCheck) {
        const sheet = sheets.getItemOrNullObject(sheetName);
        sheet.load("name");
        await ctx.sync();

        if (sheet.isNullObject) continue;

        const used = sheet.getUsedRangeOrNullObject();
        await ctx.sync();

        if (used.isNullObject) {
          sheet.delete();
          await ctx.sync();
        }
      }

      ownershipSheet = sheets.getItemOrNullObject("_Extension_Ownership");
      await ctx.sync();
      if (!ownershipSheet.isNullObject) {
        ownershipSheet.delete();
        await ctx.sync();
      }
    });
  }
}
