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

  async writeTable(
    data: any[][],
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.ensureOfficeReady();
    if (typeof Excel === 'undefined') return;

    await Excel.run(async (context) => {
      const sheet = context.workbook.worksheets.getActiveWorksheet();

      // Write table data to A5
      const range = sheet
        .getRange('A5') // TODO: make this optional parameter
        .getResizedRange(data.length - 1, data[0].length - 1);
      range.values = data;
      range.format.autofitColumns(); // TODO: make this optional parameter
      range.format.autofitRows(); // TODO: make this optional parameter

      // Write metadata to Z1
      if (metadata) {
        const marker = '#EXT_META:' + JSON.stringify(metadata);
        const metaRange = sheet.getRange('A2'); // TODO: find a better place to hold metadata than within z1. I actually prefer it's A2, and table doesn't start until A5 (or something like that). Either way should be a parameter, not hard-coded
        metaRange.values = [[marker]];
        //metaRange.format.font.color = '#FFFFFF'; // hide visually (optional) // TODO: Update styling to use args instead of hard-coded
        //metaRange.format.fill.color = '#FFFFFF'; // hide visually (optional)
      }

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

  async getSheetMetadata(
    sheetName: string
  ): Promise<Record<string, any> | null> {
    await this.ensureOfficeReady();
    if (typeof Excel === 'undefined') return null;

    return Excel.run(async (context) => {
      const sheet = context.workbook.worksheets.getItem(sheetName);
      const metaCell = sheet.getRange('Z1');
      metaCell.load('values');
      await context.sync();

      const value = metaCell.values?.[0]?.[0] || '';
      if (value.startsWith('#EXT_META:')) {
        const json = value.replace('#EXT_META:', '');
        return JSON.parse(json);
      }

      return null;
    });
  }

  async refreshSheetWithMetadata(
    name: string,
    fetcher: (query: string) => Promise<any[]>
  ): Promise<void> {
    await this.ensureOfficeReady();
    if (typeof Excel === 'undefined') return;

    return Excel.run(async (context) => {
      const sheet = context.workbook.worksheets.getItem(name);
      const metaCell = sheet.getRange('Z1');
      metaCell.load('values');
      await context.sync();

      const raw = metaCell.values?.[0]?.[0] || '';
      if (!raw.startsWith('#EXT_META:')) {
        throw new Error('No metadata found');
      }

      const meta = JSON.parse(raw.replace('#EXT_META:', ''));
      const query = meta.query || '';

      // Fetch fresh data
      const data = await fetcher(query);
      const headers = Object.keys(data[0] || {});
      const rows = data.map((row) => headers.map((h) => row[h]));
      const table = [headers, ...rows];

      // Clear and write
      const range = sheet
        .getRange('A5') // TODO: make this optional parameter
        .getResizedRange(100, 20); // adjust range // TODO: make this optional parameter based on data size
      range.clear();
      const target = sheet
        .getRange('A5') // TODO: make this optional parameter
        .getResizedRange(table.length - 1, table[0].length - 1);
      target.values = table;

      await context.sync();
    });
  }

  async setSheetMetadata(
    sheetName: string,
    metadata: Record<string, any>
  ): Promise<void> {
    await this.ensureOfficeReady();
    if (typeof Excel === 'undefined') return;

    await Excel.run(async (context) => {
      const sheet = context.workbook.worksheets.getItem(sheetName);
      const cell = sheet.getRange('Z1');
      cell.values = [['#EXT_META:' + JSON.stringify(metadata)]];
      cell.format.font.color = '#FFFFFF';
      cell.format.font.size = 1;
      await context.sync();
    });
  }
}
