import { CommonModule } from "@angular/common";
import { Component, Input } from "@angular/core";

/**
 * Generic, config-driven table primitive.
 *
 * Columns are described by `field`/`header` pairs and rows are
 * provided as an array of records. The component simply renders
 * `row[col.field]` for each cell, making it suitable for simple
 * data tables driven by configuration.
 */
@Component({
  selector: "app-table",
  standalone: true,
  imports: [CommonModule],
  template: `
    <table *ngIf="rows?.length; else empty">
      <thead>
        <tr>
          <th *ngFor="let col of columns">{{ col.header }}</th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let row of rows">
          <td *ngFor="let col of columns">{{ row[col.field] }}</td>
        </tr>
      </tbody>
    </table>
    <ng-template #empty>
      <p>{{ emptyMessage }}</p>
    </ng-template>
  `,
})
export class TableComponent<T = Record<string, unknown>> {
  /** Column metadata describing which fields to render and their headers. */
  @Input() columns: { field: keyof T & string; header: string }[] = [];
  /** Row data; each row is a record indexed by the configured fields. */
  @Input() rows: T[] = [];
  /** Message to display when `rows` is empty or undefined. */
  @Input() emptyMessage = "";
}
