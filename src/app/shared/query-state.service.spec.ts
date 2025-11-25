import { QueryStateService } from "./query-state.service";
import { QueryApiMockService, ExecuteQueryParams } from "./query-api-mock.service";
import { QueryDefinition } from "./query-model";
import type { QueryParameterValues } from "../types";
import { StorageHelperService } from "./storage-helper.service";

class QueryApiMockServiceStub {
  private readonly queries: QueryDefinition[] = [
    {
      id: "q1",
      name: "Test Query",
      description: "",
      parameters: [],
      defaultSheetName: "Sheet1",
      defaultTableName: "Table1",
      parameterKeys: ["StartDate", "EndDate", "Group", "SubGroup"],
    },
  ];

  getQueries(): QueryDefinition[] {
    return this.queries;
  }

  // Unused in these specs but required by the real service signature
  // so we keep stubs with lenient typing.
  executeQuery(id: string, _params?: ExecuteQueryParams) {
    throw new Error("Not implemented in stub");
  }
}

class StorageHelperServiceMock {
  private store = new Map<string, any>();

  getItem<T>(key: string, defaultValue: T): T {
    return this.store.has(key) ? this.store.get(key) : defaultValue;
  }

  setItem<T>(key: string, value: T): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

describe("QueryStateService parameter state and persistence", () => {
  it("initializes global/query params and run flags from empty storage", () => {
    const storage = new StorageHelperServiceMock();
    const service = new QueryStateService(
      new QueryApiMockServiceStub() as unknown as QueryApiMockService,
      storage as unknown as StorageHelperService
    );

    expect(service.getGlobalParams()).toEqual({});
    expect(service.getQueryParams("q1")).toBeUndefined();
    expect(service.getQueryRunFlag("q1")).toBeFalse();
  });

  it("persists and hydrates global params, per-query params, and run flags", () => {
    const storage = new StorageHelperServiceMock();
    const first = new QueryStateService(
      new QueryApiMockServiceStub() as unknown as QueryApiMockService,
      storage as unknown as StorageHelperService
    );
    const globals: QueryParameterValues = {
      StartDate: "2024-01-01",
      EndDate: "2024-12-31",
    };
    const overrides: QueryParameterValues = {
      Group: "Consumer",
    };

    first.setGlobalParams(globals);
    first.setQueryParams("q1", overrides);
    first.setQueryRunFlag("q1", true);

    const second = new QueryStateService(
      new QueryApiMockServiceStub() as unknown as QueryApiMockService,
      storage as unknown as StorageHelperService
    );

    expect(second.getGlobalParams()).toEqual(globals);
    expect(second.getQueryParams("q1")).toEqual(overrides);
    expect(second.getQueryRunFlag("q1")).toBeTrue();
  });

  it("computes effective params from globals only when no overrides are present", () => {
    const storage = new StorageHelperServiceMock();
    const service = new QueryStateService(
      new QueryApiMockServiceStub() as unknown as QueryApiMockService,
      storage as unknown as StorageHelperService
    );

    service.setGlobalParams({
      StartDate: "2024-01-01",
      EndDate: "2024-12-31",
      Group: "All",
    });

    const query = service.getQueries()[0];
    const effective = service.getEffectiveParams(query, "global");

    const expected: ExecuteQueryParams = {
      StartDate: "2024-01-01",
      EndDate: "2024-12-31",
      Group: "All",
    };

    expect(effective).toEqual(expected);
  });

  it("prefers per-query overrides in unique mode and falls back to globals", () => {
    const storage = new StorageHelperServiceMock();
    const service = new QueryStateService(
      new QueryApiMockServiceStub() as unknown as QueryApiMockService,
      storage as unknown as StorageHelperService
    );

    service.setGlobalParams({
      StartDate: "2024-01-01",
      EndDate: "2024-12-31",
      Group: "All",
    });

    service.setQueryParams("q1", {
      Group: "Consumer",
      SubGroup: "North",
    });

    const query = service.getQueries()[0];
    const effective = service.getEffectiveParams(query, "unique");

    const expected: ExecuteQueryParams = {
      StartDate: "2024-01-01",
      EndDate: "2024-12-31",
      Group: "Consumer",
      SubGroup: "North",
    };

    expect(effective).toEqual(expected);
  });
});
