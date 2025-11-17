import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ExcelService } from "../../core";

@Component({
  selector: "app-worksheets",
  standalone: true,
  imports: [CommonModule],
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
