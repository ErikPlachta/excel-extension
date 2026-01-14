export interface TelemetrySettings {
  /** When true, Excel telemetry is also written into a worksheet table. */
  enableWorkbookLogging: boolean;
  /** When true, telemetry events are written to the developer console. */
  enableConsoleLogging: boolean;
  /** Optional globally configured session identifier strategy label. */
  sessionStrategy?: "per-load" | "per-workbook" | "custom";
  /** Worksheet name used for Excel telemetry log table. */
  logWorksheetName?: string;
  /** Table name used for Excel telemetry log table. */
  logTableName?: string;
  /** Column names for the telemetry log table, in order. */
  logColumns?: {
    timestamp: string;
    level: string;
    operation: string;
    message: string;
    /** Optional column name for the Angular/app session identifier. */
    sessionId?: string;
    /** Optional column name for the correlation id. */
    correlationId?: string;
  };
}

/**
 * Query execution settings for performance and resource management.
 * Configures chunking, timeouts, and progressive loading behavior.
 *
 * ## Microsoft Office.js Recommended Practices
 *
 * These settings implement Microsoft's guidance for large datasets:
 * - Chunk data to stay under 5MB payload limit
 * - Retry with smaller chunks on payload errors
 * - Suspend calculations during bulk writes
 * - No arbitrary row limits (Excel supports 1,048,576 rows)
 *
 * @see https://learn.microsoft.com/en-us/office/dev/add-ins/excel/excel-add-ins-ranges-large
 * @see https://learn.microsoft.com/en-us/office/dev/add-ins/excel/performance
 */
export interface QueryExecutionSettings {
  /**
   * Maximum rows per query. 0 = unlimited (recommended per Microsoft).
   * Microsoft recommends chunking, not arbitrary limits.
   * Legacy mode: Set > 0 to enforce hard truncation.
   */
  maxRowsPerQuery: number;

  /**
   * Chunk size for Excel writes. MS recommends 5k-20k rows for large datasets.
   * Automatically reduced for wide tables to stay within 5MB payload limit.
   * @default 5000
   * @see https://learn.microsoft.com/en-us/office/dev/add-ins/excel/excel-add-ins-ranges-large
   */
  chunkSize: number;

  /**
   * Enable progressive loading: show first chunk immediately, queue rest.
   * @default true
   */
  enableProgressiveLoading: boolean;

  /**
   * API pagination page size for streaming large datasets.
   * @default 1000
   */
  apiPageSize: number;

  /**
   * Backoff delay between chunks in milliseconds to avoid Excel throttling.
   * @default 100
   */
  chunkBackoffMs: number;

  /**
   * Disable Excel formula recalculation during query execution.
   * @default true
   */
  disableFormulasDuringRun: boolean;

  /**
   * Maximum time for a single Excel.run() operation in ms.
   * Increased for wide tables (100+ columns).
   * @default 60000 (60 seconds)
   */
  excelRunTimeoutMs: number;

  /**
   * Maximum time for total query execution including all chunks in ms.
   * Should allow 10+ minutes for 100k+ row datasets.
   * @default 600000 (10 minutes)
   */
  maxExecutionTimeMs: number;

  /**
   * Maximum time for a single API fetch in ms.
   * @default 120000 (2 minutes)
   */
  fetchTimeoutMs: number;

  /**
   * Maximum concurrent API requests.
   * @default 5
   */
  maxConcurrentRequests: number;

  /**
   * Whether to auto-cleanup partial writes on error.
   * @default true
   */
  cleanupOnPartialFailure: boolean;

  /**
   * Row count threshold for suspending calculations during write.
   * Per Microsoft: use suspendApiCalculationUntilNextSync() for bulk writes.
   * Set to 0 to disable calculation suspension.
   * @default 5000
   * @see https://learn.microsoft.com/en-us/office/dev/add-ins/excel/performance
   */
  suspendCalculationThreshold: number;

  /**
   * Max times to halve chunk size on payload errors before giving up.
   * Per Microsoft: "If a single large values write fails, retry with smaller block size."
   * @default 3
   * @see https://learn.microsoft.com/en-us/office/dev/add-ins/excel/excel-add-ins-ranges-large
   */
  maxChunkRetries: number;

  /**
   * Row count threshold to log warning about large dataset.
   * Set to 0 to disable warning.
   * @default 100000
   */
  warnAtRowCount: number;
}

export interface AppSettings {
  telemetry: TelemetrySettings;
  queryExecution?: QueryExecutionSettings;
}

/**
 * Type for partial updates to AppSettings.
 * Allows partial nested objects for deep merge in SettingsService.update().
 */
export interface AppSettingsUpdate {
  telemetry?: Partial<TelemetrySettings>;
  queryExecution?: Partial<QueryExecutionSettings>;
}
