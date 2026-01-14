import { Injectable } from "@angular/core";
import {
  ExecuteQueryResultRow,
  ExcelOperationResult,
  ExcelErrorType,
  ChunkWriteResult,
  ChunkedWriteResult,
  QueryRunLocation,
  QueryTableTarget,
  WorkbookOwnershipInfo,
  WorkbookTableInfo,
} from "@excel-platform/shared/types";
import { TelemetryService } from "@excel-platform/core/telemetry";
import { SettingsService } from "@excel-platform/core/settings";

/**
 * ============================================================================
 * MICROSOFT OFFICE.JS LIMITS AND BEST PRACTICES
 * ============================================================================
 *
 * Source: Microsoft Learn Documentation (2025)
 * - https://learn.microsoft.com/en-us/office/dev/add-ins/excel/excel-add-ins-ranges-large
 * - https://learn.microsoft.com/en-us/office/dev/add-ins/excel/performance
 * - https://learn.microsoft.com/en-us/office/dev/add-ins/concepts/resource-limits-and-performance-optimization
 *
 * KEY LIMITS:
 * -----------
 * | Limit                    | Value        | Platform    | Notes                              |
 * |--------------------------|--------------|-------------|------------------------------------|
 * | Payload size             | 5 MB         | Excel Web   | Request/response combined          |
 * | Cell limit per get       | 5 million    | All         | Per single range operation         |
 * | Row limit per sheet      | 1,048,576    | All         | Excel's maximum rows               |
 * | Column limit per sheet   | 16,384       | All         | Excel's maximum columns            |
 * | Cell character limit     | 32,767       | All         | Max chars per cell value           |
 *
 * RECOMMENDED CHUNK SIZES:
 * ------------------------
 * - Start with 5,000-20,000 rows when reading/writing millions of cells
 * - Reduce chunk size for wide tables (many columns)
 * - If RequestPayloadSizeLimitExceeded error, retry with smaller chunks
 *
 * PERFORMANCE OPTIMIZATIONS:
 * --------------------------
 * 1. suspendApiCalculationUntilNextSync() - Pause calc during bulk writes
 * 2. Write data as 2D array to range.values, not row-by-row
 * 3. Batch multiple operations into single context.sync()
 * 4. Untrack() proxy objects after use to free memory
 * 5. Apply formatting AFTER data is written
 *
 * ERROR RECOVERY:
 * ---------------
 * Microsoft recommends: "If a single large values write fails, retry with
 * a smaller block size." Our implementation halves chunk size on resource
 * errors (up to maxChunkRetries times).
 *
 * ============================================================================
 */

/** Default timeout for Excel.run operations in ms (60s for wide tables) */
const DEFAULT_EXCEL_RUN_TIMEOUT = 60000;

/** Default max execution time for entire operation in ms (10 min for 100k+ rows) */
const DEFAULT_MAX_EXECUTION_TIME = 600000;

/**
 * Excel cell value max character limit.
 * @see https://support.microsoft.com/en-us/office/excel-specifications-and-limits
 */
const EXCEL_CELL_CHAR_LIMIT = 32767;

/**
 * Office.js payload limit in bytes.
 * Microsoft documents 5MB for Excel Web, we use 4MB to be safe.
 * @see https://learn.microsoft.com/en-us/office/dev/add-ins/excel/excel-add-ins-ranges-large
 */
const OFFICE_JS_PAYLOAD_LIMIT = 4 * 1024 * 1024;

/**
 * Average bytes per cell for chunk size calculation.
 * Conservative estimate for mixed content (numbers, short strings).
 * Adjust based on actual data characteristics if needed.
 */
