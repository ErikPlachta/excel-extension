import { JwtHelperService } from "./jwt-helper.service";
import { JWT_CONFIG } from "../types";

describe("JwtHelperService", () => {
  let service: JwtHelperService;

  beforeEach(() => {
    service = new JwtHelperService();
  });

  describe("generateMockTokenPair", () => {
    it("should generate a valid token pair", () => {
      const tokens = service.generateMockTokenPair("test@example.com", [
        "analyst",
      ]);

      expect(tokens).toBeDefined();
      expect(tokens.access).toBeDefined();
      expect(tokens.refresh).toBeDefined();
      expect(tokens.access.token).toBeTruthy();
      expect(tokens.refresh.token).toBeTruthy();
    });

    it("should set correct expiration times", () => {
      const now = Date.now();
      const tokens = service.generateMockTokenPair("test@example.com", [
        "analyst",
      ]);

      // Access token should expire in ~15 minutes
      const accessExpiry = tokens.access.expiresAt - now;
      expect(accessExpiry).toBeGreaterThan(JWT_CONFIG.ACCESS_TOKEN_LIFETIME_MS - 1000);
      expect(accessExpiry).toBeLessThanOrEqual(JWT_CONFIG.ACCESS_TOKEN_LIFETIME_MS + 1000);

      // Refresh token should expire in ~7 days
      const refreshExpiry = tokens.refresh.expiresAt - now;
      expect(refreshExpiry).toBeGreaterThan(JWT_CONFIG.REFRESH_TOKEN_LIFETIME_MS - 1000);
      expect(refreshExpiry).toBeLessThanOrEqual(JWT_CONFIG.REFRESH_TOKEN_LIFETIME_MS + 1000);
    });

    it("should generate deterministic tokens for same email", () => {
      const tokens1 = service.generateMockTokenPair("same@example.com", [
        "analyst",
      ]);
      const tokens2 = service.generateMockTokenPair("same@example.com", [
        "analyst",
      ]);

      // Decode payloads - sub (user ID) should be the same
      const payload1 = service.decodeMockToken(tokens1.access.token);
      const payload2 = service.decodeMockToken(tokens2.access.token);

      expect(payload1?.sub).toBe(payload2?.sub);
      expect(payload1?.email).toBe(payload2?.email);
    });

    it("should include roles in token payload", () => {
      const roles = ["analyst", "admin"];
      const tokens = service.generateMockTokenPair("test@example.com", roles);

      const payload = service.decodeMockToken(tokens.access.token);

      expect(payload?.roles).toEqual(roles);
    });

    it("should generate tokens in JWT format (header.payload.signature)", () => {
      const tokens = service.generateMockTokenPair("test@example.com", [
        "analyst",
      ]);

      const parts = tokens.access.token.split(".");
      expect(parts.length).toBe(3);
    });
  });

  describe("decodeMockToken", () => {
    it("should decode a valid token", () => {
      const tokens = service.generateMockTokenPair("decode@test.com", [
        "analyst",
      ]);
      const payload = service.decodeMockToken(tokens.access.token);

      expect(payload).toBeDefined();
      expect(payload?.email).toBe("decode@test.com");
      expect(payload?.roles).toEqual(["analyst"]);
    });

    it("should return null for invalid token format", () => {
      const payload = service.decodeMockToken("invalid-token");

      expect(payload).toBeNull();
    });

    it("should return null for malformed base64", () => {
      const payload = service.decodeMockToken("a.b.c");

      expect(payload).toBeNull();
    });
  });

  describe("validateToken", () => {
    it("should validate a fresh token as valid", () => {
      const tokens = service.generateMockTokenPair("valid@test.com", [
        "analyst",
      ]);
      const result = service.validateToken(tokens.access.token);

      expect(result.valid).toBe(true);
      expect(result.payload).toBeDefined();
      expect(result.payload?.email).toBe("valid@test.com");
      expect(result.error).toBeUndefined();
    });

    it("should return invalid for malformed token", () => {
      const result = service.validateToken("not-a-jwt");

      expect(result.valid).toBe(false);
      expect(result.payload).toBeNull();
      expect(result.error).toBe("Invalid token format");
    });

    it("should return invalid for expired token", () => {
      // Create a token with past expiration
      const tokens = service.generateMockTokenPair("expired@test.com", [
        "analyst",
      ]);

      // Manually decode and modify to simulate expired token
      const parts = tokens.access.token.split(".");
      const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
      payload.exp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago

      // Re-encode with expired timestamp
      const expiredPayload = btoa(JSON.stringify(payload))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");
      const expiredToken = `${parts[0]}.${expiredPayload}.${parts[2]}`;

      const result = service.validateToken(expiredToken);

      expect(result.valid).toBe(false);
      expect(result.payload).toBeDefined();
      expect(result.error).toBe("Token expired");
    });
  });

  describe("isTokenExpired", () => {
    it("should return false for fresh token", () => {
      const tokens = service.generateMockTokenPair("fresh@test.com", [
        "analyst",
      ]);

      expect(service.isTokenExpired(tokens.access)).toBe(false);
      expect(service.isTokenExpired(tokens.refresh)).toBe(false);
    });

    it("should return true for expired token", () => {
      const expiredToken = {
        token: "test",
        expiresAt: Date.now() - 1000, // 1 second ago
      };

      expect(service.isTokenExpired(expiredToken)).toBe(true);
    });
  });

  describe("isTokenExpiringSoon", () => {
    it("should return false for fresh token", () => {
      const tokens = service.generateMockTokenPair("fresh@test.com", [
        "analyst",
      ]);

      expect(service.isTokenExpiringSoon(tokens.access)).toBe(false);
    });

    it("should return true for token expiring within threshold", () => {
      const soonToken = {
        token: "test",
        expiresAt: Date.now() + 2 * 60 * 1000, // 2 minutes from now
      };

      // Default threshold is 5 minutes
      expect(service.isTokenExpiringSoon(soonToken)).toBe(true);
    });

    it("should respect custom threshold", () => {
      const token = {
        token: "test",
        expiresAt: Date.now() + 30 * 1000, // 30 seconds from now
      };

      // 1 minute threshold - should be expiring soon
      expect(service.isTokenExpiringSoon(token, 60 * 1000)).toBe(true);

      // 10 second threshold - should NOT be expiring soon
      expect(service.isTokenExpiringSoon(token, 10 * 1000)).toBe(false);
    });
  });

  describe("getTimeUntilExpiry", () => {
    it("should return positive value for valid token", () => {
      const tokens = service.generateMockTokenPair("time@test.com", [
        "analyst",
      ]);

      const timeRemaining = service.getTimeUntilExpiry(tokens.access);

      expect(timeRemaining).toBeGreaterThan(0);
      expect(timeRemaining).toBeLessThanOrEqual(JWT_CONFIG.ACCESS_TOKEN_LIFETIME_MS);
    });

    it("should return negative value for expired token", () => {
      const expiredToken = {
        token: "test",
        expiresAt: Date.now() - 1000,
      };

      const timeRemaining = service.getTimeUntilExpiry(expiredToken);

      expect(timeRemaining).toBeLessThan(0);
    });
  });

  describe("refreshMockTokenPair", () => {
    it("should generate new access token from valid refresh token", () => {
      const original = service.generateMockTokenPair("refresh@test.com", [
        "analyst",
      ]);
      const refreshed = service.refreshMockTokenPair(original.refresh);

      expect(refreshed).toBeDefined();
      expect(refreshed?.access.token).toBeTruthy();
      // New access token should be valid
      const validation = service.validateToken(refreshed!.access.token);
      expect(validation.valid).toBe(true);
      expect(validation.payload?.email).toBe("refresh@test.com");
    });

    it("should preserve refresh token if not close to expiry", () => {
      const original = service.generateMockTokenPair("refresh@test.com", [
        "analyst",
      ]);
      const refreshed = service.refreshMockTokenPair(original.refresh);

      // Refresh token should be the same object
      expect(refreshed?.refresh.token).toBe(original.refresh.token);
      expect(refreshed?.refresh.expiresAt).toBe(original.refresh.expiresAt);
    });

    it("should return null for expired refresh token", () => {
      const expiredRefresh = {
        token: "expired",
        expiresAt: Date.now() - 1000,
      };

      const result = service.refreshMockTokenPair(expiredRefresh);

      expect(result).toBeNull();
    });

    it("should return null for invalid refresh token", () => {
      const invalidRefresh = {
        token: "not-a-valid-jwt",
        expiresAt: Date.now() + 1000000,
      };

      const result = service.refreshMockTokenPair(invalidRefresh);

      expect(result).toBeNull();
    });

    it("should preserve user info in refreshed token", () => {
      const original = service.generateMockTokenPair("preserve@test.com", [
        "analyst",
        "admin",
      ]);
      const refreshed = service.refreshMockTokenPair(original.refresh);

      const originalPayload = service.decodeMockToken(original.access.token);
      const refreshedPayload = service.decodeMockToken(refreshed!.access.token);

      expect(refreshedPayload?.email).toBe(originalPayload?.email);
      expect(refreshedPayload?.sub).toBe(originalPayload?.sub);
      expect(refreshedPayload?.roles).toEqual(originalPayload?.roles);
    });
  });
});
