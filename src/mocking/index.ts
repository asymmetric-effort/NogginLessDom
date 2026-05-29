/**
 * Mocking module — provides comprehensive mock and spy utilities.
 * @module mocking
 */

import {
  mockModule,
  mockModulePartial,
  importActual,
  unmock,
  resetModules,
  getMockedModule,
  mockRequire,
  importMockModule,
} from './module-mock.js';

/** Internal registry of all created mock functions for bulk operations. */
const allMocks: Set<MockInstance> = new Set();

/** Internal registry of stubbed globals for restoration. */
const stubbedGlobals: Array<{
  name: string;
  hadOriginal: boolean;
  original: unknown;
}> = [];

interface MockInstance<TArgs extends unknown[] = unknown[], TReturn = unknown> {
  (...args: TArgs): TReturn;
  mock: {
    calls: TArgs[];
    results: Array<{ type: 'return' | 'throw'; value: TReturn }>;
    lastCall: TArgs | undefined;
    instances: unknown[];
    contexts: unknown[];
  };
  mockReturnValue(value: TReturn): MockInstance<TArgs, TReturn>;
  mockReturnValueOnce(value: TReturn): MockInstance<TArgs, TReturn>;
  mockImplementation(
    impl: (...args: TArgs) => TReturn,
  ): MockInstance<TArgs, TReturn>;
  mockImplementationOnce(
    impl: (...args: TArgs) => TReturn,
  ): MockInstance<TArgs, TReturn>;
  mockResolvedValue(value: Awaited<TReturn>): MockInstance<TArgs, TReturn>;
  mockResolvedValueOnce(value: Awaited<TReturn>): MockInstance<TArgs, TReturn>;
  mockRejectedValue(value: unknown): MockInstance<TArgs, TReturn>;
  mockRejectedValueOnce(value: unknown): MockInstance<TArgs, TReturn>;
  mockName(name: string): MockInstance<TArgs, TReturn>;
  getMockName(): string;
  getMockImplementation(): ((...args: TArgs) => TReturn) | undefined;
  withImplementation(
    impl: (...args: TArgs) => TReturn,
    callback: () => void,
  ): void;
  withImplementation(
    impl: (...args: TArgs) => TReturn,
    callback: () => Promise<void>,
  ): Promise<void>;
  mockClear(): void;
  mockReset(): void;
  mockRestore(): void;
}

/**
 * Create a mock function.
 */
