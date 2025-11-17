/**
 * Simple parameter definition for a query, including type and default value.
 */
export interface QueryParameter {
  /** Unique identifier for this parameter within a query. */
  id: string;
  /** Human-friendly label shown in the UI. */
  label: string;
  /** Optional description/help text. */
  description?: string;
  /** Parameter type, kept simple for now. */
  type: "string" | "number" | "boolean" | "date";
  /** Default value when the query is first configured. */
  defaultValue?: string | number | boolean | Date | null;
}

/**
 * Definition of a query that can be executed against a data source.
 */
export interface QueryDefinition {
  /** Stable id used by API/state. */
  id: string;
  /** Short name displayed in lists and nav. */
  name: string;
  /** Longer description of what this query does. */
  description?: string;
  /** Optional list of roles allowed to run this query; omitted means any allowed query role. */
  allowedRoles?: string[];
  /** Parameters required/optional for this query. */
  parameters: QueryParameter[];
  /** Base name to use when creating sheets for this query. */
  defaultSheetName: string;
  /** Base name to use when creating tables for this query. */
  defaultTableName: string;
}

/**
 * Excel location where a query wrote its results.
 */
export interface QueryRunLocation {
  /** Worksheet name where the query’s table lives. */
  sheetName: string;
  /** Table name created/used by the query. */
  tableName: string;
}

/**
 * Result metadata for a completed query run.
 */
export interface QueryRun {
  /** The query that was executed. */
  queryId: string;
  /** Timestamp when the run completed. */
  completedAt: Date;
  /** Row count written to the table. */
  rowCount: number;
  /** Where in Excel this run wrote data (if in Excel). */
  location?: QueryRunLocation;
}
