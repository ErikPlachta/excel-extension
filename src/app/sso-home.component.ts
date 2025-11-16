import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { getMockSsoResult } from "../helpers/sso-mock";

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

  async signIn(): Promise<void> {
    const result = await getMockSsoResult();
    this.isSignedIn = true;
    this.userName = result.user.displayName;
    this.userEmail = result.user.email;
    this.tokenSnippet = result.accessToken.slice(0, 10) + "…";
  }

  signOut(): void {
    this.isSignedIn = false;
    this.userName = null;
    this.userEmail = null;
    this.tokenSnippet = null;
  }
}
