import { CommonModule } from "@angular/common";
import { Component, Input } from "@angular/core";
import { UiBannerType } from "../../types";

@Component({
  selector: "app-status-banner",
  standalone: true,
  imports: [CommonModule],
  template: `
    <section *ngIf="message" [ngClass]="bannerClass">
      <strong *ngIf="title" class="banner-title">{{ title }}</strong>
      <span class="banner-message">{{ message }}</span>
    </section>
  `,
})
export class StatusBannerComponent {
  @Input() type: UiBannerType = "info";
  @Input() title = "";
  @Input() message = "";

  get bannerClass(): string {
    return `banner banner-${this.type}`;
  }
}
