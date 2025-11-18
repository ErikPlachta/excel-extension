import { TestBed } from "@angular/core/testing";
import { WorkbookService } from "./workbook.service";
import { ExcelService } from "./excel.service";

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

    const target = await service.getOrCreateManagedTableTarget({
      id: "q-1",
      name: "Query 1",
      description: "",
      defaultSheetName: "Sheet1",
      defaultTableName: "Table1",
      parameters: [],
    } as any);

    expect(target).toEqual({
      sheetName: "Sheet1",
      tableName: "Table1",
      existing: { name: "Table1", worksheet: "Sheet1", rows: 10 },
    });
  });

  it("should avoid clobbering user tables with default names when resolving targets", async () => {
    const target = await service.getOrCreateManagedTableTarget({
      id: "q-2",
      name: "Query 2",
      description: "",
      defaultSheetName: "Sheet1",
      defaultTableName: "Table1",
      parameters: [],
    } as any);

    expect(target).toEqual({
      sheetName: "Sheet1",
      tableName: "Table1_q-2",
    });
  });
});
