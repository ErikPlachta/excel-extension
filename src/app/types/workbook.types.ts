/**
 * Lightweight description of an Excel worksheet/tab in the workbook.
 */
export interface WorkbookTabInfo {
  /** Display name of the worksheet as shown in Excel. */
  name: string;
}

/**
 * Lightweight description of an Excel table used by workbook helpers
 * and features when reasoning about query outputs.
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
 * extension. Ownership is tracked at the workbook level so the
 * add-in can avoid overwriting user-managed tables.
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
