import { ExcelService } from "./excel.service";
import { TelemetryService } from "./telemetry.service";
import { QueryDefinition, QueryRunLocation } from "../shared/query-model";
import { ExecuteQueryResultRow } from "../shared/query-api-mock.service";
import { ExcelOperationResult } from "../types";

describe("ExcelService.upsertQueryTable (host-agnostic behavior)", () => {
  let service: ExcelService;
  let telemetrySpy: jasmine.SpyObj<TelemetryService>;

  beforeEach(() => {
    telemetrySpy = jasmine.createSpyObj<TelemetryService>("TelemetryService", [
      "normalizeError",
      "logEvent",
    ]);

    // In unit tests we are not running inside Excel, so
    // upsertQueryTable should short-circuit with a typed error
    // result instead of throwing.
    service = new ExcelService(telemetrySpy);

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
