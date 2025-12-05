/**
 * Mock environment configuration.
 *
 * Uses mock services instead of real backend.
 * No backend server required for development/testing.
 */
export const environment = {
  production: false,
  useRealBackend: false,
  backendUrl: '',
  apiPrefix: '',
};
