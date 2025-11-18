export interface TelemetrySettings {
  /** When true, Excel telemetry is also written into a worksheet table. */
  enableWorkbookLogging: boolean;
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
  };
}

export interface AppSettings {
  telemetry: TelemetrySettings;
}
