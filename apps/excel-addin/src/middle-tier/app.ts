/**
 * @fileoverview Middle-tier mock stubs for local development.
 *
 * @mock These are placeholder implementations that simulate backend
 * functionality. In production, replace with real HTTP calls to your
 * Node/Express/Azure Functions backend.
 *
 * @experimental Not for production use without real backend implementation.
 */

/**
 * Fetches an access token from the middle-tier auth endpoint.
 *
 * @mock Returns a static mock token for local development.
 * @returns Promise resolving to an access token string.
 */
export async function fetchTokenFromMiddleTier(): Promise<string> {
  return "mock-access-token-abc123";
}

/**
 * User profile from Microsoft Graph API.
 */
export interface GraphProfile {
  id: string;
  displayName: string;
  mail: string;
}

/**
 * Fetches user profile from Microsoft Graph API.
 *
 * @mock Returns a static mock profile for local development.
 * @param token - Access token for Graph API (unused in mock).
 * @returns Promise resolving to user profile.
 */
export async function getUserProfileFromGraph(token: string): Promise<GraphProfile> {
  return {
    id: "mock-user-id-123",
    displayName: "Mock User",
    mail: "mock.user@example.com",
  };
}
