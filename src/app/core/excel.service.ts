import { Injectable } from "@angular/core";
import { ExecuteQueryResultRow } from "../shared/query-api-mock.service";
import { QueryDefinition, QueryRunLocation } from "../shared/query-model";
import { ExcelOperationResult, WorkbookOwnershipInfo, WorkbookTableInfo } from "../types";
import { ExcelTelemetryService } from "./excel-telemetry.service";

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
 *   `WorkbookService` and `ExcelTelemetryService`.
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

@Injectable({ providedIn: "root" })
export class ExcelService {
  constructor(private readonly telemetry: ExcelTelemetryService) {}

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
  async getWorksheets(): Promise<string[]> {
    if (!this.isExcel) return [];
    await this.ensureOfficeReady();
    // Excel.run provides an untyped RequestContext from Office.js; we
    // treat it as any here but keep the surface area small.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Excel!.run(async (ctx: any) => {
      const sheets = ctx.workbook.worksheets.load("items/name");
      await ctx.sync();
      return sheets.items.map((s: any) => s.name);
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

      return tables.items.map((t: any) => ({
        name: t.name,
        worksheet: t.worksheet.name,
        rows: t.rows.count,
      }));
    });
  }

  /**
   * Returns a lightweight description of all tables in the workbook.
   * This is a typed wrapper around `getTables` for use by
   * `WorkbookService` and features.
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
   * Errors are normalized and logged via {@link ExcelTelemetryService}.
   */
  async upsertQueryTable(
    query: QueryDefinition,
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
      // Basic shape info for telemetry/logging.
      const header = rows.length ? Object.keys(rows[0]) : [];
      const values = rows.map((r) => header.map((h) => r[h] ?? null));
      const effectiveHeader = header.length ? header : ["Value"];
      const effectiveValues = values.length ? values : [[null]];

      const writeMode = "overwrite";

      // Use telemetry debug helper when available without requiring it.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const maybeDebug = (
        this.telemetry as unknown as { logDebug?: (event: string, info: any) => void }
      ).logDebug;
      if (maybeDebug) {
        maybeDebug("upsertQueryTable:start", {
          queryId: query.id,
          writeMode,
          headerLength: effectiveHeader.length,
          rowCount: effectiveValues.length,
        });
      }

      const [tables, ownership] = await Promise.all([
        this.getWorkbookTables(),
        this.getWorkbookOwnership(),
      ]);

      const existingManaged = tables.find((t) =>
        ownership.some(
          (o) =>
            o.isManaged &&
            o.queryId === query.id &&
            o.tableName === t.name &&
            o.sheetName === t.worksheet
        )
      );

      const defaultSheetName = query.defaultSheetName;
      const defaultTableName = query.defaultTableName;

      const conflictingUserTable = tables.find((t) => t.name === defaultTableName);
      const safeTableName = conflictingUserTable
        ? `${defaultTableName}_${query.id}`
        : defaultTableName;

      const sheetName = locationHint?.sheetName ?? existingManaged?.worksheet ?? defaultSheetName;
      const tableName = locationHint?.tableName ?? existingManaged?.name ?? safeTableName;

      if (maybeDebug) {
        maybeDebug("upsertQueryTable:target", {
          queryId: query.id,
          sheetName,
          tableName,
          hasExistingManaged: !!existingManaged,
        });
      }

      try {
        const worksheets = ctx.workbook.worksheets;
        let sheet = worksheets.getItemOrNullObject(sheetName);
        sheet.load("name");
        await ctx.sync();

        if (sheet.isNullObject) {
          sheet = worksheets.add(sheetName);
        }

        let table = ctx.workbook.tables.getItemOrNullObject(tableName);
        table.load("name,worksheet,showHeaders");
        await ctx.sync();

        // Helper: create a new table with header + data starting at A1.
        const createNewTable = () => {
          const startCell = sheet.getRange("A1");
          const totalRowCount = 1 + effectiveValues.length;
          const totalColumnCount = effectiveHeader.length;
          const dataRange = startCell.getResizedRange(totalRowCount - 1, totalColumnCount - 1);
          dataRange.values = [effectiveHeader, ...effectiveValues];
          const newTable = ctx.workbook.tables.add(dataRange, true /* hasHeaders */);
          newTable.name = tableName;
          return newTable;
        };

        if (table.isNullObject) {
          if (maybeDebug) {
            maybeDebug("upsertQueryTable:createNewTable", {
              queryId: query.id,
              sheetName,
              tableName,
              totalRowCount: 1 + effectiveValues.length,
              totalColumnCount: effectiveHeader.length,
            });
          }
          table = createNewTable();
        } else {
          // Existing table: work with header and data body using standard
          // Excel patterns: header row stays fixed; overwrite clears and
          // rewrites data rows, append adds rows at the bottom.
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
            currentColumnCount === effectiveHeader.length &&
            currentHeaderValues.length === effectiveHeader.length;

          if (maybeDebug) {
            maybeDebug("upsertQueryTable:headerShape", {
              queryId: query.id,
              currentColumnCount,
              effectiveHeaderLength: effectiveHeader.length,
              currentHeaderLength: currentHeaderValues.length,
              headerShapeMatches,
            });
          }

          if (!headerShapeMatches) {
            if (maybeDebug) {
              maybeDebug("upsertQueryTable:headerMismatch_recreate", {
                queryId: query.id,
                sheetName,
                tableName,
              });
            }
            table.delete();
            table = createNewTable();
          } else {
            // Header shape matches: overwrite header text in place so
            // labels stay aligned with the columns, then always
            // overwrite data rows.
            headerRange.values = [effectiveHeader];

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

            if (effectiveValues.length > 0) {
              if (maybeDebug) {
                maybeDebug("upsertQueryTable:overwrite", {
                  queryId: query.id,
                  overwriteRowCount: effectiveValues.length,
                  columnCount: effectiveHeader.length,
                });
              }
              table.rows.add(null, effectiveValues);
            }
          }
        }

        await ctx.sync();
        this.telemetry.logSuccess("upsertQueryTable", {
          queryId: query.id,
          sheetName,
          tableName,
          rowCount: rows.length,
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
      await this.recordOwnership({ tableName, sheetName, queryId: query.id });

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
   * Records or updates an ownership row in the `_Extension_Ownership`
   * worksheet for the given table/query combination.
   */
  private async recordOwnership(info: {
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
   * Activates the worksheet and selects the range for a previously
   * recorded query location, if running inside Excel.
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
