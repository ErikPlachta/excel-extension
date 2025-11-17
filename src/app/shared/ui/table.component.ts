import { CommonModule } from "@angular/common";
import { Component, Input } from "@angular/core";

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
export class TableComponent<T extends Record<string, unknown>> {
  @Input() columns: { field: keyof T & string; header: string }[] = [];
  @Input() rows: T[] = [];
  @Input() emptyMessage = "";
}