export function fn<TArgs extends unknown[] = unknown[], TReturn = unknown>(
  implementation?: (...args: TArgs) => TReturn,
): MockInstance<TArgs, TReturn> {
  let currentImpl = implementation;
  const onceImpls: Array<(...args: TArgs) => TReturn> = [];
  const onceReturns: TReturn[] = [];
  let returnValue: TReturn | undefined;
  let mockNameValue = 'vi.fn()';

  const state = {
    calls: [] as TArgs[],
    results: [] as Array<{ type: 'return' | 'throw'; value: TReturn }>,
    instances: [] as unknown[],
    contexts: [] as unknown[],
    get lastCall(): TArgs | undefined {
      return state.calls[state.calls.length - 1];
    },
  };

  // Use a named function expression so it is constructable (arrow functions are not).
  const mockFn = function mockFnImpl(this: unknown, ...args: TArgs): TReturn {
    const isConstructorCall = typeof new.target !== 'undefined';

    state.calls.push(args);

    if (isConstructorCall) {
      state.instances.push(this);
      state.contexts.push(this);
    } else {
      state.contexts.push(this);
    }

    try {
      let result: TReturn;
      if (onceImpls.length > 0) {
        result = onceImpls.shift()!.call(this, ...args);
      } else if (onceReturns.length > 0) {
        result = onceReturns.shift()!;
      } else if (currentImpl) {
        result = currentImpl.call(this, ...args);
      } else {
        result = returnValue as TReturn;
      }
      state.results.push({ type: 'return', value: result });
      return result;
    } catch (error) {
      state.results.push({ type: 'throw', value: error as TReturn });
      throw error;
    }
  } as unknown as MockInstance<TArgs, TReturn>;

  mockFn.mock = state;
  allMocks.add(mockFn as unknown as MockInstance);

  mockFn.mockReturnValue = (value: TReturn): MockInstance<TArgs, TReturn> => {
    returnValue = value;
    return mockFn;
  };

  mockFn.mockReturnValueOnce = (
    value: TReturn,
  ): MockInstance<TArgs, TReturn> => {
    onceReturns.push(value);
    return mockFn;
  };

  mockFn.mockImplementation = (
    impl: (...args: TArgs) => TReturn,
  ): MockInstance<TArgs, TReturn> => {
    currentImpl = impl;
    return mockFn;
  };

  mockFn.mockImplementationOnce = (
    impl: (...args: TArgs) => TReturn,
  ): MockInstance<TArgs, TReturn> => {
    onceImpls.push(impl);
    return mockFn;
  };

  mockFn.mockClear = (): void => {
    state.calls.length = 0;
    state.results.length = 0;
    state.instances.length = 0;
    state.contexts.length = 0;
  };

  mockFn.mockReset = (): void => {
    mockFn.mockClear();
    currentImpl = undefined;
    returnValue = undefined;
    onceImpls.length = 0;
    onceReturns.length = 0;
  };

  mockFn.mockRestore = (): void => {
    mockFn.mockReset();
  };

  mockFn.mockResolvedValue = (
    value: Awaited<TReturn>,
  ): MockInstance<TArgs, TReturn> => {
    return mockFn.mockReturnValue(Promise.resolve(value) as TReturn);
  };

  mockFn.mockResolvedValueOnce = (
    value: Awaited<TReturn>,
  ): MockInstance<TArgs, TReturn> => {
    return mockFn.mockReturnValueOnce(Promise.resolve(value) as TReturn);
  };

  mockFn.mockRejectedValue = (value: unknown): MockInstance<TArgs, TReturn> => {
    return mockFn.mockReturnValue(Promise.reject(value) as TReturn);
  };

  mockFn.mockRejectedValueOnce = (
    value: unknown,
  ): MockInstance<TArgs, TReturn> => {
    return mockFn.mockReturnValueOnce(Promise.reject(value) as TReturn);
  };

  mockFn.mockName = (name: string): MockInstance<TArgs, TReturn> => {
    mockNameValue = name;
    return mockFn;
  };

  mockFn.getMockName = (): string => {
    return mockNameValue;
  };

  mockFn.getMockImplementation = ():
    | ((...args: TArgs) => TReturn)
    | undefined => {
    return currentImpl;
  };

  const withImplBody = (
    impl: (...args: TArgs) => TReturn,
    callback: (() => void) | (() => Promise<void>),
  ): void | Promise<void> => {
    const previousImpl = currentImpl;
    currentImpl = impl;
    let callbackResult: void | Promise<void>;
    try {
      callbackResult = callback();
    } catch (error) {
      currentImpl = previousImpl;
      throw error;
    }
    if (callbackResult instanceof Promise) {
      return callbackResult.finally(() => {
        currentImpl = previousImpl;
      });
    }
    currentImpl = previousImpl;
  };
  mockFn.withImplementation = withImplBody as MockInstance<
    TArgs,
    TReturn
  >['withImplementation'];

  return mockFn;
}

/**
 * Create a spy on an object method or accessor.
 *
 * When `accessorType` is `'get'` or `'set'`, the spy targets the
 * corresponding accessor of the property instead of its value.
 */
export function spyOn<T extends Record<string, unknown>>(
  object: T,
  method: keyof T & string,
  accessorType?: 'get' | 'set',
): MockInstance {
  if (accessorType !== undefined) {
    return spyOnAccessor(object, method, accessorType);
  }

  const original = object[method] as (...args: unknown[]) => unknown;
  if (typeof original !== 'function') {
    throw new Error(`Cannot spy on ${method}: not a function`);
  }

  const mock = fn(original);

  const restoreFn = mock.mockRestore;
  mock.mockRestore = (): void => {
    restoreFn();
    (object as Record<string, unknown>)[method] = original;
  };

  (object as Record<string, unknown>)[method] = mock;
  return mock;
}

