import { Injectable } from "@angular/core";
import {
  AccessToken,
  RefreshToken,
  TokenHeader,
  TokenPair,
  TokenPayload,
  TokenValidationResult,
  JWT_CONFIG,
} from "../types";

/**
 * JWT Helper Service - Mock JWT generation and validation for development.
 *
 * Provides deterministic JWT operations for testing and development:
 * - Token pair generation (access + refresh)
 * - Token refresh (new access token from refresh token)
 * - Token decoding and validation
 * - Expiration checking
 *
 * **Mock Implementation Notes:**
 * - Uses base64url encoding (not real JWT signatures)
 * - Deterministic token generation based on email (for testing)
 * - Designed for easy replacement with real JWT library (jose) in production
 *
 * **Token Lifetimes:**
 * - Access token: 15 minutes
 * - Refresh token: 7 days
 *
 * **Usage:**
 * ```typescript
 * // Generate token pair on sign-in
 * const tokens = jwtHelper.generateMockTokenPair('user@example.com', ['analyst']);
 *
 * // Refresh access token
 * const newTokens = jwtHelper.refreshMockTokenPair(tokens.refresh);
 *
 * // Decode and validate token
 * const result = jwtHelper.validateToken(tokens.access.token);
 * if (result.valid) {
 *   console.log('User:', result.payload?.email);
 * }
 * ```
 */
@Injectable({ providedIn: "root" })
export class JwtHelperService {
  /**
   * Generate a mock JWT token pair for a user.
   *
   * Creates deterministic access and refresh tokens based on email.
   * Tokens use base64url encoding (not real JWT signatures).
   *
   * @param email - User email address (becomes sub claim)
   * @param roles - User roles for authorization
   * @returns TokenPair containing access and refresh tokens
   */
  generateMockTokenPair(email: string, roles: string[]): TokenPair {
    const now = Date.now();
    const userId = this.generateUserId(email);

    const accessPayload: TokenPayload = {
      sub: userId,
      email,
      roles,
      iat: Math.floor(now / 1000),
      exp: Math.floor((now + JWT_CONFIG.ACCESS_TOKEN_LIFETIME_MS) / 1000),
    };

    const refreshPayload: TokenPayload = {
      sub: userId,
      email,
      roles,
      iat: Math.floor(now / 1000),
      exp: Math.floor((now + JWT_CONFIG.REFRESH_TOKEN_LIFETIME_MS) / 1000),
    };

    const accessToken = this.encodeToken(accessPayload);
    const refreshToken = this.encodeToken(refreshPayload);

    return {
      access: {
        token: accessToken,
        expiresAt: now + JWT_CONFIG.ACCESS_TOKEN_LIFETIME_MS,
      },
      refresh: {
        token: refreshToken,
        expiresAt: now + JWT_CONFIG.REFRESH_TOKEN_LIFETIME_MS,
      },
    };
  }

  /**
   * Refresh a token pair using a valid refresh token.
   *
   * Generates a new access token while keeping the refresh token
   * (unless refresh token is close to expiry, then regenerates both).
   *
   * @param refreshToken - Current refresh token
   * @returns New TokenPair, or null if refresh token is invalid/expired
   */
  refreshMockTokenPair(refreshToken: RefreshToken): TokenPair | null {
    // Validate refresh token
    const validation = this.validateToken(refreshToken.token);
    if (!validation.valid || !validation.payload) {
      return null;
    }

    const now = Date.now();
    const payload = validation.payload;

    // Check if refresh token is expired
    if (this.isTokenExpired(refreshToken)) {
      return null;
    }

    // Generate new access token
    const newAccessPayload: TokenPayload = {
      sub: payload.sub,
      email: payload.email,
      roles: payload.roles,
      iat: Math.floor(now / 1000),
      exp: Math.floor((now + JWT_CONFIG.ACCESS_TOKEN_LIFETIME_MS) / 1000),
    };

    const newAccessToken = this.encodeToken(newAccessPayload);

    // Check if refresh token needs renewal (< 1 day remaining)
    const oneDayMs = 24 * 60 * 60 * 1000;
    const refreshTimeRemaining = refreshToken.expiresAt - now;

    if (refreshTimeRemaining < oneDayMs) {
      // Regenerate both tokens
      return this.generateMockTokenPair(payload.email, payload.roles);
    }

    // Return new access token with existing refresh token
    return {
      access: {
        token: newAccessToken,
        expiresAt: now + JWT_CONFIG.ACCESS_TOKEN_LIFETIME_MS,
      },
      refresh: refreshToken,
    };
  }

