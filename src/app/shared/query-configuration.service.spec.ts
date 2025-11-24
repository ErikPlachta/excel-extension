import { QueryConfigurationService } from "./query-configuration.service";
import { QueryConfiguration } from "../types";
import { AuthService } from "../core/auth.service";

class AuthServiceStub {
  state = { user: { id: "user-1" } } as unknown as AuthService["state"];
}

describe("QueryConfigurationService", () => {
  let service: QueryConfigurationService;
  let authStub: AuthServiceStub;

  beforeEach(() => {
    authStub = new AuthServiceStub();
    service = new QueryConfigurationService(authStub as unknown as AuthService);

    // Clear any persisted state for a predictable test environment.
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.clear();
    }
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
