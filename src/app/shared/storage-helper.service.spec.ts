import { TestBed } from '@angular/core/testing';
import { StorageHelperService } from './storage-helper.service';
import { StorageBaseService } from './storage-base.service';
import { IndexedDBService } from './indexeddb.service';
import { TelemetryService } from '../core/telemetry.service';

describe('StorageHelperService', () => {
  let service: StorageHelperService;
  let baseSpy: jasmine.SpyObj<StorageBaseService>;
  let indexedDBSpy: jasmine.SpyObj<IndexedDBService>;
  let telemetrySpy: jasmine.SpyObj<TelemetryService>;

  beforeEach(() => {
    baseSpy = jasmine.createSpyObj<StorageBaseService>('StorageBaseService', [
      'getItem',
      'setItem',
      'removeItem',
      'clear',
    ]);

    indexedDBSpy = jasmine.createSpyObj<IndexedDBService>('IndexedDBService', [
      'getCachedQueryResult',
      'cacheQueryResult',
      'clearExpiredCache',
      'clearAllCache',
    ]);

    telemetrySpy = jasmine.createSpyObj<TelemetryService>('TelemetryService', ['logEvent']);

    // Setup default mock returns for StorageBaseService
    baseSpy.getItem.and.callFake((key: string, defaultValue: any) => {
      const item = localStorage.getItem(key);
      if (!item) return defaultValue;
      try {
        return JSON.parse(item);
      } catch {
        return defaultValue;
      }
    });
    baseSpy.setItem.and.callFake((key: string, value: any) => {
      localStorage.setItem(key, JSON.stringify(value));
    });
    baseSpy.removeItem.and.callFake((key: string) => {
      localStorage.removeItem(key);
    });
    baseSpy.clear.and.callFake(() => {
      localStorage.clear();
    });

    TestBed.configureTestingModule({
      providers: [
        StorageHelperService,
        { provide: StorageBaseService, useValue: baseSpy },
        { provide: IndexedDBService, useValue: indexedDBSpy },
        { provide: TelemetryService, useValue: telemetrySpy },
      ],
    });

    service = TestBed.inject(StorageHelperService);

    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('getItem', () => {
    it('should return stored value when key exists', () => {
      const key = 'test-key';
      const value = { foo: 'bar', num: 42 };
      localStorage.setItem(key, JSON.stringify(value));

      const result = service.getItem<typeof value | null>(key, null);

      expect(result).toEqual(value);
    });

    it('should return defaultValue when key does not exist', () => {
      const defaultValue = { default: true };

      const result = service.getItem('nonexistent-key', defaultValue);

      expect(result).toEqual(defaultValue);
    });

    it('should return defaultValue when JSON parse fails (delegated to StorageBaseService)', () => {
      const key = 'invalid-json';
      const defaultValue = { default: true };
      localStorage.setItem(key, 'invalid-json{{{');

      const result = service.getItem(key, defaultValue);

      // StorageBaseService handles parse errors silently and returns default
      expect(result).toEqual(defaultValue);
      expect(baseSpy.getItem).toHaveBeenCalledWith(key, defaultValue);
    });

    it('should handle primitive default values', () => {
      const stringResult = service.getItem('missing', 'default-string');
      expect(stringResult).toBe('default-string');

      const numberResult = service.getItem('missing', 123);
      expect(numberResult).toBe(123);

      const boolResult = service.getItem('missing', true);
      expect(boolResult).toBe(true);
    });
  });

  describe('setItem', () => {
    it('should store value as JSON string', () => {
      const key = 'test-key';
      const value = { foo: 'bar', num: 42 };

      service.setItem(key, value);

      const stored = localStorage.getItem(key);
      expect(stored).toBe(JSON.stringify(value));
    });

    it('should overwrite existing value', () => {
      const key = 'test-key';
      localStorage.setItem(key, JSON.stringify({ old: true }));

      service.setItem(key, { new: true });

      const stored = localStorage.getItem(key);
      expect(stored).toBe(JSON.stringify({ new: true }));
    });

    it('should delegate to StorageBaseService', () => {
      const key = 'test-key';
      const value = { test: true };

      service.setItem(key, value);

      expect(baseSpy.setItem).toHaveBeenCalledWith(key, value);
    });

    it('should handle primitive values', () => {
      service.setItem('string-key', 'test-string');
      expect(localStorage.getItem('string-key')).toBe('"test-string"');

      service.setItem('number-key', 123);
      expect(localStorage.getItem('number-key')).toBe('123');

      service.setItem('bool-key', true);
      expect(localStorage.getItem('bool-key')).toBe('true');
    });
  });

  describe('getLargeItem', () => {
    it('should delegate to IndexedDBService.getCachedQueryResult', async () => {
      const key = 'large-data';
      const cachedData = [{ id: 1, name: 'Test' }];
      indexedDBSpy.getCachedQueryResult.and.resolveTo(cachedData);

      const result = await service.getLargeItem(key);

      expect(result).toEqual(cachedData);
      expect(indexedDBSpy.getCachedQueryResult).toHaveBeenCalledWith(key);
    });

    it('should return null when IndexedDB returns null', async () => {
      indexedDBSpy.getCachedQueryResult.and.resolveTo(null);

      const result = await service.getLargeItem('missing-key');

      expect(result).toBeNull();
    });

    it('should return null and log error when IndexedDB throws', async () => {
      const key = 'error-key';
      indexedDBSpy.getCachedQueryResult.and.rejectWith(new Error('DB error'));

      const result = await service.getLargeItem(key);

      expect(result).toBeNull();
      expect(telemetrySpy.logEvent).toHaveBeenCalledWith({
        category: 'system',
        name: 'storage-indexeddb-read-error',
        severity: 'error',
        message: `Failed to read from IndexedDB: ${key}`,
        context: jasmine.objectContaining({ error: jasmine.any(Error) }),
      });
    });
  });

  describe('setLargeItem', () => {
    it('should delegate to IndexedDBService.cacheQueryResult with default TTL', async () => {
      const key = 'large-data';
      const value = [{ id: 1, name: 'Test' }];
      indexedDBSpy.cacheQueryResult.and.resolveTo();

      await service.setLargeItem(key, value);

      expect(indexedDBSpy.cacheQueryResult).toHaveBeenCalledWith(key, value, undefined);
    });

    it('should delegate with custom TTL', async () => {
      const key = 'large-data';
      const value = [{ id: 1 }];
      const ttl = 5000;
      indexedDBSpy.cacheQueryResult.and.resolveTo();

      await service.setLargeItem(key, value, ttl);

      expect(indexedDBSpy.cacheQueryResult).toHaveBeenCalledWith(key, value, ttl);
    });

    it('should log error when IndexedDB throws', async () => {
      const key = 'error-key';
      const value = [{ id: 1 }];
      indexedDBSpy.cacheQueryResult.and.rejectWith(new Error('DB error'));

      await service.setLargeItem(key, value);

      expect(telemetrySpy.logEvent).toHaveBeenCalledWith({
        category: 'system',
        name: 'storage-indexeddb-write-error',
        severity: 'error',
        message: `Failed to write to IndexedDB: ${key}`,
        context: jasmine.objectContaining({ error: jasmine.any(Error) }),
      });
    });
  });

  describe('removeItem', () => {
    it('should remove item from localStorage', () => {
      const key = 'test-key';
      localStorage.setItem(key, 'test-value');

      service.removeItem(key);

      expect(localStorage.getItem(key)).toBeNull();
    });

    it('should not throw when key does not exist', () => {
      expect(() => service.removeItem('nonexistent')).not.toThrow();
    });
  });

  describe('clear', () => {
    it('should clear all localStorage', () => {
      localStorage.setItem('key1', 'value1');
      localStorage.setItem('key2', 'value2');

      service.clear();

      expect(localStorage.length).toBe(0);
    });
  });

  describe('clearExpiredCache', () => {
    it('should delegate to IndexedDBService.clearExpiredCache', async () => {
      indexedDBSpy.clearExpiredCache.and.resolveTo();

      await service.clearExpiredCache();

      expect(indexedDBSpy.clearExpiredCache).toHaveBeenCalled();
    });

    it('should log error when IndexedDB throws', async () => {
      indexedDBSpy.clearExpiredCache.and.rejectWith(new Error('Cleanup error'));

      await service.clearExpiredCache();

      expect(telemetrySpy.logEvent).toHaveBeenCalledWith({
        category: 'system',
        name: 'storage-cache-cleanup-error',
        severity: 'error',
        message: 'Failed to clear expired cache',
        context: jasmine.objectContaining({ error: jasmine.any(Error) }),
      });
    });
  });

  describe('clearAllCache', () => {
    it('should delegate to IndexedDBService.clearAllCache', async () => {
      indexedDBSpy.clearAllCache.and.resolveTo();

      await service.clearAllCache();

      expect(indexedDBSpy.clearAllCache).toHaveBeenCalled();
    });

    it('should log error when IndexedDB throws', async () => {
      indexedDBSpy.clearAllCache.and.rejectWith(new Error('Clear all error'));

      await service.clearAllCache();

      expect(telemetrySpy.logEvent).toHaveBeenCalledWith({
        category: 'system',
        name: 'storage-cache-clear-all-error',
        severity: 'error',
        message: 'Failed to clear all cache',
        context: jasmine.objectContaining({ error: jasmine.any(Error) }),
      });
    });
  });

  describe('type safety', () => {
    interface TestType {
      id: number;
      name: string;
    }

    it('should preserve type safety with getItem', () => {
      const value: TestType = { id: 1, name: 'Test' };
      localStorage.setItem('typed-key', JSON.stringify(value));

      const result = service.getItem<TestType>('typed-key', { id: 0, name: '' });

      expect(result.id).toBe(1);
      expect(result.name).toBe('Test');
    });

    it('should preserve type safety with setItem', () => {
      const value: TestType = { id: 42, name: 'Typed' };

      service.setItem<TestType>('typed-key', value);

      const stored = JSON.parse(localStorage.getItem('typed-key')!);
      expect(stored).toEqual(value);
    });

    it('should preserve type safety with getLargeItem', async () => {
      const value: TestType[] = [{ id: 1, name: 'Test' }];
      indexedDBSpy.getCachedQueryResult.and.resolveTo(value);

      const result = await service.getLargeItem<TestType[]>('typed-key');

      expect(result).toEqual(value);
    });
  });
});
