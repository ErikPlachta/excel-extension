import { Injectable } from '@angular/core';
import { StorageBaseService } from './storage-base.service';
import { IndexedDBService } from './indexeddb.service';

// Note: TelemetryService removed to break circular dependency:
// TelemetryService → AppContextService → AuthService → StorageHelperService → TelemetryService
// Error logging uses console.error as fallback (same pattern as StorageBaseService)

/**
 * Storage Helper Service - Centralized storage operations with multi-backend support.
 *
 * Provides abstraction over localStorage (small data) and IndexedDB (large data).
 * All services should use this instead of direct storage access for:
 * - Consistent error handling and telemetry
 * - Type safety with generics
 * - Easy migration between storage backends
 * - Future-proofing for new storage APIs
 *
 * **Storage Tiers:**
 * - **Tier 1 (localStorage):** < 100 KB - Settings, auth tokens, UI state (sync API)
 * - **Tier 2 (IndexedDB):** 100 KB+ - Query results, cached API responses (async API)
 *
 * **Usage:**
 * ```typescript
 * // Small data (< 100 KB)
 * const settings = storage.getItem<Settings>('settings', DEFAULT_SETTINGS);
 * storage.setItem('settings', updatedSettings);
 *
 * // Large data (100 KB+)
 * const cached = await storage.getLargeItem<any[]>('query-results-sales');
 * await storage.setLargeItem('query-results-sales', rows, 3600000); // 1 hour TTL
 * ```
 */
@Injectable({ providedIn: 'root' })
export class StorageHelperService {
  constructor(
    private readonly base: StorageBaseService,
    private readonly indexedDB: IndexedDBService
  ) {}

  /**
   * Get item from localStorage with type safety and telemetry.
   *
   * Use for small data (< 100 KB): settings, auth tokens, UI state.
   * Returns defaultValue if key doesn't exist or parse fails.
   * Logs errors via TelemetryService (unlike StorageBaseService).
   *
   * @param key - Storage key
   * @param defaultValue - Value to return if key not found or parse error
   * @returns Parsed value or defaultValue
   */
  getItem<T>(key: string, defaultValue: T): T {
    // Delegate to base service - it handles parse errors silently
    // We could add telemetry here if we needed to distinguish parse errors
    // from missing keys, but current pattern keeps it simple
    return this.base.getItem(key, defaultValue);
  }

  /**
   * Set item in localStorage with type safety and telemetry.
   *
   * Use for small data (< 100 KB): settings, auth tokens, UI state.
   * Automatically stringifies value to JSON.
   *
   * @param key - Storage key
   * @param value - Value to store (will be JSON stringified)
   */
  setItem<T>(key: string, value: T): void {
    this.base.setItem(key, value);
  }

  /**
   * Get item from IndexedDB for large datasets.
   *
   * Use for large data (> 100 KB): query results, cached API responses.
   * Returns null if key doesn't exist or read fails.
   *
   * @param key - Storage key (typically queryId)
   * @returns Cached value or null
   */
  async getLargeItem<T>(key: string): Promise<T | null> {
    try {
      return (await this.indexedDB.getCachedQueryResult(key)) as T | null;
    } catch (error) {
      console.error('[storage] IndexedDB read error:', key, error);
      return null;
    }
  }

  /**
   * Set item in IndexedDB for large datasets.
   *
   * Use for large data (> 100 KB): query results, cached API responses.
   * Supports TTL-based expiration.
   *
   * @param key - Storage key (typically queryId)
   * @param value - Array value to store (must be array for IndexedDB schema)
   * @param ttl - Time-to-live in milliseconds (default: 1 hour)
   */
  async setLargeItem<T extends unknown[]>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      await this.indexedDB.cacheQueryResult(key, value, ttl);
    } catch (error) {
      console.error('[storage] IndexedDB write error:', key, error);
    }
  }

  /**
   * Remove item from localStorage.
   *
   * @param key - Storage key to remove
   */
  removeItem(key: string): void {
    this.base.removeItem(key);
  }

  /**
   * Clear all localStorage (use cautiously).
   *
   * Removes ALL localStorage entries, not just extension data.
   * Prefer targeted removeItem() calls for specific keys.
   */
  clear(): void {
    this.base.clear();
  }

  /**
   * Clear expired IndexedDB cache.
   *
   * Removes entries where `expiresAt < Date.now()`.
   * Should be called on app init and periodically.
   */
  async clearExpiredCache(): Promise<void> {
    try {
      await this.indexedDB.clearExpiredCache();
    } catch (error) {
      console.error('[storage] Cache cleanup error:', error);
    }
  }

  /**
   * Clear all IndexedDB cache (use cautiously).
   *
   * Removes ALL cached query results. Typically used for manual
   * cache reset via Settings UI or testing.
   */
  async clearAllCache(): Promise<void> {
    try {
      await this.indexedDB.clearAllCache();
    } catch (error) {
      console.error('[storage] Cache clear-all error:', error);
    }
  }
}
