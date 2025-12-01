/**
 * Lightweight description of an Excel worksheet/tab in the workbook.
 *
 * This model is intentionally minimal so that features which
 * enumerate or display tabs do not depend on the underlying
 * Office.js worksheet shape. Any additional fields should be
 * added behind explicit feature needs and documented here.
 */
export interface WorkbookTabInfo {
  /** Display name of the worksheet as shown in Excel. */
  name: string;
}

/**
 * Lightweight description of an Excel table used by workbook helpers
 * and features when reasoning about query outputs.
 *
 * Instances of this interface are produced by `ExcelService`
 * and consumed by `WorkbookService` and feature components. The
 * goal is to avoid leaking raw Office.js table objects into the
 * rest of the app while still exposing enough metadata to drive
 * navigation and ownership decisions.
 */
export interface WorkbookTableInfo {
  /** Display name of the table inside the workbook. */
  name: string;
  /** Name of the worksheet that contains the table. */
  worksheet: string;
  /** Cached row count for the table, when available. */
  rows: number;
}

/**
 * Ownership metadata describing how a given table relates to the
 * extension.
 *
 * Ownership is tracked at the workbook level (via a hidden
 * worksheet) so the add-in can safely distinguish between
 * extension-managed tables and user-managed content. This allows
 * features such as query reruns and reset helpers to avoid
 * destructive operations on user data.
 */
export interface WorkbookOwnershipInfo {
  /** Name of the Excel table. */
  tableName: string;
  /** Name of the worksheet that contains the table. */
  sheetName: string;
  /**
   * Identifier of the query that owns this table, if the table was
   * created by the query runner. Undefined means the table is not
   * associated with a specific query.
   */
  queryId?: string;
  /** True when the table is considered extension-managed. */
  isManaged: boolean;
  /** ISO timestamp of the last time the extension touched this table. */
  lastTouchedUtc?: string;
}
