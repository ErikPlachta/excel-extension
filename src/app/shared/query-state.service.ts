import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { ExecuteQueryParams, QueryApiMockService } from "./query-api-mock.service";
import { ApiDefinition, QueryDefinition, QueryRun } from "./query-model";
import type { QueryParameterValues } from "../types";
import { StorageHelperService } from "./storage-helper.service";

/**
 * Shape of the in-memory state managed by {@link QueryStateService}.
 *
 * This snapshot is kept inside a BehaviorSubject so components can
 * either subscribe to {@link QueryStateService.state$} or read the
 * latest value via {@link QueryStateService.snapshot}.
 */
export interface QueryStateSnapshot {
  /**
   * Master catalog of API-style definitions that can be invoked as
   * queries. This is the same shape as {@link ApiDefinition}; we keep
   * the older {@link QueryDefinition} name here until the rest of the
   * app is migrated to API-centric terminology.
   */
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

  constructor(
    private readonly api: QueryApiMockService,
    private readonly storage: StorageHelperService
  ) {
    const queries = this.api.getQueries();

    const { globalParams, queryParams, queryRunFlags } = this.hydrateFromStorage();

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

  /** Return the current list of known {@link QueryDefinition} objects. */
  getQueries(): QueryDefinition[] {
    return this.snapshot.queries;
  }

  private hydrateFromStorage(): {
    globalParams: QueryParameterValues;
    queryParams: Record<string, QueryParameterValues>;
    queryRunFlags: Record<string, boolean>;
  } {
    const globalParams = this.storage.getItem<QueryParameterValues>(
      QueryStateService.STORAGE_KEY_GLOBAL,
      {}
    );
    const queryParams = this.storage.getItem<Record<string, QueryParameterValues>>(
      QueryStateService.STORAGE_KEY_QUERY_PARAMS,
      {}
    );
    const queryRunFlags = this.storage.getItem<Record<string, boolean>>(
      QueryStateService.STORAGE_KEY_RUN_FLAGS,
      {}
    );

    return { globalParams, queryParams, queryRunFlags };
  }

  private persistSlice(): void {
    const { globalParams, queryParams, queryRunFlags } = this.snapshot;

    this.storage.setItem(QueryStateService.STORAGE_KEY_GLOBAL, globalParams);
    this.storage.setItem(QueryStateService.STORAGE_KEY_QUERY_PARAMS, queryParams);
    this.storage.setItem(QueryStateService.STORAGE_KEY_RUN_FLAGS, queryRunFlags);
  }

  /**
   * Get the current global parameter defaults that apply to all
   * parameterized queries which opt into the shared parameter model.
   */
  getGlobalParams(): QueryParameterValues {
    return this.snapshot.globalParams;
  }

  /**
   * Replace the current set of global parameter defaults and persist
   * them to localStorage. Callers should pass a full object rather
   * than mutating the returned reference from {@link getGlobalParams}.
   */
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

  /**
   * Persist per-query parameter overrides for a specific query id.
   * Overrides are merged into state but callers are expected to
   * construct the full map for the given query.
   */
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

  /**
   * Update the stored Run-checkbox flag for a single query and
   * persist the updated flags collection to localStorage.
   */
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

  /**
   * Persist the last set of {@link ExecuteQueryParams} that were used
   * to execute a given query. This does not affect global or per-query
   * parameter defaults; it is used primarily for telemetry and UX.
   */
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

  /**
   * Record the most recent completed run for a query, including the
   * inferred or actual worksheet/table location used in Excel.
   */
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
