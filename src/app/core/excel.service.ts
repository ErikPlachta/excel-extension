import { Injectable } from "@angular/core";
import { ExecuteQueryResultRow } from "../shared/query-api-mock.service";
import { QueryDefinition, QueryRunLocation } from "../shared/query-model";
import { WorkbookOwnershipInfo, WorkbookTableInfo } from "../types";

// TODO: Convert this to a proper Angular service wrapper around Office.js, multiple files, proper types, utilities, etc. to ensure stability and easy supportability. (I think #12 in todo covers this logic.)

// Office.js globals are provided at runtime by Excel; we keep them
// as any here and rely on isExcel guards to ensure safe access.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Office: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Excel: any;

@Injectable({ providedIn: "root" })
export class ExcelService {
  private officeReadyPromise: Promise<void> | null = null;

  get isExcel(): boolean {
    return typeof Office !== "undefined" && Office?.context?.host === Office.HostType.Excel;
  }

  private async ensureOfficeReady(): Promise<void> {
    if (!this.isExcel) return;

    if (!this.officeReadyPromise) {
      this.officeReadyPromise = new Promise<void>((resolve, reject) => {
        try {
          if (typeof Office !== "undefined" && typeof Office.onReady === "function") {
            Office.onReady(() => resolve());
          } else {
            resolve();
          }
        } catch (err) {
          reject(err);
        }
      });
    }

    return this.officeReadyPromise;
  }

