import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Component, OnInit } from "@angular/core";
import { ExcelService, AuthService, AppContextService, AppConfigService, AppHostStatus, AppAuthSummary } from ".";
import { IndexedDBService } from "@excel-platform/data/storage";
import { NavItemConfig, ViewId, TextCatalog } from "@excel-platform/shared/types";
import { SsoHomeComponent } from "../features/sso/sso-home.component";
import { WorksheetsComponent } from "../features/worksheets/worksheets.component";
import { TablesComponent } from "../features/tables/tables.component";
import { UserComponent } from "../features/user/user.component";
import { QueriesComponent } from "../features/queries/queries.component";
import { DebugContextComponent } from "../features/debug/debug-context.component";
import { SettingsComponent } from "../features/settings/settings.component";
import { ButtonComponent } from '@excel-platform/shared/ui';

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
    QueriesComponent,
    DebugContextComponent,
    SettingsComponent,
  ],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.css",
})
export class AppComponent implements OnInit {
  currentView: ViewId;
  readonly hostStatus: AppHostStatus;

  get appConfig() {
    return this.appConfigService.getConfig();
  }

  get text(): TextCatalog {
    // Fallback to empty structure if text not defined in config
    const emptyText: TextCatalog = {
      nav: {},
      auth: {},
      query: {},
      worksheet: {},
      table: {},
      user: {},
      hostStatus: {},
      userBanner: {},
      ui: {},
    };
    return this.appConfigService.getConfig().text || emptyText;
  }

  get authSummary(): AppAuthSummary {
    return this.appContext.getAuthSummary();
  }

  constructor(
    public excel: ExcelService,
    public auth: AuthService,
    private readonly appContext: AppContextService,
    private readonly appConfigService: AppConfigService,
    private readonly indexedDB: IndexedDBService
  ) {
    this.hostStatus = this.appContext.hostStatus;
    this.currentView = this.appConfigService.getConfig().defaultViewId;
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
    // labelKey format: "section.key" (e.g., "nav.ssoHome")
    const [section, key] = labelKey.split('.');
    if (section && key) {
      const sectionData = (this.text as any)[section];
      if (sectionData && typeof sectionData === 'object') {
        return sectionData[key] || labelKey;
      }
    }
    return labelKey;
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
