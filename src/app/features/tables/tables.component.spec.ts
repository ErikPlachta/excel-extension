import { TestBed } from "@angular/core/testing";
import { TablesComponent } from "./tables.component";
import { WorkbookService } from "../../core/workbook.service";
import { TelemetryService } from "../../core/telemetry.service";

describe("TablesComponent", () => {
  let component: TablesComponent;
  let mockWorkbook: jasmine.SpyObj<WorkbookService>;
  let mockTelemetry: jasmine.SpyObj<TelemetryService>;

  beforeEach(() => {
    mockWorkbook = jasmine.createSpyObj("WorkbookService", ["getTables", "getOwnership"], {
      isExcel: false,
    });
    mockWorkbook.getTables.and.returnValue(Promise.resolve([]));
    mockWorkbook.getOwnership.and.returnValue(Promise.resolve([]));

    mockTelemetry = jasmine.createSpyObj("TelemetryService", ["logEvent"]);

    TestBed.configureTestingModule({
      imports: [TablesComponent],
      providers: [
        { provide: WorkbookService, useValue: mockWorkbook },
        { provide: TelemetryService, useValue: mockTelemetry },
      ],
    });

    component = TestBed.createComponent(TablesComponent).componentInstance;
  });

  describe("initialization", () => {
    it("should create", () => {
      expect(component).toBeTruthy();
    });

    it("should initialize with empty tables array", () => {
      expect(component.tables).toEqual([]);
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
    it("should load tables from workbook service", async () => {
      mockWorkbook.getTables.and.returnValue(
        Promise.resolve([
          { name: "Table1", worksheet: "Sheet1", rows: 100 },
          { name: "Table2", worksheet: "Sheet2", rows: 50 },
        ])
      );
      mockWorkbook.getOwnership.and.returnValue(Promise.resolve([]));

      await component.ngOnInit();

      expect(component.tables.length).toBe(2);
      expect(component.tables[0]["name"]).toBe("Table1");
    });

    it("should mark managed tables correctly", async () => {
      mockWorkbook.getTables.and.returnValue(
        Promise.resolve([
          { name: "ManagedTable", worksheet: "Sheet1", rows: 100 },
          { name: "UserTable", worksheet: "Sheet2", rows: 50 },
        ])
      );
      mockWorkbook.getOwnership.and.returnValue(
        Promise.resolve([
          { sheetName: "Sheet1", tableName: "ManagedTable", isManaged: true, queryId: "q1", lastTouchedUtc: "" },
        ])
      );

      await component.ngOnInit();

      expect(component.tables[0]["isManaged"]).toBeTrue();
      expect(component.tables[1]["isManaged"]).toBeFalse();
    });

    it("should set loadError on failure", async () => {
      mockWorkbook.getTables.and.rejectWith(new Error("API error"));

      await component.ngOnInit();

      expect(component.loadError).toBe("Failed to load tables");
    });

    it("should log telemetry on error", async () => {
      mockWorkbook.getTables.and.rejectWith(new Error("API error"));

      await component.ngOnInit();

      expect(mockTelemetry.logEvent).toHaveBeenCalledWith(
        jasmine.objectContaining({
          category: "excel",
          name: "tables.load.error",
          severity: "error",
        })
      );
    });

    it("should not set loadError on success", async () => {
      mockWorkbook.getTables.and.returnValue(Promise.resolve([]));
      mockWorkbook.getOwnership.and.returnValue(Promise.resolve([]));

      await component.ngOnInit();

      expect(component.loadError).toBeNull();
    });
  });
});
