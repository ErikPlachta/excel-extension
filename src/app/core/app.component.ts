import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { ExcelService, AuthService } from ".";
import { SsoHomeComponent } from "../features/sso/sso-home.component";
import { WorksheetsComponent } from "../features/worksheets/worksheets.component";
import { TablesComponent } from "../features/tables/tables.component";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [CommonModule, SsoHomeComponent, WorksheetsComponent, TablesComponent],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.css",
})
export class AppComponent {
  currentView: "sso" | "worksheets" | "tables" = "sso";

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
  title = "excel-extension";
}
