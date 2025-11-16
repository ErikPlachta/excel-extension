import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { AuthService } from "../../core";

@Component({
  selector: "app-user",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./user.component.html",
  styleUrl: "./user.component.css",
})
export class UserComponent {
  constructor(public auth: AuthService) {}

  get user() {
    return this.auth.user;
  }

  get roles(): string[] {
    return this.auth.roles;
  }

  get isAuthenticated(): boolean {
    return this.auth.isAuthenticated;
  }
}
