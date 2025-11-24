export type {
  QueryParameter,
  QueryDefinition,
  QueryRunLocation,
  QueryRun,
  QueryWriteMode,
} from "../types";

/**
 * Alias for {@link QueryDefinition} used when we are explicitly talking
 * about the master catalog of APIs, rather than per-workbook query
 * configurations or individual runs.
 */
export type ApiDefinition = import("../types").QueryDefinition;
