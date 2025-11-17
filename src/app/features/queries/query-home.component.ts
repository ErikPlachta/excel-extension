import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { ExcelService, AuthService } from "../../core";
import { QueryApiMockService } from "../../shared/query-api-mock.service";
import { QueryStateService } from "../../shared/query-state.service";
import { QueryDefinition } from "../../shared/query-model";

@Component({
  selector: "app-query-home",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./query-home.component.html",
  styleUrl: "./query-home.component.css",
})
export class QueryHomeComponent implements OnInit {
  queries: QueryDefinition[] = [];
  isRunning = false;
  error: string | null = null;

  constructor(
    public readonly excel: ExcelService,
    private readonly auth: AuthService,
    private readonly api: QueryApiMockService,
    private readonly state: QueryStateService
  ) {}

  ngOnInit(): void {
    this.queries = this.state.getQueries();
  }

  isAdminOnly(query: QueryDefinition): boolean {
    return Array.isArray(query.allowedRoles) && query.allowedRoles.includes("admin");
  }

  canRun(query: QueryDefinition): boolean {
    // If the query specifies allowedRoles, require at least one of them.
    if (Array.isArray(query.allowedRoles) && query.allowedRoles.length) {
      return query.allowedRoles.some((role) => this.auth.hasRole(role));
    }
    // Otherwise fall back to general query roles.
    return this.auth.hasAnyRole(["analyst", "admin"]);
  }

  async runQuery(query: QueryDefinition): Promise<void> {
    if (!this.excel.isExcel) {
      this.error = "Queries can only be run inside Excel.";
      return;
    }
    if (!this.canRun(query)) {
      this.error = "You do not have permission to run this query.";
      return;
    }

    this.isRunning = true;
    this.error = null;
    try {
      const lastParams = this.state.getLastParams(query.id) ?? {};
      const result = await this.api.executeQuery(query.id, lastParams);
      const location = await this.excel.upsertQueryTable(query, result.rows);

      this.state.setLastRun(query.id, {
        queryId: query.id,
        completedAt: new Date(),
        rowCount: result.rows.length,
        location: location ?? undefined,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      this.error = err?.message ?? String(err);
    } finally {
      this.isRunning = false;
    }
  }

  async goToLastRun(query: QueryDefinition): Promise<void> {
    if (!this.excel.isExcel) {
      this.error = "Navigation to query tables is only available inside Excel.";
      return;
    }
    if (!this.auth.isAuthenticated) {
      this.error = "You must be signed in to navigate to query results.";
      return;
    }

    const run = this.state.getLastRun(query.id);
    if (!run || !run.location) {
      this.error = "No Excel table has been created for this query yet.";
      return;
    }

    this.error = null;
    await this.excel.activateQueryLocation(run.location);
  }
}
