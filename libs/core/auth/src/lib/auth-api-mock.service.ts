import { Injectable, inject } from "@angular/core";
import type {
  IAuthApiService,
  SignInRequest,
  SignOutResponse,
  RevokeResponse,
  UserProfile,
  TokenPair,
  TokenPayload,
  RoleId,
} from "@excel-platform/shared/types";
import { JwtHelperService } from "./jwt-helper.service";

/**
 * Auth API Mock Service - Simulates backend authentication for demo mode.
 *
 * Implements `IAuthApiService` with in-memory token management that
 * simulates real backend behavior including:
 * - Token issuance with proper JWT claims (jti, aud, iss)
 * - Token revocation via JTI blacklist
 * - Token rotation on refresh
 * - User profile retrieval
 *
 * **Key Features:**
 * - In-memory JTI blacklist for token revocation
 * - Supports demo sign-in with email/roles (no Azure AD required)
 * - Matches real backend API contract exactly
 *
 * **Usage:**
 * Configure via DI provider in app.config.ts:
 * ```typescript
 * import { AUTH_API_TOKEN } from '@excel-platform/core/auth';
 *
 * providers: [
 *   {
 *     provide: AUTH_API_TOKEN,
 *     useClass: environment.useRealBackend ? AuthApiService : AuthApiMockService
 *   }
 * ]
 * ```
 *
 * @see AuthApiService for production mode with real backend
 */
@Injectable()
export class AuthApiMockService implements IAuthApiService {
  private readonly jwtHelper = inject(JwtHelperService);

  /** In-memory blacklist of revoked token JTIs (simulates server state) */
  private readonly revokedJtis = new Set<string>();

  /** Currently active tokens for demo session tracking */
  private currentTokens: TokenPair | null = null;

  /** Current user profile for getProfile() */
  private currentProfile: UserProfile | null = null;

  /**
   * Sign in with demo credentials.
   *
   * Accepts either Azure AD token (simulated) or demo email/roles.
   * Revokes any existing tokens for this user before issuing new ones.
   *
   * @param request - Sign-in request
   * @returns Token pair with access and refresh tokens
   * @throws Error if request is invalid
   */
  async signIn(request: SignInRequest): Promise<TokenPair> {
    // Simulate network delay
    await this.simulateDelay();

    // Determine email and roles from request
    let email: string;
    let roles: RoleId[];

    if (request.azureAdToken) {
      // Simulated Azure AD token - extract mock claims
      // In production, this would validate with Azure AD
      email = this.extractEmailFromMockAzureToken(request.azureAdToken);
      roles = ['analyst']; // Default role from Azure AD groups
    } else if (request.email) {
      // Demo mode sign-in
      email = request.email;
      roles = request.roles ?? ['analyst'];
    } else {
      throw new Error('Invalid sign-in request: email or azureAdToken required');
    }

    // Revoke any existing tokens for this user (simulates server behavior)
    if (this.currentTokens) {
      const oldPayload = this.jwtHelper.decodeMockToken(this.currentTokens.access.token);
      if (oldPayload?.jti) {
        this.revokedJtis.add(oldPayload.jti);
      }
      const oldRefreshPayload = this.jwtHelper.decodeMockToken(this.currentTokens.refresh.token);
      if (oldRefreshPayload?.jti) {
        this.revokedJtis.add(oldRefreshPayload.jti);
      }
    }

    // Generate new token pair
    const tokens = this.jwtHelper.generateMockTokenPair(email, roles);
    this.currentTokens = tokens;

    // Store user profile for getProfile()
    const payload = this.jwtHelper.decodeMockToken(tokens.access.token);
    if (payload) {
      this.currentProfile = {
        id: payload.sub,
        email: payload.email,
        displayName: email.split('@')[0],
        roles: payload.roles as RoleId[],
      };
    }

    return tokens;
  }

