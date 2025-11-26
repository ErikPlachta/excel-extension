import { TestBed } from "@angular/core/testing";
import { WorksheetsComponent } from "./worksheets.component";
import { ExcelService } from "../../core/excel.service";
import { WorkbookService } from "../../core/workbook.service";
import { TelemetryService } from "../../core/telemetry.service";

describe("WorksheetsComponent", () => {
  let component: WorksheetsComponent;
  let mockExcel: jasmine.SpyObj<ExcelService>;
  let mockWorkbook: jasmine.SpyObj<WorkbookService>;
  let mockTelemetry: jasmine.SpyObj<TelemetryService>;

  beforeEach(() => {
    mockExcel = jasmine.createSpyObj("ExcelService", [], { isExcel: false });

    mockWorkbook = jasmine.createSpyObj("WorkbookService", ["getSheets"], {
      isExcel: false,
    });
    mockWorkbook.getSheets.and.returnValue(Promise.resolve([]));

    mockTelemetry = jasmine.createSpyObj("TelemetryService", ["logEvent"]);

    TestBed.configureTestingModule({
      imports: [WorksheetsComponent],
      providers: [
        { provide: ExcelService, useValue: mockExcel },
        { provide: WorkbookService, useValue: mockWorkbook },
        { provide: TelemetryService, useValue: mockTelemetry },
      ],
    });

    component = TestBed.createComponent(WorksheetsComponent).componentInstance;
  });

  describe("initialization", () => {
    it("should create", () => {
      expect(component).toBeTruthy();
    });

    it("should initialize with empty sheets array", () => {
      expect(component.sheets).toEqual([]);
    });

    it("should initialize with empty sheetsAsRows array", () => {
      expect(component.sheetsAsRows).toEqual([]);
    });

    it("should initialize with null loadError", () => {
      expect(component.loadError).toBeNull();
    });
  });

  describe("isExcel getter", () => {
    it("should return false when not in Excel", () => {
      expect(component.isExcel).toBeFalse();
    });

    it("should return true when in Excel", () => {
      Object.defineProperty(mockWorkbook, "isExcel", { value: true });
      expect(component.isExcel).toBeTrue();
    });
  });

  describe("ngOnInit", () => {
    it("should load sheets from workbook service", async () => {
      mockWorkbook.getSheets.and.returnValue(Promise.resolve(["Sheet1", "Sheet2", "Sheet3"]));

      await component.ngOnInit();

      expect(component.sheets).toEqual(["Sheet1", "Sheet2", "Sheet3"]);
    });

    it("should convert sheets to row format", async () => {
      mockWorkbook.getSheets.and.returnValue(Promise.resolve(["Sheet1", "Sheet2"]));

      await component.ngOnInit();

      expect(component.sheetsAsRows).toEqual([{ name: "Sheet1" }, { name: "Sheet2" }]);
    });

    it("should set loadError on failure", async () => {
      mockWorkbook.getSheets.and.rejectWith(new Error("API error"));

      await component.ngOnInit();

      expect(component.loadError).toBe("Failed to load worksheets");
    });

    it("should log telemetry on error", async () => {
      mockWorkbook.getSheets.and.rejectWith(new Error("API error"));

      await component.ngOnInit();

      expect(mockTelemetry.logEvent).toHaveBeenCalledWith(
        jasmine.objectContaining({
          category: "excel",
          name: "worksheets.load.error",
          severity: "error",
        })
      );
    });

    it("should not set loadError on success", async () => {
      mockWorkbook.getSheets.and.returnValue(Promise.resolve(["Sheet1"]));

      await component.ngOnInit();

      expect(component.loadError).toBeNull();
    });

    it("should handle empty sheets list", async () => {
      mockWorkbook.getSheets.and.returnValue(Promise.resolve([]));

      await component.ngOnInit();

      expect(component.sheets).toEqual([]);
      expect(component.sheetsAsRows).toEqual([]);
    });
  });
});