/**
 * Spy on a getter or setter accessor of a property.
 */
function spyOnAccessor<T extends Record<string, unknown>>(
  object: T,
  property: keyof T & string,
  accessorType: 'get' | 'set',
): MockInstance {
  const descriptor = findPropertyDescriptor(object, property);

  if (!descriptor || (!descriptor.get && !descriptor.set)) {
    throw new Error(
      `Cannot spy on ${accessorType}ter of ${property}: not an accessor property`,
    );
  }

  if (accessorType === 'get') {
    const originalGetter = descriptor.get;
    if (!originalGetter) {
      throw new Error(`Cannot spy on getter of ${property}: no getter defined`);
    }

    const mock = fn((): unknown => originalGetter.call(object));

    const restoreFn = mock.mockRestore;
    mock.mockRestore = (): void => {
      restoreFn();
      Object.defineProperty(object, property, {
        ...descriptor,
        get: originalGetter,
      });
    };

    Object.defineProperty(object, property, {
      ...descriptor,
      get: mock as () => unknown,
    });

    return mock;
  }

  // accessorType === 'set'
  const originalSetter = descriptor.set;
  if (!originalSetter) {
    throw new Error(`Cannot spy on setter of ${property}: no setter defined`);
  }

  const mock = fn((value: unknown): unknown => {
    originalSetter.call(object, value);
    return undefined;
  });

  const restoreFn = mock.mockRestore;
  mock.mockRestore = (): void => {
    restoreFn();
    Object.defineProperty(object, property, {
      ...descriptor,
      set: originalSetter,
    });
  };

  Object.defineProperty(object, property, {
    ...descriptor,
    set: mock as (v: unknown) => void,
  });

  return mock;
}

/**
 * Walk the prototype chain to find the property descriptor.
 */
function findPropertyDescriptor(
  object: object,
  property: string,
): PropertyDescriptor | undefined {
  let current: object | null = object;
  while (current !== null) {
    const desc = Object.getOwnPropertyDescriptor(current, property);
    if (desc) {
      return desc;
    }
    current = Object.getPrototypeOf(current) as object | null;
  }
  return undefined;
}

interface FakeTimerState {
  now: number;
  timers: Map<
    number,
    {
      callback: () => void;
      delay: number;
      repeat: boolean;
      scheduledAt: number;
    }
  >;
  nextId: number;
}

let fakeTimerState: FakeTimerState | null = null;
const originalSetTimeout = globalThis.setTimeout;
const originalClearTimeout = globalThis.clearTimeout;
const originalSetInterval = globalThis.setInterval;
const originalClearInterval = globalThis.clearInterval;
const originalDateNow = Date.now;
const OriginalDate = globalThis.Date;
const originalSetImmediate =
  typeof globalThis.setImmediate !== 'undefined'
    ? globalThis.setImmediate
    : undefined;
const originalClearImmediate =
  typeof globalThis.clearImmediate !== 'undefined'
    ? globalThis.clearImmediate
    : undefined;

interface FakeTimerOptions {
  now?: number | Date;
  shouldAdvanceTime?: boolean;
  toFake?: string[];
}

interface FakeTimerController {
  advanceTimersByTime(ms: number): void;
  advanceTimersByTimeAsync(ms: number): Promise<void>;
  advanceTimersToNextTimer(): void;
  advanceTimersToNextTimerAsync(): Promise<void>;
  getTimerCount(): number;
  runAllTimers(): void;
  runAllTimersAsync(): Promise<void>;
  runOnlyPendingTimers(): void;
  runOnlyPendingTimersAsync(): Promise<void>;
  setSystemTime(time: number | Date): void;
  getMockedSystemTime(): Date | null;
  getRealSystemTime(): number;
  readonly now: number;
}

/**
 * Enable fake timers.
 * Accepts a number (backward compat) or an options object.
 */
