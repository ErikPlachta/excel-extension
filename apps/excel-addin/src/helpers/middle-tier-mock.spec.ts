import { getMockGraphProfile, MockGraphProfile } from "./middle-tier-mock";

describe("middle-tier-mock", () => {
  describe("getMockGraphProfile", () => {
    it("should return a profile", async () => {
      const profile = await getMockGraphProfile();
      expect(profile).toBeDefined();
    });

    it("should return profile with id", async () => {
      const profile = await getMockGraphProfile();
      expect(profile.id).toBe("mock-graph-id-456");
    });

    it("should return profile with displayName", async () => {
      const profile = await getMockGraphProfile();
      expect(profile.displayName).toBe("Mock Graph User");
    });

    it("should return profile with mail", async () => {
      const profile = await getMockGraphProfile();
      expect(profile.mail).toBe("mock.graph@example.com");
    });

    it("should return MockGraphProfile shape", async () => {
      const profile: MockGraphProfile = await getMockGraphProfile();
      expect(profile).toEqual({
        id: "mock-graph-id-456",
        displayName: "Mock Graph User",
        mail: "mock.graph@example.com",
      });
    });

    it("should return a string id", async () => {
      const profile = await getMockGraphProfile();
      expect(typeof profile.id).toBe("string");
    });

    it("should return a string displayName", async () => {
      const profile = await getMockGraphProfile();
      expect(typeof profile.displayName).toBe("string");
    });
  });
});
