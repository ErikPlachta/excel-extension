/**
 * Standardized result for Excel-related operations.
 */
export interface ExcelOperationResult<T = void> {
  /** True when the operation completed without errors. */
  ok: boolean;
  /** Optional strongly typed payload for successful operations. */
  value?: T;
  /** Optional normalized error information when `ok` is false. */
  error?: ExcelErrorInfo;
}

/**
 * Normalized description of an Excel error.
 */
export interface ExcelErrorInfo {
  /** High-level operation name, e.g. "upsertQueryTable". */
  operation: string;
  /** Short message suitable for user-facing display. */
  message: string;
  /** Optional raw error object for logging/debugging. */
  raw?: unknown;
}
