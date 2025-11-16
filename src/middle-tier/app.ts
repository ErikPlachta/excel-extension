// Placeholder middle-tier entry point.
// In a real deployment this would be a Node/Express/Azure Functions app
// exposing routes that the taskpane calls for SSO token exchange and Graph data.

export async function fetchTokenFromMiddleTier(): Promise<string> {
  // TODO: replace with real HTTP call to your auth/SSO endpoint.
  // For now, this is wired to the same mock as the client-side SSO helper.
  return "mock-access-token-abc123";
}

export interface GraphProfile {
  id: string;
  displayName: string;
  mail: string;
}

export async function getUserProfileFromGraph(token: string): Promise<GraphProfile> {
  // TODO: replace with real Microsoft Graph call using the provided token.
  // For now, return a deterministic mock profile.
  return {
    id: "mock-user-id-123",
    displayName: "Mock User",
    mail: "mock.user@example.com",
  };
}
