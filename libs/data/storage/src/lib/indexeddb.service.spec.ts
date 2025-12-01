import { TestBed } from '@angular/core/testing';
import { IndexedDBService, QueryResultCache } from './indexeddb.service';

/**
 * Mock IndexedDB for testing.
 *
 * Provides in-memory storage for tests since IndexedDB is async and
 * may not be available in all test environments.
 */
class MockIndexedDB {
  private stores: Map<string, Map<string, unknown>> = new Map();
  private dbVersion = 0;

  open(name: string, version: number): IDBOpenDBRequest {
    this.dbVersion = version;
    const request = {
      result: this.createDB(name),
      error: null,
      onsuccess: null as ((event: Event) => void) | null,
      onerror: null as ((event: Event) => void) | null,
      onupgradeneeded: null as ((event: IDBVersionChangeEvent) => void) | null,
    } as unknown as IDBOpenDBRequest;

    setTimeout(() => {
      if (this.dbVersion > 0 && request.onupgradeneeded) {
        const event = {
          target: request,
        } as unknown as IDBVersionChangeEvent;
        request.onupgradeneeded(event);
      }
      if (request.onsuccess) {
        request.onsuccess({ target: request } as unknown as Event);
      }
    }, 0);

    return request;
  }

  private createDB(name: string): IDBDatabase {
    const store = new Map<string, unknown>();
    this.stores.set(name, store);

    return {
      objectStoreNames: {
        contains: (storeName: string) => store.has(storeName),
      },
      createObjectStore: (storeName: string) => {
        store.set(storeName, new Map<string, unknown>());
        return this.createObjectStore_impl();
      },
      transaction: (storeNames: string[], _mode: string) => {
        return this.createTransaction(name, storeNames[0]);
      },
    } as unknown as IDBDatabase;
  }

  private createObjectStore_impl() {
    const indexes = new Map<string, unknown>();
    return {
      createIndex: (indexName: string, keyPath: string, options: unknown) => {
        indexes.set(indexName, { keyPath, options });
      },
    };
  }

  private createTransaction(dbName: string, storeName: string) {
    const store = this.stores.get(dbName)?.get(storeName) as Map<string, unknown> || new Map<string, unknown>();

    return {
      objectStore: () => this.createStore(store),
    } as unknown as IDBTransaction;
  }

  private createStore(dataMap: Map<string, unknown>) {
    return {
      put: (record: QueryResultCache) => {
        const request = {
          onsuccess: null as ((event: Event) => void) | null,
          onerror: null as ((event: Event) => void) | null,
        } as unknown as IDBRequest;

        setTimeout(() => {
          dataMap.set(record.id, record);
          if (request.onsuccess) {
            request.onsuccess({ target: request } as unknown as Event);
          }
        }, 0);

        return request;
      },
      index: () => {
        return {
          getAll: (key: string) => {
            const request = {
              result: Array.from(dataMap.values()).filter(
                (r) => (r as QueryResultCache).queryId === key
              ),
              onsuccess: null as ((event: Event) => void) | null,
              onerror: null as ((event: Event) => void) | null,
            } as unknown as IDBRequest;

            setTimeout(() => {
              if (request.onsuccess) {
                request.onsuccess({ target: request } as unknown as Event);
              }
            }, 0);

            return request;
          },
          openCursor: () => {
            const records = Array.from(dataMap.values()) as QueryResultCache[];
            let index = 0;

            const request = {
              onsuccess: null as ((event: Event) => void) | null,
              onerror: null as ((event: Event) => void) | null,
            } as unknown as IDBRequest;

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
                      queueMicrotask(processNext);
                    },
                  };
                  (request as unknown as { result: unknown }).result = cursor;
                  if (request.onsuccess) {
                    request.onsuccess({ target: request } as unknown as Event);
                  }
                } else {
                  (request as unknown as { result: unknown }).result = null;
                  if (request.onsuccess) {
                    request.onsuccess({ target: request } as unknown as Event);
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
          onsuccess: null as ((event: Event) => void) | null,
          onerror: null as ((event: Event) => void) | null,
        } as unknown as IDBRequest;

        setTimeout(() => {
          dataMap.clear();
          if (request.onsuccess) {
            request.onsuccess({ target: request } as unknown as Event);
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
    originalIndexedDB = (globalThis as unknown as { indexedDB: IDBFactory }).indexedDB;

    mockIndexedDB = new MockIndexedDB();

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
    Object.defineProperty(globalThis, 'indexedDB', {
      value: originalIndexedDB,
      writable: true,
      configurable: true,
    });
  });

  describe('init', () => {
    it('should initialize database and create object store with indexes', async () => {
      await service.init();
      expect((service as unknown as { db: unknown }).db).toBeTruthy();
    });

    it('should not reinitialize if already initialized', async () => {
      await service.init();
      const db1 = (service as unknown as { db: unknown }).db;

      await service.init();
      const db2 = (service as unknown as { db: unknown }).db;

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
      const ttl = 5000;

      await service.cacheQueryResult(queryId, rows, ttl);

      const cached = await service.getCachedQueryResult(queryId);
      expect(cached).toEqual(rows);
    });
  });

  describe('getCachedQueryResult', () => {
    it('should return null when no cache exists', async () => {
      const cached = await service.getCachedQueryResult('nonexistent');
      expect(cached).toBeNull();
    });

    it('should return null when cache is expired', async () => {
      const queryId = 'test-query';
      const rows = [{ id: 1, name: 'Test' }];
      const ttl = -1000;

      await service.cacheQueryResult(queryId, rows, ttl);

      const cached = await service.getCachedQueryResult(queryId);
      expect(cached).toBeNull();
    });
  });

  describe('clearExpiredCache', () => {
    it('should handle empty cache gracefully', async () => {
      await expectAsync(service.clearExpiredCache()).toBeResolved();
    });
  });

  describe('clearAllCache', () => {
    it('should handle empty cache gracefully', async () => {
      await expectAsync(service.clearAllCache()).toBeResolved();
    });
  });

  describe('error handling', () => {
    it('should auto-initialize on first cache operation', async () => {
      const queryId = 'test-query';
      const rows = [{ id: 1 }];

      await service.cacheQueryResult(queryId, rows);

      expect((service as unknown as { db: unknown }).db).toBeTruthy();
    });
  });
});
