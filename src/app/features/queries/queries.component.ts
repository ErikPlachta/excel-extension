import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Component, OnDestroy } from "@angular/core";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { ExcelService, AuthService, TelemetryService, SettingsService, FormulaScannerService, WorkbookService } from "../../core";
import { ExecuteQueryParams, QueryApiMockService } from "../../shared/query-api-mock.service";
import { QueryStateService } from "../../shared/query-state.service";
import { ApiDefinition, QueryConfiguration, QueryConfigurationItem, QueryParameterValues, QueryWriteMode, QueryImpactAssessment } from '@excel-platform/shared/types';
import { RoleId } from "../../types";
import { SectionComponent, TableComponent, DropdownComponent, UiDropdownItem, ButtonComponent, ProgressIndicatorComponent } from '@excel-platform/shared/ui';
import { QueryConfigurationService } from "../../shared/query-configuration.service";
import { QueryQueueService } from "../../shared/query-queue.service";
import { ApiCatalogService } from "../../shared/api-catalog.service";

@Component({
  selector: "app-queries",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SectionComponent,
    TableComponent,
    DropdownComponent,
    ButtonComponent,
    ProgressIndicatorComponent,
  ],
  templateUrl: "./queries.component.html",
  styleUrl: "./queries.component.css",
})
export class QueriesComponent implements OnDestroy {
  private readonly destroy$ = new Subject<void>();

  apis: ApiDefinition[] = [];
  selectedItems: QueryConfigurationItem[] = [];

  // Named configurations
  configName = "";
  savedConfigs: QueryConfiguration[] = [];
  selectedConfigId: string | null = null;
  isRenaming = false;
  isRunningConfig = false;

  addApiItems: UiDropdownItem[] = [];
  selectedApiId: string | null = null;
  newDisplayName = "";
  newTargetSheetName = "";
  newTargetTableName = "";
  newWriteMode: QueryWriteMode = "overwrite";
  newIncludeInBatch = true;

  editingItem: QueryConfigurationItem | null = null;
  editingDisplayName = "";
  editingTargetSheetName = "";
  editingTargetTableName = "";
  editingWriteMode: QueryWriteMode = "overwrite";
  editingIncludeInBatch = true;
  editingParameters: QueryParameterValues = {};

  // Queue progress (derived from QueryQueueService)
  queueTotal = 0;
  queueCompleted = 0;
  queueCurrentItemId: string | null = null;

  // Formula management state (Phase 8)
  formulasDisabled = false;
  private previousCalculationMode: string | null = null;

  // Formula impact assessment state (Phase 9)
  formulaImpactAssessment: QueryImpactAssessment | null = null;
  showImpactWarning = false;

  // Debug view model to surface core state as JSON in the template.
  get debugState() {
    return {
      selectedApiId: this.selectedApiId,
      newDisplayName: this.newDisplayName,
      newTargetSheetName: this.newTargetSheetName,
      newTargetTableName: this.newTargetTableName,
      newWriteMode: this.newWriteMode,
      newIncludeInBatch: this.newIncludeInBatch,
      selectedItems: this.selectedItems,
      configName: this.configName,
      selectedConfigId: this.selectedConfigId,
      isRenaming: this.isRenaming,
      isRunningConfig: this.isRunningConfig,
      queue: {
        total: this.queueTotal,
        completed: this.queueCompleted,
        currentItemId: this.queueCurrentItemId,
      },
      formulasDisabled: this.formulasDisabled,
      formulaImpact: this.formulaImpactAssessment
        ? {
            hasImpact: this.formulaImpactAssessment.hasImpact,
            severity: this.formulaImpactAssessment.severity,
            affectedCount: this.formulaImpactAssessment.affectedFormulas.length,
          }
        : null,
    };
  }

