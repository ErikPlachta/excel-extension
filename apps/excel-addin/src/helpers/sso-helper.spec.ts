import { getAccessToken, getSsoAuthResult, getUserProfile } from "./sso-helper";

describe("sso-helper", () => {
  it("returns a full auth result with user and token", async () => {
    const result = await getSsoAuthResult();

    expect(result.user.displayName).toBe("Mock User");
    expect(result.user.email).toBe("mock.user@example.com");
    expect(result.accessToken).toContain("mock-");
  });

  it("returns just the access token", async () => {
    const token = await getAccessToken();
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
  });

  it("returns just the user profile", async () => {
    const user = await getUserProfile();
    expect(user.displayName).toBe("Mock User");
    expect(user.email).toBe("mock.user@example.com");
  });
});
