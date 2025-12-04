import { Injectable, OnDestroy, Inject, Optional } from "@angular/core";
import { BehaviorSubject, Subscription, interval } from "rxjs";
import { getSsoAuthResult, SsoUserProfile } from "@excel-platform/shared/util";
import {
  JWT_CONFIG,
  type AuthState,
  type TokenPair,
  type RefreshToken,
  type IAuthApiService,
  type RoleId,
} from "@excel-platform/shared/types";
import { StorageHelperService } from "@excel-platform/data/storage";
import { JwtHelperService } from "./jwt-helper.service";
import { AUTH_API_TOKEN } from "./auth.tokens";

/**
 * Authentication Service - Manages user authentication state and JWT tokens.
 *
 * Provides centralized authentication state management with:
 * - JWT-based authentication with auto-refresh
 * - Memory-only access token storage (security best practice)
 * - Refresh token persistence for session continuity
 * - Role-based access control (RBAC) checks
 * - Observable state stream for reactive updates
 * - Swappable auth API backend via IAuthApiService injection
 *
 * **JWT Token Management:**
 * - Access tokens: 15-minute lifetime, stored in MEMORY ONLY (not localStorage)
 * - Refresh tokens: 7-day lifetime, stored in localStorage
 * - Auto-refresh timer: triggers 5 minutes before access token expiry
 *
 * **Security Notes:**
 * - Access tokens are memory-only to prevent XSS token theft
 * - Refresh tokens are persisted but should be httpOnly in production
 * - Token validation uses JTI blacklist for revocation support
 *
 * **Mode Switching:**
 * The service uses `IAuthApiService` interface, configured via DI:
 * - Production: `AuthApiService` - real backend HTTP calls
 * - Demo: `AuthApiMockService` - in-memory simulation
 *
 * **Usage:**
 * ```typescript
 * // Sign in with demo credentials
 * await auth.signInWithJwt('user@example.com', '', ['analyst']);
 *
 * // Sign in with Azure AD token (production)
 * await auth.signInWithAzureAd(azureToken);
 *
 * // Get access token for API calls
 * const token = auth.getAccessToken();
 * if (token) {
 *   headers.set('Authorization', `Bearer ${token}`);
 * }
 *
 * // Check authentication
 * if (auth.isAuthenticated) {
 *   console.log('User:', auth.user);
 * }
 *
 * // Role checks
 * if (auth.hasRole('admin')) {
 *   // Admin-only logic
 * }
 *
 * // Subscribe to state changes
 * auth.state$.subscribe(state => {
 *   console.log('Auth state changed:', state);
 * });
 * ```
 */
@Injectable({ providedIn: "root" })
export class AuthService implements OnDestroy {
  /** Storage key for auth state (user profile, not tokens) */
  private static readonly AUTH_STATE_KEY = "excel-extension-auth-state";

  /** Storage key for refresh token only (access token is memory-only) */
  private static readonly REFRESH_TOKEN_KEY = "excel-ext:refresh-token";

  private readonly stateSubject = new BehaviorSubject<AuthState>({
    isAuthenticated: false,
    user: null,
    accessToken: null,
  });

  /** Access token stored in memory only (never persisted) */
  private accessToken: { token: string; expiresAt: number } | null = null;

  /** Refresh token (persisted to localStorage) */
  private refreshToken: RefreshToken | null = null;

  private tokenRefreshTimer?: Subscription;
  private stateSubscription?: Subscription;

  /** Flag to prevent concurrent refresh operations */
  private refreshInProgress = false;

  /** Auth API service for backend communication */
  private readonly authApi?: IAuthApiService;

  /**
   * Observable stream of authentication state changes.
   * Subscribe to react to sign-in/sign-out events.
   */
  readonly state$ = this.stateSubject.asObservable();

  /**
   * Current authentication state snapshot.
   */
  get state(): AuthState {
    return this.stateSubject.value;
  }

  /**
   * Whether user is currently authenticated.
   */
  get isAuthenticated(): boolean {
    return this.state.isAuthenticated;
  }

