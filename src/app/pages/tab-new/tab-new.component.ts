import { Component } from '@angular/core';
import { ExcelService } from '../../services/excel.service';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

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

  constructor(
    private excelService: ExcelService,
    private apiService: ApiService,
    private authService: AuthService
  ) {}

  async onSubmit() {
    if (!this.sheetName.trim()) {
      this.statusMessage = 'Sheet name is required.';
      return;
    }

    this.statusMessage = 'Creating sheet...';

    try {
      // 1. Create worksheet
      await this.excelService.createSheet(this.sheetName);
      this.statusMessage = 'Sheet created. Fetching data...';

      // 2. Get user ID
      const user = this.authService.getUser();
      if (!user) throw new Error('User not authenticated');

      // 3. Fetch data from API
      const data = await this.apiService.fetchUserData(user.id);
      if (!data || !Array.isArray(data)) {
        this.statusMessage = '❌ No data received from API.';
        return;
      }

      const result = this.filterData(data, this.queryParam);

      // 4. Insert data into Excel
      await this.excelService.writeTable(result);

      this.statusMessage = `✅ Sheet "${this.sheetName}" populated successfully.`;
    } catch (err: any) {
      console.error(err);
      this.statusMessage = `❌ Error: ${err.message || err}`;
    }
  }

  private filterData(data: any[], param: string): any[][] {
    if (!Array.isArray(data)) return [];

    const headers = Object.keys(data[0] || {});
    const rows = data
      .filter((row) => !param || JSON.stringify(row).includes(param))
      .map((row) => headers.map((h) => row[h]));

    return [headers, ...rows]; // Include headers as first row
  }
}
