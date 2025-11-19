import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { ExcelService, AuthService } from "../../core";
import { ExecuteQueryParams, QueryApiMockService } from "../../shared/query-api-mock.service";
import { QueryStateService } from "../../shared/query-state.service";
import { QueryDefinition } from "../../shared/query-model";
import { QueryWriteMode } from "../../types";
import { DropdownComponent, UiDropdownItem } from "../../shared/ui/dropdown.component";
import { ButtonComponent } from "../../shared/ui/button.component";
import { QueryUiActionConfig, QueryUiActionType } from "../../types/ui/primitives.types";
import { WorkbookService } from "../../core/workbook.service";
import { WorkbookTableInfo } from "../../types";

@Component({
  selector: "app-query-home",
  standalone: true,
  imports: [CommonModule, DropdownComponent, ButtonComponent],
  templateUrl: "./query-home.component.html",
  styleUrl: "./query-home.component.css",
})
export class QueryHomeComponent implements OnInit {
  queries: QueryDefinition[] = [];
  roleFilterItems: UiDropdownItem[] = [];
  selectedRoleFilter: string | null = null;
  writeModeItems: UiDropdownItem[] = [];
  selectedWriteModes = new Map<string, QueryWriteMode>();
  isRunning = false;
  error: string | null = null;
  workbookTables: WorkbookTableInfo[] = [];

  constructor(
    public readonly excel: ExcelService,
    private readonly workbook: WorkbookService,
    private readonly auth: AuthService,
    private readonly api: QueryApiMockService,
    private readonly state: QueryStateService
  ) {}

  ngOnInit(): void {
    this.queries = this.state.getQueries();

    this.roleFilterItems = [
      { value: "all", label: "All queries" },
      { value: "admin", label: "Admin only" },
      { value: "analyst", label: "Analyst-accessible" },
    ];
    this.selectedRoleFilter = "all";

    // Write mode dropdown removed; all queries now always overwrite
    // any existing extension-managed table.

    if (this.workbook.isExcel) {
      void this.loadWorkbookState();
    }
  }

  private async loadWorkbookState(): Promise<void> {
    try {
      this.workbookTables = await this.workbook.getTables();
    } catch {
      // Swallow errors here; go-to-table remains best-effort.
      this.workbookTables = [];
    }
  }

  onActionClicked(query: QueryDefinition, action: QueryUiActionConfig): void {
    this.dispatchAction(query, action.type);
  }

  // TODO: Add TSDOC Comments
  // TODO: add additional queries here as build out features.
  private dispatchAction(query: QueryDefinition, type: QueryUiActionType): void {
    if (type === "run-query") {
      void this.runQuery(query);
      return;
    }
    if (type === "go-to-table") {
      void this.goToLastRun(query);
      return;
    }
    if (type === "show-details") {
      // Example extra action: for now we just expose the query id.
      this.error = `Details not implemented yet for query '${query.id}'.`;
    }
  }

  // Legacy getter kept for compatibility with older templates that
  // referenced `filteredListItems`. The list-based UI is currently
  // commented out, so this getter is unused and returns an empty
  // array to avoid TypeScript errors.
  get filteredListItems(): never[] {
    return [];
  }

  get filteredQueries(): QueryDefinition[] {
    if (this.selectedRoleFilter === "admin") {
      return this.queries.filter((q) => this.isAdminOnly(q));
    }
    if (this.selectedRoleFilter === "analyst") {
      return this.queries.filter((q) => !this.isAdminOnly(q));
    }
    return this.queries;
  }

  onRoleFilterChange(value: string): void {
    this.selectedRoleFilter = value;
  }

  // Write mode is now fixed to overwrite, so there is no
  // onWriteModeChange handler or dropdown.

  onRunClicked(query: QueryDefinition): void {
    void this.runQuery(query);
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
      const lastParams = (this.state.getLastParams(query.id) ?? {}) as ExecuteQueryParams;
      const result = await this.api.executeQuery(query.id, lastParams);

      // Write mode is now always overwrite; append semantics have
      // been removed for simplicity and predictability.
      const effectiveQuery: QueryDefinition = { ...query, writeMode: "overwrite" };

      const excelResult = await this.excel.upsertQueryTable(effectiveQuery, result.rows);

      if (!excelResult.ok) {
        this.error = excelResult.error?.message ?? "Failed to write results into Excel.";
        return;
      }

      this.state.setLastRun(query.id, {
        queryId: query.id,
        completedAt: new Date(),
        rowCount: result.rows.length,
        location: excelResult.value,
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

    if (run && run.location) {
      this.error = null;
      await this.excel.activateQueryLocation(run.location);
      return;
    }

    // Prefer an extension-managed table if one exists for this query.
    const managedTables = await this.workbook.getManagedTablesForQuery(query.id);
    const targetTable =
      managedTables[0] ?? this.workbookTables.find((t) => t.name === query.defaultTableName);

    if (targetTable) {
      this.error = null;

      const inferredLocation = {
        sheetName: targetTable.worksheet,
        tableName: targetTable.name,
      };

      await this.excel.activateQueryLocation(inferredLocation);

      this.state.setLastRun(query.id, {
        queryId: query.id,
        completedAt: new Date(),
        rowCount: targetTable.rows,
        location: inferredLocation,
      });
      return;
    }

    this.error = "No Excel table has been created for this query yet.";
  }

  onGoToLastRunClicked(query: QueryDefinition): void {
    void this.goToLastRun(query);
  }
}
