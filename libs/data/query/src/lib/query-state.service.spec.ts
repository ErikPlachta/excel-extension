import { QueryStateService } from "./query-state.service";
import { ExecuteQueryParams, ApiCatalogService } from '@excel-platform/data/api';
import type { ApiDefinition, QueryParameterValues } from '@excel-platform/shared/types';
import { StorageHelperService } from "@excel-platform/data/storage";

class ApiCatalogServiceStub {
  private readonly apis: ApiDefinition[] = [
    {
      id: "q1",
      name: "Test Query",
      description: "",
      parameters: [
        { key: "StartDate", type: "date", required: false },
        { key: "EndDate", type: "date", required: false },
        { key: "Group", type: "string", required: false },
        { key: "SubGroup", type: "string", required: false },
      ],
    },
  ];

  getApis(): ApiDefinition[] {
    return this.apis;
  }

  getApiById(id: string): ApiDefinition | undefined {
    return this.apis.find((a) => a.id === id);
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
      new ApiCatalogServiceStub() as unknown as ApiCatalogService,
      storage as unknown as StorageHelperService
    );

    expect(service.getGlobalParams()).toEqual({});
    expect(service.getQueryParams("q1")).toBeUndefined();
    expect(service.getQueryRunFlag("q1")).toBeFalse();
  });

  it("persists and hydrates global params, per-query params, and run flags", () => {
    const storage = new StorageHelperServiceMock();
    const first = new QueryStateService(
      new ApiCatalogServiceStub() as unknown as ApiCatalogService,
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
      new ApiCatalogServiceStub() as unknown as ApiCatalogService,
      storage as unknown as StorageHelperService
    );

    expect(second.getGlobalParams()).toEqual(globals);
    expect(second.getQueryParams("q1")).toEqual(overrides);
    expect(second.getQueryRunFlag("q1")).toBeTrue();
  });

  it("computes effective params from globals only when no overrides are present", () => {
    const storage = new StorageHelperServiceMock();
    const service = new QueryStateService(
      new ApiCatalogServiceStub() as unknown as ApiCatalogService,
      storage as unknown as StorageHelperService
    );

    service.setGlobalParams({
      StartDate: "2024-01-01",
      EndDate: "2024-12-31",
      Group: "All",
    });

    const api = service.getApis()[0];
    const effective = service.getEffectiveParams(api, "global");

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
      new ApiCatalogServiceStub() as unknown as ApiCatalogService,
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

    const api = service.getApis()[0];
    const effective = service.getEffectiveParams(api, "unique");

    const expected: ExecuteQueryParams = {
      StartDate: "2024-01-01",
      EndDate: "2024-12-31",
      Group: "Consumer",
      SubGroup: "North",
    };

    expect(effective).toEqual(expected);
  });
});