  constructor(
    public readonly excel: ExcelService,
    private readonly auth: AuthService,
    private readonly api: QueryApiMockService,
    private readonly apiCatalog: ApiCatalogService,
    private readonly state: QueryStateService,
    private readonly telemetry: TelemetryService,
    private readonly configs: QueryConfigurationService,
    private readonly queue: QueryQueueService,
    private readonly settings: SettingsService,
    private readonly formulaScanner: FormulaScannerService,
    private readonly workbook: WorkbookService
  ) {
    // Phase 1: Use ApiCatalogService directly with role filtering
    const userRoles = (this.auth.roles || []) as RoleId[];
    this.apis = this.apiCatalog.getApisByRole(userRoles);
    this.addApiItems = this.apis.map((api) => ({ value: api.id, label: api.name }));

    this.configs.configs$.pipe(takeUntil(this.destroy$)).subscribe((all) => {
      this.savedConfigs = all;
    });

    this.queue.progress$.pipe(takeUntil(this.destroy$)).subscribe((progress) => {
      this.queueTotal = progress.total;
      this.queueCompleted = progress.completed;
      this.queueCurrentItemId = progress.currentItemId;
    });

    this.telemetry.logEvent(
      this.telemetry.createFeatureEvent({
        category: "ui",
        name: "queries.feature.loaded",
        severity: "info",
        context: {
          apiCount: this.apis.length,
        },
      })
    );
  }

  get canAddSelected(): boolean {
    return !!this.selectedApiId && !!this.newTargetSheetName && !!this.newTargetTableName;
  }

  onSelectedApiChange(value: string): void {
    this.selectedApiId = value;
    const api = this.apis.find((q) => q.id === value);
    this.newDisplayName = api?.name ?? "";
  }

  startEdit(item: QueryConfigurationItem): void {
    this.editingItem = item;
    this.editingDisplayName = item.displayName;
    this.editingTargetSheetName = item.targetSheetName;
    this.editingTargetTableName = item.targetTableName;
    this.editingWriteMode = item.writeMode;
    this.editingIncludeInBatch = item.includeInBatch;
    this.editingParameters = { ...item.parameters };
  }

  cancelEdit(): void {
    this.editingItem = null;
  }

  saveEdit(): void {
    if (!this.editingItem) {
      this.telemetry.logEvent(
        this.telemetry.createWorkflowEvent({
          category: "query",
          name: "queryConfig.item.update.blocked.noEditingItem",
          severity: "warn",
        })
      );
      return;
    }

    const updated: QueryConfigurationItem = {
      ...this.editingItem,
      displayName: this.editingDisplayName || this.editingItem.displayName,
      targetSheetName: this.editingTargetSheetName,
      targetTableName: this.editingTargetTableName,
      writeMode: this.editingWriteMode,
      includeInBatch: this.editingIncludeInBatch,
      parameters: { ...this.editingParameters },
    };

    this.selectedItems = this.selectedItems.map((it) => (it.id === updated.id ? updated : it));

    this.telemetry.logEvent(
      this.telemetry.createWorkflowEvent({
        category: "query",
        name: "queryConfig.item.updated",
        severity: "info",
        context: { apiId: updated.apiId, id: updated.id },
      })
    );

    this.editingItem = null;
  }

  addSelected(): void {
    this.telemetry.logEvent(
      this.telemetry.createWorkflowEvent({
        category: "query",
        name: "queryConfig.addSelected.clicked",
        severity: "debug",
        context: {
          selectedApiId: this.selectedApiId,
          targetSheetName: this.newTargetSheetName,
          targetTableName: this.newTargetTableName,
        },
      })
    );

    if (!this.selectedApiId || !this.newTargetSheetName || !this.newTargetTableName) {
      this.telemetry.logEvent(
        this.telemetry.createWorkflowEvent({
          category: "query",
          name: "queryConfig.addSelected.blocked.missingFields",
          severity: "warn",
          context: {
            hasSelectedApiId: !!this.selectedApiId,
            hasTargetSheetName: !!this.newTargetSheetName,
            hasTargetTableName: !!this.newTargetTableName,
          },
        })
      );
      return;
    }

    const id = `${this.selectedApiId}-${Date.now()}`;

    const item: QueryConfigurationItem = {
      id,
      apiId: this.selectedApiId,
      displayName: this.newDisplayName || this.selectedApiId,
      parameters: {},
      targetSheetName: this.newTargetSheetName,
      targetTableName: this.newTargetTableName,
      writeMode: this.newWriteMode,
      includeInBatch: this.newIncludeInBatch,
    };

    this.selectedItems = [...this.selectedItems, item];

    this.telemetry.logEvent(
      this.telemetry.createWorkflowEvent({
        category: "query",
        name: "queryConfig.item.created",
        severity: "info",
        context: { apiId: item.apiId, id: item.id },
      })
    );

    this.resetNewForm();
  }

  private resetNewForm(): void {
    this.selectedApiId = null;
    this.newDisplayName = "";
    this.newTargetSheetName = "";
    this.newTargetTableName = "";
    this.newWriteMode = "overwrite";
    this.newIncludeInBatch = true;
  }

