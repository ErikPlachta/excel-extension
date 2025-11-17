import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { ExcelService } from "./excel.service";
import { SsoHomeComponent } from "./sso-home.component";
import { WorksheetsComponent } from "./worksheets.component";
import { TablesComponent } from "./tables.component";
import { ButtonComponent } from "./shared/ui/button.component";
import { StatusBannerComponent } from "./shared/ui/status-banner.component";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [
    CommonModule,
    SsoHomeComponent,
    WorksheetsComponent,
    TablesComponent,
    ButtonComponent,
    StatusBannerComponent,
  ],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.css",
})
export class AppComponent {
  currentView: "sso" | "worksheets" | "tables" = "sso";

  constructor(public excel: ExcelService) {}

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
