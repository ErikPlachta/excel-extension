import { getVisitorId, clearVisitorId, buildUserKey, buildDeviceKey } from './visitor-id';

describe('visitor-id utilities', () => {
  // Store original localStorage to restore after tests
  let originalLocalStorage: Storage;
  let mockStorage: { [key: string]: string };

  beforeEach(() => {
    // Mock localStorage
    mockStorage = {};
    originalLocalStorage = window.localStorage;
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: (key: string) => mockStorage[key] ?? null,
        setItem: (key: string, value: string) => {
          mockStorage[key] = value;
        },
        removeItem: (key: string) => {
          delete mockStorage[key];
        },
        clear: () => {
          mockStorage = {};
        },
        get length() {
          return Object.keys(mockStorage).length;
        },
        key: (index: number) => Object.keys(mockStorage)[index] ?? null,
      },
      configurable: true,
    });
  });

  afterEach(() => {
    // Restore original localStorage
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage,
      configurable: true,
    });
  });

  describe('getVisitorId', () => {
    it('should generate a new UUID on first call', () => {
      const id = getVisitorId();

      expect(id).toBeTruthy();
      // UUID v4 format: 8-4-4-4-12
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it('should return the same ID on subsequent calls', () => {
      const id1 = getVisitorId();
      const id2 = getVisitorId();

      expect(id1).toBe(id2);
    });

    it('should persist ID in localStorage', () => {
      const id = getVisitorId();

      expect(mockStorage['excel-ext:visitor-id']).toBe(id);
    });

    it('should return stored ID if present', () => {
      const existingId = 'existing-uuid-1234';
      mockStorage['excel-ext:visitor-id'] = existingId;

      const id = getVisitorId();

      expect(id).toBe(existingId);
    });
  });

  describe('clearVisitorId', () => {
    it('should remove visitor ID from localStorage', () => {
      // First set an ID
      getVisitorId();
      expect(mockStorage['excel-ext:visitor-id']).toBeTruthy();

      // Clear it
      clearVisitorId();

      expect(mockStorage['excel-ext:visitor-id']).toBeUndefined();
    });

    it('should cause new ID generation on next getVisitorId call', () => {
      const id1 = getVisitorId();
      clearVisitorId();
      const id2 = getVisitorId();

      expect(id1).not.toBe(id2);
    });
  });

  describe('buildUserKey', () => {
    it('should combine prefix and userId', () => {
      const key = buildUserKey('excel-ext:settings', 'user-123');

      expect(key).toBe('excel-ext:settings:user-123');
    });

    it('should handle empty userId', () => {
      const key = buildUserKey('excel-ext:settings', '');

      expect(key).toBe('excel-ext:settings:');
    });

    it('should handle special characters in userId', () => {
      const key = buildUserKey('prefix', 'user@domain.com');

      expect(key).toBe('prefix:user@domain.com');
    });
  });

  describe('buildDeviceKey', () => {
    it('should combine prefix with visitor ID', () => {
      const visitorId = getVisitorId(); // Generate ID first
      const key = buildDeviceKey('excel-ext:auth');

      expect(key).toBe(`excel-ext:auth:${visitorId}`);
    });

    it('should use same visitor ID for multiple calls', () => {
      const key1 = buildDeviceKey('prefix1');
      const key2 = buildDeviceKey('prefix2');

      // Extract visitor ID from keys
      const id1 = key1.replace('prefix1:', '');
      const id2 = key2.replace('prefix2:', '');

      expect(id1).toBe(id2);
    });
  });

  describe('user isolation', () => {
    it('should create different keys for different users', () => {
      const key1 = buildUserKey('settings', 'user-a');
      const key2 = buildUserKey('settings', 'user-b');

      expect(key1).not.toBe(key2);
    });

    it('should create same device key regardless of user', () => {
      // Device key uses visitor ID, not user ID
      const deviceKey1 = buildDeviceKey('auth');
      const deviceKey2 = buildDeviceKey('auth');

      expect(deviceKey1).toBe(deviceKey2);
    });
  });
});