  saveCurrentConfiguration(): void {
    this.telemetry.logEvent(
      this.telemetry.createWorkflowEvent({
        category: "query",
        name: "queryConfig.save.clicked",
        severity: "debug",
        context: {
          selectedConfigId: this.selectedConfigId,
          itemCount: this.selectedItems.length,
          isRenaming: this.isRenaming,
        },
      })
    );

    if (!this.selectedItems.length) {
      this.telemetry.logEvent(
        this.telemetry.createWorkflowEvent({
          category: "query",
          name: "queryConfig.save.blocked.noItems",
          severity: "warn",
          context: {
            selectedConfigId: this.selectedConfigId,
          },
        })
      );
      return;
    }
    const id = this.selectedConfigId ?? `config-${Date.now()}`;
    const name = (this.configName || "Untitled configuration").trim();

    const config: QueryConfiguration = {
      id,
      name,
      items: this.selectedItems.map((item) => ({ ...item })),
      parameterPresets: {
        global: this.state.getGlobalParams(),
        perQuery: { ...this.state.snapshot.queryParams },
      },
    };

    this.configs.save(config);
    this.selectedConfigId = id;

    const overwrite = this.savedConfigs.some((c) => c.id === id);

    this.telemetry.logEvent(
      this.telemetry.createWorkflowEvent({
        category: "query",
        name: overwrite ? "queryConfig.saved.overwrite" : "queryConfig.saved",
        severity: overwrite ? "warn" : "info",
        context: {
          configId: id,
          name,
          itemCount: this.selectedItems.length,
          overwrite,
        },
      })
    );
  }

  loadConfiguration(id: string): void {
    const config = this.configs.get(id);
    if (!config) return;

    this.selectedConfigId = id;
    this.configName = config.name;
    this.selectedItems = config.items.map((item) => ({ ...item }));

    this.telemetry.logEvent(
      this.telemetry.createWorkflowEvent({
        category: "query",
        name: "queryConfig.loaded",
        severity: "info",
        context: { configId: id, name: config.name, itemCount: config.items.length },
      })
    );
  }

  startRename(config: QueryConfiguration): void {
    this.selectedConfigId = config.id;
    this.configName = config.name;
    this.isRenaming = true;

    this.telemetry.logEvent(
      this.telemetry.createWorkflowEvent({
        category: "query",
        name: "queryConfig.rename.started",
        severity: "debug",
        context: { configId: config.id, name: config.name },
      })
    );
  }

  newConfigurationFromCurrent(): void {
    this.selectedConfigId = null;
    this.isRenaming = false;

    this.telemetry.logEvent(
      this.telemetry.createWorkflowEvent({
        category: "query",
        name: "queryConfig.saveAsNew.clicked",
        severity: "debug",
        context: {
          itemCount: this.selectedItems.length,
        },
      })
    );

    // Immediately persist as a brand new configuration.
    this.saveCurrentConfiguration();
  }

  deleteConfiguration(id: string): void {
    this.configs.softDelete(id);

    if (this.selectedConfigId === id) {
      this.selectedConfigId = null;
    }

    this.telemetry.logEvent(
      this.telemetry.createWorkflowEvent({
        category: "query",
        name: "queryConfig.deleted",
        severity: "info",
        context: { configId: id },
      })
    );
  }

