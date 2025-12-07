/**
 * Auth API types aligned with backend specification.
 *
 * @remarks
 * These types define the contract between frontend and backend for authentication.
 * Source of truth: docs/architecture/BACKEND-API-SPEC.md
 *
 * The frontend supports two modes:
 * - **Production**: Real Azure AD SSO → Backend JWT issuance
 * - **Demo**: Mock auth simulating real contracts for testing
 */

import { RoleId } from './api.types';
import { TokenPair } from './jwt.types';

/**
 * User profile returned from auth endpoints.
 * Matches backend GET /auth/profile response.
 */
export interface UserProfile {
  /** Unique user identifier (UUID). */
  id: string;
  /** User email address. */
  email: string;
  /** Display name for UI. */
  displayName: string;
  /** User roles for authorization. */
  roles: RoleId[];
}

/**
 * Sign-in request payload.
 * For real backend: contains Azure AD token.
 * For mock: contains demo user email.
 */
export interface SignInRequest {
  /** Azure AD token from SSO flow (production). */
  azureAdToken?: string;
  /** Email for demo sign-in (mock only). */
  email?: string;
  /** Roles for demo sign-in (mock only). */
  roles?: RoleId[];
}

/**
 * Sign-out response from backend.
 */
export interface SignOutResponse {
  /** Whether sign-out was successful. */
  success: boolean;
}

/**
 * Token revocation response from backend.
 */
export interface RevokeResponse {
  /** Whether revocation was successful. */
  success: boolean;
}

/**
 * Auth API service interface.
 *
 * @remarks
 * This interface is implemented by both:
 * - `AuthApiService` - Real backend HTTP calls
 * - `AuthApiMockService` - Mock simulation for demo mode
 *
 * Use dependency injection with `AUTH_API_SERVICE` token to switch implementations.
 *
 * @example
 * ```typescript
 * // In app.config.ts
 * providers: [
 *   {
 *     provide: AUTH_API_SERVICE,
 *     useClass: environment.useRealBackend ? AuthApiService : AuthApiMockService
 *   }
 * ]
 * ```
 */
export interface IAuthApiService {
  /**
   * Sign in with Azure AD token (production) or demo credentials (mock).
   *
   * @param request - Sign-in request containing Azure AD token or demo credentials
   * @returns Token pair containing access and refresh tokens
   * @throws Error if authentication fails
   */
  signIn(request: SignInRequest): Promise<TokenPair>;

  /**
   * Refresh access token using refresh token.
   * Implements token rotation: old refresh token is revoked, new pair issued.
   *
   * @param refreshToken - Current refresh token
   * @returns New token pair (rotation)
   * @throws Error if refresh token is invalid or revoked
   */
  refresh(refreshToken: string): Promise<TokenPair>;

  /**
   * Get current user profile.
   * Requires valid access token in Authorization header.
   *
   * @returns User profile with id, email, displayName, roles
   * @throws Error if not authenticated
   */
  getProfile(): Promise<UserProfile>;

  /**
   * Sign out current user.
   * Invalidates current session on server.
   *
   * @returns Sign-out result
   */
  signOut(): Promise<SignOutResponse>;

  /**
   * Revoke a specific refresh token.
   * Used for logout-from-all-devices scenarios.
   *
   * @param refreshToken - Refresh token to revoke
   * @returns Revocation result
   */
  revoke(refreshToken: string): Promise<RevokeResponse>;
}

/**
 * Injection token key constant for auth API service.
 * @deprecated Use AUTH_API_TOKEN from \@excel-platform/core/auth instead.
 * Kept for backward compatibility only.
 */
export const AUTH_API_SERVICE = 'AUTH_API_SERVICE';

/**
 * Token validation result with reason for failure.
 * Extended from jwt.types.TokenValidationResult with specific failure reasons.
 */
export interface AuthTokenValidationResult {
  /** Whether the token is valid. */
  valid: boolean;
  /** Reason for validation failure. */
  reason?: 'expired' | 'revoked' | 'invalid_signature' | 'not_found' | 'malformed';
  /** User ID from token if valid. */
  userId?: string;
  /** Roles from token if valid. */
  roles?: RoleId[];
}
