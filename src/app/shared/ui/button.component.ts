import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import { UiButtonSize, UiButtonVariant } from "../../types";

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
  @Input() label = "";
  @Input() variant: UiButtonVariant = "primary";
  @Input() size: UiButtonSize = "md";
  @Input() disabled = false;
  @Input() iconName: string | null = null;

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
