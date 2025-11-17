import { Component, Input } from "@angular/core";

@Component({
  selector: "app-button",
  standalone: true,
  template: `<button type="button" (click)="onClick()">{{ label }}</button>`,
})
export class ButtonComponent {
  @Input() label = "";
  @Input() click?: () => void;

  onClick(): void {
    this.click?.();
  }
}
