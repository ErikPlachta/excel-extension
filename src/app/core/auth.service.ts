import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { getSsoAuthResult, SsoUserProfile } from "../../helpers/sso-helper";
import { AuthState } from "../types";
import { StorageHelperService } from "../shared/storage-helper.service";

/**
 * Authentication Service - Manages user authentication state and SSO integration.
 *
 * Provides centralized authentication state management with:
 * - Mock SSO sign-in flows (analyst/admin roles)
 * - Role-based access control (RBAC) checks
 * - Persistent auth state via StorageHelperService
 * - Observable state stream for reactive updates
 *
 * **State Persistence:**
 * - Auth state stored in localStorage via StorageHelperService
 * - Automatically hydrates on app init
 * - Automatically persists on state changes
 *
 * **Usage:**
 * ```typescript
 * // Sign in as analyst
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
export class AuthService {
  private static readonly STORAGE_KEY = "excel-extension-auth-state";

  private readonly stateSubject = new BehaviorSubject<AuthState>({
    isAuthenticated: false,
    user: null,
    accessToken: null,
  });

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

  constructor(private readonly storage: StorageHelperService) {
    // Hydrate auth state from storage
    const defaultState: AuthState = {
      isAuthenticated: false,
      user: null,
      accessToken: null,
    };
    const storedState = this.storage.getItem<AuthState>(AuthService.STORAGE_KEY, defaultState);
    this.stateSubject.next(storedState);

    // Persist state changes to storage
    this.state$.subscribe((state) => {
      this.storage.setItem(AuthService.STORAGE_KEY, state);
    });
  }

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

  async signIn(): Promise<void> {
    const result = await getSsoAuthResult();
    this.stateSubject.next({
      isAuthenticated: true,
      user: result.user,
      accessToken: result.accessToken,
    });
  }

  signOut(): void {
    this.stateSubject.next({
      isAuthenticated: false,
      user: null,
      accessToken: null,
    });
  }
}
