import { ExcelService } from "./excel.service";
import { TelemetryService } from "./telemetry.service";
import { SettingsService } from "./settings.service";
import { QueryDefinition, QueryRunLocation } from "../shared/query-model";
import { ExecuteQueryResultRow } from "../shared/query-api-mock.service";
import { ExcelOperationResult } from "../types";

describe("ExcelService.upsertQueryTable (host-agnostic behavior)", () => {
  let service: ExcelService;
  let telemetrySpy: jasmine.SpyObj<TelemetryService>;
  let settingsSpy: jasmine.SpyObj<SettingsService>;

  beforeEach(() => {
    telemetrySpy = jasmine.createSpyObj<TelemetryService>("TelemetryService", [
      "normalizeError",
      "logEvent",
    ]);

    settingsSpy = jasmine.createSpyObj<SettingsService>("SettingsService", [], {
      value: {
        telemetry: {
          enableWorkbookLogging: false,
          enableConsoleLogging: true,
        },
        queryExecution: {
          maxRowsPerQuery: 10000,
          chunkSize: 1000,
          enableProgressiveLoading: true,
          apiPageSize: 1000,
          chunkBackoffMs: 100,
          disableFormulasDuringRun: true,
        },
      },
    });

    // In unit tests we are not running inside Excel, so
    // upsertQueryTable should short-circuit with a typed error
    // result instead of throwing.
    service = new ExcelService(telemetrySpy, settingsSpy);

    // Ensure the global Office object is absent so isExcel === false.
    (globalThis as unknown as { Office?: unknown }).Office = undefined;
  });

  function createQuery(writeMode: "overwrite" | "append"): QueryDefinition {
    return {
      id: "q-test",
      name: "Test Query",
      description: "",
      defaultSheetName: "Sheet1",
      defaultTableName: "tbl_Test",
      parameters: [],
      writeMode,
    } as QueryDefinition;
  }

  function createRows(): ExecuteQueryResultRow[] {
    return [
      { Id: 1, Name: "Alice" },
      { Id: 2, Name: "Bob" },
    ];
  }

  async function callUpsert(
    writeMode: "overwrite" | "append",
    locationHint?: Partial<QueryRunLocation>
  ): Promise<ExcelOperationResult<QueryRunLocation>> {
    const query = createQuery(writeMode);
    const rows = createRows();
    return service.upsertQueryTable(query, rows, locationHint);
  }

  it("returns a typed error when not running inside Excel (overwrite)", async () => {
    const result = await callUpsert("overwrite");

    expect(result.ok).toBeFalse();
    const error = result.error as NonNullable<typeof result.error>;

    expect(error.operation).toBe("upsertQueryTable");
    expect(error.message).toContain("Excel is not available");
    expect(telemetrySpy.logEvent).not.toHaveBeenCalled();
  });

  it("returns a typed error when not running inside Excel (append)", async () => {
    const result = await callUpsert("append");

    expect(result.ok).toBeFalse();
    const error = result.error as NonNullable<typeof result.error>;

    expect(error.operation).toBe("upsertQueryTable");
    expect(error.message).toContain("Excel is not available");
    expect(telemetrySpy.logEvent).not.toHaveBeenCalled();
  });

  it("does not attempt geometry decisions when Excel is not available (overwrite)", async () => {
    const result = await callUpsert("overwrite");

    expect(result.ok).toBeFalse();
    expect(telemetrySpy.logEvent).not.toHaveBeenCalled();
  });

  it("does not attempt geometry decisions when Excel is not available (append)", async () => {
    const result = await callUpsert("append");

    expect(result.ok).toBeFalse();
    expect(telemetrySpy.logEvent).not.toHaveBeenCalled();
  });
});

describe("ExcelService.setCalculationMode (host-agnostic behavior)", () => {
  let service: ExcelService;
  let telemetrySpy: jasmine.SpyObj<TelemetryService>;
  let settingsSpy: jasmine.SpyObj<SettingsService>;

  beforeEach(() => {
    telemetrySpy = jasmine.createSpyObj<TelemetryService>("TelemetryService", [
      "normalizeError",
      "logEvent",
    ]);

    settingsSpy = jasmine.createSpyObj<SettingsService>("SettingsService", [], {
      value: {
        telemetry: {
          enableWorkbookLogging: false,
          enableConsoleLogging: true,
        },
        queryExecution: {
          maxRowsPerQuery: 10000,
          chunkSize: 1000,
          enableProgressiveLoading: true,
          apiPageSize: 1000,
          chunkBackoffMs: 100,
          disableFormulasDuringRun: true,
        },
      },
    });

    service = new ExcelService(telemetrySpy, settingsSpy);
    (globalThis as unknown as { Office?: unknown }).Office = undefined;
  });

  it("returns a typed error when not running inside Excel", async () => {
    const result = await service.setCalculationMode("Manual");

    expect(result.ok).toBeFalse();
    const error = result.error as NonNullable<typeof result.error>;
    expect(error.operation).toBe("setCalculationMode");
    expect(error.message).toContain("Excel is not available");
  });

  it("does not call telemetry when Excel is not available", async () => {
    await service.setCalculationMode("Automatic");

    expect(telemetrySpy.logEvent).not.toHaveBeenCalled();
  });
});

describe("ExcelService.getCalculationMode (host-agnostic behavior)", () => {
  let service: ExcelService;
  let telemetrySpy: jasmine.SpyObj<TelemetryService>;
  let settingsSpy: jasmine.SpyObj<SettingsService>;

  beforeEach(() => {
    telemetrySpy = jasmine.createSpyObj<TelemetryService>("TelemetryService", [
      "normalizeError",
      "logEvent",
    ]);

    settingsSpy = jasmine.createSpyObj<SettingsService>("SettingsService", [], {
      value: {
        telemetry: {
          enableWorkbookLogging: false,
          enableConsoleLogging: true,
        },
        queryExecution: {
          maxRowsPerQuery: 10000,
          chunkSize: 1000,
          enableProgressiveLoading: true,
          apiPageSize: 1000,
          chunkBackoffMs: 100,
          disableFormulasDuringRun: true,
        },
      },
    });

    service = new ExcelService(telemetrySpy, settingsSpy);
    (globalThis as unknown as { Office?: unknown }).Office = undefined;
  });

  it("returns a typed error when not running inside Excel", async () => {
    const result = await service.getCalculationMode();

    expect(result.ok).toBeFalse();
    const error = result.error as NonNullable<typeof result.error>;
    expect(error.operation).toBe("getCalculationMode");
    expect(error.message).toContain("Excel is not available");
  });
});

describe("ExcelService.CalculationMode constants", () => {
  it("exposes Automatic mode constant", () => {
    expect(ExcelService.CalculationMode.Automatic).toBe("Automatic");
  });

  it("exposes Manual mode constant", () => {
    expect(ExcelService.CalculationMode.Manual).toBe("Manual");
  });
});