  /**
   * Refresh token pair using refresh token.
   * Implements token rotation: old refresh token is revoked, new pair issued.
   *
   * @param refreshToken - Current refresh token
   * @returns New token pair
   * @throws Error if refresh token is invalid or revoked
   */
  async refresh(refreshToken: string): Promise<TokenPair> {
    await this.simulateDelay();

    // Validate refresh token
    const validation = this.jwtHelper.validateToken(refreshToken);
    if (!validation.valid || !validation.payload) {
      throw new Error('Invalid refresh token');
    }

    // Check if token is revoked
    if (this.revokedJtis.has(validation.payload.jti)) {
      throw new Error('Refresh token has been revoked');
    }

    // Revoke the old refresh token (rotation)
    this.revokedJtis.add(validation.payload.jti);

    // Generate new token pair
    const tokens = this.jwtHelper.generateMockTokenPair(
      validation.payload.email,
      validation.payload.roles
    );
    this.currentTokens = tokens;

    return tokens;
  }

  /**
   * Get current user profile.
   *
   * @returns User profile
   * @throws Error if not authenticated
   */
  async getProfile(): Promise<UserProfile> {
    await this.simulateDelay();

    if (!this.currentProfile) {
      throw new Error('Not authenticated');
    }

    // Validate current access token
    if (this.currentTokens) {
      const payload = this.jwtHelper.decodeMockToken(this.currentTokens.access.token);
      if (payload?.jti && this.revokedJtis.has(payload.jti)) {
        throw new Error('Access token has been revoked');
      }
    }

    return this.currentProfile;
  }

  /**
   * Sign out current user.
   * Revokes current tokens.
   *
   * @returns Sign-out result
   */
  async signOut(): Promise<SignOutResponse> {
    await this.simulateDelay();

    // Revoke current tokens
    if (this.currentTokens) {
      const accessPayload = this.jwtHelper.decodeMockToken(this.currentTokens.access.token);
      if (accessPayload?.jti) {
        this.revokedJtis.add(accessPayload.jti);
      }
      const refreshPayload = this.jwtHelper.decodeMockToken(this.currentTokens.refresh.token);
      if (refreshPayload?.jti) {
        this.revokedJtis.add(refreshPayload.jti);
      }
    }

    this.currentTokens = null;
    this.currentProfile = null;

    return { success: true };
  }

  /**
   * Revoke a specific refresh token.
   *
   * @param refreshToken - Refresh token to revoke
   * @returns Revocation result
   */
  async revoke(refreshToken: string): Promise<RevokeResponse> {
    await this.simulateDelay();

    const payload = this.jwtHelper.decodeMockToken(refreshToken);
    if (payload?.jti) {
      this.revokedJtis.add(payload.jti);
      return { success: true };
    }

    return { success: false };
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Mock-specific helpers
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Check if a token JTI has been revoked.
   * Exposed for testing and validation purposes.
   *
   * @param jti - JWT ID to check
   * @returns True if revoked
   */
  isTokenRevoked(jti: string): boolean {
    return this.revokedJtis.has(jti);
  }

  /**
   * Validate a token against the mock server state.
   *
   * @param token - Token string to validate
   * @returns Validation result with reason
   */
  validateToken(token: string): { valid: boolean; reason?: string; payload?: TokenPayload } {
    const result = this.jwtHelper.validateToken(token);
    if (!result.valid) {
      return { valid: false, reason: result.error };
    }

    if (result.payload?.jti && this.revokedJtis.has(result.payload.jti)) {
      return { valid: false, reason: 'revoked', payload: result.payload };
    }

    return { valid: true, payload: result.payload ?? undefined };
  }

  /**
   * Clear all mock state (for testing).
   */
  reset(): void {
    this.revokedJtis.clear();
    this.currentTokens = null;
    this.currentProfile = null;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Simulate network delay for realistic behavior.
   */
  private simulateDelay(ms: number = 100): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Extract email from mock Azure AD token.
   * In production, this would be real token validation.
   */
  private extractEmailFromMockAzureToken(token: string): string {
    // For mock purposes, treat the token as base64-encoded email or use default
    try {
      const decoded = atob(token);
      if (decoded.includes('@')) {
        return decoded;
      }
    } catch {
      // Not valid base64, use default
    }
    return 'demo@example.com';
  }
}
