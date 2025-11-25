import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Component, OnInit } from "@angular/core";
import { ExcelService, AuthService, AppContextService, AppHostStatus, AppAuthSummary } from ".";
import { IndexedDBService } from "../shared/indexeddb.service";
import { DEFAULT_APP_CONFIG, NavItemConfig, ViewId } from "../shared/app-config";
import { APP_TEXT } from "../shared/app-text";
import { SsoHomeComponent } from "../features/sso/sso-home.component";
import { WorksheetsComponent } from "../features/worksheets/worksheets.component";
import { TablesComponent } from "../features/tables/tables.component";
import { UserComponent } from "../features/user/user.component";
import { QueryHomeOldComponent } from "../features/queries-old/query-home-old.component";
import { QueriesComponent } from "../features/queries/queries.component";
import { DebugContextComponent } from "../features/debug/debug-context.component";
import { SettingsComponent } from "../features/settings/settings.component";
import { ButtonComponent } from "../shared/ui/button.component";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonComponent,
    SsoHomeComponent,
    WorksheetsComponent,
    TablesComponent,
    UserComponent,
    QueryHomeOldComponent,
    QueriesComponent,
    DebugContextComponent,
    SettingsComponent,
  ],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.css",
})
export class AppComponent implements OnInit {
  currentView: ViewId = DEFAULT_APP_CONFIG.defaultViewId;
  readonly appConfig = DEFAULT_APP_CONFIG;
  readonly text = APP_TEXT;
  readonly hostStatus: AppHostStatus;

  get authSummary(): AppAuthSummary {
    return this.appContext.getAuthSummary();
  }

  constructor(
    public excel: ExcelService,
    public auth: AuthService,
    private readonly appContext: AppContextService,
    private readonly indexedDB: IndexedDBService
  ) {
    this.hostStatus = this.appContext.hostStatus;
  }

  async ngOnInit(): Promise<void> {
    // Clean up expired cache entries on app initialization
    await this.indexedDB.clearExpiredCache();
  }

  selectView(viewId: ViewId): void {
    this.currentView = viewId;
  }

  handleNavClick(item: NavItemConfig): void {
    switch (item.actionType) {
      case "select-view": {
        if (item.viewId) {
          this.selectView(item.viewId);
        }
        break;
      }
      case "sign-in-analyst": {
        void this.signInAnalyst();
        break;
      }
      case "sign-in-admin": {
        void this.signInAdmin();
        break;
      }
      case "sign-out": {
        this.signOut();
        break;
      }
    }
  }

  isNavVisible(item: NavItemConfig): boolean {
    if (!this.auth.isAuthenticated) {
      if (item.actionType === "sign-out") {
        return false;
      }
    } else {
      if (item.actionType === "sign-in-analyst" || item.actionType === "sign-in-admin") {
        return false;
      }
    }
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
      case "nav.queriesOld":
        return this.text.nav.queriesOld;
      case "nav.settings":
        return this.text.nav.settings;
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
