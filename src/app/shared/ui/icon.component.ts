import { CommonModule } from "@angular/common";
import { Component, Input } from "@angular/core";

export type UiIconName = "play" | "table" | "user" | "warning";

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
