import { TestBed } from "@angular/core/testing";
import { AuthService } from "./auth.service";
import { StorageHelperService } from "@excel-platform/data/storage";
import { JwtHelperService } from "./jwt-helper.service";
import { AuthApiMockService } from "./auth-api-mock.service";
import { AUTH_API_TOKEN } from "./auth.tokens";

describe("AuthService", () => {
  let service: AuthService;
  let storageSpy: jasmine.SpyObj<StorageHelperService>;
  let jwtHelper: JwtHelperService;

  beforeEach(() => {
    storageSpy = jasmine.createSpyObj("StorageHelperService", [
      "getItem",
      "setItem",
      "removeItem",
    ]);

    // Return appropriate values based on key
    storageSpy.getItem.and.callFake(<T>(key: string, _defaultValue: T): T => {
      if (key === "excel-ext:refresh-token") {
        // Return null for refresh token (no stored token)
        return null as T;
      }
      // Return default auth state
      return {
        isAuthenticated: false,
        user: null,
        accessToken: null,
      } as T;
    });

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        JwtHelperService,
        AuthApiMockService,
        { provide: StorageHelperService, useValue: storageSpy },
        { provide: AUTH_API_TOKEN, useExisting: AuthApiMockService },
      ],
    });

    service = TestBed.inject(AuthService);
    jwtHelper = TestBed.inject(JwtHelperService);
  });

  afterEach(() => {
    service.ngOnDestroy();
  });

  describe("initialization", () => {
    it("should start unauthenticated", () => {
      expect(service.isAuthenticated).toBeFalse();
      expect(service.user).toBeNull();
      expect(service.roles).toEqual([]);
    });

    it("should hydrate state from storage on init", () => {
      expect(storageSpy.getItem).toHaveBeenCalled();
    });
  });

  describe("JWT Authentication", () => {
    it("should sign in with JWT and update state", async () => {
      await service.signInWithJwt("test@example.com", "password", ["analyst"]);

      expect(service.isAuthenticated).toBeTrue();
      expect(service.user?.email).toBe("test@example.com");
      expect(service.roles).toContain("analyst");
    });

    it("should generate valid access token on JWT sign-in", async () => {
      await service.signInWithJwt("test@example.com", "password", ["admin"]);

      expect(service.getAccessToken()).toBeTruthy();
      expect(service.getRefreshToken()).toBeTruthy();
    });

    it("should set access token in state after JWT sign-in", async () => {
      await service.signInWithJwt("test@example.com", "password", ["analyst"]);

      expect(service.state.accessToken).toBeTruthy();
      expect(service.getAccessToken()).toBe(service.state.accessToken);
    });

    it("should return access token via getAccessToken()", async () => {
      await service.signInWithJwt("test@example.com", "password", ["analyst"]);

      const token = service.getAccessToken();
      expect(token).toBeTruthy();
      expect(typeof token).toBe("string");
    });

    it("should return null from getAccessToken() when not authenticated", () => {
      expect(service.getAccessToken()).toBeNull();
    });

    it("should include jti, aud, iss claims in tokens", async () => {
      await service.signInWithJwt("test@example.com", "password", ["analyst"]);

      const token = service.getAccessToken();
      expect(token).toBeTruthy();

      const payload = jwtHelper.decodeMockToken(token!);
      expect(payload?.jti).toBeTruthy();
      expect(payload?.aud).toBe("databricks-api");
      expect(payload?.iss).toBe("excel-extension-mock");
    });
  });

  describe("Token Refresh", () => {
    it("should refresh access token successfully", async () => {
      await service.signInWithJwt("test@example.com", "password", ["analyst"]);
      const originalToken = service.getAccessToken();

      // Force a refresh
      const result = await service.refreshAccessToken();

      expect(result).toBeTrue();
      expect(service.getAccessToken()).toBeTruthy();
    });

    it("should fail refresh when not authenticated", async () => {
      const result = await service.refreshAccessToken();
      expect(result).toBeFalse();
    });

    it("should report isAccessTokenExpiringSoon correctly", async () => {
      await service.signInWithJwt("test@example.com", "password", ["analyst"]);

      // Fresh token should not be expiring soon
      expect(service.isAccessTokenExpiringSoon()).toBeFalse();
    });

    it("should return false for isAccessTokenExpiringSoon when not authenticated", () => {
      expect(service.isAccessTokenExpiringSoon()).toBeFalse();
    });
  });

  describe("Token Validation", () => {
    it("should validate current token when authenticated", async () => {
      await service.signInWithJwt("test@example.com", "password", ["analyst"]);

      const result = service.validateCurrentToken();
      expect(result.valid).toBeTrue();
    });

    it("should return invalid with reason when not authenticated", () => {
      const result = service.validateCurrentToken();
      expect(result.valid).toBeFalse();
      expect(result.reason).toBe("no_token");
    });
  });

  describe("Role Management", () => {
    it("should check single role with hasRole()", async () => {
      await service.signInWithJwt("test@example.com", "password", ["admin"]);

      expect(service.hasRole("admin")).toBeTrue();
      expect(service.hasRole("analyst")).toBeFalse();
    });

    it("should check multiple roles with hasAnyRole()", async () => {
      await service.signInWithJwt("test@example.com", "password", ["analyst"]);

      expect(service.hasAnyRole(["admin", "analyst"])).toBeTrue();
      expect(service.hasAnyRole(["admin", "super"])).toBeFalse();
    });

    it("should support multiple roles", async () => {
      await service.signInWithJwt("test@example.com", "password", [
        "admin",
        "analyst",
      ]);

      expect(service.hasRole("admin")).toBeTrue();
      expect(service.hasRole("analyst")).toBeTrue();
      expect(service.roles.length).toBe(2);
    });

    it("should support automation role", async () => {
      await service.signInWithJwt("service@example.com", "password", ["automation"]);

      expect(service.hasRole("automation")).toBeTrue();
    });
  });

  describe("Sign Out", () => {
    it("should clear state on sign out", async () => {
      await service.signInWithJwt("test@example.com", "password", ["analyst"]);
      expect(service.isAuthenticated).toBeTrue();

      service.signOut();

      expect(service.isAuthenticated).toBeFalse();
      expect(service.user).toBeNull();
      expect(service.getAccessToken()).toBeNull();
      expect(service.getRefreshToken()).toBeNull();
    });

    it("should stop refresh timer on sign out", async () => {
      await service.signInWithJwt("test@example.com", "password", ["analyst"]);
      service.signOut();

      // No error should occur - timer should be stopped
      expect(service.isAuthenticated).toBeFalse();
    });

    it("should clear persisted refresh token on sign out", async () => {
      await service.signInWithJwt("test@example.com", "password", ["analyst"]);
      service.signOut();

      expect(storageSpy.removeItem).toHaveBeenCalledWith("excel-ext:refresh-token");
    });
  });

  describe("Observable Streams", () => {
    it("should emit state changes via state$", (done) => {
      const states: boolean[] = [];

      service.state$.subscribe((state) => {
        states.push(state.isAuthenticated);
        if (states.length === 2) {
          expect(states).toEqual([false, true]);
          done();
        }
      });

      service.signInWithJwt("test@example.com", "password", ["analyst"]);
    });
  });

  describe("Legacy SSO Methods", () => {
    it("should sign in via legacy signIn()", async () => {
      await service.signIn();

      expect(service.isAuthenticated).toBeTrue();
      expect(service.user).not.toBeNull();
    });

    it("should sign in as analyst via signInAsAnalyst()", async () => {
      await service.signInAsAnalyst();

      expect(service.isAuthenticated).toBeTrue();
      expect(service.hasRole("analyst")).toBeTrue();
    });

    it("should sign in as admin via signInAsAdmin()", async () => {
      await service.signInAsAdmin();

      expect(service.isAuthenticated).toBeTrue();
      expect(service.hasRole("admin")).toBeTrue();
    });
  });

  describe("Memory-only access token security", () => {
    it("should not persist access token to storage", async () => {
      await service.signInWithJwt("test@example.com", "password", ["analyst"]);

      // Check that setItem was called with state that has null accessToken
      const setItemCalls = storageSpy.setItem.calls.allArgs();
      const authStateCalls = setItemCalls.filter(
        ([key]) => key === "excel-extension-auth-state"
      );

      // All auth state persists should have null accessToken
      authStateCalls.forEach(([, state]) => {
        expect((state as any).accessToken).toBeNull();
      });
    });

    it("should persist refresh token separately", async () => {
      await service.signInWithJwt("test@example.com", "password", ["analyst"]);

      expect(storageSpy.setItem).toHaveBeenCalledWith(
        "excel-ext:refresh-token",
        jasmine.objectContaining({
          token: jasmine.any(String),
          expiresAt: jasmine.any(Number),
        })
      );
    });
  });
});
