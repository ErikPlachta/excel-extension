import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ExcelService } from "../../core";
import { SectionComponent } from "../../shared/ui/section.component";
import { TableComponent } from "../../shared/ui/table.component";

interface TableInfo {
  name: string;
  worksheet: string;
  rows: number;
}

@Component({
  selector: "app-tables",
  standalone: true,
  imports: [CommonModule, SectionComponent, TableComponent],
  templateUrl: "./tables.component.html",
  styleUrl: "./tables.component.css",
})
export class TablesComponent implements OnInit {
  tables: TableInfo[] = [];
  constructor(private excel: ExcelService) {}

  get isExcel(): boolean {
    return this.excel.isExcel;
  }

  async ngOnInit(): Promise<void> {
    this.tables = await this.excel.getTables();
  }
}
