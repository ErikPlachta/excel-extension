import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { QueryApiMockService } from "./query-api-mock.service";
import { QueryDefinition, QueryRun } from "./query-model";

export interface QueryStateSnapshot {
  queries: QueryDefinition[];
  lastParams: Record<string, Record<string, any>>;
  lastRuns: Record<string, QueryRun | undefined>;
}

@Injectable({ providedIn: "root" })
export class QueryStateService {
  private readonly stateSubject: BehaviorSubject<QueryStateSnapshot>;
  readonly state$;

  constructor(private readonly api: QueryApiMockService) {
    const queries = this.api.getQueries();
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

  getLastParams(queryId: string): Record<string, any> | undefined {
    return this.snapshot.lastParams[queryId];
  }

  setLastParams(queryId: string, params: Record<string, any>): void {
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
