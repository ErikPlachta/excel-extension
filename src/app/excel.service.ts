import { Injectable } from '@angular/core';

declare const Office: any;
declare const Excel: any;

@Injectable({ providedIn: 'root' })
export class ExcelService {
  get isExcel(): boolean {
    return typeof Office !== 'undefined' &&
      Office.context?.host === Office.HostType.Excel;
  }

  async getWorksheets(): Promise<string[]> {
    if (!this.isExcel) return [];
    return Excel.run(async (ctx: any) => {
      const sheets = ctx.workbook.worksheets.load('items/name');
      await ctx.sync();
      return sheets.items.map((s: any) => s.name);
    });
  }

  async getTables(): Promise<{ name: string; worksheet: string; rows: number }[]> {
    if (!this.isExcel) return [];
    return Excel.run(async (ctx: any) => {
      const tables = ctx.workbook.tables.load('items/name');
      await ctx.sync();
      const results: { table: any; rowCount: any }[] = [];
      for (const table of tables.items) {
        table.worksheet.load('name');
        const rowCount = table.rows.getCount();
        results.push({ table, rowCount });
      }
      await ctx.sync();
      return results.map(r => ({
        name: r.table.name,
        worksheet: r.table.worksheet.name,
        rows: r.rowCount.value
      }));
    });
  }
}
