/**
 * Visitor ID utility for device-level identification.
 *
 * @remarks
 * Generates and persists a unique visitor ID for each browser/device.
 * Used to isolate auth state and device-specific data, independent of
 * which user is signed in.
 *
 * **Use cases:**
 * - Device-level auth state isolation
 * - Analytics/telemetry device tracking
 * - Multi-user device support (e.g., shared workstations)
 *
 * The visitor ID is:
 * - Generated once per browser profile
 * - Persisted in localStorage
 * - Not tied to any user account
 */

/** Storage key for visitor ID */
const VISITOR_ID_KEY = 'excel-ext:visitor-id';

/**
 * Get or generate persistent visitor ID for this device.
 *
 * @remarks
 * - Returns existing ID if present in localStorage
 * - Generates new UUID if not present
 * - SSR-safe: returns empty string if not in browser
 *
 * @returns Visitor ID (UUID format) or empty string in SSR
 *
 * @example
 * ```typescript
 * const visitorId = getVisitorId();
 * // e.g., "550e8400-e29b-41d4-a716-446655440000"
 * ```
 */
export function getVisitorId(): string {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return '';
  }

  try {
    let id = localStorage.getItem(VISITOR_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(VISITOR_ID_KEY, id);
    }
    return id;
  } catch {
    // localStorage unavailable (e.g., private browsing restrictions)
    return '';
  }
}

/**
 * Clear the visitor ID from localStorage.
 *
 * @remarks
 * Primarily for testing. Calling this will cause a new visitor ID
 * to be generated on the next `getVisitorId()` call.
 *
 * @example
 * ```typescript
 * clearVisitorId(); // Remove stored ID
 * const newId = getVisitorId(); // Generates fresh ID
 * ```
 */
export function clearVisitorId(): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(VISITOR_ID_KEY);
  } catch {
    // Ignore errors
  }
}

/**
 * Build a user-keyed storage key.
 *
 * @remarks
 * Creates storage keys that include userId for data isolation.
 * Different users on the same device will have separate storage.
 *
 * @param prefix - Key prefix (e.g., 'excel-ext:settings')
 * @param userId - User identifier
 * @returns Formatted key: `${prefix}:${userId}`
 *
 * @example
 * ```typescript
 * const key = buildUserKey('excel-ext:settings', 'user-123');
 * // Returns: "excel-ext:settings:user-123"
 * ```
 */
export function buildUserKey(prefix: string, userId: string): string {
  return `${prefix}:${userId}`;
}

/**
 * Build a device-keyed storage key using visitor ID.
 *
 * @remarks
 * Creates storage keys that include visitor ID for device isolation.
 * Useful for auth state that should persist per-device, not per-user.
 *
 * @param prefix - Key prefix (e.g., 'excel-ext:auth')
 * @returns Formatted key: `${prefix}:${visitorId}` or just prefix if no visitor ID
 *
 * @example
 * ```typescript
 * const key = buildDeviceKey('excel-ext:auth');
 * // Returns: "excel-ext:auth:550e8400-e29b-41d4-a716-446655440000"
 * ```
 */
export function buildDeviceKey(prefix: string): string {
  const visitorId = getVisitorId();
  return visitorId ? `${prefix}:${visitorId}` : prefix;
}