  /**
   * Decode a mock JWT token and extract the payload.
   *
   * @param token - JWT token string to decode
   * @returns Decoded TokenPayload, or null if invalid
   */
  decodeMockToken(token: string): TokenPayload | null {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) {
        return null;
      }

      const payloadJson = this.base64UrlDecode(parts[1]);
      return JSON.parse(payloadJson) as TokenPayload;
    } catch {
      return null;
    }
  }

  /**
   * Validate a token and return the result with payload.
   *
   * @param token - JWT token string to validate
   * @returns TokenValidationResult with valid flag, payload, and optional error
   */
  validateToken(token: string): TokenValidationResult {
    const payload = this.decodeMockToken(token);

    if (!payload) {
      return {
        valid: false,
        payload: null,
        error: "Invalid token format",
      };
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return {
        valid: false,
        payload,
        error: "Token expired",
      };
    }

    return {
      valid: true,
      payload,
    };
  }

  /**
   * Check if an access or refresh token is expired.
   *
   * @param token - AccessToken or RefreshToken to check
   * @returns True if token is expired, false otherwise
   */
  isTokenExpired(token: AccessToken | RefreshToken): boolean {
    return Date.now() >= token.expiresAt;
  }

  /**
   * Check if a token is expiring soon (within threshold).
   *
   * @param token - AccessToken or RefreshToken to check
   * @param thresholdMs - Time threshold in milliseconds (default: 5 minutes)
   * @returns True if token will expire within threshold, false otherwise
   */
  isTokenExpiringSoon(
    token: AccessToken | RefreshToken,
    thresholdMs: number = JWT_CONFIG.REFRESH_THRESHOLD_MS
  ): boolean {
    return Date.now() + thresholdMs >= token.expiresAt;
  }

  /**
   * Get time remaining until token expires.
   *
   * @param token - AccessToken or RefreshToken to check
   * @returns Time remaining in milliseconds (negative if expired)
   */
  getTimeUntilExpiry(token: AccessToken | RefreshToken): number {
    return token.expiresAt - Date.now();
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Generate a deterministic user ID from email.
   * Uses simple hash for consistent testing results.
   */
  private generateUserId(email: string): string {
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      const char = email.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `user-${Math.abs(hash).toString(16)}`;
  }

  /**
   * Encode a token payload as a mock JWT string.
   * Format: header.payload.signature (all base64url encoded)
   */
  private encodeToken(payload: TokenPayload): string {
    const header: TokenHeader = {
      alg: "HS256",
      typ: "JWT",
    };

    const headerEncoded = this.base64UrlEncode(JSON.stringify(header));
    const payloadEncoded = this.base64UrlEncode(JSON.stringify(payload));
    const signature = this.generateMockSignature(headerEncoded, payloadEncoded);

    return `${headerEncoded}.${payloadEncoded}.${signature}`;
  }

  /**
   * Generate a mock signature (not cryptographically secure).
   * Uses simple hash for deterministic testing.
   */
  private generateMockSignature(header: string, payload: string): string {
    const input = `${header}.${payload}`;
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return this.base64UrlEncode(Math.abs(hash).toString(16).padStart(32, "0"));
  }

  /**
   * Base64url encode a string.
   */
  private base64UrlEncode(str: string): string {
    const base64 = btoa(str);
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  }

  /**
   * Base64url decode a string.
   */
  private base64UrlDecode(str: string): string {
    // Add padding if needed
    let padded = str.replace(/-/g, "+").replace(/_/g, "/");
    const pad = padded.length % 4;
    if (pad) {
      padded += "=".repeat(4 - pad);
    }
    return atob(padded);
  }
}
