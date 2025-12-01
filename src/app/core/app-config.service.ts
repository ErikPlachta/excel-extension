import { Injectable, inject, Injector } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { AppConfig } from '../types/app-config.types';
import { DEFAULT_APP_CONFIG } from '../shared/app-config.default';
import { ConfigValidatorService } from './config-validator.service';
import { AuthService } from "@excel-platform/core/auth";

/**
 * AppConfig Service - Manages application configuration with observable pattern.
 *
 * Provides reactive access to app config. In Phase 2, this enables:
 * - Hot-reloading of config without restart
 * - Remote config loading with fallback to defaults
 * - Centralized config validation
 *
 * **Phase 7 Enhancement:**
 * - JWT bearer token authentication for remote config loading
 * - Automatically adds Authorization header when authenticated
 * - Falls back to unauthenticated request if no token available
 * - Uses lazy injection to avoid circular dependency with AuthService
 *
 * Services subscribe to config$ to react to config changes.
 */
@Injectable({ providedIn: 'root' })
export class AppConfigService {
  private readonly http = inject(HttpClient);
  private readonly validator = inject(ConfigValidatorService);
  private readonly injector = inject(Injector);

  /**
   * Internal config state with BehaviorSubject for replay semantics.
   */
  private readonly configSubject = new BehaviorSubject<AppConfig>(DEFAULT_APP_CONFIG);

  /**
   * Observable stream of config changes.
   *
   * Emits current config immediately on subscription, then future changes.
   */
  readonly config$: Observable<AppConfig> = this.configSubject.asObservable();

  /**
   * Get current config snapshot (synchronous).
   *
   * Use this for one-time reads. For reactive updates, subscribe to config$.
   *
   * @returns Current AppConfig
   */
  getConfig(): AppConfig {
    return this.configSubject.value;
  }

  /**
   * Update entire config and notify subscribers.
   *
   * @param config - New config to apply
   */
  setConfig(config: AppConfig): void {
    this.configSubject.next(config);
  }

  /**
   * Merge partial config into current config and notify subscribers.
   *
   * Performs shallow merge at top level. For deep merges, use setConfig with
   * manually merged config.
   *
   * @param partial - Partial config to merge
   */
  mergeConfig(partial: Partial<AppConfig>): void {
    const merged = { ...this.configSubject.value, ...partial };
    this.configSubject.next(merged);
  }

  /**
   * Load remote config from URL and merge with current config.
   *
   * Fetches config from remote endpoint, validates it, and deep-merges with
   * current config. Falls back to current config if fetch fails or validation fails.
   *
   * **Phase 7 Enhancement:**
   * Automatically adds JWT bearer token when authenticated for secure config endpoints.
   *
   * @param url - Remote config endpoint URL
   * @returns Promise resolving to true if loaded successfully, false if fallback used
   */
  async loadRemoteConfig(url: string): Promise<boolean> {
    try {
      // Build request options with optional JWT bearer token
      const options = this.buildRequestOptions();

      // Fetch remote config
      const remoteConfig = await firstValueFrom(
        this.http.get<Partial<AppConfig>>(url, options)
      );

      // Validate remote config (if it's a full config)
      if (this.isFullConfig(remoteConfig)) {
        const validation = this.validator.validate(remoteConfig);
        if (!validation.valid) {
          console.warn('Remote config validation failed:', validation.errors);
          return false;
        }
      }

      // Deep merge remote config with current config
      const merged = this.deepMergeConfigs(this.configSubject.value, remoteConfig);

      // Validate merged config
      const mergedValidation = this.validator.validate(merged);
      if (!mergedValidation.valid) {
        console.warn('Merged config validation failed:', mergedValidation.errors);
        return false;
      }

      // Apply merged config
      this.configSubject.next(merged);
      console.log('Remote config loaded successfully from:', url);
      return true;

    } catch (error) {
      console.warn('Failed to load remote config from:', url, error);
      return false;
    }
  }

  /**
   * Reload config from remote endpoint.
   *
   * Convenience method for hot-reload. Uses default config URL if available,
   * or a provided URL.
   *
   * @param url - Optional remote config URL (default: /assets/app-config.json)
   * @returns Promise resolving to true if reloaded successfully
   */
  async reloadConfig(url: string = '/assets/app-config.json'): Promise<boolean> {
    return this.loadRemoteConfig(url);
  }

  /**
   * Deep merge two configs (remote overrides base).
   *
   * Performs deep merge for nested objects like apiCatalog and text.
   * Arrays in remote config replace arrays in base config.
   *
   * @param base - Base config
   * @param remote - Remote config (partial or full)
   * @returns Merged config
   */
  private deepMergeConfigs(base: AppConfig, remote: Partial<AppConfig>): AppConfig {
    const merged = { ...base };

    // Merge top-level primitives
    if (remote.defaultViewId !== undefined) merged.defaultViewId = remote.defaultViewId;

    // Merge arrays (replace, not concat)
    if (remote.navItems !== undefined) merged.navItems = remote.navItems;
    if (remote.roles !== undefined) merged.roles = remote.roles;
    if (remote.apiCatalog !== undefined) merged.apiCatalog = remote.apiCatalog;

    // Merge nested objects
    if (remote.rootIdsAndClasses !== undefined) {
      merged.rootIdsAndClasses = { ...base.rootIdsAndClasses, ...remote.rootIdsAndClasses };
    }
    if (remote.ui !== undefined) {
      merged.ui = { ...base.ui, ...remote.ui };
    }
    if (remote.text !== undefined) {
      // Deep merge text sections
      merged.text = {
        nav: { ...base.text?.nav, ...remote.text.nav },
        auth: { ...base.text?.auth, ...remote.text.auth },
        query: { ...base.text?.query, ...remote.text.query },
        worksheet: { ...base.text?.worksheet, ...remote.text.worksheet },
        table: { ...base.text?.table, ...remote.text.table },
        user: { ...base.text?.user, ...remote.text.user },
        role: { ...base.text?.role, ...remote.text.role },
        hostStatus: { ...base.text?.hostStatus, ...remote.text.hostStatus },
        userBanner: { ...base.text?.userBanner, ...remote.text.userBanner },
        ui: { ...base.text?.ui, ...remote.text.ui },
      };
    }

    return merged;
  }

  /**
   * Check if partial config is actually a full config.
   *
   * @param config - Partial config to check
   * @returns True if config has all required fields
   */
  private isFullConfig(config: Partial<AppConfig>): config is AppConfig {
    return !!(
      config.defaultViewId &&
      config.navItems &&
      config.roles &&
      config.rootIdsAndClasses
    );
  }

  /**
   * Build HTTP request options with optional JWT bearer token.
   *
   * Uses lazy injection to get AuthService at call time, avoiding
   * circular dependency issues during app initialization.
   *
   * Adds Authorization header when user is authenticated via JWT.
   * Returns empty options object if no token available.
   *
   * @returns HTTP request options with headers
   */
  private buildRequestOptions(): { headers?: HttpHeaders } {
    try {
      // Lazy injection: resolved at call time, not construction time
      // This breaks the circular dependency chain during DI construction
      const auth = this.injector.get(AuthService);
      const token = auth.getAccessToken();

      if (token) {
        return {
          headers: new HttpHeaders({
            Authorization: `Bearer ${token}`,
          }),
        };
      }
    } catch {
      // AuthService not available or no token - continue without auth header
    }

    return {};
  }
}
