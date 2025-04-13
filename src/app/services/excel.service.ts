/// <reference types="office-js" />
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ExcelService {
  private officeReady = false;
  private officeReadyPromise: Promise<void> | null = null;

  constructor() {
    // TODO: Add any initialization logic if needed
    // this.ensureOfficeReady(); // Can't have this because if office available throws error.
  }

  private ensureOfficeReady(): Promise<void> {
    if (this.officeReady) return Promise.resolve();

    if (!this.officeReadyPromise) {
      this.officeReadyPromise = new Promise((resolve, reject) => {
        if (typeof Office === 'undefined') {
          console.warn('Office.js is not loaded or not in Excel context.');
          return resolve(); // no-op if not in Excel
        }

        Office.onReady()
          .then((info) => {
            if (info.host === Office.HostType.Excel) {
              console.log('✅ Office.js is ready inside Excel.');
              this.officeReady = true;
              resolve();
            } else {
              console.warn(
                `⚠️ Office.js loaded in unsupported host: ${info.host}`
              );
              resolve(); // allow soft fallback
            }
          })
          .catch((err) => {
            console.error('❌ Office.onReady() failed:', err);
            reject(err);
          });
      });
    }

    return this.officeReadyPromise;
  }

  // Excel features guarded by readiness

  async createSheet(name: string): Promise<void> {
    await this.ensureOfficeReady();
    if (typeof Excel === 'undefined') return;

    await Excel.run(async (context: Excel.RequestContext) => {
      const sheet = context.workbook.worksheets.add(name);
      sheet.activate();
      await context.sync();
    });
  }

  async writeTable(data: any[][]): Promise<void> {
    await this.ensureOfficeReady();
    if (typeof Excel === 'undefined') return;

    await Excel.run(async (context: Excel.RequestContext) => {
      const sheet = context.workbook.worksheets.getActiveWorksheet();
      const range = sheet
        .getRange('A1')
        .getResizedRange(data.length - 1, data[0].length - 1);
      range.values = data;
      range.format.autofitColumns();
      range.format.autofitRows();
      await context.sync();
    });
  }

  async getExtensionSheets(): Promise<string[]> {
    await this.ensureOfficeReady();
    if (typeof Excel === 'undefined') return [];

    return Excel.run(async (context) => {
      const sheets = context.workbook.worksheets.load('items/name');
      await context.sync();

      return sheets.items
        .map((s) => s.name)
        .filter((name) => name.startsWith('EXT_'));
    });
  }

  async refreshSheet(name: string): Promise<void> {
    await this.ensureOfficeReady();
    if (typeof Excel === 'undefined') return;

    return Excel.run(async (context) => {
      const sheet = context.workbook.worksheets.getItem(name);
      sheet.activate();
      await context.sync();
    });
  }

  async deleteSheet(name: string): Promise<void> {
    await this.ensureOfficeReady();
    if (typeof Excel === 'undefined') return;

    return Excel.run(async (context) => {
      context.workbook.worksheets.getItem(name).delete();
      await context.sync();
    });
  }
}
