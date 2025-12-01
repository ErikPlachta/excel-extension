import { TestBed } from "@angular/core/testing";
import { SettingsService } from "./settings.service";
import { StorageBaseService } from "@excel-platform/data/storage";

describe("SettingsService", () => {
  let service: SettingsService;

  beforeEach(() => {
    // Clear any persisted settings to ensure a clean slate per test.
    localStorage.removeItem("excel-extension.settings");

    TestBed.configureTestingModule({
      providers: [SettingsService, StorageBaseService],
    });

    service = TestBed.inject(SettingsService);
  });

  describe("telemetry settings", () => {
    it("uses default telemetry settings when no stored value exists", () => {
      expect(service.value.telemetry.enableWorkbookLogging).toBeFalse();
      expect(service.value.telemetry.enableConsoleLogging).toBeTrue();
      expect(service.value.telemetry.logWorksheetName).toBe("_Extension_Log");
      expect(service.value.telemetry.logTableName).toBe("_Extension_Log_Table");
    });

    it("persists telemetry settings updates", () => {
      service.update({
        telemetry: {
          ...service.value.telemetry,
          enableWorkbookLogging: true,
          enableConsoleLogging: false,
        },
      });

      // Create new instance via TestBed to verify persistence
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [SettingsService, StorageBaseService],
      });
      const reloaded = TestBed.inject(SettingsService);
      expect(reloaded.value.telemetry.enableWorkbookLogging).toBeTrue();
      expect(reloaded.value.telemetry.enableConsoleLogging).toBeFalse();
    });
  });

  describe("queryExecution settings", () => {
    it("uses default query execution settings when no stored value exists", () => {
      const queryExec = service.value.queryExecution;
      expect(queryExec?.maxRowsPerQuery).toBe(10000);
      expect(queryExec?.chunkSize).toBe(1000);
      expect(queryExec?.enableProgressiveLoading).toBeTrue();
    });

    it("persists maxRowsPerQuery updates", () => {
      const currentQE = service.value.queryExecution!;
      service.update({
        queryExecution: { ...currentQE, maxRowsPerQuery: 5000 },
      });

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [SettingsService, StorageBaseService],
      });
      const reloaded = TestBed.inject(SettingsService);
      expect(reloaded.value.queryExecution?.maxRowsPerQuery).toBe(5000);
    });

    it("persists chunkSize updates", () => {
      const currentQE = service.value.queryExecution!;
      service.update({
        queryExecution: { ...currentQE, chunkSize: 500 },
      });

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [SettingsService, StorageBaseService],
      });
      const reloaded = TestBed.inject(SettingsService);
      expect(reloaded.value.queryExecution?.chunkSize).toBe(500);
    });

    it("persists enableProgressiveLoading updates", () => {
      const currentQE = service.value.queryExecution!;
      service.update({
        queryExecution: { ...currentQE, enableProgressiveLoading: false },
      });

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [SettingsService, StorageBaseService],
      });
      const reloaded = TestBed.inject(SettingsService);
      expect(reloaded.value.queryExecution?.enableProgressiveLoading).toBeFalse();
    });
  });

  describe("deep merge behavior", () => {
    it("should deep merge nested objects without overwriting unset properties", () => {
      // Update only maxRowsPerQuery
      const currentQE = service.value.queryExecution!;
      service.update({
        queryExecution: { ...currentQE, maxRowsPerQuery: 2000 },
      });

      // chunkSize should still be default
      expect(service.value.queryExecution?.chunkSize).toBe(1000);
      expect(service.value.queryExecution?.maxRowsPerQuery).toBe(2000);
    });

    it("should preserve telemetry settings when updating queryExecution", () => {
      // First, enable workbook logging
      service.update({
        telemetry: {
          ...service.value.telemetry,
          enableWorkbookLogging: true,
        },
      });

      // Then update query execution
      const currentQE = service.value.queryExecution!;
      service.update({
        queryExecution: { ...currentQE, maxRowsPerQuery: 3000 },
      });

      // Both settings should be preserved
      expect(service.value.telemetry.enableWorkbookLogging).toBeTrue();
      expect(service.value.queryExecution?.maxRowsPerQuery).toBe(3000);
    });
  });

  describe("persistence", () => {
    it("should store settings in localStorage", () => {
      const currentQE = service.value.queryExecution!;
      service.update({
        queryExecution: { ...currentQE, maxRowsPerQuery: 7500 },
      });

      const stored = localStorage.getItem("excel-extension.settings");
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(parsed.queryExecution.maxRowsPerQuery).toBe(7500);
    });

    it("should handle corrupted localStorage gracefully", () => {
      localStorage.setItem("excel-extension.settings", "invalid json{{{");

      // Should not throw, should use defaults
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [SettingsService, StorageBaseService],
      });
      const newService = TestBed.inject(SettingsService);
      expect(newService.value.telemetry.enableConsoleLogging).toBeTrue();
    });
  });
});
