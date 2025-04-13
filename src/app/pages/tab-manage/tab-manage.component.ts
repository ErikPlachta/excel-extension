import { Component, OnInit } from '@angular/core';
import { ExcelService } from '../../services/excel.service';
import { PlatformService } from '../../services/platform.service';

@Component({
  selector: 'app-tab-manage',
  standalone: false,
  templateUrl: './tab-manage.component.html',
  styleUrls: ['./tab-manage.component.css'],
})
export class TabManageComponent implements OnInit {
  tabs: string[] = [];
  isBusy = false;
  statusMessage = '';

  constructor(
    private excelService: ExcelService,
    private platformService: PlatformService
  ) {}

  async ngOnInit() {
    this.statusMessage = 'Scanning sheets...';

    try {
      await this.platformService.waitForOfficeReady();

      this.tabs = await this.excelService.getExtensionSheets();
      this.statusMessage = this.tabs.length
        ? `${this.tabs.length} tabs found.`
        : 'No extension tabs found.';
    } catch (err: any) {
      console.error(err);
      this.statusMessage = `❌ Error: ${err.message || 'Unable to list tabs'}`;
    }
  }

  async refreshSheet(name: string) {
    try {
      this.statusMessage = `🔄 Refreshing ${name}...`;
      await this.excelService.refreshSheet(name); // Stub — implement next
      this.statusMessage = `✅ ${name} refreshed.`;
    } catch (err: any) {
      console.error(err);
      this.statusMessage = `❌ Failed to refresh ${name}`;
    }
  }

  async deleteSheet(name: string) {
    try {
      this.statusMessage = `🗑️ Deleting ${name}...`;
      await this.excelService.deleteSheet(name);
      this.tabs = this.tabs.filter((t) => t !== name);
      this.statusMessage = `✅ ${name} deleted.`;
    } catch (err: any) {
      console.error(err);
      this.statusMessage = `❌ Failed to delete ${name}`;
    }
  }
}
