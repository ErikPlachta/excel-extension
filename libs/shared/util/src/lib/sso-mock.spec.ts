import { getMockSsoResult, MockSsoResult, MockSsoUser } from "./sso-mock";

describe("sso-mock", () => {
  describe("getMockSsoResult", () => {
    it("should return a result", async () => {
      const result = await getMockSsoResult();
      expect(result).toBeDefined();
    });

    it("should return user object", async () => {
      const result = await getMockSsoResult();
      expect(result.user).toBeDefined();
    });

    it("should return accessToken", async () => {
      const result = await getMockSsoResult();
      expect(result.accessToken).toBeDefined();
      expect(typeof result.accessToken).toBe("string");
    });

    it("should return mock user id", async () => {
      const result = await getMockSsoResult();
      expect(result.user.id).toBe("mock-user-id-123");
    });

    it("should return mock displayName", async () => {
      const result = await getMockSsoResult();
      expect(result.user.displayName).toBe("Mock User");
    });

    it("should return mock email", async () => {
      const result = await getMockSsoResult();
      expect(result.user.email).toBe("mock.user@example.com");
    });

    it("should return empty roles array", async () => {
      const result = await getMockSsoResult();
      expect(Array.isArray(result.user.roles)).toBe(true);
      expect(result.user.roles).toEqual([]);
    });

    it("should return mock access token", async () => {
      const result = await getMockSsoResult();
      expect(result.accessToken).toBe("mock-access-token-abc123");
    });

    it("should return MockSsoResult shape", async () => {
      const result: MockSsoResult = await getMockSsoResult();
      expect(result.user).toBeDefined();
      expect(result.accessToken).toBeDefined();
    });

    it("should return MockSsoUser shape", async () => {
      const result = await getMockSsoResult();
      const user: MockSsoUser = result.user;
      expect(user.id).toBeDefined();
      expect(user.displayName).toBeDefined();
      expect(user.email).toBeDefined();
      expect(user.roles).toBeDefined();
    });
  });
});
