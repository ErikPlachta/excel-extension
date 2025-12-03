import { TestBed } from "@angular/core/testing";
import { WorkbookService } from "./workbook.service";
import { ExcelService } from "./excel.service";
import { WorkbookOwnershipInfo, WorkbookTableInfo } from "@excel-platform/shared/types";

describe("WorkbookService ownership helpers", () => {
  let workbook: WorkbookService;
  let excelSpy: jasmine.SpyObj<ExcelService>;

  beforeEach(() => {
    excelSpy = jasmine.createSpyObj<ExcelService>("ExcelService", [
      "getWorkbookOwnership",
      "getWorkbookTables",
      "writeOwnershipRecord",
      "deleteOwnershipRecord",
    ]);

    // Simulate running inside Excel so resolveTableTarget
    // exercises its non-null path in this suite.
    (excelSpy as any).isExcel = true;

    workbook = new WorkbookService(excelSpy as unknown as ExcelService);
  });

  describe("getOwnership", () => {
    it("maps ExcelService ownership rows into WorkbookOwnershipInfo[]", async () => {
      const ownershipRows: WorkbookOwnershipInfo[] = [
        {
          sheetName: "Sheet1",
          tableName: "tbl_Sales",
          queryId: "sales-summary",
          isManaged: true,
          lastTouchedUtc: "2025-11-17T12:00:00Z",
        },
        {
          sheetName: "Sheet2",
          tableName: "tbl_Inventory",
          queryId: "inventory",
          isManaged: false,
          lastTouchedUtc: "2025-11-17T13:00:00Z",
        },
      ];

      excelSpy.getWorkbookOwnership.and.resolveTo(ownershipRows);

      const result = await workbook.getOwnership();

      expect(result.length).toBe(2);
      expect(result[0].sheetName).toBe("Sheet1");
      expect(result[0].isManaged).toBeTrue();
      expect(result[1].isManaged).toBeFalse();
      expect(excelSpy.getWorkbookOwnership).toHaveBeenCalled();
    });
  });

  describe("isExtensionManagedTable", () => {
    it("returns true only when ownership marks the table as managed", async () => {
      const ownershipRows: WorkbookOwnershipInfo[] = [
        {
          sheetName: "Sheet1",
          tableName: "tbl_Q1Sales",
          queryId: "q1-sales",
          isManaged: true,
          lastTouchedUtc: "2025-11-17T12:00:00Z",
        },
      ];

      excelSpy.getWorkbookOwnership.and.resolveTo(ownershipRows);

      const tables: WorkbookTableInfo[] = [
        {
          name: "tbl_Q1Sales",
          worksheet: "Sheet1",
          rows: 10,
        },
        {
          name: "tbl_Other",
          worksheet: "Sheet1",
          rows: 5,
        },
      ];

      excelSpy.getWorkbookTables.and.resolveTo(tables);

      const managed = await workbook.isExtensionManagedTable(tables[0]);
      const unmanaged = await workbook.isExtensionManagedTable(tables[1]);

      expect(managed).toBeTrue();
      expect(unmanaged).toBeFalse();
    });
  });

  describe("getManagedTablesForQuery", () => {
    it("filters tables by queryId and isManaged flag", async () => {
      const ownershipRows: WorkbookOwnershipInfo[] = [
        {
          sheetName: "Sheet1",
          tableName: "tbl_Q1Sales",
          queryId: "q1-sales",
          isManaged: true,
          lastTouchedUtc: "2025-11-17T12:00:00Z",
        },
        {
          sheetName: "Sheet2",
          tableName: "tbl_Q2Sales",
          queryId: "q2-sales",
          isManaged: true,
          lastTouchedUtc: "2025-11-17T12:30:00Z",
        },
        {
          sheetName: "Sheet3",
          tableName: "tbl_Q1Sales_Manual",
          queryId: "q1-sales",
          isManaged: false,
          lastTouchedUtc: "2025-11-17T13:00:00Z",
        },
      ];

      const tables: WorkbookTableInfo[] = [
        { name: "tbl_Q1Sales", worksheet: "Sheet1", rows: 10 },
        { name: "tbl_Q2Sales", worksheet: "Sheet2", rows: 8 },
        { name: "tbl_Q1Sales_Manual", worksheet: "Sheet3", rows: 3 },
      ];

      excelSpy.getWorkbookOwnership.and.resolveTo(ownershipRows);
      excelSpy.getWorkbookTables.and.resolveTo(tables);

      const result = await workbook.getManagedTablesForQuery("q1-sales");

      expect(result.length).toBe(1);
      expect(result[0].name).toBe("tbl_Q1Sales");
      expect(result[0].worksheet).toBe("Sheet1");
    });
  });


  describe("recordOwnership", () => {
    it("delegates to ExcelService.writeOwnershipRecord with ownership info", async () => {
      excelSpy.writeOwnershipRecord.and.resolveTo();

      await workbook.recordOwnership({
        sheetName: "Sheet1",
        tableName: "tbl_Sales",
        queryId: "q1-sales",
      });

      expect(excelSpy.writeOwnershipRecord).toHaveBeenCalledWith({
        sheetName: "Sheet1",
        tableName: "tbl_Sales",
        queryId: "q1-sales",
      });
    });

    it("is a no-op when not in Excel", async () => {
      (excelSpy as any).isExcel = false;

      await workbook.recordOwnership({
        sheetName: "Sheet1",
        tableName: "tbl_Sales",
        queryId: "q1-sales",
      });

      expect(excelSpy.writeOwnershipRecord).not.toHaveBeenCalled();
    });
  });

  describe("updateOwnership", () => {
    it("delegates to ExcelService.writeOwnershipRecord to update timestamp", async () => {
      excelSpy.writeOwnershipRecord.and.resolveTo();

      await workbook.updateOwnership("q1-sales", "Sheet1", "tbl_Sales");

      expect(excelSpy.writeOwnershipRecord).toHaveBeenCalledWith({
        queryId: "q1-sales",
        sheetName: "Sheet1",
        tableName: "tbl_Sales",
      });
    });

    it("is a no-op when not in Excel", async () => {
      (excelSpy as any).isExcel = false;

      await workbook.updateOwnership("q1-sales", "Sheet1", "tbl_Sales");

      expect(excelSpy.writeOwnershipRecord).not.toHaveBeenCalled();
    });
  });

  describe("deleteOwnership", () => {
    it("delegates to ExcelService.deleteOwnershipRecord", async () => {
      excelSpy.deleteOwnershipRecord.and.resolveTo();

      await workbook.deleteOwnership("q1-sales", "Sheet1", "tbl_Sales");

      expect(excelSpy.deleteOwnershipRecord).toHaveBeenCalledWith({
        queryId: "q1-sales",
        sheetName: "Sheet1",
        tableName: "tbl_Sales",
      });
    });

    it("is a no-op when not in Excel", async () => {
      (excelSpy as any).isExcel = false;

      await workbook.deleteOwnership("q1-sales", "Sheet1", "tbl_Sales");

      expect(excelSpy.deleteOwnershipRecord).not.toHaveBeenCalled();
    });
  });

  describe("resolveTableTarget", () => {
    it("returns existing managed table when one exists for apiId", async () => {
      const ownershipRows: WorkbookOwnershipInfo[] = [
        {
          sheetName: "Sheet1",
          tableName: "tbl_Sales",
          queryId: "sales-api",
          isManaged: true,
          lastTouchedUtc: "2025-11-26T12:00:00Z",
        },
      ];
      const tables: WorkbookTableInfo[] = [
        { name: "tbl_Sales", worksheet: "Sheet1", rows: 10 },
      ];

      excelSpy.getWorkbookOwnership.and.resolveTo(ownershipRows);
      excelSpy.getWorkbookTables.and.resolveTo(tables);

      const result = await workbook.resolveTableTarget("sales-api", {
        sheetName: "NewSheet",
        tableName: "tbl_NewTable",
      });

      expect(result).toEqual({
        sheetName: "Sheet1",
        tableName: "tbl_Sales",
        isExisting: true,
      });
    });

    it("returns requested target when no conflicts", async () => {
      excelSpy.getWorkbookOwnership.and.resolveTo([]);
      excelSpy.getWorkbookTables.and.resolveTo([]);

      const result = await workbook.resolveTableTarget("new-api", {
        sheetName: "MySheet",
        tableName: "tbl_MyTable",
      });

      expect(result).toEqual({
        sheetName: "MySheet",
        tableName: "tbl_MyTable",
        isExisting: false,
      });
    });

    it("returns suffixed table name when user table conflicts", async () => {
      const tables: WorkbookTableInfo[] = [
        { name: "tbl_Sales", worksheet: "UserSheet", rows: 5 },
      ];

      excelSpy.getWorkbookOwnership.and.resolveTo([]);
      excelSpy.getWorkbookTables.and.resolveTo(tables);

      const result = await workbook.resolveTableTarget("sales-api", {
        sheetName: "Sheet1",
        tableName: "tbl_Sales",
      });

      expect(result).toEqual({
        sheetName: "Sheet1",
        tableName: "tbl_Sales_sales-api",
        isExisting: false,
      });
    });

    it("returns null when not in Excel", async () => {
      (excelSpy as any).isExcel = false;

      const result = await workbook.resolveTableTarget("api", {
        sheetName: "Sheet1",
        tableName: "tbl_Test",
      });

      expect(result).toBeNull();
    });
  });
});

