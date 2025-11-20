import { ComponentFixture, TestBed } from "@angular/core/testing";
import { QueryHomeComponent } from "./query-home-old.component";
import { AuthService, ExcelService, TelemetryService } from "../../core";
import {
  ExecuteQueryParams,
  GroupingOptionsResult,
  QueryApiMockService,
} from "../../shared/query-api-mock.service";
import { QueryStateService } from "../../shared/query-state.service";
import { QueryDefinition } from "../../shared/query-model";

class AuthServiceStub {
  roles: string[] = [];
  isAuthenticated = true;

  hasAnyRole(roles: string[]): boolean {
    return roles.some((r) => this.roles.includes(r));
  }

  hasRole(role: string): boolean {
    return this.roles.includes(role);
  }
}

class TelemetryServiceStub {
  logEvent = jasmine.createSpy("logEvent");
  createWorkflowEvent(input: unknown): unknown {
    return input;
  }
}

describe("QueryHomeComponent role visibility and execution", () => {
  let fixture: ComponentFixture<QueryHomeComponent>;
  let component: QueryHomeComponent;
  let authStub: AuthServiceStub;
  let excelStub: { isExcel: boolean; upsertQueryTable: jasmine.Spy };
  let apiStub: jasmine.SpyObj<QueryApiMockService>;
  let telemetryStub: TelemetryServiceStub;

  beforeEach(async () => {
    authStub = new AuthServiceStub();
    excelStub = {
      isExcel: false,
      upsertQueryTable: jasmine.createSpy("upsertQueryTable"),
    };

    apiStub = jasmine.createSpyObj<QueryApiMockService>("QueryApiMockService", [
      "getQueries",
      "getQueryById",
      "executeQuery",
      "getGroupingOptions",
    ]);

    const mockQueries: QueryDefinition[] = [
      {
        id: "sales-summary",
        name: "Sales Summary",
        description: "",
        parameterKeys: ["StartDate", "EndDate", "Group", "SubGroup"],
        parameters: [],
        defaultSheetName: "Sales_Summary",
        defaultTableName: "tbl_SalesSummary",
      },
    ];

    apiStub.getQueries.and.returnValue(mockQueries);
    apiStub.getGroupingOptions.and.resolveTo({
      groups: ["Consumer", "Enterprise"],
      subGroups: ["North", "South"],
    } as GroupingOptionsResult);

    telemetryStub = new TelemetryServiceStub();

    await TestBed.configureTestingModule({
      imports: [QueryHomeComponent],
      providers: [
        { provide: AuthService, useValue: authStub },
        { provide: ExcelService, useValue: excelStub },
        { provide: TelemetryService, useValue: telemetryStub },
        { provide: QueryApiMockService, useValue: apiStub },
        QueryStateService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(QueryHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("disallows running queries when user has no analyst/admin role", async () => {
    excelStub.isExcel = true;
    authStub.roles = [];
    const query: QueryDefinition = {
      id: "q1",
      name: "Test",
      description: "",
      parameters: [],
      defaultSheetName: "Sheet1",
      defaultTableName: "Table1",
    };

    await component.runQuery(query);

    expect(component["error"]).toContain("do not have permission");
  });

  it("allows running queries when user is analyst", async () => {
    authStub.roles = ["analyst"];
    excelStub.isExcel = true;
    apiStub.executeQuery.and.resolveTo({
      query: apiStub.getQueries()[0] as QueryDefinition,
      rows: [],
    });
    excelStub.upsertQueryTable.and.resolveTo({
      ok: true,
      value: { sheetName: "Sheet1", tableName: "Table1" },
    } as any);
    // Use the configured mock query so state and execution align.
    const query = apiStub.getQueries()[0];

    await component.runQuery(query as QueryDefinition);

    expect(component["error"]).toBeNull();
  });

  it("builds execute params from global values when running selected queries in global mode", async () => {
    excelStub.isExcel = true;
    authStub.roles = ["analyst"];

    // Ensure at least one query is selected for batch run
    component.onRunFlagChange(apiStub.getQueries()[0] as QueryDefinition, true);

    // Seed global params that should be used for execution
    component.onGlobalDateChange("StartDate", "2024-01-01");
    component.onGlobalDateChange("EndDate", "2024-12-31");

    apiStub.executeQuery.and.callFake(async (_id: string, params?: ExecuteQueryParams) => {
      const p = params ?? {};
      // Expect the effective params to reflect global values
      expect(p["StartDate"] ?? p["startDate"]).toBe("2024-01-01");
      expect(p["EndDate"] ?? p["endDate"]).toBe("2024-12-31");

      return {
        query: apiStub.getQueries()[0] as QueryDefinition,
        rows: [
          {
            AsOfDate: "2024-01-01",
            Group: "Consumer",
            SubGroup: "North",
            Region: "North",
            Year: 2024,
            Month: 1,
            Day: 1,
            Sales: 10000,
          },
        ],
      };
    });

    excelStub.upsertQueryTable.and.resolveTo({
      ok: true,
      value: { sheetName: "Sales_Summary", tableName: "tbl_SalesSummary" },
    } as any);

    await component.runSelected("global");

    expect(component["error"]).toBeNull();
  });

  it("prefers per-query overrides when running selected queries in unique mode", async () => {
    excelStub.isExcel = true;
    authStub.roles = ["analyst"];

    // Select the query for batch run
    const query = apiStub.getQueries()[0] as QueryDefinition;
    component.onRunFlagChange(query, true);

    // Seed global params that will be used as fallbacks
    component.onGlobalDateChange("StartDate", "2024-01-01");
    component.onGlobalDateChange("EndDate", "2024-12-31");

    // Open details and set per-query overrides
    component.openDetails(query);
    component.onOverrideChange("Group", "Consumer");
    component.onOverrideChange("SubGroup", "North");
    component.onSaveOverrides();

    apiStub.executeQuery.and.callFake(async (_id: string, params?: ExecuteQueryParams) => {
      const p = params ?? {};

      // Expect overrides to win over globals for Group/SubGroup
      expect(p["Group"]).toBe("Consumer");
      expect(p["SubGroup"]).toBe("North");
      // Globals should still apply for StartDate/EndDate
      expect(p["StartDate"] ?? p["startDate"]).toBe("2024-01-01");
      expect(p["EndDate"] ?? p["endDate"]).toBe("2024-12-31");

      return {
        query,
        rows: [],
      };
    });

    excelStub.upsertQueryTable.and.resolveTo({
      ok: true,
      value: { sheetName: "Sales_Summary", tableName: "tbl_SalesSummary" },
    } as any);

    await component.runSelected("unique");

    expect(component["error"]).toBeNull();
  });

  it("logs telemetry events when running a batch of queries", async () => {
    excelStub.isExcel = true;
    authStub.roles = ["analyst"];

    component.onRunFlagChange(apiStub.getQueries()[0] as QueryDefinition, true);

    apiStub.executeQuery.and.resolveTo({
      query: apiStub.getQueries()[0] as QueryDefinition,
      rows: [],
    });

    excelStub.upsertQueryTable.and.resolveTo({
      ok: true,
      value: { sheetName: "Sales_Summary", tableName: "tbl_SalesSummary" },
    } as any);

    await component.runSelected("global");

    const names = telemetryStub.logEvent.calls.all().map((c) => (c.args[0] as any).name);

    expect(names).toContain("query.batch.run.requested");
    expect(names).toContain("query.batch.run.completed");
  });

  it("loads grouping options into component state", async () => {
    excelStub.isExcel = true;

    await (
      component as unknown as { loadGroupingOptions: () => Promise<void> }
    ).loadGroupingOptions();

    expect(component["availableGroups"]).toEqual(["Consumer", "Enterprise"]);
    expect(component["availableSubGroups"]).toEqual(["North", "South"]);
  });

  it("only shows override controls for parameterKeys present on the selected query", () => {
    component.selectedQuery = {
      ...(apiStub.getQueries()[0] as QueryDefinition),
      parameterKeys: ["StartDate", "Group"],
    };

    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const html = compiled.textContent ?? "";

    // Details section should now be rendered inside the selected card
    expect(html).toContain("Overrides");
    expect(html).toContain("Start date override");
    expect(html).toContain("Group override");
  });
});
