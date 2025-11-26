import { TestBed } from "@angular/core/testing";
import { AppContextService, AppHostStatus, AppAuthSummary } from "./app-context.service";
import { AuthService } from "./auth.service";

describe("AppContextService", () => {
  let service: AppContextService;
  let mockAuthService: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    mockAuthService = jasmine.createSpyObj("AuthService", [], {
      isAuthenticated: false,
      user: null,
      roles: [],
    });

    TestBed.configureTestingModule({
      providers: [
        AppContextService,
        { provide: AuthService, useValue: mockAuthService },
      ],
    });

    service = TestBed.inject(AppContextService);
  });

  describe("hostStatus", () => {
    it("should be defined at initialization", () => {
      expect(service.hostStatus).toBeDefined();
    });

    it("should have isExcel property", () => {
      expect(typeof service.hostStatus.isExcel).toBe("boolean");
    });

    it("should have isOnline property", () => {
      expect(typeof service.hostStatus.isOnline).toBe("boolean");
    });

    it("should detect non-Excel environment in test", () => {
      // In Karma tests, Office.js is not loaded
      expect(service.hostStatus.isExcel).toBeFalse();
    });
  });

  describe("getAuthSummary", () => {
    it("should return unauthenticated summary when not logged in", () => {
      const summary = service.getAuthSummary();

      expect(summary.isAuthenticated).toBeFalse();
      expect(summary.displayName).toBeNull();
      expect(summary.roles).toEqual([]);
    });

    it("should return authenticated summary when logged in", () => {
      // Update mock to return authenticated state
      Object.defineProperty(mockAuthService, "isAuthenticated", { value: true });
      Object.defineProperty(mockAuthService, "user", {
        value: { displayName: "Test User", email: "test@example.com", id: "123", roles: ["analyst"] },
      });
      Object.defineProperty(mockAuthService, "roles", { value: ["analyst"] });

      const summary = service.getAuthSummary();

      expect(summary.isAuthenticated).toBeTrue();
      expect(summary.displayName).toBe("Test User");
      expect(summary.roles).toEqual(["analyst"]);
    });

    it("should reflect real-time auth changes", () => {
      // Initially unauthenticated
      let summary = service.getAuthSummary();
      expect(summary.isAuthenticated).toBeFalse();

      // Simulate login
      Object.defineProperty(mockAuthService, "isAuthenticated", { value: true });
      Object.defineProperty(mockAuthService, "user", {
        value: { displayName: "Admin User", email: "admin@example.com", id: "456", roles: ["admin"] },
      });
      Object.defineProperty(mockAuthService, "roles", { value: ["admin"] });

      // Now authenticated
      summary = service.getAuthSummary();
      expect(summary.isAuthenticated).toBeTrue();
      expect(summary.displayName).toBe("Admin User");
      expect(summary.roles).toContain("admin");
    });

    it("should return empty roles array when user has no roles", () => {
      Object.defineProperty(mockAuthService, "isAuthenticated", { value: true });
      Object.defineProperty(mockAuthService, "user", {
        value: { displayName: "No Role User", email: "norole@example.com", id: "789", roles: [] },
      });
      Object.defineProperty(mockAuthService, "roles", { value: [] });

      const summary = service.getAuthSummary();

      expect(summary.isAuthenticated).toBeTrue();
      expect(summary.roles).toEqual([]);
    });
  });

  describe("interface compliance", () => {
    it("should return AppHostStatus from hostStatus", () => {
      const status: AppHostStatus = service.hostStatus;
      expect("isExcel" in status).toBeTrue();
      expect("isOnline" in status).toBeTrue();
    });

    it("should return AppAuthSummary from getAuthSummary", () => {
      const summary: AppAuthSummary = service.getAuthSummary();
      expect("isAuthenticated" in summary).toBeTrue();
      expect("displayName" in summary).toBeTrue();
      expect("roles" in summary).toBeTrue();
    });
  });
});
