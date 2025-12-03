import { CommonModule } from '@angular/common';
import { Component, isDevMode } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '@excel-platform/core/auth';
import { DEMO_AUTH_USERS } from '@excel-platform/data/api';
import { AuthUserConfig } from '@excel-platform/shared/types';
import { truncateToken } from '@excel-platform/shared/util';
import { SectionComponent, CardComponent } from '@excel-platform/shared/ui';

/**
 * SSO Home Component - Authentication view with JWT sign-in.
 *
 * Provides:
 * - JWT-based sign-in with email/password form
 * - Quick sign-in buttons (only in dev mode, data-driven from DEMO_AUTH_USERS)
 * - Token information display (expiry, refresh status)
 * - Sign-out functionality
 *
 * **Data-Driven Design:**
 * - Quick sign-in buttons use the same signInWithJwt() flow as manual sign-in
 * - Button data comes from DEMO_AUTH_USERS in app-config.demo.ts
 * - Buttons only render when isDevMode() returns true
 * - No special demo code paths - just pre-populated form values
 * - Uses shared AuthUserConfig type for auth configuration
 *
 * @see app-config.demo.ts for DEMO_AUTH_USERS definition
 * @see AuthUserConfig for the shared auth configuration type
 */
@Component({
  standalone: true,
  selector: 'app-sso-home',
  imports: [CommonModule, FormsModule, SectionComponent, CardComponent],
  templateUrl: './sso-home.component.html',
  styleUrls: ['./sso-home.component.css'],
})
export class SsoHomeComponent {
  /** Email input for JWT sign-in */
  email = '';

  /** Password input for JWT sign-in (mock, not validated) */
  password = '';

  /** Selected role for JWT sign-in */
  selectedRole: 'analyst' | 'admin' = 'analyst';

  /** Error message from sign-in attempt */
  signInError = '';

  /** Loading state during sign-in */
  isLoading = false;

  /** Quick sign-in configurations - only populated in dev mode */
  readonly quickSignInUsers: AuthUserConfig[] = isDevMode() ? DEMO_AUTH_USERS : [];

  /** Whether dev mode is active (shows quick sign-in buttons) */
  readonly isDevModeActive = isDevMode();

  constructor(private readonly auth: AuthService) {}

  /**
   * Sign in using JWT authentication (mock).
   *
   * Uses email and selected role to generate mock JWT tokens.
   * Password is accepted but not validated (mock implementation).
   */
  async signInWithJwt(): Promise<void> {
    if (!this.email) {
      this.signInError = "Email is required";
      return;
    }

    this.isLoading = true;
    this.signInError = "";

    try {
      await this.auth.signInWithJwt(this.email, this.password, [
        this.selectedRole,
      ]);
      // Clear form on success
      this.email = "";
      this.password = "";
    } catch (error) {
      this.signInError =
        error instanceof Error ? error.message : "Sign-in failed";
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Sign in using pre-configured credentials.
   *
   * Uses the same signInWithJwt() flow as manual form sign-in,
   * just with pre-populated values from the auth configuration.
   *
   * @param user - Auth configuration with email and role
   */
  async signInAs(user: AuthUserConfig): Promise<void> {
    this.isLoading = true;
    this.signInError = '';

    try {
      await this.auth.signInWithJwt(user.email, '', [user.role]);
    } catch (error) {
      this.signInError =
        error instanceof Error ? error.message : 'Sign-in failed';
    } finally {
      this.isLoading = false;
    }
  }

  /** Sign out current user */
  signOut(): void {
    this.auth.signOut();
  }

  get isSignedIn(): boolean {
    return this.auth.isAuthenticated;
  }

  get userName(): string | null {
    return this.auth.user?.displayName ?? null;
  }

  get userEmail(): string | null {
    return this.auth.user?.email ?? null;
  }

  get tokenSnippet(): string | null {
    return truncateToken(this.auth.state.accessToken);
  }

  get roleSummary(): string {
    const roles = this.auth.roles ?? [];
    if (!roles.length) return "No roles assigned (mock user).";
    if (roles.includes("admin")) {
      return "Admin role active: full query and settings access.";
    }
    if (roles.includes("analyst")) {
      return "Analyst role active: can run queries and view results.";
    }
    return `Roles: ${roles.join(", ")}`;
  }

  /**
   * Check if access token is expiring soon (within 5 minutes).
   */
  get isTokenExpiringSoon(): boolean {
    return this.auth.isAccessTokenExpiringSoon();
  }

  /**
   * Get formatted token expiry time.
   */
  get tokenExpiryDisplay(): string | null {
    const token = this.auth.getAccessToken();
    if (!token) return null;

    // Decode token to get expiry (simple mock decode)
    try {
      const parts = token.split(".");
      if (parts.length !== 3) return null;
      const payload = JSON.parse(atob(parts[1]));
      const expiresAt = new Date(payload.exp * 1000);
      const now = new Date();
      const diffMs = expiresAt.getTime() - now.getTime();

      if (diffMs <= 0) return "Expired";

      const minutes = Math.floor(diffMs / 60000);
      const seconds = Math.floor((diffMs % 60000) / 1000);

      if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
      }
      return `${seconds}s`;
    } catch {
      return null;
    }
  }
}
