/**
 * Production environment configuration.
 *
 * Uses real backend with same-origin (empty backendUrl).
 * Backend deployed alongside frontend on Azure.
 */
export const environment = {
  production: true,
  useRealBackend: true,
  backendUrl: '',
  apiPrefix: '',
};
