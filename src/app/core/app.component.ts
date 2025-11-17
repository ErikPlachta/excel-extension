import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { ExcelService, AuthService } from ".";
import { DEFAULT_APP_CONFIG, NavItemConfig, ViewId } from "../shared/app-config";
import { APP_TEXT } from "../shared/app-text";
import { SsoHomeComponent } from "../features/sso/sso-home.component";
import { WorksheetsComponent } from "../features/worksheets/worksheets.component";
import { TablesComponent } from "../features/tables/tables.component";
import { UserComponent } from "../features/user/user.component";
import { QueryHomeComponent } from "../features/queries/query-home.component";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [
    CommonModule,
    SsoHomeComponent,
    WorksheetsComponent,
    TablesComponent,
    UserComponent,
    QueryHomeComponent,
  ],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.css",
})
export class AppComponent {
  currentView: ViewId = DEFAULT_APP_CONFIG.defaultViewId;
  readonly appConfig = DEFAULT_APP_CONFIG;
  readonly text = APP_TEXT;
  isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

  constructor(
    public excel: ExcelService,
    public auth: AuthService
  ) {}

  selectView(viewId: ViewId): void {
    this.currentView = viewId;
  }

  isNavVisible(item: NavItemConfig): boolean {
    if (item.requiresAuth && !this.auth.isAuthenticated) {
      return false;
    }
    if (item.requiredRoles && item.requiredRoles.length > 0) {
      return this.auth.hasAnyRole(item.requiredRoles);
    }
    return true;
  }

  canAccessNav(item: NavItemConfig): boolean {
    // For now, visibility and access use the same rules; this will allow
    // future differentiation (e.g., visible but disabled states) if needed.
    return this.isNavVisible(item);
  }

  getNavLabel(labelKey: string): string {
    switch (labelKey) {
      case "nav.ssoHome":
        return this.text.nav.ssoHome;
      case "nav.worksheets":
        return this.text.nav.worksheets;
      case "nav.tables":
        return this.text.nav.tables;
      case "nav.user":
        return this.text.nav.user;
      case "nav.queries":
        return this.text.nav.queries;
      default:
        return labelKey;
    }
  }

  async signInAnalyst(): Promise<void> {
    await this.auth.signInAsAnalyst();
    this.currentView = "sso";
  }

  async signInAdmin(): Promise<void> {
    await this.auth.signInAsAdmin();
    this.currentView = "sso";
  }

  async signIn(): Promise<void> {
    await this.auth.signIn();
    this.currentView = "sso";
  }

  signOut(): void {
    this.auth.signOut();
    this.currentView = "sso";
  }
  title = "excel-extension";
}
