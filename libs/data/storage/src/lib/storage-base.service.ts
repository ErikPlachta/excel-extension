import { Injectable } from '@angular/core';
import { ZodSchema } from 'zod';

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
 *
 * **Zod Integration:**
 * Pass an optional Zod schema to validate parsed data at runtime.
 * Invalid data returns the defaultValue instead of throwing.
 */
@Injectable({ providedIn: 'root' })
export class StorageBaseService {
  /**
   * Get item from localStorage with type safety and optional Zod validation.
   *
   * @param key - Storage key
   * @param defaultValue - Value to return if key not found, parse error, or validation fails
   * @param schema - Optional Zod schema to validate parsed data
   * @returns Parsed and validated value or defaultValue
   *
   * @example
   * ```typescript
   * // Without schema (legacy behavior)
   * const settings = storage.getItem('settings', DEFAULT_SETTINGS);
   *
   * // With Zod schema (recommended)
   * import { AppSettingsSchema } from '@excel-platform/shared/types';
   * const settings = storage.getItem('settings', DEFAULT_SETTINGS, AppSettingsSchema);
   * ```
   */
  getItem<T>(key: string, defaultValue: T, schema?: ZodSchema<T>): T {
    if (typeof window === 'undefined') return defaultValue;

    const item = localStorage.getItem(key);
    if (!item) return defaultValue;

    try {
      const parsed = JSON.parse(item);

      // If schema provided, validate parsed data
      if (schema) {
        const result = schema.safeParse(parsed);
        return result.success ? result.data : defaultValue;
      }

      return parsed as T;
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
