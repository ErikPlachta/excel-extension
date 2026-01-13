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
import {
  TokenPairSchema,
  UserProfileSchema,
  SignOutResponseSchema,
  RevokeResponseSchema,
} from "@excel-platform/shared/types";
import { ApiConfigService } from "@excel-platform/data/api";

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
  private readonly apiConfig = inject(ApiConfigService);

  /**
   * Sign in with Azure AD token.
   *
   * @param request - Sign-in request with Azure AD token
   * @returns Token pair (access + refresh)
   * @throws Error if authentication fails or response validation fails
   */
  async signIn(request: SignInRequest): Promise<TokenPair> {
    const response = await firstValueFrom(
      this.http.post<unknown>(this.apiConfig.buildUrl('/auth/signin'), request)
    );
    const parsed = TokenPairSchema.safeParse(response);
    if (!parsed.success) {
      throw new Error(`Invalid signIn response: ${parsed.error.message}`);
    }
    return parsed.data as TokenPair;
  }

  /**
   * Refresh access token using refresh token.
   * Implements token rotation: old refresh token is revoked, new pair issued.
   *
   * @param refreshToken - Current refresh token
   * @returns New token pair
   * @throws Error if refresh token is invalid or revoked, or response validation fails
   */
  async refresh(refreshToken: string): Promise<TokenPair> {
    const response = await firstValueFrom(
      this.http.post<unknown>(this.apiConfig.buildUrl('/auth/refresh'), { refreshToken })
    );
    const parsed = TokenPairSchema.safeParse(response);
    if (!parsed.success) {
      throw new Error(`Invalid refresh response: ${parsed.error.message}`);
    }
    return parsed.data as TokenPair;
  }

  /**
   * Get current user profile.
   * Requires valid access token in Authorization header (added by interceptor).
   *
   * @returns User profile
   * @throws Error if not authenticated or response validation fails
   */
  async getProfile(): Promise<UserProfile> {
    const response = await firstValueFrom(
      this.http.get<unknown>(this.apiConfig.buildUrl('/auth/profile'))
    );
    const parsed = UserProfileSchema.safeParse(response);
    if (!parsed.success) {
      throw new Error(`Invalid profile response: ${parsed.error.message}`);
    }
    return parsed.data as UserProfile;
  }

  /**
   * Sign out current user.
   * Invalidates current session on server.
   *
   * @returns Sign-out result
   * @throws Error if response validation fails
   */
  async signOut(): Promise<SignOutResponse> {
    const response = await firstValueFrom(
      this.http.post<unknown>(this.apiConfig.buildUrl('/auth/signout'), {})
    );
    const parsed = SignOutResponseSchema.safeParse(response);
    if (!parsed.success) {
      throw new Error(`Invalid signOut response: ${parsed.error.message}`);
    }
    return parsed.data as SignOutResponse;
  }

  /**
   * Revoke a specific refresh token.
   * Used for logout-from-all-devices scenarios.
   *
   * @param refreshToken - Refresh token to revoke
   * @returns Revocation result
   * @throws Error if response validation fails
   */
  async revoke(refreshToken: string): Promise<RevokeResponse> {
    const response = await firstValueFrom(
      this.http.post<unknown>(this.apiConfig.buildUrl('/auth/revoke'), { refreshToken })
    );
    const parsed = RevokeResponseSchema.safeParse(response);
    if (!parsed.success) {
      throw new Error(`Invalid revoke response: ${parsed.error.message}`);
    }
    return parsed.data as RevokeResponse;
  }
}
