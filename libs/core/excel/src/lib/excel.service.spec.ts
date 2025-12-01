import { TestBed } from "@angular/core/testing";
import { ExcelService } from "./excel.service";
import { TelemetryService } from "@excel-platform/core/telemetry";
import { SettingsService } from "@excel-platform/core/settings";

describe("ExcelService", () => {
  let service: ExcelService;
  let telemetrySpy: jasmine.SpyObj<TelemetryService>;
  let settingsSpy: jasmine.SpyObj<SettingsService>;

  beforeEach(() => {
    telemetrySpy = jasmine.createSpyObj("TelemetryService", ["logEvent", "normalizeError"]);
    settingsSpy = jasmine.createSpyObj("SettingsService", [], {
      value: { queryExecution: { chunkSize: 1000, chunkBackoffMs: 100 } },
    });

    TestBed.configureTestingModule({
      providers: [
        ExcelService,
        { provide: TelemetryService, useValue: telemetrySpy },
        { provide: SettingsService, useValue: settingsSpy },
      ],
    });

    service = TestBed.inject(ExcelService);
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });

  it("should return false for isExcel when not in Excel host", () => {
    expect(service.isExcel).toBeFalse();
  });

  describe("getWorksheets (outside Excel)", () => {
    it("should return empty array when not in Excel", async () => {
      const sheets = await service.getWorksheets();
      expect(sheets).toEqual([]);
    });
  });

  describe("getTables (outside Excel)", () => {
    it("should return empty array when not in Excel", async () => {
      const tables = await service.getTables();
      expect(tables).toEqual([]);
    });
  });

  describe("getWorkbookTables (outside Excel)", () => {
    it("should return empty array when not in Excel", async () => {
      const tables = await service.getWorkbookTables();
      expect(tables).toEqual([]);
    });
  });

  describe("getWorkbookOwnership (outside Excel)", () => {
    it("should return empty array when not in Excel", async () => {
      const ownership = await service.getWorkbookOwnership();
      expect(ownership).toEqual([]);
    });
  });

  describe("upsertQueryTable (outside Excel)", () => {
    it("should return error result when not in Excel", async () => {
      const result = await service.upsertQueryTable(
        "test-api",
        { sheetName: "Sheet1", tableName: "Table1" },
        []
      );

      expect(result.ok).toBeFalse();
      if (!result.ok) {
        expect(result.error?.operation).toBe("upsertQueryTable");
        expect(result.error?.message).toContain("Excel is not available");
      }
    });
  });

  describe("appendLogEntry (outside Excel)", () => {
    it("should be a no-op when not in Excel", async () => {
      await expectAsync(
        service.appendLogEntry({ level: "info", operation: "test", message: "test" })
      ).toBeResolved();
    });
  });

  describe("writeOwnershipRecord (outside Excel)", () => {
    it("should be a no-op when not in Excel", async () => {
      await expectAsync(
        service.writeOwnershipRecord({
          tableName: "Table1",
          sheetName: "Sheet1",
          queryId: "query-1",
        })
      ).toBeResolved();
    });
  });

  describe("deleteOwnershipRecord (outside Excel)", () => {
    it("should be a no-op when not in Excel", async () => {
      await expectAsync(
        service.deleteOwnershipRecord({
          tableName: "Table1",
          sheetName: "Sheet1",
          queryId: "query-1",
        })
      ).toBeResolved();
    });
  });

  describe("activateQueryLocation (outside Excel)", () => {
    it("should be a no-op when not in Excel", async () => {
      await expectAsync(
        service.activateQueryLocation({ sheetName: "Sheet1", tableName: "Table1" })
      ).toBeResolved();
    });

    it("should be a no-op with null location", async () => {
      await expectAsync(service.activateQueryLocation(null)).toBeResolved();
    });
  });

  describe("setCalculationMode (outside Excel)", () => {
    it("should return error result when not in Excel", async () => {
      const result = await service.setCalculationMode("Manual");

      expect(result.ok).toBeFalse();
      if (!result.ok) {
        expect(result.error?.operation).toBe("setCalculationMode");
      }
    });
  });

  describe("getCalculationMode (outside Excel)", () => {
    it("should return error result when not in Excel", async () => {
      const result = await service.getCalculationMode();

      expect(result.ok).toBeFalse();
      if (!result.ok) {
        expect(result.error?.operation).toBe("getCalculationMode");
      }
    });
  });

  describe("purgeExtensionManagedContent (outside Excel)", () => {
    it("should be a no-op when not in Excel", async () => {
      await expectAsync(service.purgeExtensionManagedContent()).toBeResolved();
    });
  });

  describe("CalculationMode constant", () => {
    it("should have Automatic and Manual modes", () => {
      expect(ExcelService.CalculationMode.Automatic).toBe("Automatic");
      expect(ExcelService.CalculationMode.Manual).toBe("Manual");
    });
  });
});
