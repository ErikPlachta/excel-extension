import { fetchTokenFromMiddleTier, getUserProfileFromGraph, GraphProfile } from "./middle-tier";

describe("middle-tier", () => {
  describe("fetchTokenFromMiddleTier", () => {
    it("should return a mock access token", async () => {
      const token = await fetchTokenFromMiddleTier();
      expect(token).toBe("mock-access-token-abc123");
    });

    it("should return a string", async () => {
      const token = await fetchTokenFromMiddleTier();
      expect(typeof token).toBe("string");
    });
  });

  describe("getUserProfileFromGraph", () => {
    it("should return a mock profile", async () => {
      const profile = await getUserProfileFromGraph("any-token");
      expect(profile).toBeDefined();
    });

    it("should return profile with id", async () => {
      const profile = await getUserProfileFromGraph("any-token");
      expect(profile.id).toBe("mock-user-id-123");
    });

    it("should return profile with displayName", async () => {
      const profile = await getUserProfileFromGraph("any-token");
      expect(profile.displayName).toBe("Mock User");
    });

    it("should return profile with mail", async () => {
      const profile = await getUserProfileFromGraph("any-token");
      expect(profile.mail).toBe("mock.user@example.com");
    });

    it("should return GraphProfile shape", async () => {
      const profile: GraphProfile = await getUserProfileFromGraph("any-token");
      expect(profile).toEqual({
        id: "mock-user-id-123",
        displayName: "Mock User",
        mail: "mock.user@example.com",
      });
    });
  });
});
