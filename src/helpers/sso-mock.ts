// Simple mocked SSO helper used during local development.
// Returns a deterministic fake user and token so the taskpane
// can behave as if SSO is configured.

export interface MockSsoUser {
  id: string;
  displayName: string;
  email: string;
  roles: string[];
}

export interface MockSsoResult {
  user: MockSsoUser;
  accessToken: string;
}

export async function getMockSsoResult(): Promise<MockSsoResult> {
  return {
    user: {
      id: "mock-user-id-123",
      displayName: "Mock User",
      email: "mock.user@example.com",
      roles: ["analyst", "admin"],
    },
    accessToken: "mock-access-token-abc123",
  };
}
