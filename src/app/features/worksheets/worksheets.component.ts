import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ExcelService } from "../../core";
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
  constructor(private excel: ExcelService) {}

  get isExcel(): boolean {
    return this.excel.isExcel;
  }

  async ngOnInit(): Promise<void> {
    this.sheets = await this.excel.getWorksheets();
  }
}
