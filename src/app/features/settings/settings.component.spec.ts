import { TestBed } from "@angular/core/testing";
import { SettingsComponent } from "./settings.component";
import { SettingsService } from "@excel-platform/core/settings";
import { ExcelService } from "../../core/excel.service";
import { TelemetryService } from "@excel-platform/core/telemetry";
import { BackupRestoreService } from "../../shared/backup-restore.service";

describe("SettingsComponent", () => {
  let component: SettingsComponent;
  let mockSettings: jasmine.SpyObj<SettingsService>;
  let mockExcel: jasmine.SpyObj<ExcelService>;
  let mockTelemetry: jasmine.SpyObj<TelemetryService>;
  let mockBackupRestore: jasmine.SpyObj<BackupRestoreService>;

  beforeEach(() => {
    mockSettings = jasmine.createSpyObj("SettingsService", ["update"], {
      value: {
        telemetry: {
          enableWorkbookLogging: false,
          enableConsoleLogging: true,
          logWorksheetName: "_Extension_Log",
          logTableName: "_Extension_Log_Table",
        },
        queryExecution: {
          maxRowsPerQuery: 10000,
          chunkSize: 1000,
          enableProgressiveLoading: true,
        },
      },
    });

    mockExcel = jasmine.createSpyObj("ExcelService", ["purgeExtensionManagedContent"], {
      isExcel: false,
    });
    mockExcel.purgeExtensionManagedContent.and.returnValue(Promise.resolve());

    mockTelemetry = jasmine.createSpyObj("TelemetryService", ["logEvent", "createFeatureEvent"]);
    mockTelemetry.createFeatureEvent.and.callFake((e: any) => ({ ...e, category: e.category || "settings" }));

    mockBackupRestore = jasmine.createSpyObj("BackupRestoreService", ["exportBackup", "importBackup"]);
    mockBackupRestore.importBackup.and.returnValue(Promise.resolve());

    TestBed.configureTestingModule({
      imports: [SettingsComponent],
      providers: [
        { provide: SettingsService, useValue: mockSettings },
        { provide: ExcelService, useValue: mockExcel },
        { provide: TelemetryService, useValue: mockTelemetry },
        { provide: BackupRestoreService, useValue: mockBackupRestore },
      ],
    });

    component = TestBed.createComponent(SettingsComponent).componentInstance;
  });

  describe("initialization", () => {
    it("should create", () => {
      expect(component).toBeTruthy();
    });

    it("should expose settings service", () => {
      expect(component.settings).toBe(mockSettings);
    });
  });

  describe("onTelemetryWorkbookLoggingChange", () => {
    it("should update settings with new value", () => {
      component.onTelemetryWorkbookLoggingChange(true);
      expect(mockSettings.update).toHaveBeenCalledWith(
        jasmine.objectContaining({
          telemetry: jasmine.objectContaining({
            enableWorkbookLogging: true,
          }),
        })
      );
    });

    it("should log telemetry event", () => {
      component.onTelemetryWorkbookLoggingChange(true);
      expect(mockTelemetry.logEvent).toHaveBeenCalled();
    });
  });

  describe("onTelemetryConsoleLoggingChange", () => {
    it("should update settings with new value", () => {
      component.onTelemetryConsoleLoggingChange(false);
      expect(mockSettings.update).toHaveBeenCalledWith(
        jasmine.objectContaining({
          telemetry: jasmine.objectContaining({
            enableConsoleLogging: false,
          }),
        })
      );
    });

    it("should log telemetry event", () => {
      component.onTelemetryConsoleLoggingChange(false);
      expect(mockTelemetry.logEvent).toHaveBeenCalled();
    });
  });

  describe("onMaxRowsChange", () => {
    it("should update settings with valid value", () => {
      component.onMaxRowsChange("5000");
      expect(mockSettings.update).toHaveBeenCalledWith(
        jasmine.objectContaining({
          queryExecution: jasmine.objectContaining({
            maxRowsPerQuery: 5000,
          }),
        })
      );
    });

    it("should not update settings with invalid value", () => {
      component.onMaxRowsChange("invalid");
      expect(mockSettings.update).not.toHaveBeenCalled();
    });

    it("should not update settings with value less than 100", () => {
      component.onMaxRowsChange("50");
      expect(mockSettings.update).not.toHaveBeenCalled();
    });

    it("should log telemetry event on valid change", () => {
      component.onMaxRowsChange("5000");
      expect(mockTelemetry.logEvent).toHaveBeenCalled();
    });
  });

  describe("onChunkSizeChange", () => {
    it("should update settings with valid value", () => {
      component.onChunkSizeChange("500");
      expect(mockSettings.update).toHaveBeenCalledWith(
        jasmine.objectContaining({
          queryExecution: jasmine.objectContaining({
            chunkSize: 500,
          }),
        })
      );
    });

    it("should not update settings with invalid value", () => {
      component.onChunkSizeChange("invalid");
      expect(mockSettings.update).not.toHaveBeenCalled();
    });

    it("should not update settings with value less than 100", () => {
      component.onChunkSizeChange("50");
      expect(mockSettings.update).not.toHaveBeenCalled();
    });
  });

  describe("onProgressiveLoadingChange", () => {
    it("should update settings with new value", () => {
      component.onProgressiveLoadingChange(false);
      expect(mockSettings.update).toHaveBeenCalledWith(
        jasmine.objectContaining({
          queryExecution: jasmine.objectContaining({
            enableProgressiveLoading: false,
          }),
        })
      );
    });

    it("should log telemetry event", () => {
      component.onProgressiveLoadingChange(false);
      expect(mockTelemetry.logEvent).toHaveBeenCalled();
    });
  });

  describe("resetManagedTables", () => {
    it("should not call purge when not in Excel", async () => {
      Object.defineProperty(mockExcel, "isExcel", { value: false });
      await component.resetManagedTables();
      expect(mockExcel.purgeExtensionManagedContent).not.toHaveBeenCalled();
    });

    it("should call purge when in Excel", async () => {
      Object.defineProperty(mockExcel, "isExcel", { value: true });
      await component.resetManagedTables();
      expect(mockExcel.purgeExtensionManagedContent).toHaveBeenCalled();
    });
  });

  describe("exportBackup", () => {
    it("should call backupRestore.exportBackup", () => {
      component.exportBackup();
      expect(mockBackupRestore.exportBackup).toHaveBeenCalled();
    });

    it("should log telemetry event", () => {
      component.exportBackup();
      expect(mockTelemetry.logEvent).toHaveBeenCalled();
    });
  });

  describe("onFileSelected", () => {
    it("should import backup from selected file", async () => {
      const mockFile = new File(["{}"], "backup.json", { type: "application/json" });
      const mockInput = { files: [mockFile], value: "" } as unknown as HTMLInputElement;
      const mockEvent = { target: mockInput } as unknown as Event;

      await component.onFileSelected(mockEvent);

      expect(mockBackupRestore.importBackup).toHaveBeenCalledWith(mockFile);
      expect(mockTelemetry.logEvent).toHaveBeenCalled();
    });

    it("should do nothing if no files selected", async () => {
      const mockInput = { files: [] } as unknown as HTMLInputElement;
      const mockEvent = { target: mockInput } as unknown as Event;

      await component.onFileSelected(mockEvent);

      expect(mockBackupRestore.importBackup).not.toHaveBeenCalled();
    });

    it("should log error on import failure", async () => {
      mockBackupRestore.importBackup.and.rejectWith(new Error("Import failed"));
      const mockFile = new File(["{}"], "backup.json", { type: "application/json" });
      const mockInput = { files: [mockFile], value: "" } as unknown as HTMLInputElement;
      const mockEvent = { target: mockInput } as unknown as Event;

      await component.onFileSelected(mockEvent);

      expect(mockTelemetry.logEvent).toHaveBeenCalled();
    });

    it("should reset input value after selection", async () => {
      const mockFile = new File(["{}"], "backup.json", { type: "application/json" });
      const mockInput = { files: [mockFile], value: "backup.json" } as unknown as HTMLInputElement;
      const mockEvent = { target: mockInput } as unknown as Event;

      await component.onFileSelected(mockEvent);

      expect(mockInput.value).toBe("");
    });
  });
});
