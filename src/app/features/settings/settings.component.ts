import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { ExcelService } from "../../core/excel.service";
import { SettingsService } from "../../core/settings.service";
import { TelemetryService } from "../../core";

@Component({
  selector: "app-settings",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./settings.component.html",
})
export class SettingsComponent {
  constructor(
    public readonly settings: SettingsService,
    private readonly excel: ExcelService,
    private readonly telemetry: TelemetryService
  ) {}

  onTelemetryWorkbookLoggingChange(checked: boolean): void {
    const current = this.settings.value.telemetry;
    this.settings.update({
      telemetry: {
        ...current,
        enableWorkbookLogging: checked,
      },
    });
    this.telemetry.logEvent(
      this.telemetry.createFeatureEvent({
        category: "settings",
        name: "telemetry.workbookLogging.toggled",
        severity: "info",
        context: { enabled: checked },
      })
    );
  }

  async resetManagedTables(): Promise<void> {
    if (!this.excel.isExcel) return;
    await this.excel.purgeExtensionManagedContent();
  }
}
