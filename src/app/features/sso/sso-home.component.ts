import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { AuthService } from "../../core";
import { truncateToken } from "../../shared/util";

@Component({
  standalone: true,
  selector: "app-sso-home",
  imports: [CommonModule],
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
}
