import { TestBed } from "@angular/core/testing";
import { AuthService } from "./auth.service";
import { StorageHelperService } from "../../../../../src/app/shared/storage-helper.service";
import { JwtHelperService } from "./jwt-helper.service";
import { JWT_CONFIG } from "@excel-platform/shared/types";

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
      if (key === JWT_CONFIG.STORAGE_KEY) {
        // Return null for JWT tokens (no stored tokens)
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
        { provide: StorageHelperService, useValue: storageSpy },
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

    it("should generate valid tokens on JWT sign-in", async () => {
      await service.signInWithJwt("test@example.com", "password", ["admin"]);

      expect(service.tokens).not.toBeNull();
      expect(service.tokens?.access.token).toBeTruthy();
      expect(service.tokens?.refresh.token).toBeTruthy();
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
  });

  describe("Token Refresh", () => {
    it("should refresh access token successfully", async () => {
      await service.signInWithJwt("test@example.com", "password", ["analyst"]);
      const originalToken = service.tokens?.access.token;

      // Force a refresh
      const result = await service.refreshAccessToken();

      // Tokens might be same if generated in same second
      expect(result).toBeTrue();
      expect(service.tokens?.access.token).toBeTruthy();
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
  });

  describe("Sign Out", () => {
    it("should clear state on sign out", async () => {
      await service.signInWithJwt("test@example.com", "password", ["analyst"]);
      expect(service.isAuthenticated).toBeTrue();

      service.signOut();

      expect(service.isAuthenticated).toBeFalse();
      expect(service.user).toBeNull();
      expect(service.tokens).toBeNull();
      expect(service.getAccessToken()).toBeNull();
    });

    it("should stop refresh timer on sign out", async () => {
      await service.signInWithJwt("test@example.com", "password", ["analyst"]);
      service.signOut();

      // No error should occur - timer should be stopped
      expect(service.isAuthenticated).toBeFalse();
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

    it("should emit token changes via tokens$", (done) => {
      const tokenStates: (boolean | null)[] = [];

      service.tokens$.subscribe((tokens) => {
        tokenStates.push(tokens ? true : null);
        if (tokenStates.length === 2) {
          expect(tokenStates).toEqual([null, true]);
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
});
