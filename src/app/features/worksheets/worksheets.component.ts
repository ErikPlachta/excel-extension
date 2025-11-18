import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ExcelService } from "../../core";
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
  constructor(
    private readonly excel: ExcelService,
    private readonly workbook: WorkbookService
  ) {}

  get isExcel(): boolean {
    return this.workbook.isExcel;
  }

  async ngOnInit(): Promise<void> {
    this.sheets = await this.workbook.getSheets();
    this.sheetsAsRows = this.sheets.map((name) => ({ name }));
  }
}
