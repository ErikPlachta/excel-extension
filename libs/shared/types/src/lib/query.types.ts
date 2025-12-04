/**
 * @packageDocumentation Query Types - Types for the Query feature.
 *
 * ## Architecture
 *
 * This module contains types specific to the Query UI feature:
 * - Query configuration and state management
 * - Query execution results and metadata
 * - Parameter values for query instances
 *
 * ## Type Hierarchy
 *
 * - **ApiDefinition** (api.types.ts): Catalog entries - SHARED across app
 * - **QueryInstance** (this file): Configured query with target location - FEATURE specific
 * - **QueryConfiguration** (this file): Saved collection of queries - FEATURE specific
 *
 * ## Key Principle
 *
 * Nothing outside the Query feature should import from this file.
 * Use api.types.ts for shared types like ExecuteApiParams and ExecuteApiResultRow.
 */

import { QueryUiConfig } from './ui/primitives.types';

// Re-export API types for backwards compatibility during migration
export type { ExecuteApiParams as ExecuteQueryParams } from './api.types';
export type { ExecuteApiResultRow as ExecuteQueryResultRow } from './api.types';

// =============================================================================
// Parameter Types (merged from query-params.types.ts)
// =============================================================================

/**
 * Parameter values map for query instances.
 *
 * Keys are parameter names from ApiParameter.key.
 * Values are strings for serialization (dates as ISO strings).
 *
 * This replaces the hardcoded QueryParameterKey type - parameter keys
 * are now derived dynamically from ApiDefinition.parameters.
 */
export interface QueryParameterValues {
  [key: string]: string | undefined;
}

/**
 * Describes how a parameter key maps to underlying data source field(s).
 *
 * Used for advanced parameter binding scenarios where a single parameter
 * may map to multiple underlying query fields.
 */
export interface QueryParameterBinding {
  /** Parameter key this binding applies to */
  key: string;
  /** Optional description of what the parameter controls */
  description?: string;
  /** Optional underlying field name(s) this parameter maps to */
  fieldNames?: string[];
}

// =============================================================================
// Query Instance Types
// =============================================================================

/**
 * Controls how a query rerun writes rows into its target Excel table.
 */
export type QueryWriteMode = 'overwrite' | 'append';

/**
 * Excel location where a query wrote its results.
 */
export interface QueryRunLocation {
  /** Worksheet name where the query's table lives */
  sheetName: string;
  /** Table name created/used by the query */
  tableName: string;
}

/**
 * Result metadata for a completed query run.
 */
export interface QueryRun {
  /** The query that was executed */
  queryId: string;
  /** Timestamp when the run completed */
  completedAt: Date;
  /** Row count written to the table */
  rowCount: number;
  /** Where in Excel this run wrote data (if in Excel) */
  location?: QueryRunLocation;
}

/**
 * Query Instance - Single configured query with target location.
 *
 * Represents a query with specific parameters targeting a specific Excel location.
 * This separates query execution instances from the API catalog (ApiDefinition).
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
  parameterValues: QueryParameterValues;

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

// =============================================================================
// Query Configuration Types (merged from query-configuration.types.ts)
// =============================================================================

/**
 * Single item in a query configuration - represents one query with its settings.
 */
export interface QueryConfigurationItem {
  /** Unique ID for this item within the configuration */
  id: string;
  /** Reference to API definition ID */
  apiId: string;
  /** Display name for this query */
  displayName: string;
  /** Parameter values for this query */
  parameters: QueryParameterValues;
  /** Target Excel sheet name */
  targetSheetName: string;
  /** Target Excel table name */
  targetTableName: string;
  /** How to write data */
  writeMode: QueryWriteMode;
  /** Include in batch runs */
  includeInBatch: boolean;
}

/**
 * Host-agnostic description of a named query configuration for a workbook.
 *
 * Binds one or more QueryConfigurationItem entries to parameter presets
 * so a "report configuration" can be saved and reused.
 */
export interface QueryConfiguration {
  /** Stable ID for this configuration within a workbook */
  id: string;
  /** Human-friendly name for this configuration */
  name: string;
  /** Optional longer description or notes */
  description?: string;
  /** The selected queries that make up this configuration */
  items: QueryConfigurationItem[];
  /**
   * Snapshot of parameter presets when the configuration was saved.
   * Mirrors QueryStateService global and per-query parameter state.
   */
  parameterPresets?: {
    global: QueryParameterValues;
    perQuery: Record<string, QueryParameterValues>;
  };
  /** Optional default write-mode preference when replaying runs */
  writeModeDefaults?: QueryWriteMode;
  /** Optional hints about the workbook this configuration is for */
  workbookHints?: {
    workbookId?: string;
    workbookName?: string;
  };
}

// =============================================================================
// Legacy Types (Deprecated)
// =============================================================================

/**
 * Simple parameter definition for a query.
 *
 * @deprecated Use ApiParameter from api.types.ts instead.
 */
export interface QueryParameter {
  /** Unique identifier for this parameter */
  id: string;
  /** Human-friendly label shown in the UI */
  label: string;
  /** Optional description/help text */
  description?: string;
  /** Parameter type */
  type: 'string' | 'number' | 'boolean' | 'date';
  /** Default value when the query is first configured */
  defaultValue?: string | number | boolean | Date | null;
}

/**
 * Definition of an API-style data operation.
 *
 * @deprecated **MIGRATION REQUIRED**
 *
 * Use these types instead:
 * - **Catalog entries**: Use {@link ApiDefinition} from api.types.ts
 * - **Query instances**: Use {@link QueryInstance} from this file
 *
 * QueryDefinition conflates catalog metadata (id, name, parameters) with
 * execution config (defaultSheetName, writeMode). The new model separates these.
 *
 * @example Migration
 * ```typescript
 * // OLD:
 * const query: QueryDefinition = {
 *   id: 'sales',
 *   name: 'Sales',
 *   defaultSheetName: 'Sales',
 *   defaultTableName: 'tbl_sales',
 *   parameters: []
 * };
 *
 * // NEW:
 * const api: ApiDefinition = { id: 'sales', name: 'Sales', parameters: [] };
 * const instance: QueryInstance = {
 *   apiId: 'sales',
 *   targetSheetName: 'Sales',
 *   targetTableName: 'tbl_sales',
 *   ...
 * };
 * ```
 */
export interface QueryDefinition {
  /** Stable ID used by API/state */
  id: string;
  /** Short name displayed in lists and nav */
  name: string;
  /** Longer description of what this query does */
  description?: string;
  /** Optional list of roles allowed to run this query */
  allowedRoles?: string[];
  /** Optional list of parameter keys this query uses */
  parameterKeys?: string[];
  /** Optional metadata describing how parameter keys map to query fields */
  parameterBindings?: QueryParameterBinding[];
  /** Parameters required/optional when invoking this query */
  parameters: QueryParameter[];
  /** Base name to use when creating sheets for this query */
  defaultSheetName: string;
  /** Base name to use when creating tables for this query */
  defaultTableName: string;
  /** Strategy for writing rows on rerun */
  writeMode?: QueryWriteMode;
  /** Optional UI configuration for how this query appears */
  uiConfig?: QueryUiConfig;
}
