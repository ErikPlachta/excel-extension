/**
 * @fileoverview Mock Graph API caller for local development.
 *
 * @mock Simulates Microsoft Graph API responses without network calls.
 * @experimental For development/testing only.
 */

/**
 * Mock Graph user profile structure.
 */
export interface MockGraphProfile {
  id: string;
  displayName: string;
  mail?: string;
}

/**
 * Returns a mock Graph user profile.
 *
 * @mock Static response for local development.
 * @returns Promise resolving to mock profile.
 */
export async function getMockGraphProfile(): Promise<MockGraphProfile> {
  return {
    id: "mock-graph-id-456",
    displayName: "Mock Graph User",
    mail: "mock.graph@example.com",
  };
}
