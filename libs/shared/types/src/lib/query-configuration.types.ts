import type { QueryParameterValues } from "./query-params.types";
import type { QueryWriteMode } from "./query.types";

/**
 * Single item in a query configuration - represents one query with its settings.
 * Moved from queries.component.ts to break circular dependency.
 */
export interface QueryConfigurationItem {
  id: string;
  apiId: string;
  displayName: string;
  parameters: QueryParameterValues;
  targetSheetName: string;
  targetTableName: string;
  writeMode: QueryWriteMode;
  includeInBatch: boolean;
}

/**
 * Host-agnostic description of a named query configuration for a
 * workbook. This binds one or more {@link QueryConfigurationItem}
 * entries to a set of parameter presets and optional workbook hints
 * so a "report configuration" can be reused.
 */
export interface QueryConfiguration {
  /** Stable id for this configuration within a workbook. */
  id: string;
  /** Human-friendly name for this configuration. */
  name: string;
  /** Optional longer description or notes. */
  description?: string;
  /** The selected queries that make up this configuration. */
  items: QueryConfigurationItem[];
  /**
   * Snapshot of parameter presets when the configuration was saved.
   * This mirrors the shape of QueryStateService global and per-query
   * parameter state but does not directly reference that service.
   */
  parameterPresets?: {
    global: QueryParameterValues;
    perQuery: Record<string, QueryParameterValues>;
  };
  /** Optional default write-mode preference when replaying runs. */
  writeModeDefaults?: QueryWriteMode;
  /** Optional hints about the workbook this configuration is for. */
  workbookHints?: {
    workbookId?: string;
    workbookName?: string;
  };
}
