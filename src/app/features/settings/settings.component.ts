import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { ExcelService } from "../../core/excel.service";
import { SettingsService } from "../../core/settings.service";
import { TelemetryService } from "../../core";
import { BackupRestoreService } from "../../shared/backup-restore.service";

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
    private readonly telemetry: TelemetryService,
    private readonly backupRestore: BackupRestoreService
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

  onTelemetryConsoleLoggingChange(checked: boolean): void {
    const current = this.settings.value.telemetry;
    this.settings.update({
      telemetry: {
        ...current,
        enableConsoleLogging: checked,
      },
    });
    this.telemetry.logEvent(
      this.telemetry.createFeatureEvent({
        category: "settings",
        name: "telemetry.consoleLogging.toggled",
        severity: "info",
        context: { enabled: checked },
      })
    );
  }

  async resetManagedTables(): Promise<void> {
    if (!this.excel.isExcel) return;
    await this.excel.purgeExtensionManagedContent();
  }

  exportBackup(): void {
    this.backupRestore.exportBackup();
    this.telemetry.logEvent(
      this.telemetry.createFeatureEvent({
        category: "settings",
        name: "backup.exported",
        severity: "info",
        context: {},
      })
    );
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    try {
      await this.backupRestore.importBackup(file);
      this.telemetry.logEvent(
        this.telemetry.createFeatureEvent({
          category: "settings",
          name: "backup.imported",
          severity: "info",
          context: { fileName: file.name },
        })
      );
    } catch (error) {
      this.telemetry.logEvent(
        this.telemetry.createFeatureEvent({
          category: "settings",
          name: "backup.import.failed",
          severity: "error",
          context: { error: error instanceof Error ? error.message : String(error) },
        })
      );
    }
    // Reset input to allow same file to be selected again
    input.value = '';
  }
}
