import { Injectable } from "@angular/core";
import { AppContextService } from "./app-context.service";
import type {
  AppTelemetryEvent,
  ExcelErrorInfo,
  ExcelOperationResult,
  FeatureTelemetryEvent,
  TelemetrySeverity,
  WorkflowTelemetryEvent,
} from "@excel-platform/shared/types";
import { SettingsService } from "@excel-platform/core/settings";

// Office.js globals are provided at runtime by Excel; they deliberately remain
// loosely typed here and are always guarded by host checks before use.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Office: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Excel: any;

/**
 * Centralized telemetry service for application operations that touch Excel
 * and other Office.js-backed behaviors.
 *
 * This service is responsible for:
 * - Normalizing Excel/Office.js errors into `ExcelOperationResult` values.
 * - Emitting structured console logs for successes, failures, and debug events.
 * - Optionally appending log rows into a workbook table when telemetry is enabled
 *   via `SettingsService` (see `TelemetrySettings`).
 *
 * All Office.js access remains behind this wrapper and is guarded so that
 * logging to the workbook is a no-op outside Excel or when disabled in
 * settings. Callers should treat this as the single entry point for
 * telemetry related to Excel and, over time, broader application events
 * rather than writing directly to the console or workbook.
 */
@Injectable({ providedIn: "root" })
export class TelemetryService {
  private readonly sessionId: string;

  constructor(
    private readonly settings: SettingsService,
    private readonly appContext: AppContextService
  ) {
    // Simple per-load session identifier; can be surfaced in settings
    // and logs to correlate events within a single Angular runtime.
    this.sessionId = `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  /**
   * Helper for building a workflow telemetry event with strong typing
   * and a sensible default category.
   */
  createWorkflowEvent(
    params: Omit<WorkflowTelemetryEvent, "category"> & {
      category?: WorkflowTelemetryEvent["category"];
    }
  ): WorkflowTelemetryEvent {
    const { category = "system", ...rest } = params;
    return {
      category,
      ...rest,
    };
  }

  /**
   * Helper for building a feature telemetry event (UI, settings, etc.).
   */
  createFeatureEvent(
    params: Omit<FeatureTelemetryEvent, "category"> & {
      category?: FeatureTelemetryEvent["category"];
    }
  ): FeatureTelemetryEvent {
    const { category = "ui", ...rest } = params;
    return {
      category,
      ...rest,
    };
  }

  /**
   * Normalize an unknown error value into a typed `ExcelOperationResult`.
   *
   * This helper should be used by Office.js wrappers (for example
   * `ExcelService`) to turn arbitrary thrown values into an
   * `ExcelErrorInfo`, emit telemetry via `logError`, and return a
   * consistent failure result to callers.
   */
  normalizeError<T>(
    operation: string,
    err: unknown,
    fallbackMessage: string
  ): ExcelOperationResult<T> {
    const message =
      (typeof err === "object" &&
      err &&
      "message" in err &&
      typeof (err as { message?: unknown }).message === "string"
        ? (err as { message?: string }).message
        : undefined) ?? fallbackMessage;

    const error: ExcelErrorInfo = {
      operation,
      message,
      raw: err,
    };

    this.logEvent({
      category: "excel",
      name: operation,
      severity: "error",
      message,
      context: { raw: err },
    });
    return { ok: false, error };
  }

  /**
   * Core helper for emitting an application telemetry event.
   *
   * This method is host-agnostic: it always logs to the console and
   * then, when workbook logging is enabled and the host is Excel,
   * appends a row into the workbook log table.
   */
  logEvent(event: AppTelemetryEvent): void {
    const { telemetry } = this.settings.value;

    const enriched: AppTelemetryEvent = {
      ...event,
      sessionId: event.sessionId ?? this.sessionId,
      context: {
        hostStatus: this.appContext.hostStatus,
        authSummary: this.appContext.getAuthSummary(),
        ...(event.context ?? {}),
      },
    };

    // Console sink is optional and controlled by settings.
    if (telemetry.enableConsoleLogging) {
      this.logToConsole(enriched);
    }

    // Workbook sink (Excel-only, best-effort, also controlled by settings).
    void this.logToWorkbookIfEnabled({
      level: this.mapSeverityToWorkbookLevel(enriched.severity),
      operation: enriched.name,
      message: enriched.message,
      sessionId: enriched.sessionId,
      correlationId: enriched.correlationId,
    });
  }

  /**
   * Internal console sink that chooses the appropriate console method
   * based on the telemetry severity and formats a consistent message.
   */
  private logToConsole(event: AppTelemetryEvent): void {
    const payload = event.context ?? {};
    const prefix = `[${event.category}]`;

    switch (event.severity) {
      case "error":
        console.error(prefix, event.name, event.message ?? "", payload);
        break;
      case "warn":
        console.warn(prefix, event.name, event.message ?? "", payload);
        break;
      case "info":
        console.info(prefix, event.name, event.message ?? "", payload);
        break;
      case "debug":
      default:
        console.debug(prefix, event.name, event.message ?? "", payload);
        break;
    }
  }

  /**
   * Map a rich telemetry severity into the simpler workbook log level.
   */
  private mapSeverityToWorkbookLevel(severity: TelemetrySeverity): "info" | "error" {
    return severity === "error" ? "error" : "info";
  }

  /**
   * Append a telemetry row into the workbook log table when enabled.
   *
   * This is a best-effort operation:
   * - No-op when workbook logging is disabled or the host is not Excel.
   * - Swallows Office.js failures, relying on the console log as the
   *   primary diagnostic surface.
   *
   * The target worksheet/table name and column labels are read from
   * `TelemetrySettings` in `SettingsService`, falling back to sensible
   * defaults when not configured.
   */
  private async logToWorkbookIfEnabled(entry: {
    level: "info" | "error";
    operation: string;
    message?: string;
    sessionId?: string;
    correlationId?: string;
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
          sessionId: "sessionId",
          correlationId: "correlationId",
        };

        let sheet = sheets.getItemOrNullObject(worksheetName);
        sheet.load("name");
        await ctx.sync();

        if (sheet.isNullObject) {
          sheet = sheets.add(worksheetName);
          const headerRange = sheet.getRange("A1:F1");
          headerRange.values = [
            [
              columns.timestamp,
              columns.level,
              columns.operation,
              columns.message,
              columns.sessionId ?? "sessionId",
              columns.correlationId ?? "correlationId",
            ],
          ];
        }

        let table = ctx.workbook.tables.getItemOrNullObject(tableName);
        table.load("name");
        await ctx.sync();

        if (table.isNullObject) {
          const headerRange = sheet.getRange("A1:F1");
          table = ctx.workbook.tables.add(headerRange, true /* hasHeaders */);
          table.name = tableName;
        }

        const rows = table.rows;
        rows.add(null, [
          [
            new Date().toISOString(),
            entry.level,
            entry.operation,
            entry.message ?? "",
            entry.sessionId ?? "",
            entry.correlationId ?? "",
          ],
        ]);

        await ctx.sync();
      });
    } catch {
      // Swallow workbook logging failures; console log already captured.
    }
  }
}