  /**
   * Current user profile, or null if not authenticated.
   */
  get user(): SsoUserProfile | null {
    return this.state.user;
  }

  /**
   * Current user's roles, or empty array if not authenticated.
   */
  get roles(): string[] {
    return this.state.user?.roles ?? [];
  }

  /**
   * Check if current user has a specific role.
   *
   * @param role - Role name to check (e.g., 'admin', 'analyst')
   * @returns True if user has the role, false otherwise
   */
  hasRole(role: string): boolean {
    return this.roles.includes(role);
  }

  /**
   * Check if current user has any of the specified roles.
   *
   * @param roles - Array of role names to check
   * @returns True if user has at least one role, false otherwise
   */
  hasAnyRole(roles: string[]): boolean {
    return roles.some((r) => this.roles.includes(r));
  }

  constructor(
    private readonly storage: StorageHelperService,
    private readonly jwtHelper: JwtHelperService,
    @Optional() @Inject(AUTH_API_TOKEN) authApi?: unknown
  ) {
    // Cast to proper type - avoids decorator metadata issues with interface type
    this.authApi = authApi as IAuthApiService | undefined;
    // Hydrate auth state from storage (user profile only)
    const defaultState: AuthState = {
      isAuthenticated: false,
      user: null,
      accessToken: null,
    };
    const storedState = this.storage.getItem<AuthState>(
      AuthService.AUTH_STATE_KEY,
      defaultState
    );

    // Hydrate refresh token from storage
    const storedRefreshToken = this.storage.getItem<RefreshToken | null>(
      AuthService.REFRESH_TOKEN_KEY,
      null
    );

    if (storedRefreshToken && !this.jwtHelper.isTokenExpired(storedRefreshToken)) {
      this.refreshToken = storedRefreshToken;

      // If we have a valid refresh token, restore auth state and try to get new access token
      if (storedState.isAuthenticated) {
        this.stateSubject.next({
          ...storedState,
          accessToken: null, // Access token is memory-only, needs refresh
        });
        // Schedule immediate token refresh
        void this.refreshAccessToken();
      }
    } else if (storedRefreshToken) {
      // Clear expired refresh token
      this.storage.removeItem(AuthService.REFRESH_TOKEN_KEY);
      // Also clear auth state since we can't refresh
      this.stateSubject.next(defaultState);
    } else {
      this.stateSubject.next(defaultState);
    }

    // Persist state changes to storage (user profile only, not access token)
    this.stateSubscription = this.state$.subscribe((state) => {
      // Store state without accessToken (it's memory-only)
      const stateToStore: AuthState = {
        ...state,
        accessToken: null, // Never persist access token
      };
      this.storage.setItem(AuthService.AUTH_STATE_KEY, stateToStore);
    });
  }

  ngOnDestroy(): void {
    this.stopTokenRefreshTimer();
    this.stateSubscription?.unsubscribe();
  }

  // ────────────────────────────────────────────────────────────────────────────
  // JWT Authentication Methods
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Sign in with Azure AD token (production mode).
   *
   * Sends Azure AD token to backend for validation and JWT issuance.
   *
   * @param azureAdToken - Token from Azure AD SSO flow
   * @throws Error if auth API service not configured or auth fails
   */
  async signInWithAzureAd(azureAdToken: string): Promise<void> {
    if (!this.authApi) {
      throw new Error("Auth API service not configured. Check DI providers.");
    }

    const tokenPair = await this.authApi.signIn({ azureAdToken });
    await this.handleTokenPair(tokenPair);
  }

  /**
   * Sign in with demo credentials (demo mode).
   *
   * Uses mock JWT generation for testing without real backend.
   * If authApi is configured, uses it; otherwise falls back to local generation.
   *
   * @param email - User email address
   * @param _password - Password (ignored in demo mode)
   * @param roles - User roles for authorization (default: ['analyst'])
   */
  async signInWithJwt(
    email: string,
    _password: string,
    roles: RoleId[] = ["analyst"]
  ): Promise<void> {
    let tokenPair: TokenPair;

    if (this.authApi) {
      // Use auth API (mock or real)
      tokenPair = await this.authApi.signIn({ email, roles });
    } else {
      // Fallback to local JWT generation
      tokenPair = this.jwtHelper.generateMockTokenPair(email, roles);
    }

    await this.handleTokenPair(tokenPair);
  }

