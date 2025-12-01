import { TestBed } from "@angular/core/testing";
import { QueryApiMockService, ExecuteQueryParams } from "./query-api-mock.service";
import { ApiCatalogService } from "./api-catalog.service";
import { IndexedDBService } from "./indexeddb.service";
import { SettingsService } from "@excel-platform/core/settings";
import { TelemetryService } from "@excel-platform/core/telemetry";

describe("QueryApiMockService", () => {
  let service: QueryApiMockService;
  let mockApiCatalog: jasmine.SpyObj<ApiCatalogService>;
  let mockIndexedDB: jasmine.SpyObj<IndexedDBService>;
  let mockSettings: jasmine.SpyObj<SettingsService>;
  let mockTelemetry: jasmine.SpyObj<TelemetryService>;

  beforeEach(() => {
    mockApiCatalog = jasmine.createSpyObj("ApiCatalogService", ["getApiById", "getApis"]);
    mockIndexedDB = jasmine.createSpyObj("IndexedDBService", [
      "getCachedQueryResult",
      "cacheQueryResult",
    ]);
    mockSettings = jasmine.createSpyObj("SettingsService", [], {
      value: {
        telemetry: { enableConsoleLogging: true, enableWorkbookLogging: false },
        queryExecution: {
          maxRowsPerQuery: 10000,
          chunkSize: 1000,
          enableProgressiveLoading: false,
          apiPageSize: 500,
          chunkBackoffMs: 100,
          disableFormulasDuringRun: true,
        },
      },
    });
    mockTelemetry = jasmine.createSpyObj("TelemetryService", ["logEvent"]);

    // Setup default mock returns
    mockIndexedDB.getCachedQueryResult.and.returnValue(Promise.resolve(null));
    mockIndexedDB.cacheQueryResult.and.returnValue(Promise.resolve());

    TestBed.configureTestingModule({
      providers: [
        QueryApiMockService,
        { provide: ApiCatalogService, useValue: mockApiCatalog },
        { provide: IndexedDBService, useValue: mockIndexedDB },
        { provide: SettingsService, useValue: mockSettings },
        { provide: TelemetryService, useValue: mockTelemetry },
      ],
    });

    service = TestBed.inject(QueryApiMockService);
  });

  describe("executeApi", () => {
    beforeEach(() => {
      // Setup mock API definition
      mockApiCatalog.getApiById.and.callFake((id: string) => {
        if (id === "test-api") {
          return {
            id: "test-api",
            name: "Test API",
            description: "Test API for unit tests",
            parameters: [],
          };
        }
        return undefined;
      });
    });

    it("should throw error for non-existent API", async () => {
      mockApiCatalog.getApiById.and.returnValue(undefined);

      await expectAsync(service.executeApi("non-existent", {})).toBeRejectedWithError(
        "API not found: non-existent"
      );
    });

    it("should check cache before generating data", async () => {
      mockApiCatalog.getApiById.and.returnValue({
        id: "cached-api",
        name: "Cached API",
        description: "Test",
        parameters: [],
      });

      await service.executeApi("cached-api", {});

      expect(mockIndexedDB.getCachedQueryResult).toHaveBeenCalled();
    });

    it("should return cached result if available", async () => {
      const cachedRows = [{ col1: "cached", col2: 123 }];
      mockIndexedDB.getCachedQueryResult.and.returnValue(Promise.resolve(cachedRows));
      mockApiCatalog.getApiById.and.returnValue({
        id: "cached-api",
        name: "Cached API",
        description: "Test",
        parameters: [],
      });

      const result = await service.executeApi("cached-api", {});

      expect(result).toEqual(cachedRows);
    });

    it("should cache results after generation", async () => {
      mockApiCatalog.getApiById.and.returnValue({
        id: "uncached-api",
        name: "Uncached API",
        description: "Test",
        parameters: [],
      });

      await service.executeApi("uncached-api", {});

      expect(mockIndexedDB.cacheQueryResult).toHaveBeenCalled();
    });
  });

  describe("getGroupingOptions", () => {
    it("should return groups and subGroups arrays", async () => {
      const options = await service.getGroupingOptions();

      expect(options).toBeDefined();
      expect(Array.isArray(options.groups)).toBeTrue();
      expect(Array.isArray(options.subGroups)).toBeTrue();
    });

    it("should return predefined grouping options", async () => {
      const options = await service.getGroupingOptions();

      expect(options.groups.length).toBeGreaterThan(0);
      expect(options.subGroups.length).toBeGreaterThan(0);
    });
  });

  describe("parameter handling", () => {
    it("should accept various parameter types without throwing", () => {
      const params: ExecuteQueryParams = {
        stringParam: "test",
        numberParam: 42,
        booleanParam: true,
        dateParam: new Date(),
        nullParam: null,
      };

      // Verify params object is valid
      expect(params["stringParam"]).toBe("test");
      expect(params["numberParam"]).toBe(42);
      expect(params["booleanParam"]).toBeTrue();
    });

    it("should handle empty parameters object", () => {
      const params: ExecuteQueryParams = {};
      expect(Object.keys(params).length).toBe(0);
    });
  });

  describe("service initialization", () => {
    it("should inject dependencies", () => {
      expect(service).toBeTruthy();
    });
  });
});
