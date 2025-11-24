import { CommonModule } from "@angular/common";
import { Component, Input } from "@angular/core";

/**
 * Flexible card primitive for presenting compact summaries such as
 * queries, users, or worksheet metadata.
 *
 * Consumers pass a `title`/`subtitle` and a `variant` that controls
 * emphasis; the card then applies appropriate classes around
 * projected content.
 */
@Component({
  selector: "app-card",
  standalone: true,
  imports: [CommonModule],
  template: `
    <article class="card" [class.card-emphasis]="variant === 'emphasis'">
      <header *ngIf="title" class="card-header">
        <h3>{{ title }}</h3>
        <p *ngIf="subtitle" class="card-subtitle">{{ subtitle }}</p>
      </header>
      <div class="card-body">
        <ng-content></ng-content>
      </div>
    </article>
  `,
})
export class CardComponent {
  /** Primary title rendered in the card header. */
  @Input() title = "";
  /** Optional subtitle providing secondary context. */
  @Input() subtitle = "";
  /** Visual emphasis variant; `emphasis` highlights the card. */
  @Input() variant: "default" | "emphasis" = "default";
}
