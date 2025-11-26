import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ExcelService, TelemetryService } from "../../core";
import { WorkbookService } from "../../core/workbook.service";
import { SectionComponent } from "../../shared/ui/section.component";
import { TableComponent } from "../../shared/ui/table.component";

@Component({
  selector: "app-worksheets",
  standalone: true,
  imports: [CommonModule, SectionComponent, TableComponent],
  templateUrl: "./worksheets.component.html",
  styleUrl: "./worksheets.component.css",
})
export class WorksheetsComponent implements OnInit {
  sheets: string[] = [];
  sheetsAsRows: { name: string }[] = [];
  loadError: string | null = null;

  constructor(
    private readonly excel: ExcelService,
    private readonly workbook: WorkbookService,
    private readonly telemetry: TelemetryService
  ) {}

  get isExcel(): boolean {
    return this.workbook.isExcel;
  }

  async ngOnInit(): Promise<void> {
    try {
      this.sheets = await this.workbook.getSheets();
      this.sheetsAsRows = this.sheets.map((name) => ({ name }));
    } catch (error) {
      this.loadError = "Failed to load worksheets";
      this.telemetry.logEvent({
        category: "excel",
        name: "worksheets.load.error",
        severity: "error",
        message: "Failed to load worksheets in ngOnInit",
        context: { error: error instanceof Error ? error.message : String(error) },
      });
    }
  }
}
