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

export interface AppSettings {
  telemetry: TelemetrySettings;
}