  async getWorksheets(): Promise<string[]> {
    if (!this.isExcel) return [];
    await this.ensureOfficeReady();
    // Excel.run provides an untyped RequestContext from Office.js; we
    // treat it as any here but keep the surface area small.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Excel!.run(async (ctx: any) => {
      const sheets = ctx.workbook.worksheets.load("items/name");
      await ctx.sync();
      return sheets.items.map((s: any) => s.name);
    });
  }

  async getTables(): Promise<{ name: string; worksheet: string; rows: number }[]> {
    if (!this.isExcel) return [];
    await this.ensureOfficeReady();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Excel!.run(async (ctx: any) => {
      const tables = ctx.workbook.tables.load("items/name,items/worksheet,items/rows");
      await ctx.sync();

      for (const table of tables.items) {
        table.worksheet.load("name");
        table.rows.load("count");
      }

      await ctx.sync();

      return tables.items.map((t: any) => ({
        name: t.name,
        worksheet: t.worksheet.name,
        rows: t.rows.count,
      }));
    });
  }

  /**
   * Returns a lightweight description of all tables in the workbook.
   * This is a typed wrapper around `getTables` for use by
   * `WorkbookService` and features.
   */
  async getWorkbookTables(): Promise<WorkbookTableInfo[]> {
    const tables = await this.getTables();
    return tables.map((t) => ({ name: t.name, worksheet: t.worksheet, rows: t.rows }));
  }

  /**
   * Reads ownership metadata for extension-managed tables.
   *
   * Ownership is stored in a hidden worksheet named
   * "_Extension_Ownership" with a simple table layout:
   *
   *   A: sheetName
   *   B: tableName
   *   C: queryId
   *   D: isManaged ("true"/"false")
   *   E: lastTouchedUtc (ISO string)
   *
   * This sheet is created on demand and kept out of the way of
   * normal user content, so the model can be evolved without
   * affecting feature code.
   */
  async getWorkbookOwnership(): Promise<WorkbookOwnershipInfo[]> {
    if (!this.isExcel) return [];
    await this.ensureOfficeReady();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Excel!.run(async (ctx: any) => {
      const sheets = ctx.workbook.worksheets;
      const sheet = sheets.getItemOrNullObject("_Extension_Ownership");
      sheet.load("name");
      await ctx.sync();

      if (sheet.isNullObject) {
        return [];
      }

      const usedRange = sheet.getUsedRangeOrNullObject();
      await ctx.sync();

      if (usedRange.isNullObject) {
        return [];
      }
      usedRange.load("values");
      await ctx.sync();

      const values: unknown[][] = (usedRange.values as unknown[][]) || [];
      if (!values.length) return [];

      const [, ...rows] = values; // skip header row

      const ownership: WorkbookOwnershipInfo[] = rows
        .filter((r) => r && r.length >= 4)
        .map((r) => {
          const [sheetName, tableName, queryId, isManagedRaw, lastTouchedUtc] = r as string[];
          return {
            sheetName: sheetName ?? "",
            tableName: tableName ?? "",
            queryId: queryId || undefined,
            isManaged: String(isManagedRaw).toLowerCase() === "true",
            lastTouchedUtc: lastTouchedUtc || undefined,
          };
        })
        .filter((o) => o.sheetName && o.tableName);

      return ownership;
    });
  }

  async upsertQueryTable(
    query: QueryDefinition,
    rows: ExecuteQueryResultRow[],
    locationHint?: Partial<QueryRunLocation>
  ): Promise<QueryRunLocation | null> {
    if (!this.isExcel) return null;
    await this.ensureOfficeReady();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Excel!.run(async (ctx: any) => {
      const [tables, ownership] = await Promise.all([
        this.getWorkbookTables(),
        this.getWorkbookOwnership(),
      ]);

      const existingManaged = tables.find((t) =>
        ownership.some(
          (o) =>
            o.isManaged &&
            o.queryId === query.id &&
            o.tableName === t.name &&
            o.sheetName === t.worksheet
        )
      );

      const defaultSheetName = query.defaultSheetName;
      const defaultTableName = query.defaultTableName;

      const conflictingUserTable = tables.find((t) => t.name === defaultTableName);
      const safeTableName = conflictingUserTable
        ? `${defaultTableName}_${query.id}`
        : defaultTableName;

      const sheetName = locationHint?.sheetName ?? existingManaged?.worksheet ?? defaultSheetName;
      const tableName = locationHint?.tableName ?? existingManaged?.name ?? safeTableName;

      try {
        const worksheets = ctx.workbook.worksheets;
        let sheet = worksheets.getItemOrNullObject(sheetName);
        sheet.load("name");
        await ctx.sync();

        if (sheet.isNullObject) {
          sheet = worksheets.add(sheetName);
        }

        const usedRange = sheet.getUsedRangeOrNullObject();
        await ctx.sync();

        const hasExisting = !usedRange.isNullObject;
        const startCell = hasExisting ? usedRange.getLastRow().getCell(1, 0) : sheet.getRange("A1");

        const header = rows.length ? Object.keys(rows[0]) : [];
        const values = rows.map((r) => header.map((h) => r[h] ?? null));

        const totalRowCount = 1 + values.length;
        const totalColumnCount = header.length || 1;
        const dataRange = startCell.getResizedRange(totalRowCount - 1, totalColumnCount - 1);

        const allValues = [
          header.length ? header : ["Value"],
          ...(values.length ? values : [[null]]),
        ];

        dataRange.values = allValues;

        let table = ctx.workbook.tables.getItemOrNullObject(tableName);
        table.load("name");
        await ctx.sync();

        if (table.isNullObject) {
          table = ctx.workbook.tables.add(dataRange, true /* hasHeaders */);
          table.name = tableName;
        } else {
          table.resize(dataRange);
        }

        await ctx.sync();
      } catch (err) {
        // Re-throw so callers can surface a clean message.
        throw err;
      }

      // Track ownership for the table we just touched so that
      // future runs and navigation can safely treat it as
      // extension-managed. This is a placeholder implementation
      // that records ownership via an in-memory bridge; a future
      // revision can persist this to a hidden sheet or table
      // without changing the call site.
      await this.recordOwnership({ tableName, sheetName, queryId: query.id });

      return {
        sheetName,
        tableName,
      } as QueryRunLocation;
    });
  }

  private async recordOwnership(info: {
    tableName: string;
    sheetName: string;
    queryId: string;
  }): Promise<void> {
    if (!this.isExcel) return;
    await this.ensureOfficeReady();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await Excel!.run(async (ctx: any) => {
      const sheets = ctx.workbook.worksheets;
      let sheet = sheets.getItemOrNullObject("_Extension_Ownership");
      sheet.load("name");
      await ctx.sync();

      if (sheet.isNullObject) {
        sheet = sheets.add("_Extension_Ownership");
        sheet.visibility = Excel.SheetVisibility.veryHidden;

        const header = [["sheetName", "tableName", "queryId", "isManaged", "lastTouchedUtc"]];
        const headerRange = sheet.getRange("A1:E1");
        headerRange.values = header;
      }

      const usedRange = sheet.getUsedRangeOrNullObject();
      await ctx.sync();
      const values: unknown[][] = [];

      if (!usedRange.isNullObject) {
        usedRange.load("values");
        await ctx.sync();
        const raw = (usedRange.values as unknown[][]) || [];
        for (const row of raw) {
          values.push(row);
        }
      }

      const headerOffset = 1; // row index after header
      const now = new Date().toISOString();
      let rowIndex = -1;

      for (let i = headerOffset; i < values.length; i++) {
        const row = values[i];
        if (!row) continue;
        const [sheetName, tableName, queryId] = row as string[];
        if (
          sheetName === info.sheetName &&
          tableName === info.tableName &&
          queryId === info.queryId
        ) {
          rowIndex = i;
          break;
        }
      }

      const targetRow = rowIndex === -1 ? values.length : rowIndex;
      const range = sheet.getRange(`A${targetRow + 1}:E${targetRow + 1}`);
      range.values = [[info.sheetName, info.tableName, info.queryId, "true", now]];

      await ctx.sync();
    });
  }

  async activateQueryLocation(location: QueryRunLocation | undefined | null): Promise<void> {
    if (!this.isExcel || !location) return;
    await this.ensureOfficeReady();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await Excel!.run(async (ctx: any) => {
      const sheet = ctx.workbook.worksheets.getItem(location.sheetName);
      sheet.activate();

      const table = ctx.workbook.tables.getItem(location.tableName);
      table.getRange().select();

      await ctx.sync();
    });
  }

  /**
   * Removes all tables and worksheets that are marked as
   * extension-managed in the ownership sheet, then deletes
   * the ownership sheet itself. Intended as a dev-only
   * "clean slate" helper when iterating on table behavior.
   */
  async purgeExtensionManagedContent(): Promise<void> {
    if (!this.isExcel) return;
    await this.ensureOfficeReady();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await Excel!.run(async (ctx: any) => {
      const sheets = ctx.workbook.worksheets;
      let ownershipSheet = sheets.getItemOrNullObject("_Extension_Ownership");
      ownershipSheet.load("name");
      await ctx.sync();

      if (ownershipSheet.isNullObject) {
        return;
      }

      const usedRange = ownershipSheet.getUsedRangeOrNullObject();
      await ctx.sync();

      if (usedRange.isNullObject) {
        ownershipSheet.delete();
        await ctx.sync();
        return;
      }

      usedRange.load("values");
      await ctx.sync();

      const values: unknown[][] = (usedRange.values as unknown[][]) || [];
      if (values.length <= 1) {
        ownershipSheet.delete();
        await ctx.sync();
        return;
      }

      const [, ...rows] = values; // skip header
      const managedTargets = rows
        .filter((r) => r && r.length >= 4)
        .map((r) => {
          const [sheetName, tableName, , isManagedRaw] = r as string[];
          return {
            sheetName,
            tableName,
            isManaged: String(isManagedRaw).toLowerCase() === "true",
          };
        })
        .filter((r) => r.sheetName && r.tableName && r.isManaged);

      const tables = ctx.workbook.tables;
      const sheetsToCheck = new Set<string>();

      for (const target of managedTargets) {
        const table = tables.getItemOrNullObject(target.tableName);
        table.load("name,worksheet");
        await ctx.sync();

        if (!table.isNullObject) {
          const ws = table.worksheet;
          ws.load("name");
          await ctx.sync();

          sheetsToCheck.add(ws.name);
          table.delete();
          await ctx.sync();
        }
      }

      for (const sheetName of sheetsToCheck) {
        const sheet = sheets.getItemOrNullObject(sheetName);
        sheet.load("name");
        await ctx.sync();

        if (sheet.isNullObject) continue;

        const used = sheet.getUsedRangeOrNullObject();
        await ctx.sync();

        if (used.isNullObject) {
          sheet.delete();
          await ctx.sync();
        }
      }

      ownershipSheet = sheets.getItemOrNullObject("_Extension_Ownership");
      await ctx.sync();
      if (!ownershipSheet.isNullObject) {
        ownershipSheet.delete();
        await ctx.sync();
      }
    });
  }
}
