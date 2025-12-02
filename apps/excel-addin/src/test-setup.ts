import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';

// Initialize Angular test environment
setupZoneTestEnv();

// Jasmine compatibility shims for Jest migration
// This allows existing Jasmine tests to work with Jest

interface JasmineSpyAnd {
  returnValue: (value: any) => jest.Mock;
  callFake: (fn: (...args: any[]) => any) => jest.Mock;
  rejectWith: (error: any) => jest.Mock;
}

interface JasmineSpy extends jest.Mock {
  and: JasmineSpyAnd;
}

function createJasmineSpy(name?: string): JasmineSpy {
  const spy = jest.fn() as JasmineSpy;
  spy.and = {
    returnValue: (value: any) => spy.mockReturnValue(value),
    callFake: (fn: (...args: any[]) => any) => spy.mockImplementation(fn),
    rejectWith: (error: any) => spy.mockRejectedValue(error),
  };
  return spy;
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
  }

  function spyOn<T extends object, M extends keyof T>(object: T, method: M): JasmineSpy;
}

(global as any).jasmine = {
  createSpyObj,
  createSpy: (name?: string) => createJasmineSpy(name),
  objectContaining: (sample: { [key: string]: any }) => expect.objectContaining(sample),
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
  };
  return spy;
}

// Override jest.spyOn
(jest as any).spyOn = jasmineSpyOn;

// Add global spyOn for Jasmine compatibility
(global as any).spyOn = jasmineSpyOn;

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
});

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeTrue(): R;
      toBeFalse(): R;
    }
  }
}

// Mock Office.js for testing
(global as any).Office = {
  context: {
    document: {},
    host: 'Excel',
    platform: 'PC',
  },
  onReady: (callback: () => void) => {
    callback();
    return Promise.resolve();
  },
};

(global as any).Excel = {
  run: async (callback: (context: any) => Promise<any>) => {
    const mockContext = {
      workbook: {
        worksheets: {
          getActiveWorksheet: () => ({
            load: () => {},
            name: 'Sheet1',
          }),
        },
      },
      sync: async () => {},
    };
    return callback(mockContext);
  },
};
