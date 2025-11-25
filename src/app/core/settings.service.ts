import { Injectable } from "@angular/core";
import { AppSettings } from "../types";

const STORAGE_KEY = "excel-extension.settings";

const DEFAULT_SETTINGS: AppSettings = {
  telemetry: {
    enableWorkbookLogging: false,
    enableConsoleLogging: true,
    sessionStrategy: "per-load",
    logWorksheetName: "_Extension_Log",
    logTableName: "_Extension_Log_Table",
    logColumns: {
      timestamp: "timestamp",
      level: "level",
      operation: "operation",
      message: "message",
      sessionId: "sessionId",
      correlationId: "correlationId",
    },
  },
  queryExecution: {
    maxRowsPerQuery: 10000,
    chunkSize: 1000,
    enableProgressiveLoading: true,
    apiPageSize: 1000,
    chunkBackoffMs: 100,
    disableFormulasDuringRun: true,
  },
};

/**
 * Settings Service - Manages application-wide user preferences and configuration.
 *
 * Provides centralized settings management with:
 * - Persistent storage via localStorage
 * - Default settings fallback
 * - Deep merge for partial updates (especially telemetry settings)
 * - Type-safe access to settings
 *
 * **Settings Structure:**
 * - **telemetry**: Logging and telemetry configuration
 *   - enableWorkbookLogging: Log to Excel workbook table
 *   - enableConsoleLogging: Log to browser console
 *   - sessionStrategy: Session ID strategy
 *   - logWorksheetName/logTableName: Excel logging targets
 * - **queryExecution**: Query performance and resource limits (Phase 6)
 *   - maxRowsPerQuery: Maximum rows per query (default 10,000)
 *   - chunkSize: Excel write batch size (default 1,000)
 *   - enableProgressiveLoading: Show first chunk immediately
 *   - apiPageSize: Pagination size for API calls
 *   - chunkBackoffMs: Delay between Excel write chunks
 *
 * **Storage:**
 * Uses direct localStorage access (not StorageHelperService to avoid circular dependency
 * with TelemetryService → StorageHelperService → TelemetryService → SettingsService).
 *
 * **Usage:**
 * ```typescript
 * // Read settings
 * const { telemetry } = settings.value;
 *
 * // Update settings
 * settings.update({
 *   telemetry: {
 *     enableConsoleLogging: true
 *   }
 * });
 * ```
 */
@Injectable({ providedIn: "root" })
export class SettingsService {
  private settings: AppSettings = this.load();

  /**
   * Current settings snapshot.
   * Returns merged settings (stored + defaults).
   */
  get value(): AppSettings {
    return this.settings;
  }

  /**
   * Update settings with partial values.
   * Performs deep merge for telemetry and queryExecution settings, shallow merge for top-level.
   * Automatically persists to localStorage.
   *
   * @param partial - Partial settings to merge with current settings
   */
  update(partial: Partial<AppSettings>): void {
    this.settings = {
      ...this.settings,
      ...partial,
      telemetry: {
        ...this.settings.telemetry,
        ...(partial.telemetry ?? {}),
      },
      queryExecution: {
        ...(this.settings.queryExecution ?? DEFAULT_SETTINGS.queryExecution!),
        ...(partial.queryExecution ?? {}),
      },
    };
    this.save();
  }

  private load(): AppSettings {
    if (typeof window === "undefined") return DEFAULT_SETTINGS;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return DEFAULT_SETTINGS;
      const parsed = JSON.parse(raw) as AppSettings;
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        telemetry: {
          ...DEFAULT_SETTINGS.telemetry,
          ...(parsed.telemetry ?? {}),
        },
        queryExecution: {
          ...DEFAULT_SETTINGS.queryExecution!,
          ...(parsed.queryExecution ?? {}),
        },
      };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  private save(): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // Ignore storage errors.
    }
  }
}
