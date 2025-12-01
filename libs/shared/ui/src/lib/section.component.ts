import { CommonModule } from "@angular/common";
import { Component, Input } from "@angular/core";

/**
 * Layout primitive that groups content under an optional title
 * and subtitle, with support for density variants.
 *
 * The `variant` input is typically driven from `AppConfig.ui.viewLayout`
 * so that spacing can be tuned per view without touching feature code.
 */
@Component({
  selector: "app-section",
  standalone: true,
  imports: [CommonModule],
  template: `
    <section [class]="sectionClass">
      <header *ngIf="title" class="section-header">
        <h2>{{ title }}</h2>
        <p *ngIf="subtitle" class="section-subtitle">{{ subtitle }}</p>
      </header>
      <div class="section-body">
        <ng-content></ng-content>
      </div>
    </section>
  `,
})
export class SectionComponent {
  /** Optional section title rendered as an `<h2>`. */
  @Input() title = "";
  /** Optional subtitle rendered under the title for additional context. */
  @Input() subtitle = "";
  /** Density/spacing variant; `dense` tightens padding and margins. */
  @Input() variant: "default" | "dense" = "default";

  get sectionClass(): string {
    return this.variant === "dense" ? "section section-dense" : "section";
  }
}
