import { CommonModule } from "@angular/common";
import { Component, Input } from "@angular/core";

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
  @Input() title = "";
  @Input() subtitle = "";
  @Input() variant: "default" | "emphasis" = "default";
}