export function useFakeTimers(
  optionsOrNow?: number | FakeTimerOptions,
): FakeTimerController {
  let initialNow: number;
  if (optionsOrNow === undefined) {
    initialNow = 0;
  } else if (typeof optionsOrNow === 'number') {
    initialNow = optionsOrNow;
  } else {
    const nowOpt = optionsOrNow.now;
    if (nowOpt instanceof Date) {
      initialNow = nowOpt.getTime();
    } else {
      initialNow = nowOpt ?? 0;
    }
    // shouldAdvanceTime and toFake are accepted but stubbed
  }

  fakeTimerState = { now: initialNow, timers: new Map(), nextId: 1 };
  const state = fakeTimerState;

  // Determine which APIs to fake
  const toFake =
    typeof optionsOrNow === 'object' && optionsOrNow !== null
      ? optionsOrNow.toFake
      : undefined;
  const shouldFake = (name: string): boolean =>
    toFake === undefined || toFake.includes(name);

  if (shouldFake('setTimeout')) {
    (globalThis as Record<string, unknown>).setTimeout = ((
      cb: () => void,
      delay = 0,
    ): number => {
      const id = state.nextId++;
      state.timers.set(id, {
        callback: cb,
        delay,
        repeat: false,
        scheduledAt: state.now,
      });
      return id;
    }) as unknown as typeof setTimeout;
  }

  if (shouldFake('clearTimeout')) {
    (globalThis as Record<string, unknown>).clearTimeout = ((
      id: number,
    ): void => {
      state.timers.delete(id);
    }) as unknown as typeof clearTimeout;
  }

  if (shouldFake('setInterval')) {
    (globalThis as Record<string, unknown>).setInterval = ((
      cb: () => void,
      delay = 0,
    ): number => {
      const id = state.nextId++;
      state.timers.set(id, {
        callback: cb,
        delay,
        repeat: true,
        scheduledAt: state.now,
      });
      return id;
    }) as unknown as typeof setInterval;
  }

  if (shouldFake('clearInterval')) {
    (globalThis as Record<string, unknown>).clearInterval = ((
      id: number,
    ): void => {
      state.timers.delete(id);
    }) as unknown as typeof clearInterval;
  }

  // Mock setImmediate/clearImmediate if available
  if (shouldFake('setImmediate') && originalSetImmediate !== undefined) {
    (globalThis as Record<string, unknown>).setImmediate = ((
      cb: () => void,
    ): number => {
      const id = state.nextId++;
      state.timers.set(id, {
        callback: cb,
        delay: 0,
        repeat: false,
        scheduledAt: state.now,
      });
      return id;
    }) as unknown as typeof setImmediate;
  }

  if (shouldFake('clearImmediate') && originalClearImmediate !== undefined) {
    (globalThis as Record<string, unknown>).clearImmediate = ((
      id: number,
    ): void => {
      state.timers.delete(id);
    }) as unknown as typeof clearImmediate;
  }

  if (shouldFake('Date')) {
    Date.now = (): number => state.now;

    // Mock the Date constructor
    const FakeDate = function FakeDate(
      this: Date,
      ...args: unknown[]
    ): Date | string {
      if (!(this instanceof FakeDate)) {
        // Called without new — Date() returns a string
        return new OriginalDate(state.now).toString();
      }
      if (args.length === 0) {
        return new OriginalDate(state.now);
      }
      // Delegate to original Date for all other signatures
      if (args.length === 1) {
        return new OriginalDate(args[0] as string | number);
      }
      return new OriginalDate(
        args[0] as number,
        args[1] as number,
        (args[2] as number) ?? 1,
        (args[3] as number) ?? 0,
        (args[4] as number) ?? 0,
        (args[5] as number) ?? 0,
        (args[6] as number) ?? 0,
      );
    } as unknown as DateConstructor;

    // Copy static methods
    FakeDate.now = (): number => state.now;
    FakeDate.parse = OriginalDate.parse;
    FakeDate.UTC = OriginalDate.UTC;
    Object.defineProperty(FakeDate, 'prototype', {
      value: OriginalDate.prototype,
      writable: false,
      configurable: false,
    });

    globalThis.Date = FakeDate;
  }

  const controller: FakeTimerController = {
    advanceTimersByTime(ms: number): void {
      const target = state.now + ms;
      let didWork = true;
      // GHSA-ghwv-f6jh-fmpm: Safety counter to prevent infinite loops
      let safety = 10000;
      while (didWork) {
        if (--safety <= 0) {
          throw new Error(
            'advanceTimersByTime: exceeded 10000 iterations — possible infinite loop',
          );
        }
        didWork = false;
        let nextFire = Infinity;
        for (const [, timer] of state.timers) {
          const fireAt = timer.scheduledAt + timer.delay;
          if (fireAt <= target && fireAt < nextFire) {
            nextFire = fireAt;
          }
        }
        if (nextFire <= target && nextFire !== Infinity) {
          state.now = nextFire;
          for (const [id, timer] of state.timers) {
            const fireAt = timer.scheduledAt + timer.delay;
            if (fireAt <= state.now) {
              timer.callback();
              if (timer.repeat) {
                timer.scheduledAt = state.now;
              } else {
                state.timers.delete(id);
              }
              didWork = true;
            }
          }
        }
      }
      state.now = target;
    },

    advanceTimersByTimeAsync(ms: number): Promise<void> {
      this.advanceTimersByTime(ms);
      return new Promise<void>((resolve) => {
        queueMicrotask(resolve);
      });
    },

    advanceTimersToNextTimer(): void {
      if (state.timers.size === 0) return;
      let earliest = Infinity;
      for (const [, timer] of state.timers) {
        const fireAt = timer.scheduledAt + timer.delay;
        if (fireAt < earliest) {
          earliest = fireAt;
        }
      }
      if (earliest === Infinity) return;
      const ms = Math.max(0, earliest - state.now);
      this.advanceTimersByTime(ms);
    },

    advanceTimersToNextTimerAsync(): Promise<void> {
      this.advanceTimersToNextTimer();
      return new Promise<void>((resolve) => {
        queueMicrotask(resolve);
      });
    },

    getTimerCount(): number {
      return state.timers.size;
    },

    runAllTimers(): void {
      let safety = 1000;
      while (state.timers.size > 0 && safety-- > 0) {
        this.advanceTimersToNextTimer();
      }
    },

    runAllTimersAsync(): Promise<void> {
      this.runAllTimers();
      return new Promise<void>((resolve) => {
        queueMicrotask(resolve);
      });
    },

    runOnlyPendingTimers(): void {
      // Snapshot the currently pending timer IDs
      const pendingIds = new Set(state.timers.keys());
      // Find the latest fire time among pending timers
      let latest = 0;
      for (const id of pendingIds) {
        const timer = state.timers.get(id);
        if (timer) {
          const fireAt = timer.scheduledAt + timer.delay;
          if (fireAt > latest) {
            latest = fireAt;
          }
        }
      }
      // Advance time step-by-step, only firing timers from the original set
      const target = latest;
      // GHSA-ghwv-f6jh-fmpm: Safety counter to prevent infinite loops
      let safety = 10000;
      while (true) {
        if (--safety <= 0) {
          throw new Error(
            'runOnlyPendingTimers: exceeded 10000 iterations — possible infinite loop',
          );
        }
        // Find the next fire time among still-pending original timers
        let nextFire = Infinity;
        for (const id of pendingIds) {
          const timer = state.timers.get(id);
          if (timer) {
            const fireAt = timer.scheduledAt + timer.delay;
            if (fireAt < nextFire) {
              nextFire = fireAt;
            }
          }
        }
        if (nextFire === Infinity || nextFire > target) break;
        state.now = nextFire;
        for (const id of pendingIds) {
          const timer = state.timers.get(id);
          if (timer) {
            const fireAt = timer.scheduledAt + timer.delay;
            if (fireAt <= state.now) {
              timer.callback();
              if (timer.repeat) {
                timer.scheduledAt = state.now;
              } else {
                state.timers.delete(id);
                pendingIds.delete(id);
              }
            }
          }
        }
      }
      state.now = target;
    },

    runOnlyPendingTimersAsync(): Promise<void> {
      this.runOnlyPendingTimers();
      return new Promise<void>((resolve) => {
        queueMicrotask(resolve);
      });
    },

    setSystemTime(time: number | Date): void {
      if (time instanceof Date) {
        state.now = time.getTime();
      } else {
        state.now = time;
      }
    },

    getMockedSystemTime(): Date | null {
      return new OriginalDate(state.now);
    },

    getRealSystemTime(): number {
      return originalDateNow.call(OriginalDate);
    },

    get now(): number {
      return state.now;
    },
  };

  return controller;
}

