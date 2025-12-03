import { RoleId } from './api.types';

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

/**
 * Configuration for authenticating a user.
 *
 * Used as input for sign-in operations. Can be used for:
 * - Demo/test quick sign-in buttons
 * - Pre-configured user accounts
 * - SSO provider configurations
 *
 * This is the **input** to authentication, not the result.
 * The result is represented by SsoUserProfile in the util library.
 */
export interface AuthUserConfig {
  /** Unique identifier for this auth configuration */
  id: string;
  /** Display label (e.g., for sign-in button text) */
  label: string;
  /** Email address for authentication */
  email: string;
  /** Role to assign on sign-in */
  role: RoleId;
  /** Optional button variant for UI rendering */
  buttonVariant?: 'primary' | 'secondary' | 'ghost';
}
