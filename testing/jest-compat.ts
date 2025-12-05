/**
 * Jasmine compatibility shims for Jest migration
 * This allows existing Jasmine tests to work with Jest
 */

interface JasmineSpyAnd {
  returnValue: (value: any) => jest.Mock;
  callFake: (fn: (...args: any[]) => any) => jest.Mock;
  rejectWith: (error: any) => jest.Mock;
  resolveTo: (value?: any) => jest.Mock;
  throwError: (error: string | Error) => jest.Mock;
}

interface JasmineSpyCalls {
  mostRecent(): { args: any[] };
  all(): { args: any[] }[];
  allArgs(): any[][];
  count(): number;
  argsFor(index: number): any[];
  reset(): void;
}

interface JasmineSpy extends jest.Mock {
  and: JasmineSpyAnd;
  calls: JasmineSpyCalls;
}

function addJasmineCallsApi(spy: jest.Mock): JasmineSpy {
  const jasmineSpy = spy as JasmineSpy;
  jasmineSpy.calls = {
    mostRecent: () => {
      const calls = spy.mock.calls;
      return calls.length > 0 ? { args: calls[calls.length - 1] } : { args: [] };
    },
    all: () => spy.mock.calls.map(args => ({ args })),
    allArgs: () => spy.mock.calls,
    count: () => spy.mock.calls.length,
    argsFor: (index: number) => spy.mock.calls[index] || [],
    reset: () => spy.mockClear(),
  };
  return jasmineSpy;
}

function createJasmineSpy(name?: string): JasmineSpy {
  const spy = jest.fn() as JasmineSpy;
  spy.and = {
    returnValue: (value: any) => spy.mockReturnValue(value),
    callFake: (fn: (...args: any[]) => any) => spy.mockImplementation(fn),
    rejectWith: (error: any) => spy.mockRejectedValue(error),
    resolveTo: (value?: any) => spy.mockResolvedValue(value),
    throwError: (error: string | Error) => spy.mockImplementation(() => {
      throw typeof error === 'string' ? new Error(error) : error;
    }),
  };
  return addJasmineCallsApi(spy);
}

function createSpyObj<T>(
  baseName: string,
  methodNames: string[] | { [key: string]: any },
  propertyValues?: { [key: string]: any }
): jasmine.SpyObj<T> {
  const obj: any = {};

  // Handle method names array
  if (Array.isArray(methodNames)) {
    for (const name of methodNames) {
      obj[name] = createJasmineSpy(`${baseName}.${name}`);
    }
  } else {
    // Handle method names with default return values
    for (const [name, value] of Object.entries(methodNames)) {
      obj[name] = createJasmineSpy(`${baseName}.${name}`);
      if (value !== undefined) {
        obj[name].mockReturnValue(value);
      }
    }
  }

  // Add property values
  if (propertyValues) {
    for (const [key, value] of Object.entries(propertyValues)) {
      Object.defineProperty(obj, key, {
        get: () => value,
        configurable: true,
      });
    }
  }

  return obj as jasmine.SpyObj<T>;
}

// Extend global jasmine namespace
declare global {
  namespace jasmine {
    function createSpyObj<T>(
      baseName: string,
      methodNames: string[] | { [key: string]: any },
      propertyValues?: { [key: string]: any }
    ): SpyObj<T>;

    function createSpy(name?: string): JasmineSpy;

    type SpyObj<T> = T & {
      [K in keyof T]: T[K] extends (...args: any[]) => any ? JasmineSpy : T[K];
    };

    function objectContaining(sample: { [key: string]: any }): any;
    function any(expectedClass: any): any;
    function arrayContaining(array: any[]): any;
    function stringMatching(pattern: string | RegExp): any;
  }

  function spyOn<T extends object, M extends keyof T>(object: T, method: M): JasmineSpy;
  function expectAsync(promise: Promise<any>): {
    toBeRejectedWithError(expected?: string | RegExp | Error): Promise<void>;
    toBeResolved(): Promise<void>;
    toBeRejected(): Promise<void>;
  };
}