/**
 * Restore real timers.
 */
export function useRealTimers(): void {
  globalThis.setTimeout = originalSetTimeout;
  globalThis.clearTimeout = originalClearTimeout;
  globalThis.setInterval = originalSetInterval;
  globalThis.clearInterval = originalClearInterval;
  // Restore Date constructor first, then fix Date.now on the original
  globalThis.Date = OriginalDate;
  OriginalDate.now = originalDateNow;
  if (originalSetImmediate !== undefined) {
    globalThis.setImmediate = originalSetImmediate;
  }
  if (originalClearImmediate !== undefined) {
    globalThis.clearImmediate = originalClearImmediate;
  }
  fakeTimerState = null;
}

/**
 * Return the current mocked system time as a Date, or null if not using fake timers.
 */
export function getMockedSystemTime(): Date | null {
  if (fakeTimerState === null) return null;
  return new OriginalDate(fakeTimerState.now);
}

/**
 * Return the real system time (Date.now()) regardless of fake timer state.
 */
export function getRealSystemTime(): number {
  return originalDateNow.call(OriginalDate);
}

/**
 * Check if a value is a mock function created by fn() or spyOn().
 */
function isMockFunction(value: unknown): boolean {
  if (typeof value !== 'function') return false;
  const candidate = value as unknown as Record<string, unknown>;
  if (candidate.mock == null || typeof candidate.mock !== 'object')
    return false;
  const mockObj = candidate.mock as Record<string, unknown>;
  return Array.isArray(mockObj.calls) && Array.isArray(mockObj.results);
}

