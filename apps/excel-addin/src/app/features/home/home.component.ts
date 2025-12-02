import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ExcelService } from "@excel-platform/core/excel";

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