  /**
   * Process a token pair from sign-in or refresh.
   * Updates internal state and starts refresh timer.
   */
  private async handleTokenPair(tokenPair: TokenPair): Promise<void> {
    // Store access token in memory only
    this.accessToken = tokenPair.access;

    // Store refresh token (persisted)
    this.refreshToken = tokenPair.refresh;
    this.storage.setItem(AuthService.REFRESH_TOKEN_KEY, tokenPair.refresh);

    // Decode payload for user info
    const payload = this.jwtHelper.decodeMockToken(tokenPair.access.token);
    if (!payload) {
      throw new Error("Failed to decode access token");
    }

    // Create user profile from token payload
    const user: SsoUserProfile = {
      id: payload.sub,
      displayName: payload.email.split("@")[0],
      email: payload.email,
      roles: payload.roles,
    };

    // Update auth state
    this.stateSubject.next({
      isAuthenticated: true,
      user,
      accessToken: tokenPair.access.token,
    });

    // Start auto-refresh timer
    this.startTokenRefreshTimer();
  }

  /**
   * Refresh the access token using the refresh token.
   *
   * Called automatically by the refresh timer, but can also be called
   * manually if needed. Uses a mutex flag to prevent concurrent refresh
   * operations which could cause race conditions.
   *
   * @returns True if refresh succeeded, false otherwise
   */
  async refreshAccessToken(): Promise<boolean> {
    // Prevent concurrent refresh operations
    if (this.refreshInProgress) {
      return false;
    }

    if (!this.refreshToken) {
      return false;
    }

    // Check if refresh token is expired
    if (this.jwtHelper.isTokenExpired(this.refreshToken)) {
      // Refresh token expired - sign out
      this.signOut();
      return false;
    }

    this.refreshInProgress = true;
    try {
      let newTokens: TokenPair | null;

      if (this.authApi) {
        // Use auth API for refresh (supports token rotation)
        try {
          newTokens = await this.authApi.refresh(this.refreshToken.token);
        } catch {
          // Refresh failed (e.g., token revoked) - sign out
          this.signOut();
          return false;
        }
      } else {
        // Fallback to local refresh
        newTokens = this.jwtHelper.refreshMockTokenPair(this.refreshToken);
      }

      if (!newTokens) {
        // Refresh failed - sign out
        this.signOut();
        return false;
      }

      // Update tokens
      this.accessToken = newTokens.access;
      this.refreshToken = newTokens.refresh;
      this.storage.setItem(AuthService.REFRESH_TOKEN_KEY, newTokens.refresh);

      // Update access token in auth state
      this.stateSubject.next({
        ...this.state,
        accessToken: newTokens.access.token,
      });

      return true;
    } finally {
      this.refreshInProgress = false;
    }
  }

  /**
   * Get the current access token if valid.
   *
   * Checks token expiration and returns null if expired.
   * Note: Auto-refresh happens via timer, this is synchronous.
   *
   * @returns Access token string, or null if not authenticated or expired
   */
  getAccessToken(): string | null {
    if (!this.accessToken) {
      return null;
    }

    // Check if access token is expired
    if (this.jwtHelper.isTokenExpired(this.accessToken)) {
      // Token expired - trigger refresh (async, returns null for now)
      void this.refreshAccessToken();
      return null;
    }

    return this.accessToken.token;
  }

  /**
   * Get the current refresh token.
   * Used by HTTP interceptor for refresh flow.
   *
   * @returns Refresh token string, or null if not authenticated
   */
  getRefreshToken(): string | null {
    return this.refreshToken?.token ?? null;
  }

