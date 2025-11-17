import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import { UiButtonSize, UiButtonVariant } from "../../types";

/**
 * Reusable button primitive used throughout the shell and features.
 *
 * Consumers provide a text `label` and optional `variant`/`size`
 * hints that map to CSS/Tailwind classes inside the component,
 * keeping feature code config-driven and style-agnostic.
 */
@Component({
  selector: "app-button",
  standalone: true,
  imports: [CommonModule],
  template: `
    <button type="button" [ngClass]="buttonClass" [disabled]="disabled" (click)="handleClick()">
      <span *ngIf="iconName" class="btn-icon" aria-hidden="true"></span>
      <span>{{ label }}</span>
    </button>
  `,
})
export class ButtonComponent {
  /** Text label rendered inside the button. */
  @Input() label = "";
  /** Visual variant controlling color and emphasis. */
  @Input() variant: UiButtonVariant = "primary";
  /** Size affecting padding and font-size. */
  @Input() size: UiButtonSize = "md";
  /** When true, disables the button and suppresses click events. */
  @Input() disabled = false;
  /** Optional icon name for a leading icon (rendered via classes/registry). */
  @Input() iconName: string | null = null;

  /** Fired when the button is activated and not disabled. */
  @Output() readonly clicked = new EventEmitter<void>();

  get buttonClass(): string {
    return ["btn", this.mapVariantToClass(this.variant), this.mapSizeToClass(this.size)]
      .filter(Boolean)
      .join(" ");
  }

  private mapVariantToClass(variant: UiButtonVariant): string {
    switch (variant) {
      case "primary":
        return "btn-primary";
      case "secondary":
        return "btn-secondary";
      case "ghost":
        return "btn-ghost";
      default:
        return "";
    }
  }

  private mapSizeToClass(size: UiButtonSize): string {
    switch (size) {
      case "sm":
        return "btn-sm";
      case "md":
        return "btn-md";
      case "lg":
        return "btn-lg";
      default:
        return "";
    }
  }

  handleClick(): void {
    if (this.disabled) return;
    this.clicked.emit();
  }
}
