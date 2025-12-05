/**
 * Development environment configuration.
 *
 * Uses Angular proxy (proxy.conf.json) to forward API calls to backend.
 * Empty backendUrl = same-origin requests → proxy intercepts → forwards to 127.0.0.1:8000
 * Toggle `useRealBackend` to false to use mock services instead.
 */
export const environment = {
  production: false,
  useRealBackend: true,
  backendUrl: '', // Empty = use proxy; set 'http://127.0.0.1:8000' for direct CORS
  apiPrefix: '',
};
