import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ExcelService } from "./excel.service";

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

  get isExcel() {
    return this.excel.isExcel;
  }

  async ngOnInit() {
    this.sheets = await this.excel.getWorksheets();
  }
}
