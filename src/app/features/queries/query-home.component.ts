import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { ExcelService, AuthService, TelemetryService } from "../../core";
import { ExecuteQueryParams, QueryApiMockService } from "../../shared/query-api-mock.service";
import { QueryStateService } from "../../shared/query-state.service";
import { QueryDefinition } from "../../shared/query-model";
import { QueryParameterValues, QueryWriteMode } from "../../types";
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
  globalParams: QueryParameterValues = {};
  selectedQuery: QueryDefinition | null = null;
  selectedQueryOverrides: QueryParameterValues = {};
  availableGroups: string[] = [];
  availableSubGroups: string[] = [];

  constructor(
    public readonly excel: ExcelService,
    private readonly workbook: WorkbookService,
    private readonly auth: AuthService,
    private readonly api: QueryApiMockService,
    private readonly state: QueryStateService,
    private readonly telemetry: TelemetryService
  ) {}

  ngOnInit(): void {
    this.queries = this.state.getQueries();
    this.globalParams = { ...this.state.getGlobalParams() };

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
      void this.loadGroupingOptions();
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

  private async loadGroupingOptions(): Promise<void> {
    try {
      const groups = await this.api.getGroupingOptions();
      this.availableGroups = groups.groups;
      this.availableSubGroups = groups.subGroups;
    } catch {
      this.availableGroups = [];
      this.availableSubGroups = [];
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
      this.openDetails(query);
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

  openDetails(query: QueryDefinition): void {
    this.selectedQuery = query;
    this.selectedQueryOverrides = {
      ...this.state.getQueryParams(query.id),
    };
  }

  closeDetails(): void {
    this.selectedQuery = null;
    this.selectedQueryOverrides = {};
  }

  onGlobalDateChange(key: "StartDate" | "EndDate", value: string): void {
    this.globalParams = {
      ...this.globalParams,
      [key]: value || undefined,
    };
    this.state.setGlobalParams(this.globalParams);
  }

  onGlobalGroupChange(key: "Group" | "SubGroup", value: string): void {
    this.globalParams = {
      ...this.globalParams,
      [key]: value || undefined,
    };
    this.state.setGlobalParams(this.globalParams);
  }

  // Write mode is now fixed to overwrite, so there is no
  // onWriteModeChange handler or dropdown.

  onRunClicked(query: QueryDefinition): void {
    this.telemetry.logEvent(
      this.telemetry.createWorkflowEvent({
        category: "query",
        name: "query.run.requested",
        severity: "info",
        context: { queryId: query.id },
      })
    );
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

  getRunFlag(query: QueryDefinition): boolean {
    return this.state.getQueryRunFlag(query.id);
  }

  onRunFlagChange(query: QueryDefinition, checked: boolean): void {
    this.state.setQueryRunFlag(query.id, checked);
  }

  onOverrideChange(key: "StartDate" | "EndDate" | "Group" | "SubGroup", value: string): void {
    if (!this.selectedQuery) {
      return;
    }
    this.selectedQueryOverrides = {
      ...this.selectedQueryOverrides,
      [key]: value || undefined,
    };
  }

  onSaveOverrides(): void {
    if (!this.selectedQuery) {
      return;
    }
    this.state.setQueryParams(this.selectedQuery.id, this.selectedQueryOverrides);
    this.closeDetails();
  }

  onClearOverrides(): void {
    if (!this.selectedQuery) {
      return;
    }
    this.selectedQueryOverrides = {};
    this.state.setQueryParams(this.selectedQuery.id, {});
  }

  async runSelected(mode: "global" | "unique"): Promise<void> {
    if (!this.excel.isExcel) {
      this.error = "Queries can only be run inside Excel.";
      return;
    }

    const runnable = this.filteredQueries.filter((q) => this.getRunFlag(q) && this.canRun(q));

    if (!runnable.length) {
      this.error = "Select at least one query to run.";
      return;
    }

    this.telemetry.logEvent(
      this.telemetry.createWorkflowEvent({
        category: "query",
        name: "query.batch.run.requested",
        severity: "info",
        context: {
          mode,
          queryIds: runnable.map((q) => q.id),
          globalParams: this.state.getGlobalParams(),
          perQueryParams: Object.fromEntries(
            runnable.map((q) => [q.id, this.state.getQueryParams(q.id) ?? {}])
          ),
        },
      })
    );

    this.isRunning = true;
    this.error = null;

    const results: { query: QueryDefinition; ok: boolean; error?: string }[] = [];

    for (const query of runnable) {
      try {
        const ok = await this.runSingle(query, mode);
        results.push({ query, ok });
      } catch (err) {
        const message = (err as Error)?.message ?? String(err);
        results.push({ query, ok: false, error: message });
      }
    }

    const failed = results.filter((r) => !r.ok);

    if (failed.length) {
      this.error = `One or more queries failed: ${failed.map((f) => f.query.id).join(", ")}`;
    }

    this.telemetry.logEvent(
      this.telemetry.createWorkflowEvent({
        category: "query",
        name: failed.length ? "query.batch.run.failed" : "query.batch.run.completed",
        severity: failed.length ? "error" : "info",
        context: {
          mode,
          queryIds: runnable.map((q) => q.id),
          failedQueryIds: failed.map((f) => f.query.id),
          globalParams: this.state.getGlobalParams(),
          perQueryParams: Object.fromEntries(
            runnable.map((q) => [q.id, this.state.getQueryParams(q.id) ?? {}])
          ),
        },
      })
    );

    this.isRunning = false;
  }

  private async runSingle(query: QueryDefinition, mode: "global" | "unique"): Promise<boolean> {
    if (!this.excel.isExcel || !this.canRun(query)) {
      return false;
    }

    const effectiveParams = this.state.getEffectiveParams(query, mode);

    this.telemetry.logEvent(
      this.telemetry.createWorkflowEvent({
        category: "query",
        name: "query.run.requested",
        severity: "info",
        context: { queryId: query.id, mode, params: effectiveParams },
      })
    );

    try {
      const result = await this.api.executeQuery(query.id, effectiveParams as ExecuteQueryParams);

      const effectiveQuery: QueryDefinition = { ...query, writeMode: "overwrite" };
      const excelResult = await this.excel.upsertQueryTable(effectiveQuery, result.rows);

      if (!excelResult.ok) {
        this.telemetry.logEvent(
          this.telemetry.createWorkflowEvent({
            category: "query",
            name: "query.run.failed",
            severity: "error",
            message: excelResult.error?.message,
            context: { queryId: query.id, mode },
          })
        );
        return false;
      }

      this.state.setLastRun(query.id, {
        queryId: query.id,
        completedAt: new Date(),
        rowCount: result.rows.length,
        location: excelResult.value,
      });

      this.telemetry.logEvent(
        this.telemetry.createWorkflowEvent({
          category: "query",
          name: "query.run.completed",
          severity: "info",
          context: {
            queryId: query.id,
            mode,
            rowCount: result.rows.length,
          },
        })
      );

      return true;
    } catch (err) {
      const message = (err as Error)?.message ?? String(err);
      this.telemetry.logEvent(
        this.telemetry.createWorkflowEvent({
          category: "query",
          name: "query.run.failed",
          severity: "error",
          message,
          context: { queryId: query.id, mode },
        })
      );
      return false;
    }
  }

  async runQuery(query: QueryDefinition): Promise<void> {
    this.error = null;

    if (!this.excel.isExcel) {
      this.error = "Queries can only be run inside Excel.";
      return;
    }
    if (!this.canRun(query)) {
      this.error = "You do not have permission to run this query.";
      return;
    }

    this.isRunning = true;
    const ok = await this.runSingle(query, "unique");

    if (!ok) {
      this.error = `Failed to run query '${query.id}'.`;
    }

    this.isRunning = false;
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
