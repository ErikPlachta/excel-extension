/**
 * Formula dependency types for detecting table/column references in Excel formulas.
 * Used by FormulaScannerService to identify breaking changes before query updates.
 */

/**
 * A table/column reference found within a formula.
 */
export interface TableColumnReference {
  /** Table name referenced in the formula */
  tableName: string;
  /** Column name referenced (optional - may reference entire table) */
  columnName?: string;
}

/**
 * A formula dependency linking a cell to a table/column reference.
 */
export interface FormulaDependency {
  /** Worksheet containing the formula */
  sheetName: string;
  /** Cell address (e.g., "A1", "B5") */
  cellAddress: string;
  /** The formula text */
  formula: string;
  /** Referenced table name */
  tableName: string;
  /** Referenced column name (if any) */
  columnName?: string;
}

/**
 * Result of scanning a workbook for formula dependencies.
 */
export interface FormulaScanResult {
  /** All formula dependencies found */
  dependencies: FormulaDependency[];
  /** Number of worksheets scanned */
  sheetsScanned: number;
  /** Number of formulas analyzed */
  formulasAnalyzed: number;
  /** Scan timestamp */
  scannedAt: Date;
}

/**
 * Impact assessment for a query update on formula-dependent columns.
 */
export interface QueryImpactAssessment {
  /** Query ID being assessed */
  queryId: string;
  /** Target table name */
  tableName: string;
  /** Whether the query would affect formula-dependent columns */
  hasImpact: boolean;
  /** Columns that would be affected */
  affectedColumns: string[];
  /** Formulas that depend on affected columns */
  affectedFormulas: FormulaDependency[];
  /** Severity: none, low (few refs), high (many refs) */
  severity: "none" | "low" | "high";
}
