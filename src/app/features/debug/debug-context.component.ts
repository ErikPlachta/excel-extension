import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { AuthService, AppContextService } from "../../core";
import { QueryStateService } from "../../shared/query-state.service";
import { WorkbookService } from "../../core/workbook.service";

@Component({
  selector: "app-debug-context",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./debug-context.component.html",
})
export class DebugContextComponent {
  constructor(
    public readonly appContext: AppContextService,
    public readonly auth: AuthService,
    public readonly queries: QueryStateService,
    public readonly workbook: WorkbookService
  ) {}
}
