import { CommonModule } from "@angular/common";
import { Component, Input } from "@angular/core";

/**
 * Available icon names for the IconComponent.
 */
export type UiIconName = "play" | "table" | "user" | "warning";

/**
 * Icon component rendering semantic icons via CSS classes.
 *
 * Maps icon names to CSS class names for consistent iconography.
 */
@Component({
  selector: "app-icon",
  standalone: true,
  imports: [CommonModule],
  template: ` <span class="icon" [ngClass]="iconClass" aria-hidden="true"></span> `,
})
export class IconComponent {
  @Input() name: UiIconName = "play";

  get iconClass(): string {
    switch (this.name) {
      case "play":
        return "icon-play";
      case "table":
        return "icon-table";
      case "user":
        return "icon-user";
      case "warning":
        return "icon-warning";
      default:
        return "";
    }
  }
}
