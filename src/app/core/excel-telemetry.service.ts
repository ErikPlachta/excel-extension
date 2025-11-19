import { Injectable } from "@angular/core";
import { ExcelErrorInfo, ExcelOperationResult } from "../types";
import { SettingsService } from "./settings.service";

// Office.js globals are provided at runtime by Excel; we keep them
// as any here and rely on host guards in call sites.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Office: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Excel: any;

@Injectable({ providedIn: "root" })
export class ExcelTelemetryService {
  constructor(private readonly settings: SettingsService) {}

  /**
   * Optional debug helper used by ExcelService and other callers to emit
   * structured diagnostics without affecting normal telemetry behavior.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  logDebug(event: string, info?: Record<string, any>): void {
    // eslint-disable-next-line no-console
    console.debug("[Excel][debug]", event, info ?? {});
  }

  logSuccess(operation: string, info?: Record<string, unknown>): void {
    // For now we log to the console; this can later
    // be redirected to an in-workbook log table.
    // eslint-disable-next-line no-console
    console.info("[Excel]", operation, "ok", info ?? {});
    void this.logToWorkbookIfEnabled({ level: "info", operation, info });
  }

  logError(error: ExcelErrorInfo, context?: Record<string, unknown>): void {
    // eslint-disable-next-line no-console
    console.error("[Excel]", error.operation, error.message, {
      raw: error.raw,
      ...context,
    });
    void this.logToWorkbookIfEnabled({
      level: "error",
      operation: error.operation,
      message: error.message,
    });
  }

  normalizeError<T>(
    operation: string,
    err: unknown,
    fallbackMessage: string
  ): ExcelOperationResult<T> {
    const message =
      (typeof err === "object" &&
      err &&
      "message" in err &&
      typeof (err as any).message === "string"
        ? (err as any).message
        : undefined) ?? fallbackMessage;

    const error: ExcelErrorInfo = {
      operation,
      message,
      raw: err,
    };

    this.logError(error);
    return { ok: false, error };
  }

  private async logToWorkbookIfEnabled(entry: {
    level: "info" | "error";
    operation: string;
    message?: string;
    info?: Record<string, unknown>;
  }): Promise<void> {
    const { telemetry } = this.settings.value;
    if (!telemetry.enableWorkbookLogging) return;
    if (typeof Office === "undefined" || Office?.context?.host !== Office.HostType.Excel) {
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await Excel!.run(async (ctx: any) => {
        const sheets = ctx.workbook.worksheets;
        const worksheetName = telemetry.logWorksheetName ?? "_Extension_Log";
        const tableName = telemetry.logTableName ?? "_Extension_Log_Table";
        const columns = telemetry.logColumns ?? {
          timestamp: "timestamp",
          level: "level",
          operation: "operation",
          message: "message",
        };

        let sheet = sheets.getItemOrNullObject(worksheetName);
        sheet.load("name");
        await ctx.sync();

        if (sheet.isNullObject) {
          sheet = sheets.add(worksheetName);
          const headerRange = sheet.getRange("A1:D1");
          headerRange.values = [
            [columns.timestamp, columns.level, columns.operation, columns.message],
          ];
        }

        let table = ctx.workbook.tables.getItemOrNullObject(tableName);
        table.load("name");
        await ctx.sync();

        if (table.isNullObject) {
          const headerRange = sheet.getRange("A1:D1");
          table = ctx.workbook.tables.add(headerRange, true /* hasHeaders */);
          table.name = tableName;
        }

        const rows = table.rows;
        rows.add(null, [
          [new Date().toISOString(), entry.level, entry.operation, entry.message ?? ""],
        ]);

        await ctx.sync();
      });
    } catch {
      // Swallow workbook logging failures; console log already captured.
    }
  }
}
