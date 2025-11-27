import { CommonModule } from "@angular/common";
import { Component, Input } from "@angular/core";
import { UiBannerType } from "../../types";

/**
 * Simple status/host banner used to surface Excel/online state
 * and other high-level messages.
 *
 * The `type` input controls the visual treatment, while `title`
 * and `message` carry the rendered text (typically from `AppConfig.text`).
 */
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
  /** Semantic banner type (info, warning, or error). */
  @Input() type: UiBannerType = "info";
  /** Optional bolded title displayed before the message. */
  @Input() title = "";
  /** Main message text; when empty, the banner is not rendered. */
  @Input() message = "";

  get bannerClass(): string {
    return `banner banner-${this.type}`;
  }
}
