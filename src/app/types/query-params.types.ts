/**
 * Well-known parameter keys supported by global and per-query parameter management.
 *
 * This initial set is shared across queries; future work may extend or specialize it.
 *
 * @TODO update to system that manages this sort of information based on metadata rather than hardcoding.
 */
export type QueryParameterKey = "StartDate" | "EndDate" | "Group" | "SubGroup";

/**
 * Describes how a well-known parameter key maps onto underlying
 * query fields in the data source (for example, an AsOfDate filter
 * or grouping columns).
 */
export interface QueryParameterBinding {
  /** The well-known key this binding applies to. */
  key: QueryParameterKey;
  /** Optional description of what the parameter controls. */
  description?: string;
  /**
   * Optional underlying field or column name(s) this parameter
   * maps to in the data source.
   */
  fieldNames?: string[];
}

/**
 * Map of well-known parameter keys to their string values.
 *
 * Dates are represented as ISO date strings to keep persistence and
 * mock execution simple and host-agnostic.
 */
export interface QueryParameterValues {
  StartDate?: string;
  EndDate?: string;
  Group?: string;
  SubGroup?: string;
}
