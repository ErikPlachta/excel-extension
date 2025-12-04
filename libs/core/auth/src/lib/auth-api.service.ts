import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";
import type {
  IAuthApiService,
  SignInRequest,
  SignOutResponse,
  RevokeResponse,
  UserProfile,
  TokenPair,
} from "@excel-platform/shared/types";

/**
 * Auth API Service - Real backend HTTP implementation.
 *
 * Implements `IAuthApiService` with actual HTTP calls to the backend.
 * Use this service in production mode with a real authentication server.
 *
 * **Endpoints (per BACKEND-API-SPEC.md):**
 * - POST /auth/signin - Sign in with Azure AD token
 * - POST /auth/refresh - Refresh token pair (rotation)
 * - GET /auth/profile - Get current user profile
 * - POST /auth/signout - Sign out current session
 * - POST /auth/revoke - Revoke a refresh token
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
 * @see AuthApiMockService for demo/testing mode
 */
@Injectable()
export class AuthApiService implements IAuthApiService {
  private readonly http = inject(HttpClient);

  /**
   * Sign in with Azure AD token.
   *
   * @param request - Sign-in request with Azure AD token
   * @returns Token pair (access + refresh)
   * @throws Error if authentication fails
   */
  async signIn(request: SignInRequest): Promise<TokenPair> {
    return firstValueFrom(
      this.http.post<TokenPair>('/auth/signin', request)
    );
  }

  /**
   * Refresh access token using refresh token.
   * Implements token rotation: old refresh token is revoked, new pair issued.
   *
   * @param refreshToken - Current refresh token
   * @returns New token pair
   * @throws Error if refresh token is invalid or revoked
   */
  async refresh(refreshToken: string): Promise<TokenPair> {
    return firstValueFrom(
      this.http.post<TokenPair>('/auth/refresh', { refreshToken })
    );
  }

  /**
   * Get current user profile.
   * Requires valid access token in Authorization header (added by interceptor).
   *
   * @returns User profile
   * @throws Error if not authenticated
   */
  async getProfile(): Promise<UserProfile> {
    return firstValueFrom(
      this.http.get<UserProfile>('/auth/profile')
    );
  }

  /**
   * Sign out current user.
   * Invalidates current session on server.
   *
   * @returns Sign-out result
   */
  async signOut(): Promise<SignOutResponse> {
    return firstValueFrom(
      this.http.post<SignOutResponse>('/auth/signout', {})
    );
  }

  /**
   * Revoke a specific refresh token.
   * Used for logout-from-all-devices scenarios.
   *
   * @param refreshToken - Refresh token to revoke
   * @returns Revocation result
   */
  async revoke(refreshToken: string): Promise<RevokeResponse> {
    return firstValueFrom(
      this.http.post<RevokeResponse>('/auth/revoke', { refreshToken })
    );
  }
}
