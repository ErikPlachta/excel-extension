import { Injectable } from "@angular/core";
import type { ExecuteQueryParams } from "../../shared/query-api-mock.service";
import type { QueryDefinition } from "../../types";
import type { QueryParameterKey, QueryParameterValues } from "../../types";

export type QueryParameterMode = "global" | "unique";

export interface QueryParameterMetadata {
  readonly parameterKeys?: ReadonlyArray<QueryParameterKey>;
}

/**
 * QueryParamsService centralizes query-parameter composition logic
 * (global defaults + per-query overrides) for the queries feature.
 */
@Injectable({ providedIn: "root" })
export class QueryParamsService {
  buildExecuteQueryParams(
    definition: QueryDefinition & Partial<QueryParameterMetadata>,
    mode: QueryParameterMode,
    globalValues: QueryParameterValues,
    perQueryValues: QueryParameterValues | undefined
  ): ExecuteQueryParams {
    const keys = definition.parameterKeys ?? [];

    const result: Partial<Record<QueryParameterKey, string>> = {};

    for (const key of keys) {
      if (mode === "unique") {
        const overrideValue = perQueryValues?.[key];
        if (overrideValue != null) {
          result[key] = overrideValue;
          continue;
        }
      }

      const globalValue = globalValues[key];
      if (globalValue != null) {
        result[key] = globalValue;
      }
    }

    return result as ExecuteQueryParams;
  }
}
