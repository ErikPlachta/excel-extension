import { Injectable } from "@angular/core";
import { ExcelService } from "./excel.service";
import {
  WorkbookOwnershipInfo,
  WorkbookTableInfo,
} from "@excel-platform/shared/types";

/**
 * Provides a typed, feature-friendly abstraction over workbook state.
 *
 * `WorkbookService` is the preferred entry point for code that needs
 * to reason about worksheets, tables, or extension ownership. It
 * delegates all Office.js calls to `ExcelService` and exposes
 * strongly-typed models (`WorkbookTableInfo`, `WorkbookOwnershipInfo`)
 * so features never have to deal with raw Excel objects.
 */
@Injectable({ providedIn: "root" })
export class WorkbookService {
  constructor(private readonly excel: ExcelService) {}

  get isExcel(): boolean {
    return this.excel.isExcel;
  }

  /**
   * Returns the list of worksheet names in the current workbook.
   *
   * Outside Excel this resolves to an empty array, mirroring the
   * behavior of `ExcelService.getWorksheets`.
   */
  async getSheets(): Promise<string[]> {
    return this.excel.getWorksheets();
  }

  /**
   * Returns a lightweight description of all tables in the workbook.
   */
  async getTables(): Promise<WorkbookTableInfo[]> {
    return this.excel.getWorkbookTables();
  }

  /**
   * Looks up a table by name, returning undefined when the table
   * cannot be found in the workbook.
   */
  async getTableByName(name: string): Promise<WorkbookTableInfo | undefined> {
    const tables = await this.getTables();
    return tables.find((t) => t.name === name);
  }

  /**
   * Returns ownership metadata for tables in the workbook.
   *
   * Ownership information is used by higher-level features to avoid
   * overwriting user-managed tables and to find tables that belong
   * to a specific query.
   */
  async getOwnership(): Promise<WorkbookOwnershipInfo[]> {
    return this.excel.getWorkbookOwnership();
  }

  /**
   * Determines whether the given table is considered extension-managed
   * based on ownership metadata.
   */
  async isExtensionManagedTable(table: WorkbookTableInfo): Promise<boolean> {
    const ownership = await this.getOwnership();
    return ownership.some(
      (o) => o.tableName === table.name && o.sheetName === table.worksheet && o.isManaged
    );
  }

  /**
   * Returns tables that are managed by the extension for a given query.
   */
  async getManagedTablesForQuery(queryId: string): Promise<WorkbookTableInfo[]> {
    const [tables, ownership] = await Promise.all([this.getTables(), this.getOwnership()]);
    const managedNames = new Set(
      ownership
        .filter((o) => o.queryId === queryId && o.isManaged)
        .map((o) => `${o.sheetName}::${o.tableName}`)
    );
    return tables.filter((t) => managedNames.has(`${t.worksheet}::${t.name}`));
  }

  /**
   * Returns true if any ownership record marks the given table as
   * extension-managed for the provided query.
   *
   * This helper is kept private to centralize the matching logic
   * while leaving a simpler public API on the service.
   */
  private isManagedForQuery(
    ownership: WorkbookOwnershipInfo[],
    table: WorkbookTableInfo,
    queryId: string
  ): boolean {
    return ownership.some(
      (o) =>
        o.isManaged &&
        o.queryId === queryId &&
        o.tableName === table.name &&
        o.sheetName === table.worksheet
    );
  }

  /**
   * Retrieves an existing extension-managed table for the given
   * query, or returns undefined when none are found.
   */
  async getManagedTableForQuery(queryId: string): Promise<WorkbookTableInfo | undefined> {
    const [tables, ownership] = await Promise.all([this.getTables(), this.getOwnership()]);
    return tables.find((t) => this.isManagedForQuery(ownership, t, queryId));
  }

  /**
   * Resolves the target sheet/table for a query execution.
   *
   * This method encapsulates ownership lookup and conflict resolution:
   * 1. Returns existing managed table if one exists for this apiId
   * 2. Avoids conflicts with user-created tables by suffixing
   * 3. Returns the requested target if no conflicts
   *
   * @param apiId - The API identifier for ownership lookup
   * @param target - Requested target sheet and table names
   * @returns Resolved target with isExisting flag, or null outside Excel
   */
  async resolveTableTarget(
    apiId: string,
    target: { sheetName: string; tableName: string }
  ): Promise<{ sheetName: string; tableName: string; isExisting: boolean } | null> {
    if (!this.isExcel) return null;

    const [tables, ownership] = await Promise.all([this.getTables(), this.getOwnership()]);

    // Check for existing managed table for this API
    const existingManaged = tables.find((t) =>
      ownership.some(
        (o) =>
          o.isManaged &&
          o.queryId === apiId &&
          o.tableName === t.name &&
          o.sheetName === t.worksheet
      )
    );

    if (existingManaged) {
      return {
        sheetName: existingManaged.worksheet,
        tableName: existingManaged.name,
        isExisting: true,
      };
    }

    // Check for user table conflict
    const conflictingUserTable = tables.find((t) => t.name === target.tableName);
    const safeTableName = conflictingUserTable
      ? `${target.tableName}_${apiId}`
      : target.tableName;

    return {
      sheetName: target.sheetName,
      tableName: safeTableName,
      isExisting: false,
    };
  }

  /**
   * Records ownership for a table, creating or updating the ownership
   * metadata in `_Extension_Ownership`.
   *
   * This marks the table as extension-managed and associates it with
   * the given query ID. Subsequent calls update the `lastTouchedUtc`
   * timestamp.
   *
   * @param info - Ownership information including sheet name, table name,
   * and query ID.
   */
  async recordOwnership(info: {
    sheetName: string;
    tableName: string;
    queryId: string;
  }): Promise<void> {
    if (!this.isExcel) return;
    await this.excel.writeOwnershipRecord(info);
  }

  /**
   * Updates the `lastTouchedUtc` timestamp for an existing ownership
   * record without changing other fields.
   *
   * This is useful when a table is modified but ownership details
   * remain the same.
   *
   * @param queryId - The query ID that owns the table.
   * @param sheetName - The worksheet containing the table.
   * @param tableName - The table name.
   */
  async updateOwnership(queryId: string, sheetName: string, tableName: string): Promise<void> {
    if (!this.isExcel) return;
    await this.excel.writeOwnershipRecord({ queryId, sheetName, tableName });
  }

  /**
   * Removes the ownership record for a table, unmarking it as
   * extension-managed.
   *
   * This does not delete the table itself; it only removes the
   * ownership metadata. Use this when the extension no longer manages
   * a table or when cleaning up after table deletion.
   *
   * @param queryId - The query ID that owns the table.
   * @param sheetName - The worksheet containing the table.
   * @param tableName - The table name.
   */
  async deleteOwnership(queryId: string, sheetName: string, tableName: string): Promise<void> {
    if (!this.isExcel) return;
    await this.excel.deleteOwnershipRecord({ queryId, sheetName, tableName });
  }
}
