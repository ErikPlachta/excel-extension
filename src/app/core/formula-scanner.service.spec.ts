import { TestBed } from "@angular/core/testing";
import { FormulaScannerService } from "./formula-scanner.service";
import { ExcelService } from "./excel.service";
import { TelemetryService } from "./telemetry.service";

describe("FormulaScannerService", () => {
  let service: FormulaScannerService;
  let excelSpy: jasmine.SpyObj<ExcelService>;
  let telemetrySpy: jasmine.SpyObj<TelemetryService>;

  beforeEach(() => {
    excelSpy = jasmine.createSpyObj("ExcelService", [], { isExcel: false });
    telemetrySpy = jasmine.createSpyObj("TelemetryService", ["logEvent", "normalizeError"]);

    TestBed.configureTestingModule({
      providers: [
        FormulaScannerService,
        { provide: ExcelService, useValue: excelSpy },
        { provide: TelemetryService, useValue: telemetrySpy },
      ],
    });

    service = TestBed.inject(FormulaScannerService);
  });

  describe("parseTableColumnReferences", () => {
    it("parses basic Table[Column] references", () => {
      const refs = service.parseTableColumnReferences("=SUM(Sales[Amount])");
      expect(refs.length).toBe(1);
      expect(refs[0].tableName).toBe("Sales");
      expect(refs[0].columnName).toBe("Amount");
    });

    it("parses multiple references in same formula", () => {
      const refs = service.parseTableColumnReferences("=Sales[Amount]+Products[Price]");
      expect(refs.length).toBe(2);
      expect(refs[0].tableName).toBe("Sales");
      expect(refs[0].columnName).toBe("Amount");
      expect(refs[1].tableName).toBe("Products");
      expect(refs[1].columnName).toBe("Price");
    });

    it("parses @ (this row) references", () => {
      const refs = service.parseTableColumnReferences("=Sales[@Amount]*Sales[@Quantity]");
      expect(refs.length).toBe(2);
      expect(refs[0].columnName).toBe("Amount");
      expect(refs[1].columnName).toBe("Quantity");
    });

    it("parses columns with spaces", () => {
      const refs = service.parseTableColumnReferences("=SUM(Sales[Total Amount])");
      expect(refs.length).toBe(1);
      expect(refs[0].columnName).toBe("Total Amount");
    });

    it("parses double-bracket column references", () => {
      const refs = service.parseTableColumnReferences("=Sales[[Column1]]");
      expect(refs.length).toBe(1);
      expect(refs[0].tableName).toBe("Sales");
      expect(refs[0].columnName).toBe("Column1");
    });

    it("skips # special items like #Headers, #All", () => {
      const refs = service.parseTableColumnReferences("=INDIRECT(Sales[#Headers])");
      expect(refs.length).toBe(0);
    });

    it("handles table names starting with underscore", () => {
      const refs = service.parseTableColumnReferences("=_Table1[Column1]");
      expect(refs.length).toBe(1);
      expect(refs[0].tableName).toBe("_Table1");
    });

    it("returns empty array for formulas without table refs", () => {
      const refs = service.parseTableColumnReferences("=SUM(A1:A10)");
      expect(refs.length).toBe(0);
    });

    it("returns empty array for non-formula strings", () => {
      const refs = service.parseTableColumnReferences("plain text");
      expect(refs.length).toBe(0);
    });
  });

  describe("scanWorkbook (host-agnostic)", () => {
    it("returns error when not running in Excel", async () => {
      const result = await service.scanWorkbook();
      expect(result.ok).toBe(false);
      if (!result.ok && result.error) {
        expect(result.error.operation).toBe("scanWorkbook");
        expect(result.error.message).toContain("Excel is not available");
      }
    });

    it("does not call telemetry.normalizeError when Excel is not available", async () => {
      await service.scanWorkbook();
      expect(telemetrySpy.normalizeError).not.toHaveBeenCalled();
    });
  });

  describe("checkQueryImpact (host-agnostic)", () => {
    it("returns error when not running in Excel", async () => {
      const result = await service.checkQueryImpact("query1", "Table1");
      expect(result.ok).toBe(false);
      if (!result.ok && result.error) {
        expect(result.error.operation).toBe("scanWorkbook");
      }
    });
  });

  describe("getTableDependencies (host-agnostic)", () => {
    it("returns error when not running in Excel", async () => {
      const result = await service.getTableDependencies();
      expect(result.ok).toBe(false);
    });
  });

  describe("generateReportCsv", () => {
    it("generates valid CSV with headers", () => {
      const csv = service.generateReportCsv([]);
      expect(csv).toBe("Sheet,Cell,Formula,Table,Column\n");
    });

    it("generates CSV rows for dependencies", () => {
      const csv = service.generateReportCsv([
        {
          sheetName: "Sheet1",
          cellAddress: "B2",
          formula: "=SUM(Sales[Amount])",
          tableName: "Sales",
          columnName: "Amount",
        },
      ]);
      expect(csv).toContain("Sheet,Cell,Formula,Table,Column\n");
      expect(csv).toContain('"Sheet1","B2","=SUM(Sales[Amount])","Sales","Amount"');
    });

    it("escapes double quotes in fields", () => {
      const csv = service.generateReportCsv([
        {
          sheetName: 'Sheet "1"',
          cellAddress: "A1",
          formula: '="Test"',
          tableName: "Table1",
          columnName: "Col",
        },
      ]);
      expect(csv).toContain('Sheet ""1""');
      expect(csv).toContain('=""Test""');
    });

    it("handles missing column name", () => {
      const csv = service.generateReportCsv([
        {
          sheetName: "Sheet1",
          cellAddress: "A1",
          formula: "=Table1[]",
          tableName: "Table1",
        },
      ]);
      expect(csv).toContain('""'); // Empty column at end
    });
  });

  describe("clearCache", () => {
    it("logs telemetry event when clearing cache", () => {
      service.clearCache();
      expect(telemetrySpy.logEvent).toHaveBeenCalledWith(
        jasmine.objectContaining({
          category: "formula",
          name: "clearCache",
        })
      );
    });
  });
});
