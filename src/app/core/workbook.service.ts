import { Injectable } from "@angular/core";
import { ExcelService } from "./excel.service";
import { QueryDefinition } from "../shared/query-model";
import { WorkbookOwnershipInfo, WorkbookTableInfo } from "../types";

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
   * Resolves the table that should be used for a query run,
   * preferring an existing extension-managed table when present
   * and otherwise falling back to the default table name.
   *
   * This does not perform any mutations; callers are still
   * responsible for actually creating/updating the table via
   * Excel APIs. The intent is to centralize ownership decisions
   * so features do not need to reason about conflicting user
   * tables themselves.
   */
  async getOrCreateManagedTableTarget(
    query: QueryDefinition
  ): Promise<{ sheetName: string; tableName: string; existing?: WorkbookTableInfo } | null> {
    if (!this.isExcel) return null;

    const [tables, ownership] = await Promise.all([this.getTables(), this.getOwnership()]);

    const existingManaged = tables.find((t) => this.isManagedForQuery(ownership, t, query.id));
    if (existingManaged) {
      return {
        sheetName: existingManaged.worksheet,
        tableName: existingManaged.name,
        existing: existingManaged,
      };
    }

    const defaultTableName = query.defaultTableName;
    const conflictingUserTable = tables.find((t) => t.name === defaultTableName);

    if (conflictingUserTable) {
      // Respect user content by choosing a new, extension-specific
      // name based on the query id.
      const safeName = `${defaultTableName}_${query.id}`;
      return {
        sheetName: query.defaultSheetName,
        tableName: safeName,
      };
    }

    return {
      sheetName: query.defaultSheetName,
      tableName: defaultTableName,
    };
  }
}
