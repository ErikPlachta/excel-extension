import { Component, OnInit } from '@angular/core';
import { ExcelService } from '../../services/excel.service';
import { PlatformService } from '../../services/platform.service';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { ConnectivityService } from '../../services/connectivity.service';

@Component({
  selector: 'app-tab-manage',
  standalone: false,
  templateUrl: './tab-manage.component.html',
  styleUrls: ['./tab-manage.component.css'],
})
export class TabManageComponent implements OnInit {
  tabs: { name: string; query: string }[] = [];
  isBusy = false;
  statusMessage = '';

  constructor(
    private excelService: ExcelService,
    private platformService: PlatformService,
    private authService: AuthService,
    private apiService: ApiService,
    private connectivity: ConnectivityService
  ) {}

  // async ngOnInit() {
  //   this.statusMessage = 'Scanning sheets...';

  //   try {
  //     await this.platformService.waitForOfficeReady();

  //     this.tabs = await this.excelService.getExtensionSheets();
  //     this.statusMessage = this.tabs.length
  //       ? `${this.tabs.length} tabs found.`
  //       : 'No extension tabs found.';
  //   } catch (err: any) {
  //     console.error(err);
  //     this.statusMessage = `❌ Error: ${err.message || 'Unable to list tabs'}`;
  //   }
  // }

  async ngOnInit() {
    this.statusMessage = 'Scanning sheets...';

    try {
      await this.platformService.waitForOfficeReady();

      const sheetNames = await this.excelService.getExtensionSheets();
      const tabsWithMeta = await Promise.all(
        sheetNames.map(async (name) => {
          const meta = await this.excelService.getSheetMetadata(name);
          return {
            name,
            query: meta?.['query'] || '',
          };
        })
      );

      this.tabs = tabsWithMeta;
      this.statusMessage = `Found ${this.tabs.length} sheet(s).`;
    } catch (err: any) {
      this.statusMessage = `❌ Error: ${err.message}`;
    }
  }

  async refreshSheet(name: string) {
    try {
      this.statusMessage = `🔄 Refreshing ${name}...`;
      if (!this.connectivity.isOnline()) {
        this.statusMessage += ' (offline mode)';
      }
      await this.excelService.refreshSheetWithMetadata(name, (query) => {
        const user = this.authService.getUser();
        return this.apiService.fetchUserData(user?.id || '').then((data) => {
          // TODO: Add better error handling here
          if (!data) {
            console.warn('No data returned from API.');
            this.statusMessage = '⚠️ No data returned from API.';
            return [];
          }
          if (!Array.isArray(data)) {
            console.warn('Data is not an array.');
            this.statusMessage = '⚠️ Data is not an array.';
            return [];
          }
          if (data.length === 0) {
            console.warn('Data is empty.');
            this.statusMessage = '⚠️ Data is empty.';
            return [];
          }
          if (!query) {
            this.statusMessage = `🔄 No query provided.`;
          }
          if (query && query.length === 0) {
            this.statusMessage = `⚠️ Query is empty.`;
          }
          // There is data, not an empty request, so we can proceed
          return data.filter(
            (row) => !query || JSON.stringify(row).includes(query)
          );
        });
      });

      this.statusMessage = `✅ ${name} refreshed.`;
    } catch (err: any) {
      console.error(err);
      this.statusMessage = `❌ Failed to refresh ${name}: ${err.message}`;
    }
  }

  async deleteSheet(name: string) {
    try {
      this.statusMessage = `🗑️ Deleting ${name}...`;
      await this.excelService.deleteSheet(name);
      this.tabs = this.tabs.filter((t) => t.name !== name);
      this.statusMessage = `✅ ${name} deleted.`;
    } catch (err: any) {
      console.error(err);
      this.statusMessage = `❌ Failed to delete ${name}`;
    }
  }

  async saveMetadata(sheetName: string, query: string) {
    try {
      this.statusMessage = `💾 Saving query for ${sheetName}...`;

      const user = this.authService.getUser();
      const metadata = {
        createdBy: 'excel-extension',
        userId: user?.id,
        query,
        updatedAt: new Date().toISOString(),
      };

      await this.excelService.setSheetMetadata(sheetName, metadata);
      this.statusMessage = `✅ Query saved for ${sheetName}.`;
    } catch (err: any) {
      this.statusMessage = `❌ Failed to save: ${err.message}`;
    }
  }
}
