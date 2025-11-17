import { Component, Input } from "@angular/core";

@Component({
  selector: "app-status-banner",
  standalone: true,
  template: `<section *ngIf="message">{{ message }}</section>`,
})
export class StatusBannerComponent {
  @Input() message = "";
}
