import { TestBed } from "@angular/core/testing";
import { ApiConfigService, API_CONFIG_TOKEN, ApiConfig } from "./api-config.service";

describe("ApiConfigService", () => {
  describe("without config provided", () => {
    let service: ApiConfigService;

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [ApiConfigService],
      });
      service = TestBed.inject(ApiConfigService);
    });

    it("should create", () => {
      expect(service).toBeTruthy();
    });

    it("should return empty string for backendUrl", () => {
      expect(service.backendUrl).toBe("");
    });

    it("should return false for useRealBackend", () => {
      expect(service.useRealBackend).toBe(false);
    });

    it("should return relative path from buildUrl", () => {
      const url = service.buildUrl("/api/catalog");
      expect(url).toBe("/api/catalog");
    });

    it("should return path as-is when no backend configured", () => {
      const url = service.buildUrl("/auth/signin");
      expect(url).toBe("/auth/signin");
    });
  });

  describe("with config provided", () => {
    let service: ApiConfigService;

    beforeEach(() => {
      const mockConfig: ApiConfig = {
        backendUrl: "http://127.0.0.1:8000",
        useRealBackend: true,
      };

      TestBed.configureTestingModule({
        providers: [
          ApiConfigService,
          { provide: API_CONFIG_TOKEN, useValue: mockConfig },
        ],
      });
      service = TestBed.inject(ApiConfigService);
    });

    it("should return configured backendUrl", () => {
      expect(service.backendUrl).toBe("http://127.0.0.1:8000");
    });

    it("should return configured useRealBackend", () => {
      expect(service.useRealBackend).toBe(true);
    });

    it("should build full URL with backend base", () => {
      const url = service.buildUrl("/api/catalog");
      expect(url).toBe("http://127.0.0.1:8000/api/catalog");
    });

    it("should handle path without leading slash", () => {
      const url = service.buildUrl("api/catalog");
      expect(url).toBe("http://127.0.0.1:8000/api/catalog");
    });

    it("should build URL for auth endpoints", () => {
      const url = service.buildUrl("/auth/signin");
      expect(url).toBe("http://127.0.0.1:8000/auth/signin");
    });

    it("should build URL for operations endpoints", () => {
      const url = service.buildUrl("/operations/query-data");
      expect(url).toBe("http://127.0.0.1:8000/operations/query-data");
    });
  });

  describe("with empty backendUrl config", () => {
    let service: ApiConfigService;

    beforeEach(() => {
      const mockConfig: ApiConfig = {
        backendUrl: "",
        useRealBackend: false,
      };

      TestBed.configureTestingModule({
        providers: [
          ApiConfigService,
          { provide: API_CONFIG_TOKEN, useValue: mockConfig },
        ],
      });
      service = TestBed.inject(ApiConfigService);
    });

    it("should return empty string for backendUrl", () => {
      expect(service.backendUrl).toBe("");
    });

    it("should return relative path from buildUrl", () => {
      const url = service.buildUrl("/api/catalog");
      expect(url).toBe("/api/catalog");
    });
  });

  describe("buildUrl path normalization", () => {
    let service: ApiConfigService;

    beforeEach(() => {
      const mockConfig: ApiConfig = {
        backendUrl: "http://localhost:3000",
        useRealBackend: true,
      };

      TestBed.configureTestingModule({
        providers: [
          ApiConfigService,
          { provide: API_CONFIG_TOKEN, useValue: mockConfig },
        ],
      });
      service = TestBed.inject(ApiConfigService);
    });

    it("should handle path with leading slash", () => {
      expect(service.buildUrl("/path")).toBe("http://localhost:3000/path");
    });

    it("should add leading slash to path without one", () => {
      expect(service.buildUrl("path")).toBe("http://localhost:3000/path");
    });

    it("should handle complex paths", () => {
      expect(service.buildUrl("/api/v1/users/123")).toBe(
        "http://localhost:3000/api/v1/users/123"
      );
    });

    it("should handle paths with query parameters", () => {
      expect(service.buildUrl("/api/search?q=test")).toBe(
        "http://localhost:3000/api/search?q=test"
      );
    });
  });
});
