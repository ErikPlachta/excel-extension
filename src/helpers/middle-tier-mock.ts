// Placeholder middle-tier caller that simulates a backend/Graph call.
// During local development, this avoids any real network dependency.

export interface MockGraphProfile {
  id: string;
  displayName: string;
  mail?: string;
}

export async function getMockGraphProfile(): Promise<MockGraphProfile> {
  return {
    id: "mock-graph-id-456",
    displayName: "Mock Graph User",
    mail: "mock.graph@example.com",
  };
}
