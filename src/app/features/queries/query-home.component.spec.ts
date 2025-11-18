import { ComponentFixture, TestBed } from "@angular/core/testing";
import { QueryHomeComponent } from "./query-home.component";
import { AuthService, ExcelService } from "../../core";
import { QueryApiMockService } from "../../shared/query-api-mock.service";
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

describe("QueryHomeComponent role visibility", () => {
  let fixture: ComponentFixture<QueryHomeComponent>;
  let component: QueryHomeComponent;
  let authStub: AuthServiceStub;
  let excelStub: { isExcel: boolean; upsertQueryTable: jasmine.Spy };

  beforeEach(async () => {
    authStub = new AuthServiceStub();
    excelStub = {
      isExcel: false,
      upsertQueryTable: jasmine.createSpy("upsertQueryTable"),
    };

    await TestBed.configureTestingModule({
      imports: [QueryHomeComponent],
      providers: [
        { provide: AuthService, useValue: authStub },
        { provide: ExcelService, useValue: excelStub },
        QueryApiMockService,
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
    excelStub.upsertQueryTable.and.resolveTo({
      ok: true,
      value: { sheetName: "Sheet1", tableName: "Table1" },
    } as any);
    const query: QueryDefinition = {
      id: "sales-summary",
      name: "Sales",
      description: "",
      parameters: [],
      defaultSheetName: "Sales",
      defaultTableName: "SalesTable",
    };

    await component.runQuery(query);

    expect(component["error"]).toBeNull();
  });
});
