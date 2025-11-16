import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ExcelService } from "../../core";

interface TableInfo {
  name: string;
  worksheet: string;
  rows: number;
}

@Component({
  selector: "app-tables",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./tables.component.html",
  styleUrl: "./tables.component.css",
})
export class TablesComponent implements OnInit {
  tables: TableInfo[] = [];
  constructor(private excel: ExcelService) {}

  get isExcel() {
    return this.excel.isExcel;
  }

  async ngOnInit() {
    this.tables = await this.excel.getTables();
  }
}
