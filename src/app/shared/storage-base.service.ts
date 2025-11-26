import { Injectable } from '@angular/core';

/**
 * Storage Base Service - Zero-dependency localStorage wrapper.
 *
 * Provides basic localStorage operations without any external dependencies.
 * This service exists to break the circular dependency chain:
 * `TelemetryService → SettingsService → StorageHelperService → TelemetryService`
 *
 * **Usage:**
 * - `SettingsService` uses this directly (avoids TelemetryService dependency)
 * - `StorageHelperService` delegates to this and adds telemetry logging
 *
 * **Design Decision:**
 * Silent failure on errors (no telemetry) - services needing error logging
 * should use `StorageHelperService` instead.
 */
@Injectable({ providedIn: 'root' })
export class StorageBaseService {
  /**
   * Get item from localStorage with type safety.
   *
   * @param key - Storage key
   * @param defaultValue - Value to return if key not found or parse error
   * @returns Parsed value or defaultValue
   */
  getItem<T>(key: string, defaultValue: T): T {
    if (typeof window === 'undefined') return defaultValue;

    const item = localStorage.getItem(key);
    if (!item) return defaultValue;

    try {
      return JSON.parse(item) as T;
    } catch {
      return defaultValue;
    }
  }

  /**
   * Set item in localStorage with type safety.
   *
   * @param key - Storage key
   * @param value - Value to store (will be JSON stringified)
   */
  setItem<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Silent fail - no telemetry available at this layer
    }
  }

  /**
   * Remove item from localStorage.
   *
   * @param key - Storage key to remove
   */
  removeItem(key: string): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
  }

  /**
   * Clear all localStorage (use cautiously).
   */
  clear(): void {
    if (typeof window === 'undefined') return;
    localStorage.clear();
  }
}
