import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import { FormsModule } from "@angular/forms";

export interface UiDropdownItem {
  value: string;
  label: string;
}

@Component({
  selector: "app-dropdown",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <label class="dropdown">
      <span *ngIf="label" class="dropdown-label">{{ label }}</span>
      <select [ngModel]="value" (ngModelChange)="onChange($event.target?.value ?? '')">
        <option value="" disabled selected *ngIf="placeholder">{{ placeholder }}</option>
        <option *ngFor="let item of items" [value]="item.value">{{ item.label }}</option>
      </select>
    </label>
  `,
})
export class DropdownComponent {
  @Input() items: UiDropdownItem[] = [];
  @Input() value: string | null = null;
  @Input() placeholder = "";
  @Input() label = "";
  @Output() valueChange = new EventEmitter<string>();

  onChange(newValue: string): void {
    this.value = newValue;
    this.valueChange.emit(newValue);
  }
}
