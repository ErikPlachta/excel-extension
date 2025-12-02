import { Injectable } from '@angular/core';

/**
 * IndexedDB Service - Large dataset storage for query result caching.
 *
 * Provides async storage for query results (10k+ rows) to reduce API calls
 * and enable offline review. Uses TTL-based cache invalidation.
 *
 * **Usage:**
 * ```typescript
 * // Cache query result
 * await indexedDB.cacheQueryResult('sales-summary', rows, 3600000); // 1 hour TTL
 *
 * // Get cached result
 * const cached = await indexedDB.getCachedQueryResult('sales-summary');
 * if (cached) {
 *   // Use cached data
 * } else {
 *   // Fetch fresh data
 * }
 *
 * // Clear expired cache
 * await indexedDB.clearExpiredCache();
 * ```
 */
@Injectable({ providedIn: 'root' })
export class IndexedDBService {
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'ExcelExtensionDB';
  private readonly DB_VERSION = 1;
  private readonly STORE_NAME = 'queryResults';

  /**
   * Initialize IndexedDB connection.
   *
   * Creates object store with indexes if not exists. Called automatically
   * on first cache operation, but can be called explicitly for early init.
   *
   * @returns Promise that resolves when DB is ready
   */
  async init(): Promise<void> {
    if (this.db) return; // Already initialized

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
          store.createIndex('queryId', 'queryId', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  /**
   * Cache query result with TTL expiration.
   *
   * Stores large datasets (10k+ rows) for offline access and performance.
   * Multiple cached results per queryId are allowed (timestamped).
   *
   * @param queryId - Query identifier
   * @param rows - Result rows to cache
   * @param expiresIn - TTL in milliseconds (default: 1 hour)
   */
  async cacheQueryResult(
    queryId: string,
    rows: unknown[],
    expiresIn: number = 3600000 // 1 hour default
  ): Promise<void> {
    if (!this.db) await this.init();

    const record: QueryResultCache = {
      id: `${queryId}-${Date.now()}`,
      queryId,
      rows,
      timestamp: Date.now(),
      expiresAt: Date.now() + expiresIn,
    };

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = tx.objectStore(this.STORE_NAME);
      const request = store.put(record);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get most recent non-expired cached result for a query.
   *
   * Returns null if no valid cache exists (expired or not found).
   *
   * @param queryId - Query identifier
   * @returns Cached rows or null
   */
  async getCachedQueryResult(queryId: string): Promise<unknown[] | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = tx.objectStore(this.STORE_NAME);
      const index = store.index('queryId');
      const request = index.getAll(queryId);

      request.onsuccess = () => {
        const results = request.result as QueryResultCache[];
        if (!results.length) {
          resolve(null);
          return;
        }

        // Get most recent non-expired result
        const validResults = results
          .filter((r) => r.expiresAt > Date.now())
          .sort((a, b) => b.timestamp - a.timestamp);

        resolve(validResults.length > 0 ? validResults[0].rows : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all expired cache entries based on TTL.
   *
   * Should be called on app init and periodically. Removes entries
   * where `expiresAt < Date.now()`.
   */
  async clearExpiredCache(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = tx.objectStore(this.STORE_NAME);
      const index = store.index('timestamp');
      const request = index.openCursor();

      request.onsuccess = (event: Event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (cursor) {
          const record = cursor.value as QueryResultCache;
          if (record.expiresAt < Date.now()) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all cached results (use cautiously).
   *
   * Removes all entries from the query results store. Typically used
   * for testing or manual cache reset via Settings UI.
   */
  async clearAllCache(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = tx.objectStore(this.STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

/**
 * Query result cache record schema.
 */
export interface QueryResultCache {
  /** Primary key: `${queryId}-${timestamp}` */
  id: string;
  /** Query identifier (indexed) */
  queryId: string;
  /** Cached result rows */
  rows: unknown[];
  /** Cache creation timestamp (indexed) */
  timestamp: number;
  /** TTL expiration timestamp */
  expiresAt: number;
}
