import { Injectable } from "@angular/core";
import { AppSettings, AppSettingsUpdate, AppSettingsSchema } from "@excel-platform/shared/types";
import { StorageBaseService } from "@excel-platform/data/storage";

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
    excelRunTimeoutMs: 30000,
    maxExecutionTimeMs: 120000,
    fetchTimeoutMs: 30000,
    maxConcurrentRequests: 5,
    cleanupOnPartialFailure: true,
  },
};

/**
 * Settings Service - Manages application-wide user preferences and configuration.
 *
 * Provides centralized settings management with:
 * - Persistent storage via StorageBaseService
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
 * Uses StorageBaseService (zero-dependency) to avoid circular dependency with TelemetryService.
 * Other services that need telemetry logging should use StorageHelperService instead.
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
  private settings: AppSettings;

  constructor(private readonly storage: StorageBaseService) {
    this.settings = this.load();
  }

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
  update(partial: AppSettingsUpdate): void {
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
    // Use Zod schema validation for runtime type safety at storage boundary
    const parsed = this.storage.getItem<AppSettings>(STORAGE_KEY, DEFAULT_SETTINGS, AppSettingsSchema);
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
  }

  private save(): void {
    this.storage.setItem(STORAGE_KEY, this.settings);
  }
}
