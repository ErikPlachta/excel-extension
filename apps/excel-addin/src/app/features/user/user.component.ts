import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { AuthService } from "@excel-platform/core/auth";
import { SectionComponent } from '@excel-platform/shared/ui';

@Component({
  selector: "app-user",
  standalone: true,
  imports: [CommonModule, SectionComponent],
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

  get isAdmin(): boolean {
    return this.auth.hasRole("admin");
  }

  get isAnalyst(): boolean {
    return this.auth.hasRole("analyst");
  }
}