/**
 * Replace a global property with a value, storing the original for restoration.
 */
function stubGlobal(name: string, value: unknown): void {
  const g = globalThis as Record<string, unknown>;
  const hadOriginal = name in g;
  const original = g[name];
  stubbedGlobals.push({ name, hadOriginal, original });
  g[name] = value;
}

/**
 * Restore all stubbed globals to their original values.
 */
function unstubAllGlobals(): void {
  const g = globalThis as Record<string, unknown>;
  while (stubbedGlobals.length > 0) {
    const entry = stubbedGlobals.pop()!;
    if (entry.hadOriginal) {
      g[entry.name] = entry.original;
    } else {
      delete g[entry.name];
    }
  }
}

/**
 * Call mockClear on all tracked mocks.
 */
function clearAllMocks(): void {
  for (const m of allMocks) {
    m.mockClear();
  }
}

/**
 * Call mockReset on all tracked mocks.
 */
function resetAllMocks(): void {
  for (const m of allMocks) {
    m.mockReset();
  }
}

/**
 * Call mockRestore on all active mocks/spies and unstub all globals.
 */
function restoreAllMocks(): void {
  for (const m of allMocks) {
    m.mockRestore();
  }
  unstubAllGlobals();
}

/**
 * The `mock` object aggregates all mocking utilities.
 */
/**
 * Execute a factory function immediately and return its result.
 * Used for variable declarations that need to be available before
 * mock.module() calls. This is a convenience wrapper.
 */
function hoisted<T>(factory: () => T): T {
  return factory();
}

/**
 * Import a module with mock-awareness: if a mock is registered, return it.
 * Otherwise, dynamically import the real module and auto-mock all its exports.
 * Functions become mock functions, primitives are kept as-is.
 */
async function importMock(moduleName: string): Promise<unknown> {
  return importMockModule(moduleName);
}

/**
 * The `mock` object aggregates all mocking utilities.
 */
