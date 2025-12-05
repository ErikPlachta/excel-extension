/**
 * JWT authentication types for token management.
 *
 * This module defines the types used for JWT-based authentication,
 * including access tokens, refresh tokens, and token payloads.
 * Currently implemented as mock JWT for development; designed for
 * easy transition to real JWT library (e.g., jose) in production.
 */

/**
 * JWT access token with expiration metadata.
 * Access tokens are short-lived (default 15 minutes).
 */
export interface AccessToken {
  /** The JWT token string (base64url encoded). */
  token: string;
  /** Expiration timestamp in milliseconds (Unix epoch). */
  expiresAt: number;
}

/**
 * JWT refresh token with expiration metadata.
 * Refresh tokens are longer-lived (default 7 days).
 */
export interface RefreshToken {
  /** The JWT refresh token string (base64url encoded). */
  token: string;
  /** Expiration timestamp in milliseconds (Unix epoch). */
  expiresAt: number;
}

/**
 * JWT token payload (decoded claims).
 * Contains user identity and authorization information.
 *
 * @remarks
 * Aligned with backend API spec. The `jti`, `aud`, and `iss` claims
 * are required for token revocation and validation.
 */
export interface TokenPayload {
  /** Subject - unique user identifier (UUID). */
  sub: string;
  /** User email address. */
  email: string;
  /** User roles for authorization. */
  roles: string[];
  /** Issued at timestamp (Unix seconds). */
  iat: number;
  /** Expiration timestamp (Unix seconds). */
  exp: number;
  /** JWT ID - unique identifier for this token (used for revocation). */
  jti: string;
  /** Audience - intended recipient of the token. */
  aud: string;
  /** Issuer - the entity that issued the token. */
  iss: string;
}

/**
 * JWT header (standard JWT structure).
 */
export interface TokenHeader {
  /** Algorithm used for signing (mock uses 'HS256'). */
  alg: string;
  /** Token type, always 'JWT'. */
  typ: string;
}

/**
 * Complete token pair containing access and refresh tokens.
 * Returned from sign-in and token refresh operations.
 */
export interface TokenPair {
  /** Short-lived access token for API authentication. */
  access: AccessToken;
  /** Long-lived refresh token for obtaining new access tokens. */
  refresh: RefreshToken;
}

/**
 * Result of token validation.
 */
export interface TokenValidationResult {
  /** Whether the token is valid. */
  valid: boolean;
  /** Decoded payload if valid, null otherwise. */
  payload: TokenPayload | null;
  /** Error message if invalid. */
  error?: string;
}

/**
 * JWT configuration constants.
 */
export const JWT_CONFIG = {
  /** Access token lifetime in milliseconds (15 minutes). */
  ACCESS_TOKEN_LIFETIME_MS: 15 * 60 * 1000,
  /** Refresh token lifetime in milliseconds (7 days). */
  REFRESH_TOKEN_LIFETIME_MS: 7 * 24 * 60 * 60 * 1000,
  /** Time before expiry to trigger auto-refresh in milliseconds (5 minutes). */
  REFRESH_THRESHOLD_MS: 5 * 60 * 1000,
  /** Interval for checking token expiry in milliseconds (60 seconds). */
  TOKEN_CHECK_INTERVAL_MS: 60 * 1000,
  /** localStorage key for storing token pair. */
  STORAGE_KEY: 'jwt_tokens',
} as const;
