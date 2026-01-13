import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";

/**
 * Data structure for list items.
 */
export interface UiListItem {
  /** Unique identifier for the item. */
  id: string;
  /** Primary display text. */
  label: string;
  /** Optional secondary description text. */
  description?: string;
  /** Optional badge label shown alongside the item. */
  badge?: string;
}

/**
 * List component for displaying selectable items.
 *
 * Renders a list of items with optional descriptions and badges,
 * emitting selection events when items are clicked.
 */
@Component({
  selector: "app-list",
  standalone: true,
  imports: [CommonModule],
  template: `
    <ul *ngIf="items.length; else empty">
      <li *ngFor="let item of items" (click)="select(item)" class="list-item">
        <div class="list-main">
          <strong>{{ item.label }}</strong>
          <span *ngIf="item.badge" class="list-badge">{{ item.badge }}</span>
        </div>
        <div *ngIf="item.description" class="list-description">
          {{ item.description }}
        </div>
      </li>
    </ul>
    <ng-template #empty>
      <p>{{ emptyMessage }}</p>
    </ng-template>
  `,
})
export class ListComponent {
  @Input() items: UiListItem[] = [];
  @Input() emptyMessage = "";
  @Output() itemSelected = new EventEmitter<UiListItem>();

  select(item: UiListItem): void {
    this.itemSelected.emit(item);
  }
}
