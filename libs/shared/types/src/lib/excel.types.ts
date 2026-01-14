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
 * Error classification for retry/recovery decisions.
 */
export type ExcelErrorType =
  | 'transient'   // Timeout, Excel busy - can retry
  | 'permanent'   // Bad data, validation failure - fail fast
  | 'resource'    // Memory, payload limit - reduce batch size
  | 'unknown';    // Unclassified error

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
  /** Error classification for retry/recovery decisions. */
  errorType?: ExcelErrorType;
  /** Whether the error is recoverable via retry. */
  retriable?: boolean;
}

/**
 * Result of writing a single chunk to Excel.
 */
export interface ChunkWriteResult {
  /** Zero-based chunk index. */
  chunkIndex: number;
  /** Start row index (within data array). */
  startRow: number;
  /** End row index (exclusive). */
  endRow: number;
  /** Whether this chunk was written successfully. */
  success: boolean;
  /** Error info if chunk failed. */
  error?: ExcelErrorInfo;
}

/**
 * Detailed result from chunked write operation.
 */
export interface ChunkedWriteResult {
  /** Overall success - true only if ALL chunks succeeded. */
  ok: boolean;
  /** Total rows successfully written. */
  rowsWritten: number;
  /** Total rows that failed to write. */
  rowsFailed: number;
  /** Per-chunk results for debugging. */
  chunks: ChunkWriteResult[];
  /** Whether partial data was cleaned up. */
  cleanedUp?: boolean;
}

/**
 * Target specification for query table upsert operations.
 *
 * Separates execution target (where to write) from API definition (what to fetch).
 * Used by ExcelService.upsertQueryTable() as part of Phase 1 migration.
 */
export interface QueryTableTarget {
  /** Target worksheet name */
  sheetName: string;
  /** Target table name */
  tableName: string;
}
