import { Injectable, OnDestroy } from "@angular/core";
import { BehaviorSubject, Subscription, interval } from "rxjs";
import { getSsoAuthResult, SsoUserProfile } from "@excel-platform/shared/util";
import type { AuthState, TokenPair } from "@excel-platform/shared/types";
import { JWT_CONFIG } from "@excel-platform/shared/types";
import { StorageHelperService } from "@excel-platform/data/storage";
import { JwtHelperService } from "./jwt-helper.service";

/**
 * Authentication Service - Manages user authentication state and JWT tokens.
 *
 * Provides centralized authentication state management with:
 * - JWT-based authentication with auto-refresh
 * - Legacy mock SSO sign-in flows (analyst/admin roles)
 * - Role-based access control (RBAC) checks
 * - Persistent auth state via StorageHelperService
 * - Observable state stream for reactive updates
 *
 * **JWT Token Management:**
 * - Access tokens: 15-minute lifetime, auto-refreshed
 * - Refresh tokens: 7-day lifetime
 * - Auto-refresh timer: triggers 5 minutes before expiry
 * - Token persistence in localStorage
 *
 * **State Persistence:**
 * - Auth state stored in localStorage via StorageHelperService
 * - JWT tokens stored separately for security isolation
 * - Automatically hydrates on app init
 * - Automatically persists on state changes
 *
 * **Usage:**
 * ```typescript
 * // JWT sign-in (preferred)
 * await auth.signInWithJwt('user@example.com', 'password', ['analyst']);
 *
 * // Get access token for API calls
 * const token = auth.getAccessToken();
 * if (token) {
 *   headers.set('Authorization', `Bearer ${token}`);
 * }
 *
 * // Legacy SSO sign-in
 * await auth.signInAsAnalyst();
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
  private static readonly STORAGE_KEY = "excel-extension-auth-state";

  private readonly stateSubject = new BehaviorSubject<AuthState>({
    isAuthenticated: false,
    user: null,
    accessToken: null,
  });

  private readonly tokensSubject = new BehaviorSubject<TokenPair | null>(null);

  private tokenRefreshTimer?: Subscription;
  private stateSubscription?: Subscription;
  private tokensSubscription?: Subscription;

  /** Flag to prevent concurrent refresh operations */
  private refreshInProgress = false;

  /**
   * Observable stream of authentication state changes.
   * Subscribe to react to sign-in/sign-out events.
   */
  readonly state$ = this.stateSubject.asObservable();

  /**
   * Observable stream of JWT token changes.
   * Subscribe to react to token refresh events.
   */
  readonly tokens$ = this.tokensSubject.asObservable();

  /**
   * Current authentication state snapshot.
   */
  get state(): AuthState {
    return this.stateSubject.value;
  }

  /**
   * Current JWT tokens, or null if not authenticated via JWT.
   */
  get tokens(): TokenPair | null {
    return this.tokensSubject.value;
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
    private readonly jwtHelper: JwtHelperService
  ) {
    // Hydrate auth state from storage
    const defaultState: AuthState = {
      isAuthenticated: false,
      user: null,
      accessToken: null,
    };
    const storedState = this.storage.getItem<AuthState>(
      AuthService.STORAGE_KEY,
      defaultState
    );
    this.stateSubject.next(storedState);

    // Hydrate JWT tokens from storage
    const storedTokens = this.storage.getItem<TokenPair | null>(
      JWT_CONFIG.STORAGE_KEY,
      null
    );
    if (storedTokens && !this.jwtHelper.isTokenExpired(storedTokens.refresh)) {
      this.tokensSubject.next(storedTokens);
      this.startTokenRefreshTimer();
    } else if (storedTokens) {
      // Clear expired tokens
      this.storage.removeItem(JWT_CONFIG.STORAGE_KEY);
    }

    // Persist state changes to storage (store subscription for cleanup)
    this.stateSubscription = this.state$.subscribe((state) => {
      this.storage.setItem(AuthService.STORAGE_KEY, state);
    });

    // Persist token changes to storage (store subscription for cleanup)
    this.tokensSubscription = this.tokens$.subscribe((tokens) => {
      if (tokens) {
        this.storage.setItem(JWT_CONFIG.STORAGE_KEY, tokens);
      } else {
        this.storage.removeItem(JWT_CONFIG.STORAGE_KEY);
      }
    });
  }

  ngOnDestroy(): void {
    this.stopTokenRefreshTimer();
    this.stateSubscription?.unsubscribe();
    this.tokensSubscription?.unsubscribe();
  }

  // ────────────────────────────────────────────────────────────────────────────
  // JWT Authentication Methods
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Sign in with JWT token-based authentication.
   *
   * Generates mock JWT tokens and updates auth state. This method is
   * designed to be replaced with real backend authentication in production.
   *
   * @param email - User email address
   * @param _password - Password (ignored in mock implementation)
   * @param roles - User roles for authorization (default: ['analyst'])
   */
  async signInWithJwt(
    email: string,
    _password: string,
    roles: string[] = ["analyst"]
  ): Promise<void> {
    // Generate mock JWT tokens
    const tokens = this.jwtHelper.generateMockTokenPair(email, roles);

    // Decode payload for user info
    const payload = this.jwtHelper.decodeMockToken(tokens.access.token);
    if (!payload) {
      throw new Error("Failed to decode generated token");
    }

    // Create user profile from token payload
    const user: SsoUserProfile = {
      id: payload.sub,
      displayName: email.split("@")[0],
      email: payload.email,
      roles: payload.roles,
    };

    // Update tokens
    this.tokensSubject.next(tokens);

    // Update auth state
    this.stateSubject.next({
      isAuthenticated: true,
      user,
      accessToken: tokens.access.token,
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

    const currentTokens = this.tokensSubject.value;
    if (!currentTokens) {
      return false;
    }

    // Check if refresh token is expired
    if (this.jwtHelper.isTokenExpired(currentTokens.refresh)) {
      // Refresh token expired - sign out
      this.signOut();
      return false;
    }

    this.refreshInProgress = true;
    try {
      // Generate new tokens
      const newTokens = this.jwtHelper.refreshMockTokenPair(currentTokens.refresh);
      if (!newTokens) {
        // Refresh failed - sign out
        this.signOut();
        return false;
      }

      // Update tokens
      this.tokensSubject.next(newTokens);

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
   * Checks token expiration and triggers refresh if needed.
   *
   * @returns Access token string, or null if not authenticated
   */
  getAccessToken(): string | null {
    const tokens = this.tokensSubject.value;
    if (!tokens) {
      return null;
    }

    // Check if access token is expired
    if (this.jwtHelper.isTokenExpired(tokens.access)) {
      // Token expired - try to refresh
      // Note: This is synchronous check; async refresh happens via timer
      return null;
    }

    return tokens.access.token;
  }

  /**
   * Check if the current access token is expiring soon.
   *
   * @returns True if token will expire within the refresh threshold
   */
  isAccessTokenExpiringSoon(): boolean {
    const tokens = this.tokensSubject.value;
    if (!tokens) {
      return false;
    }
    return this.jwtHelper.isTokenExpiringSoon(tokens.access);
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
      // Use void to indicate fire-and-forget, but wrap in error handler
      void this.checkAndRefreshTokens();
    });
  }

  /**
   * Check token expiration and refresh if needed.
   * Separated from timer callback for proper async/await handling.
   */
  private async checkAndRefreshTokens(): Promise<void> {
    try {
      const tokens = this.tokensSubject.value;
      if (!tokens) {
        this.stopTokenRefreshTimer();
        return;
      }

      // Check if access token is expiring soon
      if (this.jwtHelper.isTokenExpiringSoon(tokens.access)) {
        await this.refreshAccessToken();
      }

      // Check if refresh token is expired (re-check after potential refresh)
      const currentTokens = this.tokensSubject.value;
      if (currentTokens && this.jwtHelper.isTokenExpired(currentTokens.refresh)) {
        this.signOut();
      }
    } catch {
      // Token refresh failed - sign out to prevent inconsistent state
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
   * Clears both JWT tokens and legacy auth state.
   */
  signOut(): void {
    // Stop refresh timer
    this.stopTokenRefreshTimer();

    // Clear JWT tokens
    this.tokensSubject.next(null);

    // Clear auth state
    this.stateSubject.next({
      isAuthenticated: false,
      user: null,
      accessToken: null,
    });
  }
}