  /**
   * Check if the current access token is expiring soon.
   *
   * @returns True if token will expire within the refresh threshold
   */
  isAccessTokenExpiringSoon(): boolean {
    if (!this.accessToken) {
      return false;
    }
    return this.jwtHelper.isTokenExpiringSoon(this.accessToken);
  }

  /**
   * Validate the current access token.
   *
   * @returns Validation result with reason if invalid
   */
  validateCurrentToken(): { valid: boolean; reason?: string } {
    if (!this.accessToken) {
      return { valid: false, reason: "no_token" };
    }

    const result = this.jwtHelper.validateToken(this.accessToken.token);
    if (!result.valid) {
      return { valid: false, reason: result.error ?? "invalid" };
    }

    return { valid: true };
  }

  /**
   * Start the automatic token refresh timer.
   *
   * Checks token expiration every 60 seconds and refreshes
   * when the access token is within 5 minutes of expiry.
   */
  private startTokenRefreshTimer(): void {
    this.stopTokenRefreshTimer();

    this.tokenRefreshTimer = interval(JWT_CONFIG.TOKEN_CHECK_INTERVAL_MS).subscribe(() => {
      void this.checkAndRefreshTokens();
    });
  }

  /**
   * Check token expiration and refresh if needed.
   */
  private async checkAndRefreshTokens(): Promise<void> {
    try {
      if (!this.accessToken) {
        this.stopTokenRefreshTimer();
        return;
      }

      // Check if access token is expiring soon
      if (this.jwtHelper.isTokenExpiringSoon(this.accessToken)) {
        await this.refreshAccessToken();
      }

      // Check if refresh token is expired
      if (this.refreshToken && this.jwtHelper.isTokenExpired(this.refreshToken)) {
        this.signOut();
      }
    } catch {
      // Token refresh failed - sign out
      this.signOut();
    }
  }

  /**
   * Stop the automatic token refresh timer.
   */
  private stopTokenRefreshTimer(): void {
    if (this.tokenRefreshTimer) {
      this.tokenRefreshTimer.unsubscribe();
      this.tokenRefreshTimer = undefined;
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Legacy SSO Methods (for backward compatibility)
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Sign in as analyst using legacy mock SSO.
   * @deprecated Use signInWithJwt() instead
   */
  async signInAsAnalyst(): Promise<void> {
    const result = await getSsoAuthResult();
    const user: SsoUserProfile = {
      ...result.user,
      roles: ["analyst"],
    };

    this.stateSubject.next({
      isAuthenticated: true,
      user,
      accessToken: result.accessToken,
    });
  }

  /**
   * Sign in as admin using legacy mock SSO.
   * @deprecated Use signInWithJwt() instead
   */
  async signInAsAdmin(): Promise<void> {
    const result = await getSsoAuthResult();
    const user: SsoUserProfile = {
      ...result.user,
      roles: ["admin"],
    };

    this.stateSubject.next({
      isAuthenticated: true,
      user,
      accessToken: result.accessToken,
    });
  }

  /**
   * Sign in using legacy mock SSO.
   * @deprecated Use signInWithJwt() instead
   */
  async signIn(): Promise<void> {
    const result = await getSsoAuthResult();
    this.stateSubject.next({
      isAuthenticated: true,
      user: result.user,
      accessToken: result.accessToken,
    });
  }

  /**
   * Sign out and clear all authentication state.
   *
   * Clears both memory and persisted tokens.
   * Optionally calls backend signOut if authApi configured.
   */
  signOut(): void {
    // Stop refresh timer
    this.stopTokenRefreshTimer();

    // Try to notify backend (non-blocking, fire-and-forget)
    if (this.authApi && this.accessToken) {
      void this.authApi.signOut().catch(() => {
        // Ignore errors on sign-out
      });
    }

    // Clear memory-only access token
    this.accessToken = null;

    // Clear persisted refresh token
    this.refreshToken = null;
    this.storage.removeItem(AuthService.REFRESH_TOKEN_KEY);

    // Clear auth state
    this.stateSubject.next({
      isAuthenticated: false,
      user: null,
      accessToken: null,
    });
  }
}
