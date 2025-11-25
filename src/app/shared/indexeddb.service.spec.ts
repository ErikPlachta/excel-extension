import { TestBed } from '@angular/core/testing';
import { IndexedDBService, QueryResultCache } from './indexeddb.service';

/**
 * Mock IndexedDB for testing.
 *
 * Provides in-memory storage for tests since IndexedDB is async and
 * may not be available in all test environments.
 */
class MockIndexedDB {
  private stores: Map<string, Map<string, any>> = new Map();
  private dbVersion = 0;

  open(name: string, version: number): IDBOpenDBRequest {
    this.dbVersion = version;
    const request = {
      result: this.createDB(name),
      error: null,
      onsuccess: null as any,
      onerror: null as any,
      onupgradeneeded: null as any,
    } as unknown as IDBOpenDBRequest;

    setTimeout(() => {
      if (this.dbVersion > 0 && request.onupgradeneeded) {
        const event = {
          target: request,
        } as unknown as IDBVersionChangeEvent;
        request.onupgradeneeded(event);
      }
      if (request.onsuccess) {
        request.onsuccess({ target: request } as any);
      }
    }, 0);

    return request;
  }

  private createDB(name: string): IDBDatabase {
    const store = new Map<string, any>();
    this.stores.set(name, store);

    return {
      objectStoreNames: {
        contains: (storeName: string) => store.has(storeName),
      },
      createObjectStore: (storeName: string, options: any) => {
        store.set(storeName, new Map<string, any>());
        return this.createObjectStore_impl(name, storeName);
      },
      transaction: (storeNames: string[], mode: string) => {
        return this.createTransaction(name, storeNames[0], mode);
      },
    } as unknown as IDBDatabase;
  }

  private createObjectStore_impl(dbName: string, storeName: string) {
    const indexes = new Map<string, any>();
    return {
      createIndex: (indexName: string, keyPath: string, options: any) => {
        indexes.set(indexName, { keyPath, options });
      },
    };
  }

  private createTransaction(dbName: string, storeName: string, mode: string) {
    const store = this.stores.get(dbName)?.get(storeName) || new Map<string, any>();

    return {
      objectStore: () => this.createStore(store),
    } as unknown as IDBTransaction;
  }

  private createStore(dataMap: Map<string, any>) {
    return {
      put: (record: any) => {
        const request = {
          onsuccess: null as any,
          onerror: null as any,
        } as unknown as IDBRequest;

        setTimeout(() => {
          dataMap.set(record.id, record);
          if (request.onsuccess) {
            request.onsuccess({ target: request } as any);
          }
        }, 0);

        return request;
      },
      index: (indexName: string) => {
        return {
          getAll: (key: string) => {
            const request = {
              result: Array.from(dataMap.values()).filter(
                (r) => r.queryId === key
              ),
              onsuccess: null as any,
              onerror: null as any,
            } as unknown as IDBRequest;

            setTimeout(() => {
              if (request.onsuccess) {
                request.onsuccess({ target: request } as any);
              }
            }, 0);

            return request;
          },
          openCursor: () => {
            const records = Array.from(dataMap.values());
            let index = 0;
            let continueRequested = false;

            const request = {
              onsuccess: null as any,
              onerror: null as any,
            } as unknown as IDBRequest;

            // Use queueMicrotask for synchronous-ish iteration
            queueMicrotask(() => {
              const processNext = () => {
                if (index < records.length) {
                  const record = records[index];
                  const cursor = {
                    value: record,
                    delete: () => {
                      dataMap.delete(record.id);
                    },
                    continue: () => {
                      index++;
                      continueRequested = true;
                      // Process next immediately in microtask
                      queueMicrotask(processNext);
                    },
                  };
                  (request as any).result = cursor;
                  if (request.onsuccess) {
                    request.onsuccess({ target: request } as any);
                  }
                } else {
                  (request as any).result = null;
                  if (request.onsuccess) {
                    request.onsuccess({ target: request } as any);
                  }
                }
              };
              processNext();
            });

            return request;
          },
        };
      },
      clear: () => {
        const request = {
          onsuccess: null as any,
          onerror: null as any,
        } as unknown as IDBRequest;

        setTimeout(() => {
          dataMap.clear();
          if (request.onsuccess) {
            request.onsuccess({ target: request } as any);
          }
        }, 0);

        return request;
      },
    } as unknown as IDBObjectStore;
  }
}

