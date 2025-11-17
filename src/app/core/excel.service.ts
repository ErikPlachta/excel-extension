import { Injectable } from "@angular/core";
import { ExecuteQueryResultRow } from "../shared/query-api-mock.service";
import { QueryDefinition, QueryRunLocation } from "../shared/query-model";

// TODO: Convert this to a proper Angular service wrapper around Office.js, multiple files, proper types, utilities, etc. to ensure stability and easy supportability. (I think #12 in todo covers this logic.)

// Office.js globals are provided at runtime by Excel; we keep them
// as any here and rely on isExcel guards to ensure safe access.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Office: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const Excel: any;

@Injectable({ providedIn: "root" })
export class ExcelService {
  get isExcel(): boolean {
    return typeof Office !== "undefined" && Office?.context?.host === Office.HostType.Excel;
  }

  async getWorksheets(): Promise<string[]> {
    if (!this.isExcel) return [];
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Excel!.run(async (ctx: any) => {
      const tables = ctx.workbook.tables.load("items/name");
      await ctx.sync();
      const results: { table: any; rowCount: any }[] = [];
      for (const table of tables.items) {
        table.worksheet.load("name");
        const rowCount = table.rows.getCount();
        results.push({ table, rowCount });
      }
      await ctx.sync();
      return results.map((r) => ({
        name: r.table.name,
        worksheet: r.table.worksheet.name,
        rows: r.rowCount.value,
      }));
    });
  }

  async upsertQueryTable(
    query: QueryDefinition,
    rows: ExecuteQueryResultRow[],
    locationHint?: Partial<QueryRunLocation>
  ): Promise<QueryRunLocation | null> {
    if (!this.isExcel) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Excel!.run(async (ctx: any) => {
      const sheetName = locationHint?.sheetName ?? query.defaultSheetName;
      const tableName = locationHint?.tableName ?? query.defaultTableName;

      const worksheets = ctx.workbook.worksheets;
      let sheet = worksheets.getItemOrNullObject(sheetName);
      await ctx.sync();

      if (sheet.isNullObject) {
        sheet = worksheets.add(sheetName);
      }

      const usedRange = sheet.getUsedRangeOrNullObject();
      await ctx.sync();

      const hasExisting = !usedRange.isNullObject;
      const startCell = hasExisting ? sheet.getCell(usedRange.rowCount, 0) : sheet.getRange("A1");

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
      await ctx.sync();

      if (table.isNullObject) {
        table = ctx.workbook.tables.add(dataRange, true /* hasHeaders */);
        table.name = tableName;
      } else {
        table.resize(dataRange);
      }

      await ctx.sync();

      return {
        sheetName,
        tableName,
      } as QueryRunLocation;
    });
  }

  async activateQueryLocation(location: QueryRunLocation | undefined | null): Promise<void> {
    if (!this.isExcel || !location) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await Excel!.run(async (ctx: any) => {
      const sheet = ctx.workbook.worksheets.getItem(location.sheetName);
      sheet.activate();

      const table = ctx.workbook.tables.getItem(location.tableName);
      table.getRange().select();

      await ctx.sync();
    });
  }
}