export const mock = {
  module: mockModule,
  modulePartial: mockModulePartial,
  /** Explicitly non-hoisted module mock (equivalent to module()). */
  doMock: mockModule,
  importActual,
  importMock,
  /** Mock-aware require: returns mock if registered, otherwise real module. */
  require: mockRequire,
  unmock,
  /** Alias for unmock (explicitly non-hoisted). */
  doUnmock: unmock,
  resetModules,
  getMockedModule,
  stubGlobal,
  unstubAllGlobals,
  isMockFunction,
  clearAllMocks,
  resetAllMocks,
  restoreAllMocks,
  hoisted,
};

// ---------------------------------------------------------------------------
// Environment variable stubbing
// ---------------------------------------------------------------------------

/** Internal registry of stubbed env vars for restoration. */
const stubbedEnvs: Array<{
  name: string;
  hadOriginal: boolean;
  original: string | undefined;
}> = [];

/**
 * Stub an environment variable.
 */
function stubEnv(name: string, value: string): void {
  const hadOriginal = name in process.env;
  const original = process.env[name];
  stubbedEnvs.push({ name, hadOriginal, original });
  process.env[name] = value;
}

/**
 * Restore all stubbed environment variables to their original values.
 */
function unstubAllEnvs(): void {
  while (stubbedEnvs.length > 0) {
    const entry = stubbedEnvs.pop()!;
    if (entry.hadOriginal) {
      process.env[entry.name] = entry.original;
    } else {
      delete process.env[entry.name];
    }
  }
}

// ---------------------------------------------------------------------------
// waitFor / waitUntil
// ---------------------------------------------------------------------------

interface WaitOptions {
  timeout?: number;
  interval?: number;
}

/**
 * Retry a callback until it does not throw.
 * Returns the callback's return value on success.
 */
async function waitFor<T>(
  callback: () => T | Promise<T>,
  options?: WaitOptions,
): Promise<T> {
  const timeout = options?.timeout ?? 1000;
  const interval = options?.interval ?? 50;
  const start = Date.now();
  let lastError: unknown;

  while (true) {
    try {
      const result = await callback();
      return result;
    } catch (err: unknown) {
      lastError = err;
    }
    if (Date.now() - start >= timeout) {
      throw lastError instanceof Error
        ? lastError
        : new Error(String(lastError));
    }
    await new Promise<void>((resolve) => {
      originalSetTimeout(resolve, interval);
    });
  }
}

/**
 * Retry a callback until it returns a truthy value.
 * Returns the truthy value on success.
 */
async function waitUntil<T>(
  callback: () => T | Promise<T>,
  options?: WaitOptions,
): Promise<T> {
  const timeout = options?.timeout ?? 1000;
  const interval = options?.interval ?? 50;
  const start = Date.now();

  while (true) {
    const result = await callback();
    if (result) {
      return result;
    }
    if (Date.now() - start >= timeout) {
      throw new Error('vi.waitUntil timed out');
    }
    await new Promise<void>((resolve) => {
      originalSetTimeout(resolve, interval);
    });
  }
}

// ---------------------------------------------------------------------------
// vi namespace — vitest-compatible alias object
// ---------------------------------------------------------------------------

/**
 * The `vi` object mirrors vitest's API for compatibility.
 */
/**
 * Identity function for TypeScript type narrowing of mocked values.
 */
function mocked<T>(item: T): T {
  return item;
}

export const vi = {
  fn,
  spyOn,
  useFakeTimers,
  useRealTimers,
  getMockedSystemTime,
  getRealSystemTime,
  stubEnv,
  unstubAllEnvs,
  waitFor,
  waitUntil,
  mocked,
  ...mock,
  /**
   * Register a mock for a module path.
   *
   * Unlike vitest, NogginLessDom does not use a build transform to hoist
   * mock registrations above imports. Mocks must be set up BEFORE the
   * module under test is imported:
   *
   * ```ts
   * mock.module('fs', () => ({ writeFileSync: fn() }));
   * const { myFunction } = await import('./my-module.js');
   * ```
   */
  mock: mockModule,
};
