import { TestBed } from '@angular/core/testing';
import { UserKeyedStorageService } from './user-keyed-storage.service';
import { StorageBaseService } from './storage-base.service';
import { IndexedDBService } from './indexeddb.service';

describe('UserKeyedStorageService', () => {
  let service: UserKeyedStorageService;
  let mockStorageBase: jasmine.SpyObj<StorageBaseService>;
  let mockIndexedDB: jasmine.SpyObj<IndexedDBService>;

  beforeEach(() => {
    mockStorageBase = jasmine.createSpyObj('StorageBaseService', [
      'getItem',
      'setItem',
      'removeItem',
      'clear',
    ]);
    mockIndexedDB = jasmine.createSpyObj('IndexedDBService', [
      'getCachedQueryResult',
      'cacheQueryResult',
    ]);

    // Default mock returns
    mockStorageBase.getItem.and.callFake((key: string, defaultValue: unknown) => defaultValue);
    mockIndexedDB.getCachedQueryResult.and.returnValue(Promise.resolve(null));
    mockIndexedDB.cacheQueryResult.and.returnValue(Promise.resolve());

    TestBed.configureTestingModule({
      providers: [
        UserKeyedStorageService,
        { provide: StorageBaseService, useValue: mockStorageBase },
        { provide: IndexedDBService, useValue: mockIndexedDB },
      ],
    });

    service = TestBed.inject(UserKeyedStorageService);
  });

  describe('user ID management', () => {
    it('should start with no user ID', () => {
      expect(service.getUserId()).toBeNull();
    });

    it('should set user ID', () => {
      service.setUserId('user-123');
      expect(service.getUserId()).toBe('user-123');
    });

    it('should clear user ID', () => {
      service.setUserId('user-123');
      service.clearUserId();
      expect(service.getUserId()).toBeNull();
    });
  });

  describe('buildKey', () => {
    it('should return prefix only when no user ID set', () => {
      const key = service.buildKey('excel-ext:settings');
      expect(key).toBe('excel-ext:settings');
    });

    it('should return user-keyed key when user ID is set', () => {
      service.setUserId('user-456');
      const key = service.buildKey('excel-ext:settings');
      expect(key).toBe('excel-ext:settings:user-456');
    });
  });

  describe('localStorage operations (getItem/setItem)', () => {
    it('should call base service with user-keyed key', () => {
      service.setUserId('user-123');
      service.getItem('settings', {});

      expect(mockStorageBase.getItem).toHaveBeenCalledWith(
        'settings:user-123',
        {}
      );
    });

    it('should call base service with prefix only when no user', () => {
      service.getItem('settings', {});

      expect(mockStorageBase.getItem).toHaveBeenCalledWith('settings', {});
    });

    it('should set item with user-keyed key', () => {
      service.setUserId('user-789');
      const value = { theme: 'dark' };
      service.setItem('settings', value);

      expect(mockStorageBase.setItem).toHaveBeenCalledWith(
        'settings:user-789',
        value
      );
    });

    it('should remove item with user-keyed key', () => {
      service.setUserId('user-abc');
      service.removeItem('settings');

      expect(mockStorageBase.removeItem).toHaveBeenCalledWith('settings:user-abc');
    });
  });

  describe('IndexedDB operations (getLargeItem/setLargeItem)', () => {
    it('should get large item with user-keyed key', async () => {
      service.setUserId('user-123');
      await service.getLargeItem('query-cache');

      expect(mockIndexedDB.getCachedQueryResult).toHaveBeenCalledWith(
        'query-cache:user-123'
      );
    });

    it('should set large item with user-keyed key', async () => {
      service.setUserId('user-456');
      const value = [{ id: 1 }];
      await service.setLargeItem('query-cache', value, 3600000);

      expect(mockIndexedDB.cacheQueryResult).toHaveBeenCalledWith(
        'query-cache:user-456',
        value,
        3600000
      );
    });

    it('should handle IndexedDB errors gracefully', async () => {
      service.setUserId('user-err');
      mockIndexedDB.getCachedQueryResult.and.returnValue(
        Promise.reject(new Error('DB error'))
      );

      const result = await service.getLargeItem('failing-key');

      expect(result).toBeNull();
    });
  });

  describe('data isolation', () => {
    it('should use different keys for different users', () => {
      service.setUserId('user-a');
      const keyA = service.buildKey('data');

      service.setUserId('user-b');
      const keyB = service.buildKey('data');

      expect(keyA).not.toBe(keyB);
      expect(keyA).toBe('data:user-a');
      expect(keyB).toBe('data:user-b');
    });

    it('should access user-specific data after switching users', () => {
      // User A writes data
      service.setUserId('user-a');
      service.setItem('prefs', { color: 'red' });

      // User B writes data
      service.setUserId('user-b');
      service.setItem('prefs', { color: 'blue' });

      // Verify different keys were used
      expect(mockStorageBase.setItem).toHaveBeenCalledWith('prefs:user-a', {
        color: 'red',
      });
      expect(mockStorageBase.setItem).toHaveBeenCalledWith('prefs:user-b', {
        color: 'blue',
      });
    });
  });

  describe('migrateFromLegacyKey', () => {
    it('should return false when no user ID set', () => {
      const result = service.migrateFromLegacyKey('old-key', 'new-prefix');
      expect(result).toBeFalse();
    });

    it('should return false when old key has no data', () => {
      service.setUserId('user-123');
      mockStorageBase.getItem.and.returnValue(null);

      const result = service.migrateFromLegacyKey('old-key', 'new-prefix');

      expect(result).toBeFalse();
    });

    it('should migrate data and remove old key by default', () => {
      service.setUserId('user-123');
      const oldData = { setting: 'value' };
      mockStorageBase.getItem.and.callFake((key: string, defaultValue: unknown) => {
        if (key === 'old-settings') return oldData;
        return defaultValue;
      });

      const result = service.migrateFromLegacyKey('old-settings', 'new-settings');

      expect(result).toBeTrue();
      expect(mockStorageBase.setItem).toHaveBeenCalledWith(
        'new-settings:user-123',
        oldData
      );
      expect(mockStorageBase.removeItem).toHaveBeenCalledWith('old-settings');
    });

    it('should keep old key when removeOld is false', () => {
      service.setUserId('user-123');
      mockStorageBase.getItem.and.returnValue({ data: 'test' });

      service.migrateFromLegacyKey('old-key', 'new-key', false);

      expect(mockStorageBase.removeItem).not.toHaveBeenCalled();
    });
  });

  describe('service initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });
  });

  describe('clearAllUserData', () => {
    it('should do nothing when no user ID set', () => {
      // No user ID set - verify via getUserId
      expect(service.getUserId()).toBeNull();

      service.clearAllUserData();

      // Should not throw, should complete silently
      expect(service.getUserId()).toBeNull();
    });

    it('should remove all keys containing userId suffix', () => {
      service.setUserId('user-cleanup');

      // Mock localStorage with user-keyed items
      const mockLocalStorageData: { [key: string]: string } = {
        'settings:user-cleanup': '{}',
        'prefs:user-cleanup': '{}',
        'other-key': '{}',
        'cache:user-other': '{}',
      };
      const keys = Object.keys(mockLocalStorageData);

      // Create a mock localStorage object
      const mockLS = {
        length: keys.length,
        key: (i: number) => keys[i] ?? null,
        removeItem: jest.fn(),
        getItem: jest.fn(),
        setItem: jest.fn(),
        clear: jest.fn(),
      };

      // Replace localStorage temporarily
      const originalLS = window.localStorage;
      Object.defineProperty(window, 'localStorage', {
        value: mockLS,
        writable: true,
        configurable: true,
      });

      service.clearAllUserData();

      expect(mockLS.removeItem).toHaveBeenCalledWith('settings:user-cleanup');
      expect(mockLS.removeItem).toHaveBeenCalledWith('prefs:user-cleanup');
      expect(mockLS.removeItem).not.toHaveBeenCalledWith('other-key');
      expect(mockLS.removeItem).not.toHaveBeenCalledWith('cache:user-other');

      // Restore original localStorage
      Object.defineProperty(window, 'localStorage', {
        value: originalLS,
        writable: true,
        configurable: true,
      });
    });

    it('should handle empty localStorage', () => {
      service.setUserId('user-empty');

      // Create a mock empty localStorage
      const mockLS = {
        length: 0,
        key: () => null,
        removeItem: jest.fn(),
        getItem: jest.fn(),
        setItem: jest.fn(),
        clear: jest.fn(),
      };

      const originalLS = window.localStorage;
      Object.defineProperty(window, 'localStorage', {
        value: mockLS,
        writable: true,
        configurable: true,
      });

      service.clearAllUserData();

      expect(mockLS.removeItem).not.toHaveBeenCalled();

      // Restore original localStorage
      Object.defineProperty(window, 'localStorage', {
        value: originalLS,
        writable: true,
        configurable: true,
      });
    });
  });

  describe('buildDeviceKey', () => {
    it('should delegate to visitor-id buildDeviceKey utility', () => {
      // Create mock localStorage for visitor ID generation
      const deviceMockStorage: { [key: string]: string } = {};
      const mockLS = {
        length: 0,
        key: () => null,
        removeItem: jest.fn(),
        getItem: (key: string) => deviceMockStorage[key] ?? null,
        setItem: (key: string, value: string) => {
          deviceMockStorage[key] = value;
        },
        clear: jest.fn(),
      };

      const originalLS = window.localStorage;
      Object.defineProperty(window, 'localStorage', {
        value: mockLS,
        writable: true,
        configurable: true,
      });

      const key = service.buildDeviceKey('excel-ext:auth');
      // Should contain prefix and a UUID-like visitor ID
      expect(key).toMatch(/^excel-ext:auth:[0-9a-f-]{36}$/i);

      // Restore original localStorage
      Object.defineProperty(window, 'localStorage', {
        value: originalLS,
        writable: true,
        configurable: true,
      });
    });

    it('should return consistent device key across calls', () => {
      // Create mock localStorage for visitor ID generation
      const deviceMockStorage: { [key: string]: string } = {};
      const mockLS = {
        length: 0,
        key: () => null,
        removeItem: jest.fn(),
        getItem: (key: string) => deviceMockStorage[key] ?? null,
        setItem: (key: string, value: string) => {
          deviceMockStorage[key] = value;
        },
        clear: jest.fn(),
      };

      const originalLS = window.localStorage;
      Object.defineProperty(window, 'localStorage', {
        value: mockLS,
        writable: true,
        configurable: true,
      });

      const key1 = service.buildDeviceKey('prefix1');
      const key2 = service.buildDeviceKey('prefix2');

      // Extract visitor IDs from keys
      const visitorId1 = key1.replace('prefix1:', '');
      const visitorId2 = key2.replace('prefix2:', '');

      expect(visitorId1).toBe(visitorId2);

      // Restore original localStorage
      Object.defineProperty(window, 'localStorage', {
        value: originalLS,
        writable: true,
        configurable: true,
      });
    });
  });
});
