/**
 * Auth-related state shared across the application.
 */
export interface AuthState {
  /** Whether a user is currently authenticated via SSO. */
  isAuthenticated: boolean;
  /** User profile object from the SSO helper; shape is kept loose here. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user: any | null;
  /** Access token returned from the SSO helper, when available. */
  accessToken: string | null;
}
