import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ExcelService } from "@excel-platform/core/excel";

/**
 * Home page component displaying add-in status and quick actions.
 *
 * Serves as the landing page when users open the Excel task pane,
 * showing current Excel connection state and navigation options.
 */
@Component({
  selector: "app-home",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./home.component.html",
  styleUrl: "./home.component.css",
})
export class HomeComponent {
  constructor(public excel: ExcelService) {}
}
