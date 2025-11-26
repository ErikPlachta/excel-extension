import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { TelemetryService } from "../../core";
import { WorkbookService } from "../../core/workbook.service";
import { SectionComponent } from "../../shared/ui/section.component";
import { TableComponent } from "../../shared/ui/table.component";

@Component({
  selector: "app-tables",
  standalone: true,
  imports: [CommonModule, SectionComponent, TableComponent],
  templateUrl: "./tables.component.html",
  styleUrl: "./tables.component.css",
})
export class TablesComponent implements OnInit {
  tables: Record<string, unknown>[] = [];
  loadError: string | null = null;
  isLoading = true;

  constructor(
    private readonly workbook: WorkbookService,
    private readonly telemetry: TelemetryService
  ) {}

  get isExcel(): boolean {
    return this.workbook.isExcel;
  }

  async ngOnInit(): Promise<void> {
    if (!this.isExcel) {
      this.isLoading = false;
      return;
    }
    try {
      const tables = await this.workbook.getTables();
      const ownership = await this.workbook.getOwnership();
      const managedKeys = new Set(
        ownership.filter((o) => o.isManaged).map((o) => `${o.sheetName}::${o.tableName}`)
      );

      this.tables = tables.map((t) => ({
        name: t.name,
        worksheet: t.worksheet,
        rows: t.rows,
        isManaged: managedKeys.has(`${t.worksheet}::${t.name}`),
      }));
    } catch (error) {
      this.loadError = "Failed to load tables";
      this.telemetry.logEvent({
        category: "excel",
        name: "tables.load.error",
        severity: "error",
        message: "Failed to load tables in ngOnInit",
        context: { error: error instanceof Error ? error.message : String(error) },
      });
    } finally {
      this.isLoading = false;
    }
  }
}
