import { TestBed } from "@angular/core/testing";
import { SettingsService } from "./settings.service";

describe("SettingsService", () => {
  let service: SettingsService;

  beforeEach(() => {
    // Clear any persisted settings to ensure a clean slate per test.
    localStorage.removeItem("excel-extension.settings");

    TestBed.configureTestingModule({
      providers: [SettingsService],
    });

    service = TestBed.inject(SettingsService);
  });

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

    const reloaded = new SettingsService();
    expect(reloaded.value.telemetry.enableWorkbookLogging).toBeTrue();
    expect(reloaded.value.telemetry.enableConsoleLogging).toBeFalse();
  });
});
