import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, Input } from "@angular/core";

/**
 * Progress indicator component showing completion status.
 *
 * Displays a progress bar with count label (completed/total) and
 * optional current item identifier for batch operation tracking.
 */
@Component({
  selector: "app-progress-indicator",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="total > 0" class="app-progress-indicator">
      <div class="app-progress-indicator__label">
        {{ completed }} / {{ total }}
        <ng-container *ngIf="currentItemId"> (current: {{ currentItemId }})</ng-container>
      </div>
      <div class="app-progress-indicator__bar">
        <div class="app-progress-indicator__bar-fill" [style.width.%]="percent"></div>
      </div>
    </div>
  `,
  styles: [
    `
      .app-progress-indicator {
        display: flex;
        flex-direction: column;
        gap: 4px;
        font-size: 12px;
      }

      .app-progress-indicator__label {
        color: #374151;
      }

      .app-progress-indicator__bar {
        position: relative;
        width: 100%;
        height: 4px;
        border-radius: 9999px;
        background-color: #e5e7eb;
        overflow: hidden;
      }

      .app-progress-indicator__bar-fill {
        height: 100%;
        background-color: #3b82f6;
        transition: width 120ms ease-out;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgressIndicatorComponent {
  @Input() total = 0;
  @Input() completed = 0;
  @Input() currentItemId: string | null = null;

  get percent(): number {
    if (!this.total) {
      return 0;
    }
    const value = (this.completed / this.total) * 100;
    return value > 100 ? 100 : value;
  }
}
