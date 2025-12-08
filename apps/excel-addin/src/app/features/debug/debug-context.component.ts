import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { AuthService } from "@excel-platform/core/auth";
import { WorkbookService } from "@excel-platform/core/excel";
import { QueryStateService } from "@excel-platform/data/query";
import { AppContextService } from "@excel-platform/core/telemetry";

/**
 * Debug component displaying raw application context state.
 *
 * Shows JSON dumps of host status, auth state, API definitions,
 * and Excel context for development and troubleshooting purposes.
 */
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