  async runCurrentConfiguration(): Promise<void> {
    const configId = this.selectedConfigId ?? "unsaved";

    if (!this.excel.isExcel) {
      this.telemetry.logEvent(
        this.telemetry.createWorkflowEvent({
          category: "query",
          name: "queryConfig.run.blocked.notInExcel",
          severity: "warn",
          context: { configId, excelDetected: this.excel.isExcel },
        })
      );
      return;
    }

    this.telemetry.logEvent(
      this.telemetry.createWorkflowEvent({
        category: "query",
        name: "queryConfig.run.clicked",
        severity: "debug",
        context: {
          configId,
          itemIds: this.selectedItems.map((i) => i.id),
        },
      })
    );

    if (!this.selectedItems.length) {
      this.telemetry.logEvent(
        this.telemetry.createWorkflowEvent({
          category: "query",
          name: "queryConfig.run.blocked.noItems",
          severity: "warn",
          context: { configId },
        })
      );
      return;
    }

    this.isRunningConfig = true;

    // Phase 9: Check formula impact before execution
    this.showImpactWarning = false;
    this.formulaImpactAssessment = null;

    // Get unique target table names from selected items
    const targetTables = [...new Set(this.selectedItems.map((item) => item.targetTableName))];

    for (const tableName of targetTables) {
      const impact = await this.formulaScanner.checkQueryImpact(configId, tableName);
      if (impact.ok && impact.value && impact.value.hasImpact) {
        this.formulaImpactAssessment = impact.value;
        this.showImpactWarning = true;
        // Show warning but don't block execution
        break;
      }
    }

    // Phase 8: Disable formulas during execution if setting enabled
    const shouldDisableFormulas =
      this.settings.value.queryExecution?.disableFormulasDuringRun ?? true;

    if (shouldDisableFormulas) {
      const modeResult = await this.excel.setCalculationMode("Manual");
      if (modeResult.ok && modeResult.value) {
        this.previousCalculationMode = modeResult.value.previousMode;
        this.formulasDisabled = true;
        this.telemetry.logEvent({
          category: "excel",
          name: "formulas.disabled",
          severity: "info",
          context: {
            configId,
            previousMode: this.previousCalculationMode,
          },
        });
      }
    }

    this.telemetry.logEvent(
      this.telemetry.createWorkflowEvent({
        category: "query",
        name: "queryConfig.run.requested",
        severity: "info",
        context: {
          configId,
          itemIds: this.selectedItems.map((i) => i.id),
          formulasDisabled: this.formulasDisabled,
        },
      })
    );

    try {
      await this.queue.runBatch(
        {
          configId,
          items: this.selectedItems,
          backoffMs: 50,
        },
        async (item) => {
          const api = this.apis.find((a) => a.id === item.apiId);
          if (!api) {
            return { ok: false, rowCount: 0 };
          }

          const params: ExecuteQueryParams = { ...item.parameters };

          try {
            // Phase 1: Use executeApi() instead of deprecated executeQuery()
            const rows = await this.api.executeApi(api.id, params);

            // Phase 3: Resolve target via WorkbookService for ownership-aware targeting
            const requestedTarget = {
              sheetName: item.targetSheetName,
              tableName: item.targetTableName,
            };
            const resolvedTarget = await this.workbook.resolveTableTarget(api.id, requestedTarget);
            const target = resolvedTarget ?? requestedTarget;

            const excelResult = await this.excel.upsertQueryTable(api.id, target, rows);

            const ok = excelResult.ok;

            if (ok && excelResult.value) {
              this.state.setLastRun(api.id, {
                queryId: api.id,
                completedAt: new Date(),
                rowCount: rows.length,
                location: excelResult.value,
              });
            }

            return { ok, rowCount: rows.length };
          } catch {
            return { ok: false, rowCount: 0 };
          }
        }
      );
    } finally {
      // Phase 8: Restore formulas after execution (even on error)
      if (this.formulasDisabled && this.previousCalculationMode) {
        const restoreMode =
          this.previousCalculationMode === "Manual" ? "Manual" : "Automatic";
        await this.excel.setCalculationMode(restoreMode);
        this.telemetry.logEvent({
          category: "excel",
          name: "formulas.restored",
          severity: "info",
          context: {
            configId,
            restoredMode: restoreMode,
          },
        });
        this.formulasDisabled = false;
        this.previousCalculationMode = null;
      }

      this.isRunningConfig = false;
    }
  }

  /**
   * Export formula dependencies to CSV file.
   * Scans workbook and downloads report of all table/column references.
   */
  async exportFormulaDependencies(): Promise<void> {
    this.telemetry.logEvent({
      category: "formula",
      name: "exportDependencies.clicked",
      severity: "debug",
    });

    const scanResult = await this.formulaScanner.scanWorkbook();
    if (!scanResult.ok || !scanResult.value) {
      this.telemetry.logEvent({
        category: "formula",
        name: "exportDependencies.failed",
        severity: "warn",
        context: { error: scanResult.error?.message },
      });
      return;
    }

    const csv = this.formulaScanner.generateReportCsv(scanResult.value.dependencies);

    // Download via Blob URL
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `formula-dependencies-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    this.telemetry.logEvent({
      category: "formula",
      name: "exportDependencies.completed",
      severity: "info",
      context: {
        dependencyCount: scanResult.value.dependencies.length,
        sheetsScanned: scanResult.value.sheetsScanned,
      },
    });
  }

  /**
   * Cleanup subscriptions on component destroy to prevent memory leaks.
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
