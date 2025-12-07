import { QueryConfigurationService } from "./query-configuration.service";
import { QueryConfiguration } from '@excel-platform/shared/types';
import { AuthService } from "@excel-platform/core/auth";
import { ApiCatalogService, QueryValidationService, ValidationResult } from '@excel-platform/data/api';
import { StorageHelperService } from "@excel-platform/data/storage";

class AuthServiceStub {
  state = { user: { id: "user-1" } } as unknown as AuthService["state"];
}

class ApiCatalogServiceStub {
  getApiById(id: string) {
    // Return a stub API for any ID to allow tests to pass
    return { id, name: `API ${id}`, parameters: [] };
  }
}

class StorageHelperServiceMock {
  private store = new Map<string, unknown>();

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

class QueryValidationServiceMock {
  validateConfiguration(config: QueryConfiguration): ValidationResult {
    // Return valid by default for tests
    return { valid: true, errors: [] };
  }
}

describe("QueryConfigurationService", () => {
  let service: QueryConfigurationService;
  let authStub: AuthServiceStub;
  let apiCatalogStub: ApiCatalogServiceStub;
  let storageStub: StorageHelperServiceMock;
  let validatorStub: QueryValidationServiceMock;

  beforeEach(() => {
    authStub = new AuthServiceStub();
    apiCatalogStub = new ApiCatalogServiceStub();
    storageStub = new StorageHelperServiceMock();
    validatorStub = new QueryValidationServiceMock();

    service = new QueryConfigurationService(
      authStub as unknown as AuthService,
      apiCatalogStub as unknown as ApiCatalogService,
      storageStub as unknown as StorageHelperService,
      validatorStub as unknown as QueryValidationService
    );
  });

  it("saves and retrieves configurations by id", () => {
    const config: QueryConfiguration = {
      id: "config-1",
      name: "Test",
      items: [],
    };

    service.save(config);

    expect(service.get("config-1")).toEqual(config);
    expect(service.list()).toEqual([config]);
  });

  it("updates existing configurations when saving with the same id", () => {
    const first: QueryConfiguration = { id: "config-1", name: "First", items: [] };
    const second: QueryConfiguration = { id: "config-1", name: "Second", items: [] };

    service.save(first);
    service.save(second);

    expect(service.list()).toEqual([second]);
  });

  it("deletes configurations by id", () => {
    const config: QueryConfiguration = { id: "config-1", name: "ToDelete", items: [] };

    service.save(config);
    service.delete("config-1");

    expect(service.get("config-1")).toBeUndefined();
    expect(service.list()).toEqual([]);
  });

  it("softDelete currently behaves like delete", () => {
    const config: QueryConfiguration = { id: "config-1", name: "Soft", items: [] };

    service.save(config);
    service.softDelete("config-1");

    expect(service.get("config-1")).toBeUndefined();
  });
});
