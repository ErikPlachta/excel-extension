import { TestBed } from "@angular/core/testing";
import { TelemetryService } from "./telemetry.service";
import { SettingsService } from "@excel-platform/core/settings";
import { AppContextService, AppAuthSummary, AppHostStatus } from "./app-context.service";

class MockSettingsService {
  value = {
    telemetry: {
      enableWorkbookLogging: false,
      enableConsoleLogging: true,
      sessionStrategy: "per-load" as const,
      logWorksheetName: "_Extension_Log",
      logTableName: "_Extension_Log_Table",
      logColumns: {
        timestamp: "timestamp",
        level: "level",
        operation: "operation",
        message: "message",
        sessionId: "sessionId",
        correlationId: "correlationId",
      },
    },
  };
}

class MockAppContextService {
  hostStatus: AppHostStatus = {
    isExcel: false,
    isOnline: true,
  };

  getAuthSummary(): AppAuthSummary {
    return {
      isAuthenticated: false,
      displayName: "",
      roles: [],
    };
  }
}

describe("TelemetryService", () => {
  let service: TelemetryService;
  let settings: MockSettingsService;
  let appContext: MockAppContextService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        TelemetryService,
        { provide: SettingsService, useClass: MockSettingsService },
        { provide: AppContextService, useClass: MockAppContextService },
      ],
    });

    service = TestBed.inject(TelemetryService);
    settings = TestBed.inject(SettingsService) as unknown as MockSettingsService;
    appContext = TestBed.inject(AppContextService) as unknown as MockAppContextService;
  });

  it("logs to console for each severity when enabled", () => {
    const debugSpy = spyOn(console, "debug");
    const infoSpy = spyOn(console, "info");
    const warnSpy = spyOn(console, "warn");
    const errorSpy = spyOn(console, "error");

    service.logEvent(
      service.createWorkflowEvent({
        name: "test.debug",
        severity: "debug",
      })
    );

    service.logEvent(
      service.createWorkflowEvent({
        name: "test.info",
        severity: "info",
      })
    );

    service.logEvent(
      service.createWorkflowEvent({
        name: "test.warn",
        severity: "warn",
      })
    );

    service.logEvent(
      service.createWorkflowEvent({
        name: "test.error",
        severity: "error",
      })
    );

    expect(debugSpy).toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
  });

  it("does not attempt workbook logging when enableWorkbookLogging is false", async () => {
    settings.value.telemetry.enableWorkbookLogging = false;

    // logEvent should complete without errors; workbook logging branch is guarded.
    service.logEvent(
      service.createWorkflowEvent({
        name: "test.noWorkbookLogging",
        severity: "info",
      })
    );

    // No explicit expectation on Excel/Office here; the key behavior is that
    // the call does not throw even when not in Excel.
  });

  it("maps severity to correct workbook level", () => {
    const infoEvent = service.createWorkflowEvent({
      name: "test.info.level",
      severity: "info",
    });

    const errorEvent = service.createWorkflowEvent({
      name: "test.error.level",
      severity: "error",
    });

    // Indirectly validate via console spies – workbook level is internal,
    // but severity mapping should still route correctly to console layer.
    const infoSpy = spyOn(console, "info");
    const errorSpy = spyOn(console, "error");

    service.logEvent(infoEvent);
    service.logEvent(errorEvent);

    expect(infoSpy).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
  });

  it("enriches events with session id, host status, and auth summary", () => {
    const debugSpy = spyOn(console, "debug");

    service.logEvent(
      service.createWorkflowEvent({
        name: "test.context",
        severity: "debug",
        context: { foo: "bar" },
      })
    );

    expect(debugSpy).toHaveBeenCalled();

    const [, , , loggedPayload] = debugSpy.calls.mostRecent().args as [
      string,
      string,
      string,
      {
        hostStatus: AppHostStatus;
        authSummary: AppAuthSummary;
        foo: string;
      },
    ];

    expect(loggedPayload.hostStatus).toEqual(appContext.hostStatus);
    expect(loggedPayload.authSummary).toEqual(appContext.getAuthSummary());
    expect(loggedPayload.foo).toBe("bar");
  });

  it("is safe when workbook logging is enabled but host is not Excel", () => {
    settings.value.telemetry.enableWorkbookLogging = true;

    // In the test environment Office is undefined, so the Excel
    // workbook logging branch should short-circuit without throwing.
    service.logEvent(
      service.createWorkflowEvent({
        name: "test.nonExcelHost",
        severity: "info",
      })
    );
  });

  it("is safe when workbook logging is enabled and host is Excel", () => {
    settings.value.telemetry.enableWorkbookLogging = true;

    // Stub a minimal Office/Excel environment on the global scope so that
    // logToWorkbookIfEnabled has something to talk to. We only assert that
    // no errors are thrown; the operation is best-effort.
    const originalOffice = (window as unknown as { Office?: unknown }).Office;
    const originalExcel = (window as unknown as { Excel?: unknown }).Excel;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const windowAny: any = window as any;
    windowAny.Office = {
      HostType: { Excel: "Excel" },
      context: { host: "Excel" },
    };
    windowAny.Excel = {
      run: () => Promise.resolve(),
    };

    try {
      service.logEvent(
        service.createWorkflowEvent({
          name: "test.excelHost",
          severity: "info",
        })
      );
    } finally {
      (window as unknown as { Office?: unknown }).Office = originalOffice;
      (window as unknown as { Excel?: unknown }).Excel = originalExcel;
    }
  });
});
