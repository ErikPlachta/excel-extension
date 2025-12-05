import { Injectable, InjectionToken, inject } from '@angular/core';

/**
 * Configuration for API connectivity.
 */
export interface ApiConfig {
  /** Base URL for API calls. Empty string for same-origin. */
  backendUrl: string;
  /** Whether to use real backend vs mock services */
  useRealBackend: boolean;
}

/**
 * Injection token for API configuration.
 *
 * @example
 * ```typescript
 * // In app.config.ts
 * import { API_CONFIG_TOKEN } from '@excel-platform/data/api';
 * import { environment } from '../environments/environment';
 *
 * providers: [
 *   { provide: API_CONFIG_TOKEN, useValue: environment }
 * ]
 * ```
 */
export const API_CONFIG_TOKEN = new InjectionToken<ApiConfig>('API_CONFIG');

/**
 * Service for building API URLs.
 *
 * Provides a centralized way to construct full URLs for API endpoints,
 * handling both development (localhost) and production (same-origin) scenarios.
 *
 * @example
 * ```typescript
 * constructor(private apiConfig: ApiConfigService) {}
 *
 * async fetchData() {
 *   const url = this.apiConfig.buildUrl('/api/catalog');
 *   // Returns 'http://127.0.0.1:8000/api/catalog' in dev
 *   // Returns '/api/catalog' in production
 * }
 * ```
 */
@Injectable({ providedIn: 'root' })
export class ApiConfigService {
  private readonly config = inject(API_CONFIG_TOKEN, { optional: true });

  /** Base URL for API calls */
  get backendUrl(): string {
    return this.config?.backendUrl ?? '';
  }

  /** Whether real backend is enabled */
  get useRealBackend(): boolean {
    return this.config?.useRealBackend ?? false;
  }

  /**
   * Build full URL for an API endpoint.
   *
   * @param path - API path (e.g., '/auth/signin', '/api/catalog')
   * @returns Full URL with backend base if configured
   */
  buildUrl(path: string): string {
    if (!this.backendUrl) {
      return path; // Relative path for same-origin
    }
    // Ensure path starts with /
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.backendUrl}${normalizedPath}`;
  }
}
