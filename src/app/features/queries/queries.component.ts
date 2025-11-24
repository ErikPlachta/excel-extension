import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Component } from "@angular/core";
import { ExcelService, AuthService, TelemetryService } from "../../core";
import { ExecuteQueryParams, QueryApiMockService } from "../../shared/query-api-mock.service";
import { QueryStateService } from "../../shared/query-state.service";
import { QueryDefinition } from "../../shared/query-model";
import { QueryConfiguration, QueryParameterValues, QueryWriteMode } from "../../types";
import { SectionComponent } from "../../shared/ui/section.component";
import { TableComponent } from "../../shared/ui/table.component";
import { DropdownComponent, UiDropdownItem } from "../../shared/ui/dropdown.component";
import { ButtonComponent } from "../../shared/ui/button.component";
import { ProgressIndicatorComponent } from "../../shared/ui/progress-indicator.component";
import { QueryConfigurationService } from "../../shared/query-configuration.service";
import { QueryQueueService } from "../../shared/query-queue.service";

export interface QueryConfigurationItem {
  id: string;
  apiId: string;
  displayName: string;
  parameters: QueryParameterValues;
  targetSheetName: string;
  targetTableName: string;
  writeMode: QueryWriteMode;
  includeInBatch: boolean;
}

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
export class QueriesComponent {
  apis: QueryDefinition[] = [];
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
    };
  }

  constructor(
    public readonly excel: ExcelService,
    private readonly auth: AuthService,
    private readonly api: QueryApiMockService,
    private readonly state: QueryStateService,
    private readonly telemetry: TelemetryService,
    private readonly configs: QueryConfigurationService,
    private readonly queue: QueryQueueService
  ) {
    this.apis = this.api.getQueries();
    this.addApiItems = this.apis.map((q) => ({ value: q.id, label: q.name }));

    this.configs.configs$.subscribe((all) => {
      this.savedConfigs = all;
    });

    this.queue.progress$.subscribe((progress) => {
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

    this.telemetry.logEvent(
      this.telemetry.createWorkflowEvent({
        category: "query",
        name: "queryConfig.run.requested",
        severity: "info",
        context: {
          configId,
          itemIds: this.selectedItems.map((i) => i.id),
        },
      })
    );

    await this.queue.runBatch(
      {
        configId,
        items: this.selectedItems,
        backoffMs: 50,
      },
      async (item) => {
        const api = this.apis.find((q) => q.id === item.apiId);
        if (!api) {
          return { ok: false, rowCount: 0 };
        }

        const params: ExecuteQueryParams = { ...item.parameters };

        try {
          const result = await this.api.executeQuery(api.id, params);
          const effectiveQuery = {
            ...api,
            defaultSheetName: item.targetSheetName,
            defaultTableName: item.targetTableName,
            writeMode: item.writeMode,
          };
          const excelResult = await this.excel.upsertQueryTable(effectiveQuery, result.rows);

          const ok = excelResult.ok;

          if (ok && excelResult.value) {
            this.state.setLastRun(api.id, {
              queryId: api.id,
              completedAt: new Date(),
              rowCount: result.rows.length,
              location: excelResult.value,
            });
          }

          return { ok, rowCount: result.rows.length };
        } catch {
          return { ok: false, rowCount: 0 };
        }
      }
    );

    this.isRunningConfig = false;
  }
}
