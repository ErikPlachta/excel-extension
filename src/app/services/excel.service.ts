import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ExcelService {
  async createSheet(name: string): Promise<void> {
    await Excel.run(async (context) => {
      const sheet = context.workbook.worksheets.add(name);
      sheet.activate();
      await context.sync();
    });
  }

  async writeTable(data: any[][]): Promise<void> {
    await Excel.run(async (context) => {
      const sheet = context.workbook.worksheets.getActiveWorksheet();
      const range = sheet
        .getRange('A1')
        .getResizedRange(data.length - 1, data[0].length - 1);
      range.values = data;
      await context.sync();
    });
  }
}
