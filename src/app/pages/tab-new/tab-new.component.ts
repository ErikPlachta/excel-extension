import { Component } from '@angular/core';
import { ExcelService } from '../../services/excel.service';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { PlatformService } from '../../services/platform.service';
import { ConnectivityService } from '../../services/connectivity.service';

@Component({
  selector: 'app-tab-new',
  standalone: false,
  templateUrl: './tab-new.component.html',
  styleUrls: ['./tab-new.component.css'],
})
export class TabNewComponent {
  sheetName = '';
  queryParam = '';
  statusMessage = '';
  isBusy = false;

  constructor(
    private excelService: ExcelService,
    private apiService: ApiService,
    private authService: AuthService,
    private platformService: PlatformService,
    private connectivity: ConnectivityService
  ) {}

  async onSubmit(): Promise<void> {
    this.statusMessage = '';
    this.isBusy = true;

    try {
      // 1. Validate input
      const sheetNameTrimmed = this.sheetName.trim();
      if (!sheetNameTrimmed) {
        this.statusMessage = '❌ Sheet name is required.';
        return;
      }

      // 2. Ensure Office is ready
      await this.platformService.waitForOfficeReady();

      // 3. Authenticate user
      const user = this.authService.getUser();
      if (!user) {
        this.statusMessage = '❌ User not authenticated.';
        return;
      }

      // 4. Create new sheet
      this.statusMessage = `📄 Creating sheet "${sheetNameTrimmed}"...`;
      await this.excelService.createSheet(sheetNameTrimmed);

      // 5. Fetch data from API
      this.statusMessage = `🌐 Fetching data for ${user.name}...`;
      if (!this.connectivity.isOnline()) {
        this.statusMessage += ' (offline mode)';
      }
      const data = await this.apiService.fetchUserData(user.id);
      if (!data || !Array.isArray(data) || data.length === 0) {
        this.statusMessage = '⚠️ No data returned from API.';
        return;
      }

      // 6. Filter data based on query parameter
      const filtered = this.filterData(data, this.queryParam);
      if (filtered.length === 1) {
        // only headers
        this.statusMessage = '⚠️ No results matched your query.';
        return;
      }

      // 7. Write data to Excel
      this.statusMessage = '📊 Inserting data into Excel...';
      await this.excelService.writeTable(filtered);

      // 8. Write metadata
      this.statusMessage = '📝 Writing metadata...';
      await this.excelService.writeTable(filtered, {
        createdBy: 'excel-extension',
        userId: user.id,
        query: this.queryParam || '',
        createdAt: new Date().toISOString(),
      });

      // 9. Finalize
      this.statusMessage = `✅ Sheet "${sheetNameTrimmed}" populated successfully.`;
    } catch (err: any) {
      console.error('[TabNewComponent] Error:', err);
      this.statusMessage = `❌ Error: ${err?.message || 'Unexpected failure.'}`;
    } finally {
      this.isBusy = false;
    }
  }

  private filterData(data: any[], param: string): any[][] {
    const headers = Object.keys(data[0] || {});
    const rows = data
      .filter(
        (row) =>
          !param ||
          JSON.stringify(row).toLowerCase().includes(param.toLowerCase())
      )
      .map((row) => headers.map((h) => row[h]));

    return [headers, ...rows]; // Add headers
  }
}
