import { getSsoAuthResult, getAccessToken, getUserProfile, SsoUserProfile, SsoAuthResult } from "./sso-helper";

describe("sso-helper", () => {
  describe("getSsoAuthResult", () => {
    it("should return an auth result", async () => {
      const result = await getSsoAuthResult();
      expect(result).toBeDefined();
    });

    it("should return user object", async () => {
      const result = await getSsoAuthResult();
      expect(result.user).toBeDefined();
    });

    it("should return accessToken", async () => {
      const result = await getSsoAuthResult();
      expect(result.accessToken).toBeDefined();
      expect(typeof result.accessToken).toBe("string");
    });

    it("should return user with id", async () => {
      const result = await getSsoAuthResult();
      expect(result.user.id).toBe("mock-user-id-123");
    });

    it("should return user with displayName", async () => {
      const result = await getSsoAuthResult();
      expect(result.user.displayName).toBe("Mock User");
    });

    it("should return user with email", async () => {
      const result = await getSsoAuthResult();
      expect(result.user.email).toBe("mock.user@example.com");
    });

    it("should return user with roles array", async () => {
      const result = await getSsoAuthResult();
      expect(Array.isArray(result.user.roles)).toBe(true);
    });

    it("should return SsoAuthResult shape", async () => {
      const result: SsoAuthResult = await getSsoAuthResult();
      expect(result.user).toBeDefined();
      expect(result.accessToken).toBeDefined();
    });
  });

  describe("getAccessToken", () => {
    it("should return a token string", async () => {
      const token = await getAccessToken();
      expect(typeof token).toBe("string");
    });

    it("should return mock token", async () => {
      const token = await getAccessToken();
      expect(token).toBe("mock-access-token-abc123");
    });
  });

  describe("getUserProfile", () => {
    it("should return a profile", async () => {
      const profile = await getUserProfile();
      expect(profile).toBeDefined();
    });

    it("should return profile with id", async () => {
      const profile = await getUserProfile();
      expect(profile.id).toBe("mock-user-id-123");
    });

    it("should return profile with displayName", async () => {
      const profile = await getUserProfile();
      expect(profile.displayName).toBe("Mock User");
    });

    it("should return profile with email", async () => {
      const profile = await getUserProfile();
      expect(profile.email).toBe("mock.user@example.com");
    });

    it("should return profile with roles array", async () => {
      const profile = await getUserProfile();
      expect(Array.isArray(profile.roles)).toBe(true);
    });

    it("should return SsoUserProfile shape", async () => {
      const profile: SsoUserProfile = await getUserProfile();
      expect(profile.id).toBeDefined();
      expect(profile.displayName).toBeDefined();
      expect(profile.email).toBeDefined();
      expect(profile.roles).toBeDefined();
    });
  });
});