// TODO: Add TSDocs for WorkbookService and its methods.
class ExcelServiceStub {
  isExcel = true;
  getWorksheets = jasmine
    .createSpy("getWorksheets")
    .and.returnValue(Promise.resolve(["Sheet1", "Sheet2"]));
  getTables = jasmine.createSpy("getTables").and.returnValue(
    Promise.resolve([
      { name: "Table1", worksheet: "Sheet1", rows: 10 },
      { name: "Table2", worksheet: "Sheet2", rows: 5 },
    ])
  );
  getWorkbookTables = jasmine.createSpy("getWorkbookTables").and.callFake(this.getTables);
  getWorkbookOwnership = jasmine
    .createSpy("getWorkbookOwnership")
    .and.returnValue(Promise.resolve([]));
}

describe("WorkbookService", () => {
  let service: WorkbookService;
  let excelStub: ExcelServiceStub;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [WorkbookService, { provide: ExcelService, useClass: ExcelServiceStub }],
    });

    service = TestBed.inject(WorkbookService);
    excelStub = TestBed.inject(ExcelService) as unknown as ExcelServiceStub;
  });

  it("should expose isExcel from ExcelService", () => {
    expect(service.isExcel).toBeTrue();
    excelStub.isExcel = false;
    expect(service.isExcel).toBeFalse();
  });

  it("should delegate getSheets to ExcelService.getWorksheets", async () => {
    const sheets = await service.getSheets();
    expect(excelStub.getWorksheets).toHaveBeenCalled();
    expect(sheets).toEqual(["Sheet1", "Sheet2"]);
  });

  it("should delegate getTables to ExcelService.getTables", async () => {
    const tables = await service.getTables();
    expect(excelStub.getWorkbookTables).toHaveBeenCalled();
    expect(tables.length).toBe(2);
    expect(tables[0].name).toBe("Table1");
  });

  it("should find a table by name via getTableByName", async () => {
    const table = await service.getTableByName("Table2");
    expect(table).toEqual({ name: "Table2", worksheet: "Sheet2", rows: 5 });

    const missing = await service.getTableByName("Missing");
    expect(missing).toBeUndefined();
  });

  it("should treat tables as unmanaged when no ownership metadata exists", async () => {
    const table = (await service.getTables())[0]!;
    const managed = await service.isExtensionManagedTable(table);
    expect(managed).toBeFalse();
  });

  it("should return managed tables for a query when ownership exists", async () => {
    excelStub.getWorkbookOwnership.and.returnValue(
      Promise.resolve([
        {
          tableName: "Table2",
          sheetName: "Sheet2",
          queryId: "q-1",
          isManaged: true,
          lastTouchedUtc: "2025-01-01T00:00:00Z",
        },
      ])
    );

    const tables = await service.getManagedTablesForQuery("q-1");
    expect(tables.length).toBe(1);
    expect(tables[0].name).toBe("Table2");
  });

  it("should prefer an existing managed table for a query when resolving targets", async () => {
    excelStub.getWorkbookOwnership.and.returnValue(
      Promise.resolve([
        {
          tableName: "Table1",
          sheetName: "Sheet1",
          queryId: "q-1",
          isManaged: true,
          lastTouchedUtc: "2025-01-01T00:00:00Z",
        },
      ])
    );

    const target = await service.resolveTableTarget("q-1", {
      sheetName: "Sheet1",
      tableName: "Table1",
    });

    expect(target).toEqual({
      sheetName: "Sheet1",
      tableName: "Table1",
      isExisting: true,
    });
  });

  it("should avoid clobbering user tables with default names when resolving targets", async () => {
    const target = await service.resolveTableTarget("q-2", {
      sheetName: "Sheet1",
      tableName: "Table1",
    });

    expect(target).toEqual({
      sheetName: "Sheet1",
      tableName: "Table1_q-2",
      isExisting: false,
    });
  });
});
