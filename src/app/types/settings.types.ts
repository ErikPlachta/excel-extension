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
 * Configures chunking, row limits, and progressive loading behavior.
 */
export interface QueryExecutionSettings {
  /** Maximum rows per query to prevent Excel crashes (default: 10000) */
  maxRowsPerQuery: number;

  /** Chunk size for Excel writes to stay within Office.js 5MB payload limit (default: 1000) */
  chunkSize: number;

  /** Enable progressive loading: show first chunk immediately, queue rest (default: true) */
  enableProgressiveLoading: boolean;

  /** API pagination page size for streaming large datasets (default: 1000) */
  apiPageSize: number;

  /** Backoff delay between chunks in milliseconds to avoid Excel throttling (default: 100) */
  chunkBackoffMs: number;

  /** Disable Excel formula recalculation during query execution (default: true) */
  disableFormulasDuringRun: boolean;
}

export interface AppSettings {
  telemetry: TelemetrySettings;
  queryExecution?: QueryExecutionSettings;
}
