import { Component } from '@angular/core';
import { CacheService } from '../../services/cache.service';

@Component({
  selector: 'app-settings',
  standalone: false,
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css',
})
export class SettingsComponent {
  constructor(private cache: CacheService) {}

  clearCache() {
    this.cache.clear();
    alert('Local cache cleared.');
  }
}
