import { TestBed } from "@angular/core/testing";
import { QueriesComponent } from "./queries.component";
import { QueryConfigurationItem } from '@excel-platform/shared/types';
import { ExcelService } from "../../core/excel.service";
import { AuthService } from "@excel-platform/core/auth";
import { TelemetryService } from "@excel-platform/core/telemetry";
import { SettingsService } from "@excel-platform/core/settings";
import { FormulaScannerService } from "../../core/formula-scanner.service";
import { QueryApiMockService } from "../../shared/query-api-mock.service";
import { QueryStateService } from "../../shared/query-state.service";
import { QueryConfigurationService } from "../../shared/query-configuration.service";
import { QueryQueueService } from "../../shared/query-queue.service";
import { ApiCatalogService } from "../../shared/api-catalog.service";
import { BehaviorSubject, Subject } from "rxjs";
import { QueryConfiguration } from "../../types";

describe("QueriesComponent", () => {
  let component: QueriesComponent;
  let mockExcel: jasmine.SpyObj<ExcelService>;
  let mockAuth: jasmine.SpyObj<AuthService>;
  let mockTelemetry: jasmine.SpyObj<TelemetryService>;
  let mockSettings: jasmine.SpyObj<SettingsService>;
  let mockFormulaScanner: jasmine.SpyObj<FormulaScannerService>;
  let mockQueryApi: jasmine.SpyObj<QueryApiMockService>;
  let mockQueryState: jasmine.SpyObj<QueryStateService>;
  let mockConfigs: jasmine.SpyObj<QueryConfigurationService>;
  let mockQueue: jasmine.SpyObj<QueryQueueService>;
  let mockApiCatalog: jasmine.SpyObj<ApiCatalogService>;

  let configsSubject: BehaviorSubject<QueryConfiguration[]>;
  let progressSubject: BehaviorSubject<{ total: number; completed: number; currentItemId: string | null }>;

  beforeEach(() => {
    configsSubject = new BehaviorSubject<QueryConfiguration[]>([]);
    progressSubject = new BehaviorSubject<{ total: number; completed: number; currentItemId: string | null }>({ total: 0, completed: 0, currentItemId: null });

    mockExcel = jasmine.createSpyObj("ExcelService", ["upsertQueryTable", "setCalculationMode"], {
      isExcel: false,
    });

    mockAuth = jasmine.createSpyObj("AuthService", [], {
      roles: ["analyst"],
    });

    mockTelemetry = jasmine.createSpyObj("TelemetryService", [
      "logEvent",
      "createFeatureEvent",
      "createWorkflowEvent",
    ]);
    mockTelemetry.createFeatureEvent.and.callFake((e: any) => ({ ...e, category: e.category || "ui" }));
    mockTelemetry.createWorkflowEvent.and.callFake((e: any) => ({ ...e, category: e.category || "query" }));

    mockSettings = jasmine.createSpyObj("SettingsService", [], {
      value: {
        queryExecution: { disableFormulasDuringRun: true },
      },
    });

    mockFormulaScanner = jasmine.createSpyObj("FormulaScannerService", [
      "checkQueryImpact",
      "scanWorkbook",
      "generateReportCsv",
    ]);

    // Phase 1: Updated to use executeApi instead of deprecated executeQuery
    mockQueryApi = jasmine.createSpyObj("QueryApiMockService", ["executeApi"]);
    mockQueryApi.executeApi.and.returnValue(Promise.resolve([]));

    mockQueryState = jasmine.createSpyObj("QueryStateService", ["getGlobalParams", "setLastRun"], {
      snapshot: { queryParams: {} },
    });
    mockQueryState.getGlobalParams.and.returnValue({});

    mockConfigs = jasmine.createSpyObj("QueryConfigurationService", ["save", "get", "softDelete"], {
      configs$: configsSubject.asObservable(),
    });

    mockQueue = jasmine.createSpyObj("QueryQueueService", ["runBatch"], {
      progress$: progressSubject.asObservable(),
    });

    mockApiCatalog = jasmine.createSpyObj("ApiCatalogService", ["getApisByRole"]);
    mockApiCatalog.getApisByRole.and.returnValue([
      { id: "sales-summary", name: "Sales Summary", parameters: [] },
      { id: "top-customers", name: "Top Customers", parameters: [] },
    ]);

    TestBed.configureTestingModule({
      imports: [QueriesComponent],
      providers: [
        { provide: ExcelService, useValue: mockExcel },
        { provide: AuthService, useValue: mockAuth },
        { provide: TelemetryService, useValue: mockTelemetry },
        { provide: SettingsService, useValue: mockSettings },
        { provide: FormulaScannerService, useValue: mockFormulaScanner },
        { provide: QueryApiMockService, useValue: mockQueryApi },
        { provide: QueryStateService, useValue: mockQueryState },
        { provide: QueryConfigurationService, useValue: mockConfigs },
        { provide: QueryQueueService, useValue: mockQueue },
        { provide: ApiCatalogService, useValue: mockApiCatalog },
      ],
    });

    component = TestBed.createComponent(QueriesComponent).componentInstance;
  });

  describe("initialization", () => {
    it("should create", () => {
      expect(component).toBeTruthy();
    });

    it("should filter APIs by user roles", () => {
      expect(mockApiCatalog.getApisByRole).toHaveBeenCalledWith(["analyst"]);
      expect(component.apis.length).toBe(2);
    });

    it("should populate addApiItems from filtered APIs", () => {
      expect(component.addApiItems.length).toBe(2);
      expect(component.addApiItems[0].value).toBe("sales-summary");
    });

    it("should subscribe to configs$", () => {
      configsSubject.next([{ id: "cfg-1", name: "Test Config", items: [], parameterPresets: { global: {}, perQuery: {} } }]);
      expect(component.savedConfigs.length).toBe(1);
    });

    it("should subscribe to queue progress$", () => {
      progressSubject.next({ total: 5, completed: 2, currentItemId: "item-1" });
      expect(component.queueTotal).toBe(5);
      expect(component.queueCompleted).toBe(2);
      expect(component.queueCurrentItemId).toBe("item-1");
    });

    it("should log feature loaded event", () => {
      expect(mockTelemetry.logEvent).toHaveBeenCalled();
    });
  });

  describe("canAddSelected", () => {
    it("should return false when no API selected", () => {
      component.selectedApiId = null;
      component.newTargetSheetName = "Sheet1";
      component.newTargetTableName = "Table1";
      expect(component.canAddSelected).toBeFalse();
    });

    it("should return false when no sheet name", () => {
      component.selectedApiId = "sales-summary";
      component.newTargetSheetName = "";
      component.newTargetTableName = "Table1";
      expect(component.canAddSelected).toBeFalse();
    });

    it("should return false when no table name", () => {
      component.selectedApiId = "sales-summary";
      component.newTargetSheetName = "Sheet1";
      component.newTargetTableName = "";
      expect(component.canAddSelected).toBeFalse();
    });

    it("should return true when all fields provided", () => {
      component.selectedApiId = "sales-summary";
      component.newTargetSheetName = "Sheet1";
      component.newTargetTableName = "Table1";
      expect(component.canAddSelected).toBeTrue();
    });
  });

  describe("onSelectedApiChange", () => {
    it("should set selectedApiId", () => {
      component.onSelectedApiChange("top-customers");
      expect(component.selectedApiId).toBe("top-customers");
    });

    it("should set newDisplayName from API name", () => {
      component.onSelectedApiChange("top-customers");
      expect(component.newDisplayName).toBe("Top Customers");
    });

    it("should handle unknown API gracefully", () => {
      component.onSelectedApiChange("unknown-api");
      expect(component.selectedApiId).toBe("unknown-api");
      expect(component.newDisplayName).toBe("");
    });
  });

  describe("addSelected", () => {
    beforeEach(() => {
      component.selectedApiId = "sales-summary";
      component.newDisplayName = "My Sales Report";
      component.newTargetSheetName = "Reports";
      component.newTargetTableName = "SalesTable";
      component.newWriteMode = "overwrite";
      component.newIncludeInBatch = true;
    });

    it("should add item to selectedItems", () => {
      component.addSelected();
      expect(component.selectedItems.length).toBe(1);
      expect(component.selectedItems[0].apiId).toBe("sales-summary");
    });

    it("should reset form after adding", () => {
      component.addSelected();
      expect(component.selectedApiId).toBeNull();
      expect(component.newDisplayName).toBe("");
      expect(component.newTargetSheetName).toBe("");
    });

    it("should not add if missing fields", () => {
      component.selectedApiId = null;
      component.addSelected();
      expect(component.selectedItems.length).toBe(0);
    });

    it("should log telemetry event", () => {
      component.addSelected();
      expect(mockTelemetry.logEvent).toHaveBeenCalled();
    });
  });

  describe("startEdit/cancelEdit/saveEdit", () => {
    const testItem: QueryConfigurationItem = {
      id: "item-1",
      apiId: "sales-summary",
      displayName: "Sales",
      parameters: {},
      targetSheetName: "Sheet1",
      targetTableName: "Table1",
      writeMode: "overwrite",
      includeInBatch: true,
    };

    beforeEach(() => {
      component.selectedItems = [testItem];
    });

    it("should populate editing fields on startEdit", () => {
      component.startEdit(testItem);
      expect(component.editingItem).toBe(testItem);
      expect(component.editingDisplayName).toBe("Sales");
      expect(component.editingTargetSheetName).toBe("Sheet1");
    });

    it("should clear editingItem on cancelEdit", () => {
      component.startEdit(testItem);
      component.cancelEdit();
      expect(component.editingItem).toBeNull();
    });

    it("should update item on saveEdit", () => {
      component.startEdit(testItem);
      component.editingDisplayName = "Updated Sales";
      component.editingTargetSheetName = "NewSheet";
      component.saveEdit();
      expect(component.selectedItems[0].displayName).toBe("Updated Sales");
      expect(component.selectedItems[0].targetSheetName).toBe("NewSheet");
      expect(component.editingItem).toBeNull();
    });

    it("should not save if no editingItem", () => {
      component.editingItem = null;
      component.saveEdit();
      expect(mockTelemetry.logEvent).toHaveBeenCalled();
    });
  });

  describe("saveCurrentConfiguration", () => {
    beforeEach(() => {
      component.selectedItems = [
        {
          id: "item-1",
          apiId: "sales-summary",
          displayName: "Sales",
          parameters: {},
          targetSheetName: "Sheet1",
          targetTableName: "Table1",
          writeMode: "overwrite",
          includeInBatch: true,
        },
      ];
      component.configName = "My Config";
    });

    it("should save configuration via service", () => {
      component.saveCurrentConfiguration();
      expect(mockConfigs.save).toHaveBeenCalled();
    });

    it("should set selectedConfigId after save", () => {
      component.saveCurrentConfiguration();
      expect(component.selectedConfigId).toBeTruthy();
    });

    it("should not save if no items", () => {
      component.selectedItems = [];
      component.saveCurrentConfiguration();
      expect(mockConfigs.save).not.toHaveBeenCalled();
    });
  });

  describe("loadConfiguration", () => {
    it("should load configuration from service", () => {
      const config: QueryConfiguration = {
        id: "cfg-1",
        name: "Test Config",
        items: [
          {
            id: "item-1",
            apiId: "sales-summary",
            displayName: "Sales",
            parameters: {},
            targetSheetName: "Sheet1",
            targetTableName: "Table1",
            writeMode: "overwrite",
            includeInBatch: true,
          },
        ],
        parameterPresets: { global: {}, perQuery: {} },
      };
      mockConfigs.get.and.returnValue(config);

      component.loadConfiguration("cfg-1");

      expect(component.selectedConfigId).toBe("cfg-1");
      expect(component.configName).toBe("Test Config");
      expect(component.selectedItems.length).toBe(1);
    });

    it("should do nothing if config not found", () => {
      mockConfigs.get.and.returnValue(undefined);
      component.loadConfiguration("non-existent");
      expect(component.selectedConfigId).toBeNull();
    });
  });

  describe("deleteConfiguration", () => {
    it("should call softDelete on service", () => {
      component.deleteConfiguration("cfg-1");
      expect(mockConfigs.softDelete).toHaveBeenCalledWith("cfg-1");
    });

    it("should clear selectedConfigId if deleted config was selected", () => {
      component.selectedConfigId = "cfg-1";
      component.deleteConfiguration("cfg-1");
      expect(component.selectedConfigId).toBeNull();
    });

    it("should not clear selectedConfigId if different config deleted", () => {
      component.selectedConfigId = "cfg-2";
      component.deleteConfiguration("cfg-1");
      expect(component.selectedConfigId).toBe("cfg-2");
    });
  });

  describe("runCurrentConfiguration", () => {
    it("should not run if not in Excel", async () => {
      Object.defineProperty(mockExcel, "isExcel", { value: false });
      component.selectedItems = [
        {
          id: "item-1",
          apiId: "sales-summary",
          displayName: "Sales",
          parameters: {},
          targetSheetName: "Sheet1",
          targetTableName: "Table1",
          writeMode: "overwrite",
          includeInBatch: true,
        },
      ];

      await component.runCurrentConfiguration();

      expect(mockQueue.runBatch).not.toHaveBeenCalled();
    });

    it("should not run if no items", async () => {
      Object.defineProperty(mockExcel, "isExcel", { value: true });
      component.selectedItems = [];

      await component.runCurrentConfiguration();

      expect(mockQueue.runBatch).not.toHaveBeenCalled();
    });
  });

  describe("ngOnDestroy", () => {
    it("should complete destroy$ subject", () => {
      const destroySpy = spyOn(component["destroy$"], "next");
      const completeSpy = spyOn(component["destroy$"], "complete");

      component.ngOnDestroy();

      expect(destroySpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });
  });

  describe("debugState", () => {
    it("should return current state", () => {
      component.selectedApiId = "test-api";
      component.queueTotal = 5;
      component.queueCompleted = 2;

      const state = component.debugState;

      expect(state.selectedApiId).toBe("test-api");
      expect(state.queue.total).toBe(5);
      expect(state.queue.completed).toBe(2);
    });
  });
});