describe('IndexedDBService', () => {
  let service: IndexedDBService;
  let mockIndexedDB: MockIndexedDB;
  let originalIndexedDB: IDBFactory;

  beforeEach(() => {
    // Save original indexedDB
    originalIndexedDB = (globalThis as any).indexedDB;

    mockIndexedDB = new MockIndexedDB();

    // Use Object.defineProperty to override read-only indexedDB
    Object.defineProperty(globalThis, 'indexedDB', {
      value: mockIndexedDB,
      writable: true,
      configurable: true,
    });

    TestBed.configureTestingModule({
      providers: [IndexedDBService],
    });

    service = TestBed.inject(IndexedDBService);
  });

  afterEach(() => {
    // Restore original indexedDB
    Object.defineProperty(globalThis, 'indexedDB', {
      value: originalIndexedDB,
      writable: true,
      configurable: true,
    });
  });

  describe('init', () => {
    it('should initialize database and create object store with indexes', async () => {
      await service.init();
      expect((service as any).db).toBeTruthy();
    });

    it('should not reinitialize if already initialized', async () => {
      await service.init();
      const db1 = (service as any).db;

      await service.init();
      const db2 = (service as any).db;

      expect(db1).toBe(db2);
    });
  });

  describe('cacheQueryResult', () => {
    it('should cache query result with default TTL (1 hour)', async () => {
      const queryId = 'test-query';
      const rows = [{ id: 1, name: 'Test' }];

      await service.cacheQueryResult(queryId, rows);

      const cached = await service.getCachedQueryResult(queryId);
      expect(cached).toEqual(rows);
    });

    it('should cache query result with custom TTL', async () => {
      const queryId = 'test-query';
      const rows = [{ id: 1, name: 'Test' }];
      const ttl = 5000; // 5 seconds

      await service.cacheQueryResult(queryId, rows, ttl);

      const cached = await service.getCachedQueryResult(queryId);
      expect(cached).toEqual(rows);
    });

    it('should allow multiple cached results for same queryId', async () => {
      const queryId = 'test-query';
      const rows1 = [{ id: 1, name: 'Test 1' }];
      const rows2 = [{ id: 2, name: 'Test 2' }];

      await service.cacheQueryResult(queryId, rows1);
      await new Promise((resolve) => setTimeout(resolve, 10)); // Ensure different timestamps
      await service.cacheQueryResult(queryId, rows2);

      const cached = await service.getCachedQueryResult(queryId);
      expect(cached).toEqual(rows2); // Should return most recent
    });
  });

  describe('getCachedQueryResult', () => {
    it('should return null when no cache exists', async () => {
      const cached = await service.getCachedQueryResult('nonexistent');
      expect(cached).toBeNull();
    });

    it('should return most recent non-expired result', async () => {
      const queryId = 'test-query';
      const rows1 = [{ id: 1, name: 'Old' }];
      const rows2 = [{ id: 2, name: 'New' }];

      await service.cacheQueryResult(queryId, rows1, 3600000);
      await new Promise((resolve) => setTimeout(resolve, 10));
      await service.cacheQueryResult(queryId, rows2, 3600000);

      const cached = await service.getCachedQueryResult(queryId);
      expect(cached).toEqual(rows2);
    });

    it('should return null when cache is expired', async () => {
      const queryId = 'test-query';
      const rows = [{ id: 1, name: 'Test' }];
      const ttl = -1000; // Expired 1 second ago

      await service.cacheQueryResult(queryId, rows, ttl);

      const cached = await service.getCachedQueryResult(queryId);
      expect(cached).toBeNull();
    });

    it('should skip expired results and return most recent valid one', async () => {
      const queryId = 'test-query';
      const rows1 = [{ id: 1, name: 'Valid' }];
      const rows2 = [{ id: 2, name: 'Expired' }];

      await service.cacheQueryResult(queryId, rows1, 3600000); // Valid
      await new Promise((resolve) => setTimeout(resolve, 10));
      await service.cacheQueryResult(queryId, rows2, -1000); // Expired

      const cached = await service.getCachedQueryResult(queryId);
      expect(cached).toEqual(rows1); // Should return first (most recent valid)
    });
  });

  describe('clearExpiredCache', () => {
    it('should remove expired cache entries', async () => {
      const queryId1 = 'valid-query';
      const queryId2 = 'expired-query';
      const rows1 = [{ id: 1 }];
      const rows2 = [{ id: 2 }];

      await service.cacheQueryResult(queryId1, rows1, 3600000); // Valid
      await service.cacheQueryResult(queryId2, rows2, -1000); // Expired

      await service.clearExpiredCache();

      const cached1 = await service.getCachedQueryResult(queryId1);
      const cached2 = await service.getCachedQueryResult(queryId2);

      expect(cached1).toEqual(rows1);
      expect(cached2).toBeNull();
    });

    it('should not remove valid cache entries', async () => {
      const queryId = 'test-query';
      const rows = [{ id: 1 }];

      await service.cacheQueryResult(queryId, rows, 3600000);

      await service.clearExpiredCache();

      const cached = await service.getCachedQueryResult(queryId);
      expect(cached).toEqual(rows);
    });

    it('should handle empty cache gracefully', async () => {
      await expectAsync(service.clearExpiredCache()).toBeResolved();
    });
  });

  describe('clearAllCache', () => {
    it('should remove all cache entries', async () => {
      const queryId1 = 'query-1';
      const queryId2 = 'query-2';
      const rows1 = [{ id: 1 }];
      const rows2 = [{ id: 2 }];

      await service.cacheQueryResult(queryId1, rows1);
      await service.cacheQueryResult(queryId2, rows2);

      await service.clearAllCache();

      const cached1 = await service.getCachedQueryResult(queryId1);
      const cached2 = await service.getCachedQueryResult(queryId2);

      expect(cached1).toBeNull();
      expect(cached2).toBeNull();
    });

    it('should handle empty cache gracefully', async () => {
      await expectAsync(service.clearAllCache()).toBeResolved();
    });
  });

  describe('error handling', () => {
    it('should auto-initialize on first cache operation', async () => {
      const queryId = 'test-query';
      const rows = [{ id: 1 }];

      // Don't call init() explicitly
      await service.cacheQueryResult(queryId, rows);

      expect((service as any).db).toBeTruthy();
    });

    it('should auto-initialize on first get operation', async () => {
      // Don't call init() explicitly
      const cached = await service.getCachedQueryResult('test');

      expect((service as any).db).toBeTruthy();
      expect(cached).toBeNull();
    });
  });
});
