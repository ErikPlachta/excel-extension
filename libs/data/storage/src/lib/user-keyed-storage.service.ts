import { Injectable, inject } from '@angular/core';
import { StorageBaseService } from './storage-base.service';
import { IndexedDBService } from './indexeddb.service';
import { buildUserKey, buildDeviceKey } from '@excel-platform/shared/util';

/**
 * User-Keyed Storage Service - Storage operations with user context.
 *
 * Provides storage abstraction that automatically includes userId in storage keys
 * to prevent cross-user data leakage on shared devices.
 *
 * **Key Features:**
 * - Automatic user-keying: `prefix:${userId}` pattern
 * - Device-keying option: `prefix:${visitorId}` for device-specific data
 * - Fallback to shared keys when no userId available
 * - Clear user data on sign-out
 *
 * **Storage Key Patterns:**
 * - User-keyed: `excel-ext:settings:user-123` (per-user)
 * - Device-keyed: `excel-ext:auth:visitor-uuid` (per-device)
 * - Shared: `excel-ext:app-config` (all users)
 *
 * **Usage:**
 * ```typescript
 * // Inject the service
 * private storage = inject(UserKeyedStorageService);
 *
 * // Set user context (typically after sign-in)
 * storage.setUserId('user-123');
 *
 * // User-keyed storage
 * storage.setItem('settings', { theme: 'dark' });
 * const settings = storage.getItem('settings', {});
 *
 * // Clear on sign-out
 * storage.clearUserId();
 * ```
 *
 * @remarks
 * This service is designed for data that should be isolated per user.
 * Use StorageHelperService for shared/global data.
 */
@Injectable({ providedIn: 'root' })
export class UserKeyedStorageService {
  private readonly base = inject(StorageBaseService);
  private readonly indexedDB = inject(IndexedDBService);

  /** Current user ID for keying storage */
  private userId: string | null = null;

  /**
   * Set the current user ID.
   * Call this after successful sign-in.
   *
   * @param userId - User identifier (e.g., from AuthService.user.id)
   */
  setUserId(userId: string): void {
    this.userId = userId;
  }

  /**
   * Clear the current user ID.
   * Call this on sign-out.
   */
  clearUserId(): void {
    this.userId = null;
  }

  /**
   * Get current user ID if set.
   */
  getUserId(): string | null {
    return this.userId;
  }

  /**
   * Build a user-keyed storage key.
   *
   * @param prefix - Key prefix (e.g., 'excel-ext:settings')
   * @returns User-keyed key if userId is set, otherwise just prefix
   */
  buildKey(prefix: string): string {
    return this.userId ? buildUserKey(prefix, this.userId) : prefix;
  }

  /**
   * Build a device-keyed storage key (uses visitor ID, not user ID).
   *
   * @param prefix - Key prefix
   * @returns Device-keyed key
   */
  buildDeviceKey(prefix: string): string {
    return buildDeviceKey(prefix);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // localStorage operations (user-keyed)
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Get item from localStorage with user-keying.
   *
   * @param keyPrefix - Storage key prefix
   * @param defaultValue - Default value if not found
   * @returns Stored value or default
   */
  getItem<T>(keyPrefix: string, defaultValue: T): T {
    const key = this.buildKey(keyPrefix);
    return this.base.getItem(key, defaultValue);
  }

  /**
   * Set item in localStorage with user-keying.
   *
   * @param keyPrefix - Storage key prefix
   * @param value - Value to store
   */
  setItem<T>(keyPrefix: string, value: T): void {
    const key = this.buildKey(keyPrefix);
    this.base.setItem(key, value);
  }

  /**
   * Remove item from localStorage (user-keyed).
   *
   * @param keyPrefix - Storage key prefix
   */
  removeItem(keyPrefix: string): void {
    const key = this.buildKey(keyPrefix);
    this.base.removeItem(key);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // IndexedDB operations (user-keyed)
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Get large item from IndexedDB with user-keying.
   *
   * @param keyPrefix - Storage key prefix
   * @returns Cached value or null
   */
  async getLargeItem<T>(keyPrefix: string): Promise<T | null> {
    const key = this.buildKey(keyPrefix);
    try {
      return (await this.indexedDB.getCachedQueryResult(key)) as T | null;
    } catch (error) {
      console.error('[user-storage] IndexedDB read error:', key, error);
      return null;
    }
  }

  /**
   * Set large item in IndexedDB with user-keying.
   *
   * @param keyPrefix - Storage key prefix
   * @param value - Value to store
   * @param ttl - Time-to-live in milliseconds
   */
  async setLargeItem<T extends unknown[]>(
    keyPrefix: string,
    value: T,
    ttl?: number
  ): Promise<void> {
    const key = this.buildKey(keyPrefix);
    try {
      await this.indexedDB.cacheQueryResult(key, value, ttl);
    } catch (error) {
      console.error('[user-storage] IndexedDB write error:', key, error);
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Cleanup operations
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Clear all user-keyed data from localStorage.
   *
   * @remarks
   * This removes all keys matching the pattern `*:${userId}:*` or `*:${userId}`.
   * Should be called on sign-out to ensure no data leakage.
   */
  clearAllUserData(): void {
    if (!this.userId) {
      return;
    }

    const keysToRemove: string[] = [];
    const userSuffix = `:${this.userId}`;

    // Find all keys containing the userId
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes(userSuffix)) {
        keysToRemove.push(key);
      }
    }

    // Remove found keys
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  }

  /**
   * Migrate data from old (non-user-keyed) key to new user-keyed key.
   *
   * @param oldKey - Original storage key (without user prefix)
   * @param newKeyPrefix - New key prefix (will be user-keyed)
   * @param removeOld - Whether to remove the old key after migration
   * @returns True if migration occurred, false if no data to migrate
   */
  migrateFromLegacyKey<T>(
    oldKey: string,
    newKeyPrefix: string,
    removeOld = true
  ): boolean {
    if (!this.userId) {
      return false;
    }

    const oldValue = this.base.getItem<T | null>(oldKey, null);
    if (oldValue === null) {
      return false;
    }

    // Store under user-keyed key
    this.setItem(newKeyPrefix, oldValue);

    // Optionally remove old key
    if (removeOld) {
      this.base.removeItem(oldKey);
    }

    return true;
  }
}