(global as any).jasmine = {
  createSpyObj,
  createSpy: (name?: string) => createJasmineSpy(name),
  objectContaining: (sample: { [key: string]: any }) => expect.objectContaining(sample),
  any: (expectedClass: any) => expect.any(expectedClass),
  arrayContaining: (array: any[]) => expect.arrayContaining(array),
  stringMatching: (pattern: string | RegExp) => expect.stringMatching(pattern),
};

// Also make spyOn return a Jasmine-compatible spy
const originalSpyOn = jest.spyOn;
function jasmineSpyOn<T extends object, M extends keyof T>(
  object: T,
  method: M
): JasmineSpy {
  const spy = originalSpyOn(object, method as any) as unknown as JasmineSpy;
  spy.and = {
    returnValue: (value: any) => spy.mockReturnValue(value),
    callFake: (fn: (...args: any[]) => any) => spy.mockImplementation(fn),
    rejectWith: (error: any) => spy.mockRejectedValue(error),
    resolveTo: (value?: any) => spy.mockResolvedValue(value),
    throwError: (error: string | Error) => spy.mockImplementation(() => {
      throw typeof error === 'string' ? new Error(error) : error;
    }),
  };
  return addJasmineCallsApi(spy);
}

// Override jest.spyOn
(jest as any).spyOn = jasmineSpyOn;

// Add global spyOn for Jasmine compatibility
(global as any).spyOn = jasmineSpyOn;

// Add Jasmine's expectAsync for async matchers
interface AsyncMatchers {
  toBeRejectedWithError(expected?: string | RegExp | Error): Promise<void>;
  toBeResolved(): Promise<void>;
  toBeRejected(): Promise<void>;
}

function expectAsync(promise: Promise<any>): AsyncMatchers {
  return {
    async toBeRejectedWithError(expected?: string | RegExp | Error): Promise<void> {
      try {
        await promise;
        throw new Error('Expected promise to be rejected but it resolved');
      } catch (error: any) {
        if (expected === undefined) return;
        const message = error?.message || String(error);
        if (expected instanceof RegExp) {
          expect(message).toMatch(expected);
        } else if (typeof expected === 'string') {
          expect(message).toContain(expected);
        } else if (expected instanceof Error) {
          expect(message).toBe(expected.message);
        }
      }
    },
    async toBeResolved(): Promise<void> {
      await promise; // If it rejects, the test will fail
    },
    async toBeRejected(): Promise<void> {
      await expect(promise).rejects.toBeDefined();
    },
  };
}

(global as any).expectAsync = expectAsync;

// Add Jasmine-style matchers
expect.extend({
  toBeTrue(received: any) {
    const pass = received === true;
    return {
      pass,
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be true`,
    };
  },
  toBeFalse(received: any) {
    const pass = received === false;
    return {
      pass,
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be false`,
    };
  },
  toThrowError(received: any, expected?: string | RegExp | typeof Error) {
    try {
      received();
      return {
        pass: false,
        message: () => 'Expected function to throw an error but it did not',
      };
    } catch (error: any) {
      if (expected === undefined) {
        return { pass: true, message: () => '' };
      }
      const message = error?.message || String(error);
      if (expected instanceof RegExp) {
        const pass = expected.test(message);
        return {
          pass,
          message: () => `Expected error message to match ${expected}, got "${message}"`,
        };
      } else if (typeof expected === 'string') {
        const pass = message.includes(expected);
        return {
          pass,
          message: () => `Expected error message to include "${expected}", got "${message}"`,
        };
      } else if (typeof expected === 'function') {
        const pass = error instanceof expected;
        return {
          pass,
          message: () => `Expected error to be instance of ${expected.name}`,
        };
      }
      return { pass: true, message: () => '' };
    }
  },
});

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeTrue(): R;
      toBeFalse(): R;
      toThrowError(expected?: string | RegExp | typeof Error): R;
    }
  }
}

// Mock URL methods for jsdom - always use jest.fn() so spyOn works
(URL as any).createObjectURL = jest.fn(() => 'blob:mock-url');
(URL as any).revokeObjectURL = jest.fn();

// Polyfill File.text() for older jsdom
if (typeof File !== 'undefined' && !File.prototype.text) {
  File.prototype.text = function(): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(this);
    });
  };
}

export {};
