import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { ExcelService } from "../../core/excel.service";
import { SettingsService } from "../../core/settings.service";

@Component({
  selector: "app-settings",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./settings.component.html",
})
export class SettingsComponent {
  constructor(
    public readonly settings: SettingsService,
    private readonly excel: ExcelService
  ) {}

  onTelemetryWorkbookLoggingChange(checked: boolean): void {
    this.settings.update({ telemetry: { enableWorkbookLogging: checked } });
  }

  async resetManagedTables(): Promise<void> {
    if (!this.excel.isExcel) return;
    await this.excel.purgeExtensionManagedContent();
  }
}
