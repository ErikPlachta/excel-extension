import { fetchTokenFromMiddleTier, getUserProfileFromGraph } from "./app";

describe("middle-tier app stubs", () => {
  it("returns a mock token from middle tier", async () => {
    const token = await fetchTokenFromMiddleTier();
    expect(token).toBe("mock-access-token-abc123");
  });

  it("returns a mock Graph profile", async () => {
    const profile = await getUserProfileFromGraph("mock-access-token-abc123");
    expect(profile.displayName).toBe("Mock User");
    expect(profile.mail).toBe("mock.user@example.com");
  });
});
