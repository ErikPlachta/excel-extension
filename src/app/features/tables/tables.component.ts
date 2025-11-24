import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
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

  constructor(private readonly workbook: WorkbookService) {}

  get isExcel(): boolean {
    return this.workbook.isExcel;
  }

  async ngOnInit(): Promise<void> {
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
  }
}
