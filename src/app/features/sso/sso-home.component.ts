import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { AuthService } from "../../core";
import { truncateToken } from "../../shared/util";
import { SectionComponent } from "../../shared/ui/section.component";
import { CardComponent } from "../../shared/ui/card.component";

@Component({
  standalone: true,
  selector: "app-sso-home",
  imports: [CommonModule, SectionComponent, CardComponent],
  templateUrl: "./sso-home.component.html",
  styleUrls: ["./sso-home.component.css"],
})
export class SsoHomeComponent {
  constructor(private readonly auth: AuthService) {}

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
    const roles = this.auth.roles;
    if (!roles.length) return "No roles assigned (mock user).";
    if (roles.includes("admin")) {
      return "Admin role active: full query and settings access.";
    }
    if (roles.includes("analyst")) {
      return "Analyst role active: can run queries and view results.";
    }
    return `Roles: ${roles.join(", ")}`;
  }
}
