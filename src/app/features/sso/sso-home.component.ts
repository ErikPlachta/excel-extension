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
  userName: string | null = null;
  userEmail: string | null = null;
  tokenSnippet: string | null = null;

  isSignedIn = false;

  constructor(private readonly auth: AuthService) {}

  async signIn(): Promise<void> {
    await this.auth.signIn();
    const state = this.auth.state;
    this.isSignedIn = state.isAuthenticated;
    this.userName = state.user?.displayName ?? null;
    this.userEmail = state.user?.email ?? null;
    this.tokenSnippet = truncateToken(state.accessToken);
  }

  signOut(): void {
    this.auth.signOut();
    this.isSignedIn = false;
    this.userName = null;
    this.userEmail = null;
    this.tokenSnippet = null;
  }
}
