import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { ExecuteQueryParams, QueryApiMockService } from "./query-api-mock.service";
import { QueryApiLargeDatasetService } from "./query-api-large-dataset.service";
import { QueryDefinition, QueryRun } from "./query-model";

export interface QueryStateSnapshot {
  queries: QueryDefinition[];
  lastParams: Record<string, ExecuteQueryParams>;
  lastRuns: Record<string, QueryRun | undefined>;
}

@Injectable({ providedIn: "root" })
export class QueryStateService {
  private readonly stateSubject: BehaviorSubject<QueryStateSnapshot>;
  readonly state$;

  constructor(
    private readonly api: QueryApiMockService,
    private readonly largeDatasetApi: QueryApiLargeDatasetService
  ) {
    // Combine queries from both services
    const queries = [...this.api.getQueries(), ...this.largeDatasetApi.getQueries()];
    this.stateSubject = new BehaviorSubject<QueryStateSnapshot>({
      queries,
      lastParams: {},
      lastRuns: {},
    });
    this.state$ = this.stateSubject.asObservable();
  }

  get snapshot(): QueryStateSnapshot {
    return this.stateSubject.value;
  }

  getQueries(): QueryDefinition[] {
    return this.snapshot.queries;
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
}
