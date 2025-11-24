/**
 * Simple parameter definition for a query invocation, including type and default value.
 *
 * In this refactor, a "query" should be thought of as a call against a
 * specific API definition with concrete parameter values. The API itself is
 * described by {@link QueryDefinition}.
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
import type { QueryParameterBinding, QueryParameterKey } from "./query-params.types";

/**
 * Controls how a query rerun should write rows into its
 * target Excel table.
 */
export type QueryWriteMode = "overwrite" | "append";

/**
 * Definition of an API-style data operation that can be invoked as a "query".
 *
 * The mock layer and UI treat this as the master catalog entry. A single
 * {@link QueryDefinition} (API) may be invoked many times with different
 * parameters and targets when users build configurations.
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
  /**
   * Optional list of well-known parameter keys this query participates in.
   * Used by the parameter management feature to map global/per-query
   * values into concrete execution parameters in a data-driven way.
   */
  parameterKeys?: QueryParameterKey[];
  /** Optional metadata describing how well-known parameter keys map to query fields. */
  parameterBindings?: QueryParameterBinding[];
  /**
   * Parameters required/optional when invoking this API as a query. These
   * definitions describe the shape of the input the underlying data source
   * expects, not the values for a particular run.
   */
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

/**
 * Query Instance - Single instance of a configured query (Phase 1).
 *
 * Represents a query with specific parameters, targeting a specific Excel location.
 * This is the NEW type that separates query execution instances from the API catalog.
 * Named QueryInstance to avoid collision with existing QueryConfiguration (collection type).
 *
 * @example
 * ```typescript
 * const salesQuery: QueryInstance = {
 *   id: 'sales-q1-2024',
 *   apiId: 'sales-summary-api',
 *   displayName: 'Q1 2024 Sales',
 *   parameterValues: { StartDate: '2024-01-01', EndDate: '2024-03-31' },
 *   targetSheetName: 'Sales_Q1',
 *   targetTableName: 'tbl_sales_q1',
 *   writeMode: 'overwrite',
 *   includeInBatch: true,
 *   createdAt: Date.now(),
 *   modifiedAt: Date.now()
 * };
 * ```
 */
export interface QueryInstance {
  /** Unique query instance ID */
  id: string;

  /** Reference to API definition (from ApiCatalogService) */
  apiId: string;

  /** Display name override (defaults to API name if not provided) */
  displayName?: string;

  /** Parameter values for this query instance */
  parameterValues: Record<string, any>;

  /** Target Excel sheet name */
  targetSheetName: string;

  /** Target Excel table name */
  targetTableName: string;

  /** How to write data (overwrite/append) */
  writeMode: QueryWriteMode;

  /** Include in batch runs */
  includeInBatch: boolean;

  /** UI configuration for query list display */
  uiConfig?: QueryUiConfig;

  /** Timestamp when config was created */
  createdAt: number;

  /** Timestamp when config was last modified */
  modifiedAt: number;
}
