import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { AuthService } from "../../core";
import { truncateToken } from '@excel-platform/shared/util';
import { SectionComponent, CardComponent } from '@excel-platform/shared/ui';

/**
 * SSO Home Component - Authentication view with JWT sign-in.
 *
 * Provides:
 * - JWT-based sign-in with email/password form
 * - Legacy mock SSO sign-in (for testing)
 * - Token information display (expiry, refresh status)
 * - Sign-out functionality
 *
 * **Phase 7 Enhancement:**
 * - JWT authentication flow with mock token generation
 * - Token expiry countdown and refresh timer display
 * - Role selection during sign-in
 */
@Component({
  standalone: true,
  selector: "app-sso-home",
  imports: [CommonModule, FormsModule, SectionComponent, CardComponent],
  templateUrl: "./sso-home.component.html",
  styleUrls: ["./sso-home.component.css"],
})
export class SsoHomeComponent {
  /** Email input for JWT sign-in */
  email = "";

  /** Password input for JWT sign-in (mock, not validated) */
  password = "";

  /** Selected role for JWT sign-in */
  selectedRole: "analyst" | "admin" = "analyst";

  /** Error message from sign-in attempt */
  signInError = "";

  /** Loading state during sign-in */
  isLoading = false;

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
   * Legacy mock SSO sign-in for backward compatibility.
   */
  async signIn(): Promise<void> {
    await this.auth.signIn();
  }

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
