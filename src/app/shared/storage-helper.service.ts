import { Injectable } from '@angular/core';
import { IndexedDBService } from './indexeddb.service';
import { TelemetryService } from '../core/telemetry.service';

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
    private readonly indexedDB: IndexedDBService,
    private readonly telemetry: TelemetryService
  ) {}

  /**
   * Get item from localStorage with type safety.
   *
   * Use for small data (< 100 KB): settings, auth tokens, UI state.
   * Returns defaultValue if key doesn't exist or parse fails.
   *
   * @param key - Storage key
   * @param defaultValue - Value to return if key not found or parse error
   * @returns Parsed value or defaultValue
   */
  getItem<T>(key: string, defaultValue: T): T {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;

    try {
      return JSON.parse(item) as T;
    } catch (error) {
      this.telemetry.logEvent({
        category: 'system',
        name: 'storage-parse-error',
        severity: 'error',
        message: `Failed to parse storage key: ${key}`,
        context: { error },
      });
      return defaultValue;
    }
  }

  /**
   * Set item in localStorage with type safety.
   *
   * Use for small data (< 100 KB): settings, auth tokens, UI state.
   * Automatically stringifies value to JSON.
   *
   * @param key - Storage key
   * @param value - Value to store (will be JSON stringified)
   */
  setItem<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      this.telemetry.logEvent({
        category: 'system',
        name: 'storage-write-error',
        severity: 'error',
        message: `Failed to write storage key: ${key}`,
        context: { error },
      });
    }
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
      this.telemetry.logEvent({
        category: 'system',
        name: 'storage-indexeddb-read-error',
        severity: 'error',
        message: `Failed to read from IndexedDB: ${key}`,
        context: { error },
      });
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
      this.telemetry.logEvent({
        category: 'system',
        name: 'storage-indexeddb-write-error',
        severity: 'error',
        message: `Failed to write to IndexedDB: ${key}`,
        context: { error },
      });
    }
  }

  /**
   * Remove item from localStorage.
   *
   * @param key - Storage key to remove
   */
  removeItem(key: string): void {
    localStorage.removeItem(key);
  }

  /**
   * Clear all localStorage (use cautiously).
   *
   * Removes ALL localStorage entries, not just extension data.
   * Prefer targeted removeItem() calls for specific keys.
   */
  clear(): void {
    localStorage.clear();
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
      this.telemetry.logEvent({
        category: 'system',
        name: 'storage-cache-cleanup-error',
        severity: 'error',
        message: 'Failed to clear expired cache',
        context: { error },
      });
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
      this.telemetry.logEvent({
        category: 'system',
        name: 'storage-cache-clear-all-error',
        severity: 'error',
        message: 'Failed to clear all cache',
        context: { error },
      });
    }
  }
}
