import { CommonModule } from "@angular/common";
import { Component, Input } from "@angular/core";

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
  @Input() title = "";
  @Input() subtitle = "";
  @Input() variant: "default" | "dense" = "default";

  get sectionClass(): string {
    return this.variant === "dense" ? "section section-dense" : "section";
  }
}
