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

import { QueryUiConfig } from "./ui/primitives.types";

/**
 * Controls how a query rerun should write rows into its
 * target Excel table.
 */
export type QueryWriteMode = "overwrite" | "append";

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
  /**
   * Strategy for writing rows on rerun.
   * - "overwrite" (default): rewrites the table region
   *   for each run.
   * - "append": preserves existing rows and appends new
   *   ones to the bottom of the table.
   */
  writeMode?: QueryWriteMode;
  /** Optional, data-driven UI configuration for how this query appears in the UI. */
  uiConfig?: QueryUiConfig;
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
