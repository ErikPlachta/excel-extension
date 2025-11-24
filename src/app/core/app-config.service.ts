import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AppConfig } from '../types/app-config.types';
import { DEFAULT_APP_CONFIG } from '../shared/app-config.default';

/**
 * AppConfig Service - Manages application configuration with observable pattern.
 *
 * Provides reactive access to app config. In Phase 2, this enables:
 * - Hot-reloading of config without restart
 * - Remote config loading with fallback to defaults
 * - Centralized config validation
 *
 * Services subscribe to config$ to react to config changes.
 */
@Injectable({ providedIn: 'root' })
export class AppConfigService {
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
}
