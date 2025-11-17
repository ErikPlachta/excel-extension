import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { ExcelService, AuthService } from ".";
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
  currentView: "sso" | "worksheets" | "tables" | "user" | "queries" = "sso";
  isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

  constructor(
    public excel: ExcelService,
    public auth: AuthService
  ) {}

  showSso(): void {
    this.currentView = "sso";
  }

  showWorksheets(): void {
    this.currentView = "worksheets";
  }

  showTables(): void {
    this.currentView = "tables";
  }
  showUser(): void {
    this.currentView = "user";
  }
  showQueries(): void {
    this.currentView = "queries";
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
