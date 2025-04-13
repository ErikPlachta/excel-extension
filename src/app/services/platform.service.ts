import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PlatformService {
  private officeReady = false;
  private officeReadyPromise: Promise<void>;

  constructor() {
    this.officeReadyPromise = this.initializeOffice();
  }

  async waitForOfficeReady(): Promise<void> {
    if (!this.officeReady) {
      await this.officeReadyPromise;
    }
  }

  private async initializeOffice(): Promise<void> {
    if (!this.isExcelEnvironment()) {
      console.warn('🧪 Running outside Excel. Office.js will not be loaded.');
      return;
    }

    await this.loadOfficeScript();
    await Office.onReady((info) => {
      if (info.host === Office.HostType.Excel) {
        console.log('✅ Office.js is ready inside Excel.');
        this.officeReady = true;
      } else {
        console.warn('⚠️ Office.js running in a non-Excel host:', info.host);
      }
    });
  }

  private isExcelEnvironment(): boolean {
    return !!window.location.href.match(/taskpane|localhost:\d+/i); // TODO: update regex for production once ready.
  }

  private loadOfficeScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://appsforoffice.microsoft.com/lib/1/hosted/office.js';
      script.onload = () => resolve();
      script.onerror = () => reject('⚠️ Failed to load office.js');
      document.head.appendChild(script);
    });
  }

  isRunningInExcel(): boolean {
    return this.officeReady;
  }
}
