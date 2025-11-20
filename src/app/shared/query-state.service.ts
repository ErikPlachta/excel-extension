import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { ExecuteQueryParams, QueryApiMockService } from "./query-api-mock.service";
import { QueryDefinition, QueryRun } from "./query-model";
import type { QueryParameterValues } from "../types";

export interface QueryStateSnapshot {
  queries: QueryDefinition[];
  lastParams: Record<string, ExecuteQueryParams>;
  lastRuns: Record<string, QueryRun | undefined>;
  /** Global parameter defaults applied to all queries that opt in. */
  globalParams: QueryParameterValues;
  /** Per-query parameter overrides keyed by query id. */
  queryParams: Record<string, QueryParameterValues>;
  /** Per-query Run checkbox state used for batch execution. */
  queryRunFlags: Record<string, boolean>;
}

@Injectable({ providedIn: "root" })
export class QueryStateService {
  private readonly stateSubject: BehaviorSubject<QueryStateSnapshot>;
  readonly state$;

  private static readonly STORAGE_KEY_GLOBAL = "excel-ext:queries:globalParams";
  private static readonly STORAGE_KEY_QUERY_PARAMS = "excel-ext:queries:queryParams";
  private static readonly STORAGE_KEY_RUN_FLAGS = "excel-ext:queries:runFlags";

  constructor(private readonly api: QueryApiMockService) {
    const queries = this.api.getQueries();

    const { globalParams, queryParams, queryRunFlags } = QueryStateService.hydrateFromStorage();

    this.stateSubject = new BehaviorSubject<QueryStateSnapshot>({
      queries,
      lastParams: {},
      lastRuns: {},
      globalParams,
      queryParams,
      queryRunFlags,
    });
    this.state$ = this.stateSubject.asObservable();
  }

  get snapshot(): QueryStateSnapshot {
    return this.stateSubject.value;
  }

  getQueries(): QueryDefinition[] {
    return this.snapshot.queries;
  }

  private static hydrateFromStorage(): {
    globalParams: QueryParameterValues;
    queryParams: Record<string, QueryParameterValues>;
    queryRunFlags: Record<string, boolean>;
  } {
    if (typeof window === "undefined" || !window.localStorage) {
      return { globalParams: {}, queryParams: {}, queryRunFlags: {} };
    }

    const safeParse = <T>(raw: string | null): T | undefined => {
      if (!raw) return undefined;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return undefined;
      }
    };

    const globalParams =
      safeParse<QueryParameterValues>(
        window.localStorage.getItem(QueryStateService.STORAGE_KEY_GLOBAL)
      ) ?? {};
    const queryParams =
      safeParse<Record<string, QueryParameterValues>>(
        window.localStorage.getItem(QueryStateService.STORAGE_KEY_QUERY_PARAMS)
      ) ?? {};
    const queryRunFlags =
      safeParse<Record<string, boolean>>(
        window.localStorage.getItem(QueryStateService.STORAGE_KEY_RUN_FLAGS)
      ) ?? {};

    return { globalParams, queryParams, queryRunFlags };
  }

  private persistSlice(): void {
    if (typeof window === "undefined" || !window.localStorage) {
      return;
    }

    const { globalParams, queryParams, queryRunFlags } = this.snapshot;

    try {
      window.localStorage.setItem(
        QueryStateService.STORAGE_KEY_GLOBAL,
        JSON.stringify(globalParams)
      );
      window.localStorage.setItem(
        QueryStateService.STORAGE_KEY_QUERY_PARAMS,
        JSON.stringify(queryParams)
      );
      window.localStorage.setItem(
        QueryStateService.STORAGE_KEY_RUN_FLAGS,
        JSON.stringify(queryRunFlags)
      );
    } catch {
      // Swallow storage errors; state still works in-memory.
    }
  }

  getGlobalParams(): QueryParameterValues {
    return this.snapshot.globalParams;
  }

  setGlobalParams(values: QueryParameterValues): void {
    this.stateSubject.next({
      ...this.snapshot,
      globalParams: { ...values },
    });
    this.persistSlice();
  }

  getQueryParams(queryId: string): QueryParameterValues | undefined {
    return this.snapshot.queryParams[queryId];
  }

  setQueryParams(queryId: string, values: QueryParameterValues): void {
    const { queryParams } = this.snapshot;
    this.stateSubject.next({
      ...this.snapshot,
      queryParams: {
        ...queryParams,
        [queryId]: { ...values },
      },
    });
    this.persistSlice();
  }

  getQueryRunFlag(queryId: string): boolean {
    return this.snapshot.queryRunFlags[queryId] ?? false;
  }

  setQueryRunFlag(queryId: string, value: boolean): void {
    const { queryRunFlags } = this.snapshot;
    this.stateSubject.next({
      ...this.snapshot,
      queryRunFlags: {
        ...queryRunFlags,
        [queryId]: value,
      },
    });
    this.persistSlice();
  }

  getLastParams(queryId: string): Record<string, unknown> | undefined {
    return this.snapshot.lastParams[queryId];
  }

  setLastParams(queryId: string, params: ExecuteQueryParams): void {
    const { lastParams } = this.snapshot;
    this.stateSubject.next({
      ...this.snapshot,
      lastParams: {
        ...lastParams,
        [queryId]: { ...params },
      },
    });
  }

  getLastRun(queryId: string): QueryRun | undefined {
    return this.snapshot.lastRuns[queryId];
  }

  setLastRun(queryId: string, run: QueryRun): void {
    const { lastRuns } = this.snapshot;
    this.stateSubject.next({
      ...this.snapshot,
      lastRuns: {
        ...lastRuns,
        [queryId]: run,
      },
    });
  }

  /**
   * Compute the effective ExecuteQueryParams for a query in a given mode
   * by combining global defaults and per-query overrides.
   *
   * This does not persist any state; callers are responsible for
   * deciding when to store last-used params.
   */
  getEffectiveParams(query: QueryDefinition, mode: "global" | "unique"): ExecuteQueryParams {
    const globalValues = this.getGlobalParams();
    const overrideValues = this.getQueryParams(query.id);

    const result: ExecuteQueryParams = {};

    const keys = query.parameterKeys ?? [];
    for (const key of keys) {
      if (mode === "unique") {
        const overrideValue = overrideValues?.[key];
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

    return result;
  }
}
