import { TestBed } from '@angular/core/testing';
import { StorageHelperService } from './storage-helper.service';
import { StorageBaseService } from './storage-base.service';
import { IndexedDBService } from './indexeddb.service';

describe('StorageHelperService', () => {
  let service: StorageHelperService;
  let baseSpy: jasmine.SpyObj<StorageBaseService>;
  let indexedDBSpy: jasmine.SpyObj<IndexedDBService>;
  let consoleErrorSpy: jasmine.Spy;

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

    consoleErrorSpy = spyOn(console, 'error');

    baseSpy.getItem.and.callFake((key: string, defaultValue: unknown) => {
      const item = localStorage.getItem(key);
      if (!item) return defaultValue;
      try {
        return JSON.parse(item);
      } catch {
        return defaultValue;
      }
    });
    baseSpy.setItem.and.callFake((key: string, value: unknown) => {
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
      ],
    });

    service = TestBed.inject(StorageHelperService);
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
  });

  describe('setItem', () => {
    it('should store value as JSON string', () => {
      const key = 'test-key';
      const value = { foo: 'bar', num: 42 };

      service.setItem(key, value);

      const stored = localStorage.getItem(key);
      expect(stored).toBe(JSON.stringify(value));
    });

    it('should delegate to StorageBaseService', () => {
      const key = 'test-key';
      const value = { test: true };

      service.setItem(key, value);

      expect(baseSpy.setItem).toHaveBeenCalledWith(key, value);
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
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[storage] IndexedDB read error:',
        key,
        jasmine.any(Error)
      );
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

    it('should log error when IndexedDB throws', async () => {
      const key = 'error-key';
      const value = [{ id: 1 }];
      indexedDBSpy.cacheQueryResult.and.rejectWith(new Error('DB error'));

      await service.setLargeItem(key, value);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[storage] IndexedDB write error:',
        key,
        jasmine.any(Error)
      );
    });
  });

  describe('removeItem', () => {
    it('should remove item from localStorage', () => {
      const key = 'test-key';
      localStorage.setItem(key, 'test-value');

      service.removeItem(key);

      expect(localStorage.getItem(key)).toBeNull();
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

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[storage] Cache cleanup error:',
        jasmine.any(Error)
      );
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

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[storage] Cache clear-all error:',
        jasmine.any(Error)
      );
    });
  });
});