const AVG_BYTES_PER_CELL = 50;

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
   * Wraps a promise with a timeout.
   * @param promise - Promise to wrap
   * @param timeoutMs - Timeout in milliseconds
   * @param operationName - Name for error reporting
   * @returns Promise that rejects with timeout error if exceeded
   */
  private withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    operationName: string
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`${operationName} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  }

  /**
   * Classifies an error for retry/recovery decisions.
   */
  private classifyError(error: unknown): ExcelErrorType {
    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

    // Timeout errors are transient
    if (message.includes('timeout') || message.includes('timed out')) {
      return 'transient';
    }

    // Excel busy/unavailable is transient
    if (message.includes('busy') || message.includes('excel is not available') ||
        message.includes('operation failed') || message.includes('retry')) {
      return 'transient';
    }

    // Payload/memory limits are resource errors
    if (message.includes('payload') || message.includes('memory') ||
        message.includes('limit exceeded') || message.includes('too large')) {
      return 'resource';
    }

    // Validation failures are permanent
    if (message.includes('invalid') || message.includes('validation') ||
        message.includes('not found') || message.includes('does not exist')) {
      return 'permanent';
    }

    return 'unknown';
  }

  /**
   * Calculate adaptive chunk size based on column count.
   * Reduces chunk size for wide tables to stay within Office.js payload limit.
   *
   * Microsoft's 5k-20k recommendation is for ROWS, but the actual constraint
   * is the 5MB payload limit (which depends on cells = rows × columns).
   *
   * Examples with 4MB payload limit and 50 bytes/cell estimate:
   * - 10 columns  → max ~8,388 rows/chunk (5k default works)
   * - 50 columns  → max ~1,677 rows/chunk (5k reduced to 1,677)
   * - 100 columns → max ~838 rows/chunk (5k reduced to 838)
   * - 200 columns → max ~419 rows/chunk (5k reduced to 419)
   *
   * @param columnCount - Number of columns in the data
   * @param configuredChunkSize - User-configured chunk size (default: 5000)
   * @returns Adjusted chunk size that respects payload limit
   *
   * @see https://learn.microsoft.com/en-us/office/dev/add-ins/excel/excel-add-ins-ranges-large
   */
  private calculateAdaptiveChunkSize(columnCount: number, configuredChunkSize: number): number {
    // Estimate bytes per row: columns × avg bytes per cell
    const bytesPerRow = columnCount * AVG_BYTES_PER_CELL;

    // Calculate max rows per chunk to stay under 4MB payload limit
    // Formula: maxRows = payloadLimit / (columns × avgBytesPerCell)
    const maxRowsForPayload = Math.floor(OFFICE_JS_PAYLOAD_LIMIT / bytesPerRow);

    // Use the smaller of configured size or payload-safe size
    const adaptiveSize = Math.min(configuredChunkSize, maxRowsForPayload);

    // Ensure at least 100 rows per chunk for efficiency
    return Math.max(100, adaptiveSize);
  }

  /**
   * Validates data shape before writing to Excel.
   * @returns Error message if validation fails, undefined if valid
   */
  private validateDataShape(header: string[], values: unknown[][]): string | undefined {
    if (header.length === 0) {
      return 'Header cannot be empty';
    }

    const expectedColumnCount = header.length;

    for (let rowIdx = 0; rowIdx < values.length; rowIdx++) {
      const row = values[rowIdx];

      // Check column count matches
      if (row.length !== expectedColumnCount) {
        return `Row ${rowIdx} has ${row.length} columns, expected ${expectedColumnCount}`;
      }

      // Check cell values don't exceed Excel limit
      for (let colIdx = 0; colIdx < row.length; colIdx++) {
        const cell = row[colIdx];
        if (typeof cell === 'string' && cell.length > EXCEL_CELL_CHAR_LIMIT) {
          return `Cell at row ${rowIdx}, column ${colIdx} exceeds ${EXCEL_CELL_CHAR_LIMIT} character limit (${cell.length} chars)`;
        }
      }
    }

    return undefined;
  }

  /**
   * Lists the names of all worksheets in the active workbook.
   *
   * @returns An array of worksheet names; returns an empty array when
   * not running inside Excel.
   */
  async getWorksheets(): Promise<string[]> {
    if (!this.isExcel) return [];
    await this.ensureOfficeReady();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Excel!.run(async (ctx: any) => {
      const sheets = ctx.workbook.worksheets.load("items/name");
      await ctx.sync();
      return sheets.items.map((s: { name: string }) => s.name);
    });
  }

  /**
   * Lists all tables in the workbook as simple anonymous objects.
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
   * Reads ownership metadata for extension-managed tables from the
   * hidden `_Extension_Ownership` worksheet.
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
   * Creates or overwrites the Excel table that represents the result
   * of a query run.
   *
   * Includes quality controls:
   * - Pre-write data shape validation
   * - Per-chunk error recovery
   * - Post-write row count verification
   * - Only records ownership after ALL data written successfully
   *
   * @param apiId - API identifier for telemetry and ownership tracking.
   * @param target - Target location (sheetName, tableName) for the data.
   * @param rows - The executed query result rows to project into the
   * Excel table.
   * @param locationHint - Optional hint to override target location.
   *
   * @returns An {@link ExcelOperationResult} whose `value`, on
   * success, is the {@link QueryRunLocation} of the table that was
   * written.
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

    const queryExecSettings = this.settings.value.queryExecution;
    const maxExecutionTime = queryExecSettings?.maxExecutionTimeMs ?? DEFAULT_MAX_EXECUTION_TIME;
    const cleanupOnFailure = queryExecSettings?.cleanupOnPartialFailure ?? true;

    const { header, values } = this.computeHeaderAndValues(rows);
    const sheetName = locationHint?.sheetName ?? target.sheetName;
    const tableName = locationHint?.tableName ?? target.tableName;

    // Pre-write validation - fail fast before touching Excel
    const validationError = this.validateDataShape(header, values);
    if (validationError) {
      this.telemetry.logEvent({
        category: "excel",
        name: "upsertQueryTable:validationFailed",
        severity: "error",
        message: validationError,
        context: { apiId, sheetName, tableName, rowCount: values.length },
      });
      return {
        ok: false,
        error: {
          operation: "upsertQueryTable",
          message: `Data validation failed: ${validationError}`,
          errorType: 'permanent',
          retriable: false,
        },
      };
    }

    this.telemetry.logEvent({
      category: "excel",
      name: "upsertQueryTable:start",
      severity: "debug",
      context: {
        apiId,
        writeMode: "overwrite",
        headerLength: header.length,
        rowCount: values.length,
        sheetName,
        tableName,
      },
    });

    try {
      // Wrap entire Excel.run with timeout
      const result = await this.withTimeout<ExcelOperationResult<QueryRunLocation>>(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Excel!.run(async (ctx: any) => {
          const worksheets = ctx.workbook.worksheets;
          let sheet = worksheets.getItemOrNullObject(sheetName);
          sheet.load("name");
          await ctx.sync();

          if (sheet.isNullObject) {
            sheet = worksheets.add(sheetName);
          }

          const writeResult = await this.writeQueryTableData(ctx, sheet, tableName, header, values, apiId);

          // Check if chunked write had failures
          if (writeResult.chunkedResult && !writeResult.chunkedResult.ok) {
            const failedChunks = writeResult.chunkedResult.chunks.filter(c => !c.success);

            this.telemetry.logEvent({
              category: "excel",
              name: "upsertQueryTable:partialFailure",
              severity: "error",
              message: `${failedChunks.length} chunks failed`,
              context: {
                apiId,
                sheetName,
                tableName,
                rowsWritten: writeResult.chunkedResult.rowsWritten,
                rowsFailed: writeResult.chunkedResult.rowsFailed,
                failedChunks: failedChunks.map(c => c.chunkIndex),
              },
            });

            // Cleanup partial data if configured
            if (cleanupOnFailure && writeResult.chunkedResult.rowsWritten > 0) {
              try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const tableToDelete = ctx.workbook.tables.getItemOrNullObject(tableName) as any;
                tableToDelete.load("name");
                await ctx.sync();

                if (!tableToDelete.isNullObject) {
                  tableToDelete.delete();
                  await ctx.sync();

                  this.telemetry.logEvent({
                    category: "excel",
                    name: "upsertQueryTable:cleanupPartialData",
                    severity: "warn",
                    context: { apiId, tableName, rowsCleaned: writeResult.chunkedResult.rowsWritten },
                  });
                }
              } catch (cleanupErr) {
                this.telemetry.logEvent({
                  category: "excel",
                  name: "upsertQueryTable:cleanupFailed",
                  severity: "error",
                  context: {
                    apiId,
                    tableName,
                    error: cleanupErr instanceof Error ? cleanupErr.message : String(cleanupErr),
                  },
                });
              }
            }

            return {
              ok: false,
              error: {
                operation: "upsertQueryTable",
                message: `Partial write failure: ${writeResult.chunkedResult.rowsWritten} of ${values.length} rows written`,
                errorType: failedChunks[0]?.error?.errorType ?? 'unknown',
                retriable: failedChunks[0]?.error?.retriable ?? false,
              },
            } as ExcelOperationResult<QueryRunLocation>;
          }

          // Post-write validation: verify row count
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const table = ctx.workbook.tables.getItem(tableName) as any;
          const bodyRange = table.getDataBodyRange();
          bodyRange.load("rowCount");
          await ctx.sync();

          const actualRowCount = bodyRange.rowCount as number;
          const expectedRowCount = values.length;

          if (actualRowCount !== expectedRowCount) {
            this.telemetry.logEvent({
              category: "excel",
              name: "upsertQueryTable:rowCountMismatch",
              severity: "error",
              message: `Expected ${expectedRowCount} rows, got ${actualRowCount}`,
              context: { apiId, sheetName, tableName, expected: expectedRowCount, actual: actualRowCount },
            });

            return {
              ok: false,
              error: {
                operation: "upsertQueryTable",
                message: `Row count verification failed: expected ${expectedRowCount}, got ${actualRowCount}`,
                errorType: 'unknown',
                retriable: true,
              },
            } as ExcelOperationResult<QueryRunLocation>;
          }

          // All chunks succeeded and row count verified - NOW record ownership
          await this.recordOwnership({ tableName, sheetName, queryId: apiId });

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
              verified: true,
            },
          });

          return {
            ok: true,
            value: { sheetName, tableName },
          } as ExcelOperationResult<QueryRunLocation>;
        }),
        maxExecutionTime,
        "upsertQueryTable"
      );

      return result;
    } catch (err) {
      const errorType = this.classifyError(err);
      return {
        ok: false,
        error: {
          operation: "upsertQueryTable",
          message: err instanceof Error ? err.message : "Failed to write query results into Excel.",
          raw: err,
          errorType,
          retriable: errorType === 'transient',
        },
      };
    }
  }

  /**
   * Appends a single telemetry log entry to the `_Extension_Log`
   * worksheet, creating it on demand.
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

      const headerOffset = 1;
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
        return;
      }

      const usedRange = sheet.getUsedRangeOrNullObject();
      await ctx.sync();

      if (usedRange.isNullObject) {
        return;
      }

      usedRange.load("values");
      await ctx.sync();

      const values: unknown[][] = (usedRange.values as unknown[][]) || [];
      if (values.length <= 1) {
        return;
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
        return;
      }

      const range = sheet.getRange(`A${rowIndex + 1}:E${rowIndex + 1}`);
      range.delete(Excel.DeleteShiftDirection.up);

      await ctx.sync();
    });
  }

  /**
   * @deprecated Use writeOwnershipRecord() instead.
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
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Write table rows in chunks to avoid Excel payload limits.
   * Includes per-chunk error recovery with retry-smaller-chunk on payload errors.
   *
   * Per Microsoft recommendation: "If a single large values write fails,
   * retry with a smaller block size."
   */
  private async writeRowsInChunks(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ctx: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    table: any,
    rows: unknown[][],
    chunkSize: number = 1000,
    backoffMs: number = 100,
    onChunkWritten?: (chunkIndex: number, totalChunks: number) => void,
    retriesRemaining?: number
  ): Promise<ChunkedWriteResult> {
    if (rows.length === 0) {
      return { ok: true, rowsWritten: 0, rowsFailed: 0, chunks: [] };
    }

    const queryExecSettings = this.settings.value.queryExecution;
    const maxRetries = retriesRemaining ?? (queryExecSettings?.maxChunkRetries ?? 3);
    const chunkTimeoutMs = queryExecSettings?.excelRunTimeoutMs ?? DEFAULT_EXCEL_RUN_TIMEOUT;

    const totalChunks = Math.ceil(rows.length / chunkSize);
    const chunkResults: ChunkWriteResult[] = [];
    let rowsWritten = 0;
    let rowsFailed = 0;

    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const chunkIndex = Math.floor(i / chunkSize);
      const startRow = i;
      const endRow = Math.min(i + chunkSize, rows.length);

      try {
        // Wrap chunk write in timeout
        await this.withTimeout(
          (async () => {
            table.rows.add(null, chunk);
            await ctx.sync();
          })(),
          chunkTimeoutMs,
          `chunk ${chunkIndex + 1}/${totalChunks}`
        );

        chunkResults.push({
          chunkIndex,
          startRow,
          endRow,
          success: true,
        });
        rowsWritten += chunk.length;

        this.telemetry.logEvent({
          category: 'excel',
          name: 'writeRowsInChunks:chunk',
          severity: 'debug',
          context: {
            chunkIndex,
            totalChunks,
            chunkSize: chunk.length,
            totalRows: rows.length,
            rowsWritten,
          },
        });

        if (onChunkWritten) {
          onChunkWritten(chunkIndex, totalChunks);
        }

        if (i + chunkSize < rows.length) {
          await this.sleep(backoffMs);
        }
      } catch (error) {
        const errorType = this.classifyError(error);
        const errorMessage = error instanceof Error ? error.message : String(error);

        // Microsoft recommends: retry with smaller chunk on resource/payload errors
        if (errorType === 'resource' && maxRetries > 0 && chunkSize > 100) {
          const newChunkSize = Math.max(100, Math.floor(chunkSize / 2));

          this.telemetry.logEvent({
            category: 'excel',
            name: 'writeRowsInChunks:retryWithSmallerChunk',
            severity: 'warn',
            message: `Payload error, retrying with smaller chunk: ${chunkSize} → ${newChunkSize}`,
            context: {
              chunkIndex,
              originalChunkSize: chunkSize,
              newChunkSize,
              retriesRemaining: maxRetries - 1,
              errorMessage,
            },
          });

          // Retry the remaining rows with smaller chunk size
          const remainingRows = rows.slice(i);
          const retryResult = await this.writeRowsInChunks(
            ctx,
            table,
            remainingRows,
            newChunkSize,
            backoffMs,
            onChunkWritten,
            maxRetries - 1
          );

          // Combine results
          return {
            ok: retryResult.ok,
            rowsWritten: rowsWritten + retryResult.rowsWritten,
            rowsFailed: retryResult.rowsFailed,
            chunks: [...chunkResults, ...retryResult.chunks],
          };
        }

        chunkResults.push({
          chunkIndex,
          startRow,
          endRow,
          success: false,
          error: {
            operation: 'writeRowsInChunks',
            message: `Chunk ${chunkIndex + 1}/${totalChunks} failed: ${errorMessage}`,
            raw: error,
            errorType,
            retriable: errorType === 'transient',
          },
        });
        rowsFailed += chunk.length;

        this.telemetry.logEvent({
          category: 'excel',
          name: 'writeRowsInChunks:chunkError',
          severity: 'error',
          message: `Chunk ${chunkIndex + 1}/${totalChunks} failed`,
          context: {
            chunkIndex,
            totalChunks,
            startRow,
            endRow,
            errorType,
            errorMessage,
            rowsWrittenSoFar: rowsWritten,
          },
        });

        // Stop on first non-retriable failure
        break;
      }
    }

    const allSucceeded = chunkResults.every(c => c.success);

    return {
      ok: allSucceeded,
      rowsWritten,
      rowsFailed,
      chunks: chunkResults,
    };
  }

  /**
   * Writes or overwrites data in an Excel table for a query.
   * Returns detailed result including chunk success/failure info.
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
  ): Promise<{ table: unknown; chunkedResult?: ChunkedWriteResult; isNewTable: boolean }> {
    let table = ctx.workbook.tables.getItemOrNullObject(tableName);
    table.load("name,worksheet,showHeaders");
    await ctx.sync();

    const createNewTable = () => {
      const startCell = sheet.getRange("A1");
      const totalRowCount = 1 + values.length;
      const totalColumnCount = header.length;
      const dataRange = startCell.getResizedRange(totalRowCount - 1, totalColumnCount - 1);
      dataRange.values = [header, ...values];
      const newTable = ctx.workbook.tables.add(dataRange, true);
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
      await ctx.sync();

      // New table created with all data - return success
      return {
        table,
        chunkedResult: {
          ok: true,
          rowsWritten: values.length,
          rowsFailed: 0,
          chunks: [{
            chunkIndex: 0,
            startRow: 0,
            endRow: values.length,
            success: true,
          }],
        },
        isNewTable: true,
      };
    } else {
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
        await ctx.sync();

        return {
          table,
          chunkedResult: {
            ok: true,
            rowsWritten: values.length,
            rowsFailed: 0,
            chunks: [{
              chunkIndex: 0,
              startRow: 0,
              endRow: values.length,
              success: true,
            }],
          },
          isNewTable: true,
        };
      } else {
        headerRange.values = [header];

        const currentRowCount = dataBodyRange.rowCount;
        if (currentRowCount > 0) {
          const rowsCollection = table.rows;
          rowsCollection.load("count");
          await ctx.sync();

          for (let i = rowsCollection.count - 1; i >= 0; i--) {
            rowsCollection.getItemAt(i).delete();
          }
          await ctx.sync();
        }

        let chunkedResult: ChunkedWriteResult = {
          ok: true,
          rowsWritten: 0,
          rowsFailed: 0,
          chunks: [],
        };

        if (values.length > 0) {
          const queryExecSettings = this.settings.value.queryExecution;
          const configuredChunkSize = queryExecSettings?.chunkSize ?? 1000;
          const backoffMs = queryExecSettings?.chunkBackoffMs ?? 100;
          const suspendThreshold = queryExecSettings?.suspendCalculationThreshold ?? 5000;
          const warnAtRowCount = queryExecSettings?.warnAtRowCount ?? 100000;

          // Microsoft recommends: suspend calculation for large writes
          const shouldSuspendCalc = suspendThreshold > 0 && values.length > suspendThreshold;
          if (shouldSuspendCalc) {
            ctx.application.suspendApiCalculationUntilNextSync();
            this.telemetry.logEvent({
              category: "excel",
              name: "upsertQueryTable:suspendCalculation",
              severity: "debug",
              context: { queryId, rowCount: values.length, threshold: suspendThreshold },
            });
          }

          // Warn about very large datasets
          if (warnAtRowCount > 0 && values.length > warnAtRowCount) {
            this.telemetry.logEvent({
              category: "excel",
              name: "upsertQueryTable:largeDatasetWarning",
              severity: "warn",
              message: `Dataset has ${values.length} rows, which exceeds warning threshold of ${warnAtRowCount}. Operation may be slow.`,
              context: { queryId, rowCount: values.length, warnAtRowCount },
            });
          }

          // Calculate adaptive chunk size based on column count
          const chunkSize = this.calculateAdaptiveChunkSize(header.length, configuredChunkSize);
          const wasAdapted = chunkSize !== configuredChunkSize;

          this.telemetry.logEvent({
            category: "excel",
            name: "upsertQueryTable:overwrite",
            severity: "debug",
            context: {
              queryId,
              overwriteRowCount: values.length,
              columnCount: header.length,
              configuredChunkSize,
              adaptedChunkSize: chunkSize,
              wasAdapted,
              estimatedChunks: Math.ceil(values.length / chunkSize),
              willChunk: values.length > chunkSize,
              calculationSuspended: shouldSuspendCalc,
            },
          });

          chunkedResult = await this.writeRowsInChunks(ctx, table, values, chunkSize, backoffMs, (chunk, total) => {
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

        return { table, chunkedResult, isNewTable: false };
      }
    }
  }

  /**
   * Activates the worksheet and selects the range for a previously
   * recorded query location.
   *
   * @param location - The last known location of the query results.
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
   */
  static readonly CalculationMode = {
    Automatic: "Automatic",
    Manual: "Manual",
  } as const;

  /**
   * Sets the Excel workbook calculation mode.
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
   * extension-managed in the ownership sheet, then deletes the
   * ownership sheet itself.
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

      const [, ...rows] = values;
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
