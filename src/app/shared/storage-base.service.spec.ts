import { TestBed } from '@angular/core/testing';
import { StorageBaseService } from './storage-base.service';

describe('StorageBaseService', () => {
  let service: StorageBaseService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StorageBaseService);
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('getItem', () => {
    it('should return default value when key does not exist', () => {
      const result = service.getItem('non-existent', { default: true });
      expect(result).toEqual({ default: true });
    });

    it('should return parsed value when key exists', () => {
      localStorage.setItem('test-key', JSON.stringify({ value: 123 }));
      const result = service.getItem<{ value?: number; default?: boolean }>('test-key', { default: true });
      expect(result).toEqual({ value: 123 });
    });

    it('should return default value on parse error', () => {
      localStorage.setItem('invalid-json', 'not valid json');
      const result = service.getItem('invalid-json', { fallback: true });
      expect(result).toEqual({ fallback: true });
    });

    it('should handle string values', () => {
      localStorage.setItem('string-key', JSON.stringify('hello'));
      const result = service.getItem('string-key', '');
      expect(result).toBe('hello');
    });

    it('should handle array values', () => {
      localStorage.setItem('array-key', JSON.stringify([1, 2, 3]));
      const result = service.getItem<number[]>('array-key', []);
      expect(result).toEqual([1, 2, 3]);
    });
  });

  describe('setItem', () => {
    it('should store value as JSON string', () => {
      service.setItem('test-key', { value: 42 });
      const stored = localStorage.getItem('test-key');
      expect(stored).toBe('{"value":42}');
    });

    it('should overwrite existing value', () => {
      service.setItem('test-key', { first: true });
      service.setItem('test-key', { second: true });
      const result = service.getItem('test-key', {});
      expect(result).toEqual({ second: true });
    });

    it('should handle string values', () => {
      service.setItem('string-key', 'hello world');
      expect(localStorage.getItem('string-key')).toBe('"hello world"');
    });

    it('should handle array values', () => {
      service.setItem('array-key', [1, 2, 3]);
      expect(localStorage.getItem('array-key')).toBe('[1,2,3]');
    });
  });

  describe('removeItem', () => {
    it('should remove existing item', () => {
      localStorage.setItem('test-key', 'value');
      service.removeItem('test-key');
      expect(localStorage.getItem('test-key')).toBeNull();
    });

    it('should not throw when removing non-existent key', () => {
      expect(() => service.removeItem('non-existent')).not.toThrow();
    });
  });

  describe('clear', () => {
    it('should remove all items', () => {
      localStorage.setItem('key1', 'value1');
      localStorage.setItem('key2', 'value2');
      service.clear();
      expect(localStorage.length).toBe(0);
    });
  });

  describe('zero dependencies', () => {
    it('should have no constructor dependencies', () => {
      // Verify service can be instantiated directly without any providers
      const directInstance = new StorageBaseService();
      expect(directInstance).toBeTruthy();
      expect(directInstance.getItem('test', 'default')).toBe('default');
    });
  });
});
