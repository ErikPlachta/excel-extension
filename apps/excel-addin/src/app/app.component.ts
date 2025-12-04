import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Component, OnInit } from "@angular/core";
import { ExcelService } from "@excel-platform/core/excel";
import { AuthService } from "@excel-platform/core/auth";
import { AppContextService, AppHostStatus, AppAuthSummary } from "@excel-platform/core/telemetry";
import { AppConfigService } from "@excel-platform/data/api";
import { IndexedDBService } from "@excel-platform/data/storage";
import { NavItemConfig, ViewId, TextCatalog, getTextSection } from "@excel-platform/shared/types";
import { SsoHomeComponent } from "./features/sso/sso-home.component";
import { WorksheetsComponent } from "./features/worksheets/worksheets.component";
import { TablesComponent } from "./features/tables/tables.component";
import { UserComponent } from "./features/user/user.component";
import { QueriesComponent } from "./features/queries/queries.component";
import { DebugContextComponent } from "./features/debug/debug-context.component";
import { SettingsComponent } from "./features/settings/settings.component";
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

  /**
   * Handle navigation item click.
   *
   * Routes action based on NavItemConfig.actionType.
   * Sign-in actions have been moved to SsoHomeComponent.
   *
   * @param item - Navigation item that was clicked
   */
  handleNavClick(item: NavItemConfig): void {
    switch (item.actionType) {
      case 'select-view': {
        if (item.viewId) {
          this.selectView(item.viewId);
        }
        break;
      }
      case 'sign-out': {
        this.signOut();
        break;
      }
    }
  }

  /**
   * Determine if a navigation item should be visible.
   *
   * Visibility rules:
   * - sign-out: Only when authenticated
   * - requiresAuth items: Only when authenticated
   * - requiredRoles items: Only when user has any of the required roles
   *
   * @param item - Navigation item to check
   * @returns True if item should be visible
   */
  isNavVisible(item: NavItemConfig): boolean {
    // Sign-out only visible when authenticated
    if (item.actionType === 'sign-out' && !this.auth.isAuthenticated) {
      return false;
    }
    // Auth-required items only visible when authenticated
    if (item.requiresAuth && !this.auth.isAuthenticated) {
      return false;
    }
    // Role-restricted items only visible when user has required role
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
      const sectionData = getTextSection(this.text, section);
      if (sectionData) {
        return sectionData[key] ?? labelKey;
      }
    }
    return labelKey;
  }

  /**
   * Sign out and return to SSO view.
   */
  signOut(): void {
    this.auth.signOut();
    this.currentView = 'sso';
  }

  /** Application title */
  title = 'excel-extension';
}
