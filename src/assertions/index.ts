/**
 * Assertions module — provides a comprehensive expect() API.
 * @module assertions
 */

import assert from 'node:assert/strict';
import { matchSnapshot, matchInlineSnapshot } from './snapshots.js';

/** An object with an asymmetricMatch method used for flexible matching. */
interface AsymmetricMatcher {
  asymmetricMatch(actual: unknown): boolean;
}

function isAsymmetricMatcher(val: unknown): val is AsymmetricMatcher {
  return (
    val !== null &&
    typeof val === 'object' &&
    'asymmetricMatch' in val &&
    typeof (val as AsymmetricMatcher).asymmetricMatch === 'function'
  );
}

/**
 * Deep equality check that recognizes asymmetric matchers.
 * Returns true if values are deeply equal (treating asymmetric matchers specially).
 */
function deepEqualWithAsymmetric(actual: unknown, expected: unknown): boolean {
  if (isAsymmetricMatcher(expected)) {
    return expected.asymmetricMatch(actual);
  }
  if (actual === expected) return true;
  if (actual === null || expected === null) return actual === expected;
  if (typeof actual !== typeof expected) return false;
  if (typeof actual !== 'object') return Object.is(actual, expected);

  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) return false;
    if (actual.length !== expected.length) return false;
    return expected.every((item, i) =>
      deepEqualWithAsymmetric(actual[i], item),
    );
  }

  const actualObj = actual as Record<string, unknown>;
  const expectedObj = expected as Record<string, unknown>;
  const expectedKeys = Object.keys(expectedObj);
  const actualKeys = Object.keys(actualObj);
  if (expectedKeys.length !== actualKeys.length) return false;
  return expectedKeys.every((key) =>
    deepEqualWithAsymmetric(actualObj[key], expectedObj[key]),
  );
}

/**
 * Partial deep match: checks that every key in expected exists in actual
 * with a matching value. Extra keys in actual are allowed.
 */
function deepMatchObject(actual: unknown, expected: unknown): boolean {
  if (isAsymmetricMatcher(expected)) {
    return expected.asymmetricMatch(actual);
  }
  if (actual === expected) return true;
  if (actual === null || expected === null) return actual === expected;
  if (typeof actual !== 'object' || typeof expected !== 'object') {
    return Object.is(actual, expected);
  }

  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) return false;
    // Each element in expected must match the corresponding element in actual
    return expected.every((item, i) => {
      if (i >= actual.length) return false;
      return deepMatchObject(actual[i], item);
    });
  }

  const actualObj = actual as Record<string, unknown>;
  const expectedObj = expected as Record<string, unknown>;
  return Object.keys(expectedObj).every((key) =>
    deepMatchObject(actualObj[key], expectedObj[key]),
  );
}

/**
 * Check if two argument arrays match, supporting asymmetric matchers.
 */
export function argsMatch(actual: unknown[], expected: unknown[]): boolean {
  if (actual.length !== expected.length) return false;
  return expected.every((exp, i) => deepEqualWithAsymmetric(actual[i], exp));
}

interface AsyncMatchers<T> {
  toBe(expected: T): Promise<void>;
  toEqual(expected: T): Promise<void>;
  toStrictEqual(expected: T): Promise<void>;
  toBeTruthy(): Promise<void>;
  toBeFalsy(): Promise<void>;
  toBeNull(): Promise<void>;
  toBeUndefined(): Promise<void>;
  toBeDefined(): Promise<void>;
  toBeNaN(): Promise<void>;
  toBeInstanceOf(
    expected: abstract new (...args: unknown[]) => unknown,
  ): Promise<void>;
  toContain(expected: unknown): Promise<void>;
  toHaveLength(expected: number): Promise<void>;
  toHaveProperty(key: string, value?: unknown): Promise<void>;
  toMatch(expected: string | RegExp): Promise<void>;
  toThrow(expected?: string | RegExp | Error): Promise<void>;
  toBeGreaterThan(expected: number): Promise<void>;
  toBeGreaterThanOrEqual(expected: number): Promise<void>;
  toBeLessThan(expected: number): Promise<void>;
  toBeLessThanOrEqual(expected: number): Promise<void>;
  toBeCloseTo(expected: number, precision?: number): Promise<void>;
  not: AsyncMatchers<T>;
}

interface Matchers<T> {
  toBe(expected: T): void;
  toEqual(expected: T): void;
  toStrictEqual(expected: T): void;
  toBeTruthy(): void;
  toBeFalsy(): void;
  toBeNull(): void;
  toBeUndefined(): void;
  toBeDefined(): void;
  toBeNaN(): void;
  toBeInstanceOf(expected: abstract new (...args: unknown[]) => unknown): void;
  toContain(expected: unknown): void;
  toHaveLength(expected: number): void;
  toHaveProperty(key: string, value?: unknown): void;
  toMatch(expected: string | RegExp): void;
  toThrow(expected?: string | RegExp | Error): void;
  toBeGreaterThan(expected: number): void;
  toBeGreaterThanOrEqual(expected: number): void;
  toBeLessThan(expected: number): void;
  toBeLessThanOrEqual(expected: number): void;
  toBeCloseTo(expected: number, precision?: number): void;
  toMatchObject(expected: Record<string, unknown> | unknown[]): void;
  toHaveBeenCalledOnce(): void;
  toSatisfy(predicate: (value: unknown) => boolean): void;
  toHaveBeenCalled(): void;
  toHaveBeenCalledTimes(n: number): void;
  toHaveBeenCalledWith(...args: unknown[]): void;
  toHaveBeenLastCalledWith(...args: unknown[]): void;
  toHaveBeenNthCalledWith(n: number, ...args: unknown[]): void;
  toHaveReturned(): void;
  toHaveReturnedTimes(n: number): void;
  toHaveReturnedWith(value: unknown): void;
  toHaveLastReturnedWith(value: unknown): void;
  toMatchSnapshot(snapshotName?: string): void;
  toMatchInlineSnapshot(inlineSnapshot?: string): void;
  not: Matchers<T>;
  resolves: AsyncMatchers<T>;
  rejects: AsyncMatchers<T>;
  [key: string]: unknown;
}

function createAsyncMatchers<T>(
  promise: Promise<unknown>,
  negated: boolean,
  mode: 'resolves' | 'rejects',
): AsyncMatchers<T> {
  async function getResolved(): Promise<unknown> {
    if (mode === 'resolves') {
      try {
        return await promise;
      } catch (err) {
        throw new Error(
          `Expected promise to resolve, but it rejected with: ${String(err)}`,
        );
      }
    } else {
      try {
        const val = await promise;
        throw new Error(
          `Expected promise to reject, but it resolved with: ${String(val)}`,
        );
      } catch (err) {
        if (
          err instanceof Error &&
          err.message.startsWith('Expected promise to reject')
        ) {
          throw err;
        }
        return err;
      }
    }
  }

  function makeAsync(
    fn: (resolved: unknown, ...rest: unknown[]) => void,
  ): (...args: unknown[]) => Promise<void> {
    return async (...args: unknown[]) => {
      const resolved = await getResolved();
      fn(resolved, ...args);
    };
  }

  const asyncMatchers: AsyncMatchers<T> = {
    toBe: makeAsync((val, expected) => {
      if (negated) assert.notStrictEqual(val, expected);
      else assert.strictEqual(val, expected);
    }) as AsyncMatchers<T>['toBe'],

    toEqual: makeAsync((val, expected) => {
      if (negated) assert.notDeepStrictEqual(val, expected);
      else assert.deepStrictEqual(val, expected);
    }) as AsyncMatchers<T>['toEqual'],

    toStrictEqual: makeAsync((val, expected) => {
      if (negated) assert.notDeepStrictEqual(val, expected);
      else assert.deepStrictEqual(val, expected);
    }) as AsyncMatchers<T>['toStrictEqual'],

    toBeTruthy: makeAsync((val) => {
      if (negated) assert.ok(!val, `Expected ${String(val)} to be falsy`);
      else assert.ok(val, `Expected ${String(val)} to be truthy`);
    }) as AsyncMatchers<T>['toBeTruthy'],

    toBeFalsy: makeAsync((val) => {
      if (negated) assert.ok(val, `Expected ${String(val)} to be truthy`);
      else assert.ok(!val, `Expected ${String(val)} to be falsy`);
    }) as AsyncMatchers<T>['toBeFalsy'],

    toBeNull: makeAsync((val) => {
      if (negated) assert.notStrictEqual(val, null);
      else assert.strictEqual(val, null);
    }) as AsyncMatchers<T>['toBeNull'],

    toBeUndefined: makeAsync((val) => {
      if (negated) assert.notStrictEqual(val, undefined);
      else assert.strictEqual(val, undefined);
    }) as AsyncMatchers<T>['toBeUndefined'],

    toBeDefined: makeAsync((val) => {
      if (negated) assert.strictEqual(val, undefined);
      else assert.notStrictEqual(val, undefined);
    }) as AsyncMatchers<T>['toBeDefined'],

    toBeNaN: makeAsync((val) => {
      const isNaN = Number.isNaN(val);
      if (negated) assert.ok(!isNaN, `Expected ${String(val)} not to be NaN`);
      else assert.ok(isNaN, `Expected ${String(val)} to be NaN`);
    }) as AsyncMatchers<T>['toBeNaN'],

    toBeInstanceOf: makeAsync((val, expected) => {
      const ctor = expected as abstract new (...args: unknown[]) => unknown;
      if (negated) {
        assert.ok(
          !(val instanceof ctor),
          `Expected value not to be instance of ${ctor.name}`,
        );
      } else {
        assert.ok(
          val instanceof ctor,
          `Expected value to be instance of ${ctor.name}`,
        );
      }
    }) as AsyncMatchers<T>['toBeInstanceOf'],

    toContain: makeAsync((val, expected) => {
      const arr = val as unknown[];
      if (negated)
        assert.ok(
          !arr.includes(expected),
          `Expected array not to contain ${String(expected)}`,
        );
      else
        assert.ok(
          arr.includes(expected),
          `Expected array to contain ${String(expected)}`,
        );
    }) as AsyncMatchers<T>['toContain'],

    toHaveLength: makeAsync((val, expected) => {
      const length = (val as { length: number }).length;
      if (negated) assert.notStrictEqual(length, expected);
      else assert.strictEqual(length, expected);
    }) as AsyncMatchers<T>['toHaveLength'],

    toHaveProperty: makeAsync((val, key, value) => {
      const has = (key as string) in (val as object);
      if (negated) {
        assert.ok(
          !has,
          `Expected object not to have property "${key as string}"`,
        );
      } else {
        assert.ok(has, `Expected object to have property "${key as string}"`);
        if (value !== undefined) {
          assert.deepStrictEqual(
            (val as Record<string, unknown>)[key as string],
            value,
          );
        }
      }
    }) as AsyncMatchers<T>['toHaveProperty'],

    toMatch: makeAsync((val, expected) => {
      const str = val as string;
      const exp = expected as string | RegExp;
      if (typeof exp === 'string') {
        if (negated)
          assert.ok(
            !str.includes(exp),
            `Expected "${str}" not to match "${exp}"`,
          );
        else
          assert.ok(str.includes(exp), `Expected "${str}" to match "${exp}"`);
      } else {
        if (negated) assert.doesNotMatch(str, exp);
        else assert.match(str, exp);
      }
    }) as AsyncMatchers<T>['toMatch'],

    toThrow: makeAsync((val, expected) => {
      // For rejects, the value IS the rejection reason, not a function to call.
      // toThrow() should verify the value is an Error (or matches the expected pattern).
      if (typeof val === 'function') {
        const fn = val as () => void;
        if (negated) {
          assert.doesNotThrow(fn);
        } else if (expected) {
          if (typeof expected === 'string')
            assert.throws(fn, { message: expected });
          else if (expected instanceof RegExp) assert.throws(fn, expected);
          else assert.throws(fn, { message: (expected as Error).message });
        } else {
          assert.throws(fn);
        }
      } else {
        // val is the rejected value; check it like an error
        if (negated) {
          assert.ok(
            !(val instanceof Error),
            `Expected value not to be an Error`,
          );
        } else if (expected) {
          if (typeof expected === 'string') {
            assert.ok(val instanceof Error && val.message === expected);
          } else if (expected instanceof RegExp) {
            assert.ok(val instanceof Error && expected.test(val.message));
          } else {
            assert.ok(
              val instanceof Error &&
                val.message === (expected as Error).message,
            );
          }
        } else {
          assert.ok(
            val instanceof Error,
            `Expected rejected value to be an Error`,
          );
        }
      }
    }) as AsyncMatchers<T>['toThrow'],

    toBeGreaterThan: makeAsync((val, expected) => {
      if (negated) assert.ok((val as number) <= (expected as number));
      else assert.ok((val as number) > (expected as number));
    }) as AsyncMatchers<T>['toBeGreaterThan'],

    toBeGreaterThanOrEqual: makeAsync((val, expected) => {
      if (negated) assert.ok((val as number) < (expected as number));
      else assert.ok((val as number) >= (expected as number));
    }) as AsyncMatchers<T>['toBeGreaterThanOrEqual'],

    toBeLessThan: makeAsync((val, expected) => {
      if (negated) assert.ok((val as number) >= (expected as number));
      else assert.ok((val as number) < (expected as number));
    }) as AsyncMatchers<T>['toBeLessThan'],

    toBeLessThanOrEqual: makeAsync((val, expected) => {
      if (negated) assert.ok((val as number) > (expected as number));
      else assert.ok((val as number) <= (expected as number));
    }) as AsyncMatchers<T>['toBeLessThanOrEqual'],

    toBeCloseTo: makeAsync((val, expected, precision) => {
      const p = (precision as number) ?? 2;
      const diff = Math.abs((val as number) - (expected as number));
      const threshold = Math.pow(10, -p) / 2;
      if (negated)
        assert.ok(
          diff >= threshold,
          `Expected ${String(val)} not to be close to ${expected}`,
        );
      else
        assert.ok(
          diff < threshold,
          `Expected ${String(val)} to be close to ${expected}`,
        );
    }) as AsyncMatchers<T>['toBeCloseTo'],

    get not(): AsyncMatchers<T> {
      return createAsyncMatchers<T>(promise, !negated, mode);
    },
  };

  return asyncMatchers;
}

/** Extract the .mock state from a mock function, or throw. */
function getMockState(actual: unknown): {
  calls: unknown[][];
  results: Array<{ type: string; value: unknown }>;
} {
  const fn = actual as unknown as
    | {
        mock?: {
          calls: unknown[][];
          results: Array<{ type: string; value: unknown }>;
        };
      }
    | null
    | undefined;
  if (!fn || typeof actual !== 'function' || !fn.mock) {
    throw new Error('Value is not a mock function');
  }
  return fn.mock;
}

/** Check if a value (possibly nested) contains any asymmetric matchers. */
function hasAsymmetricMatcher(val: unknown): boolean {
  if (isAsymmetricMatcher(val)) return true;
  if (val === null || typeof val !== 'object') return false;
  if (Array.isArray(val)) return val.some(hasAsymmetricMatcher);
  return Object.values(val as Record<string, unknown>).some(
    hasAsymmetricMatcher,
  );
}

/** Return type for custom matchers. */
interface CustomMatcherResult {
  pass: boolean;
  message: () => string;
}

/** Custom matcher function signature. */
type CustomMatcherFn = (
  received: unknown,
  ...args: unknown[]
) => CustomMatcherResult;

/** Registry for custom matchers added via expect.extend(). */
const customMatcherRegistry = new Map<string, CustomMatcherFn>();

/** Module-level assertion tracking state. */
interface ExpectState {
  assertionCount: number;
  expectedAssertionCount: number | null;
  isExpectingAssertions: boolean;
}

const expectState: ExpectState = {
  assertionCount: 0,
  expectedAssertionCount: null,
  isExpectingAssertions: false,
};

/** Increment the assertion counter. Called by every matcher. */
function trackAssertion(): void {
  expectState.assertionCount++;
}

/**
 * Create an assertion wrapper for the given value.
 */
export function expect<T>(actual: T): Matchers<T> {
  let negated = false;
  const matchers: Matchers<T> = {
    toBe(expected: T): void {
      trackAssertion();
      if (negated) {
        assert.notStrictEqual(actual, expected);
      } else {
        assert.strictEqual(actual, expected);
      }
    },

    toEqual(expected: T): void {
      trackAssertion();
      // Check if expected contains any asymmetric matchers
      if (hasAsymmetricMatcher(expected)) {
        const matches = deepEqualWithAsymmetric(actual, expected);
        if (negated) {
          assert.ok(!matches, `Expected values not to match`);
        } else {
          assert.ok(
            matches,
            `Expected ${JSON.stringify(actual)} to match ${JSON.stringify(expected)}`,
          );
        }
      } else if (negated) {
        assert.notDeepStrictEqual(actual, expected);
      } else {
        assert.deepStrictEqual(actual, expected);
      }
    },

    toStrictEqual(expected: T): void {
      trackAssertion();
      if (negated) {
        assert.notDeepStrictEqual(actual, expected);
      } else {
        assert.deepStrictEqual(actual, expected);
      }
    },

    toBeTruthy(): void {
      trackAssertion();
      if (negated) {
        assert.ok(!actual, `Expected ${String(actual)} to be falsy`);
      } else {
        assert.ok(actual, `Expected ${String(actual)} to be truthy`);
      }
    },

    toBeFalsy(): void {
      trackAssertion();
      if (negated) {
        assert.ok(actual, `Expected ${String(actual)} to be truthy`);
      } else {
        assert.ok(!actual, `Expected ${String(actual)} to be falsy`);
      }
    },

    toBeNull(): void {
      trackAssertion();
      if (negated) {
        assert.notStrictEqual(actual, null);
      } else {
        assert.strictEqual(actual, null);
      }
    },

    toBeUndefined(): void {
      trackAssertion();
      if (negated) {
        assert.notStrictEqual(actual, undefined);
      } else {
        assert.strictEqual(actual, undefined);
      }
    },

    toBeDefined(): void {
      trackAssertion();
      if (negated) {
        assert.strictEqual(actual, undefined);
      } else {
        assert.notStrictEqual(actual, undefined);
      }
    },

    toBeNaN(): void {
      trackAssertion();
      const isNaN = Number.isNaN(actual);
      if (negated) {
        assert.ok(!isNaN, `Expected ${String(actual)} not to be NaN`);
      } else {
        assert.ok(isNaN, `Expected ${String(actual)} to be NaN`);
      }
    },

    toBeInstanceOf(
      expected: abstract new (...args: unknown[]) => unknown,
    ): void {
      trackAssertion();
      if (negated) {
        assert.ok(
          !(actual instanceof expected),
          `Expected value not to be instance of ${expected.name}`,
        );
      } else {
        assert.ok(
          actual instanceof expected,
          `Expected value to be instance of ${expected.name}`,
        );
      }
    },

    toContain(expected: unknown): void {
      trackAssertion();
      const arr = actual as unknown[];
      if (negated) {
        assert.ok(
          !arr.includes(expected),
          `Expected array not to contain ${String(expected)}`,
        );
      } else {
        assert.ok(
          arr.includes(expected),
          `Expected array to contain ${String(expected)}`,
        );
      }
    },

    toHaveLength(expected: number): void {
      trackAssertion();
      const length = (actual as unknown as { length: number }).length;
      if (negated) {
        assert.notStrictEqual(length, expected);
      } else {
        assert.strictEqual(length, expected);
      }
    },

    toHaveProperty(key: string, value?: unknown): void {
      trackAssertion();
      const has = key in (actual as object);
      if (negated) {
        assert.ok(!has, `Expected object not to have property "${key}"`);
      } else {
        assert.ok(has, `Expected object to have property "${key}"`);
        if (value !== undefined) {
          assert.deepStrictEqual(
            (actual as Record<string, unknown>)[key],
            value,
          );
        }
      }
    },

    toMatch(expected: string | RegExp): void {
      trackAssertion();
      const str = actual as unknown as string;
      if (typeof expected === 'string') {
        if (negated) {
          assert.ok(
            !str.includes(expected),
            `Expected "${str}" not to match "${expected}"`,
          );
        } else {
          assert.ok(
            str.includes(expected),
            `Expected "${str}" to match "${expected}"`,
          );
        }
      } else {
        if (negated) {
          assert.doesNotMatch(str, expected);
        } else {
          assert.match(str, expected);
        }
      }
    },

    toThrow(expected?: string | RegExp | Error): void {
      trackAssertion();
      const fn = actual as unknown as () => void;
      if (negated) {
        assert.doesNotThrow(fn);
      } else if (expected) {
        if (typeof expected === 'string') {
          assert.throws(fn, { message: expected });
        } else if (expected instanceof RegExp) {
          assert.throws(fn, expected);
        } else {
          assert.throws(fn, { message: expected.message });
        }
      } else {
        assert.throws(fn);
      }
    },

    toBeGreaterThan(expected: number): void {
      trackAssertion();
      if (negated) {
        assert.ok((actual as unknown as number) <= expected);
      } else {
        assert.ok((actual as unknown as number) > expected);
      }
    },

    toBeGreaterThanOrEqual(expected: number): void {
      trackAssertion();
      if (negated) {
        assert.ok((actual as unknown as number) < expected);
      } else {
        assert.ok((actual as unknown as number) >= expected);
      }
    },

    toBeLessThan(expected: number): void {
      trackAssertion();
      if (negated) {
        assert.ok((actual as unknown as number) >= expected);
      } else {
        assert.ok((actual as unknown as number) < expected);
      }
    },

    toBeLessThanOrEqual(expected: number): void {
      trackAssertion();
      if (negated) {
        assert.ok((actual as unknown as number) > expected);
      } else {
        assert.ok((actual as unknown as number) <= expected);
      }
    },

    toBeCloseTo(expected: number, precision = 2): void {
      trackAssertion();
      const diff = Math.abs((actual as unknown as number) - expected);
      const threshold = Math.pow(10, -precision) / 2;
      if (negated) {
        assert.ok(
          diff >= threshold,
          `Expected ${String(actual)} not to be close to ${expected}`,
        );
      } else {
        assert.ok(
          diff < threshold,
          `Expected ${String(actual)} to be close to ${expected}`,
        );
      }
    },

    toHaveBeenCalled(): void {
      trackAssertion();
      const mock = getMockState(actual);
      if (negated) {
        assert.ok(
          mock.calls.length === 0,
          `Expected mock not to have been called, but it was called ${mock.calls.length} time(s)`,
        );
      } else {
        assert.ok(mock.calls.length > 0, `Expected mock to have been called`);
      }
    },

    toHaveBeenCalledTimes(n: number): void {
      trackAssertion();
      const mock = getMockState(actual);
      if (negated) {
        assert.ok(
          mock.calls.length !== n,
          `Expected mock not to have been called ${n} times`,
        );
      } else {
        assert.strictEqual(
          mock.calls.length,
          n,
          `Expected mock to have been called ${n} times, but was called ${mock.calls.length} times`,
        );
      }
    },

    toHaveBeenCalledWith(...args: unknown[]): void {
      trackAssertion();
      const mock = getMockState(actual);
      const found = mock.calls.some((call: unknown[]) => argsMatch(call, args));
      if (negated) {
        assert.ok(
          !found,
          `Expected mock not to have been called with ${JSON.stringify(args)}`,
        );
      } else {
        assert.ok(
          found,
          `Expected mock to have been called with ${JSON.stringify(args)}`,
        );
      }
    },

    toHaveBeenLastCalledWith(...args: unknown[]): void {
      trackAssertion();
      const mock = getMockState(actual);
      const lastCall = mock.calls[mock.calls.length - 1];
      const matches = lastCall && argsMatch(lastCall, args);
      if (negated) {
        assert.ok(
          !matches,
          `Expected last call not to have args ${JSON.stringify(args)}`,
        );
      } else {
        assert.ok(
          matches,
          `Expected last call to have args ${JSON.stringify(args)}, but got ${JSON.stringify(lastCall)}`,
        );
      }
    },

    toHaveBeenNthCalledWith(n: number, ...args: unknown[]): void {
      trackAssertion();
      const mock = getMockState(actual);
      const nthCall = mock.calls[n - 1];
      const matches = nthCall && argsMatch(nthCall, args);
      if (negated) {
        assert.ok(
          !matches,
          `Expected call ${n} not to have args ${JSON.stringify(args)}`,
        );
      } else {
        assert.ok(
          matches,
          `Expected call ${n} to have args ${JSON.stringify(args)}, but got ${JSON.stringify(nthCall)}`,
        );
      }
    },

    toHaveReturned(): void {
      trackAssertion();
      const mock = getMockState(actual);
      const hasReturn = mock.results.some(
        (r: { type: string }) => r.type === 'return',
      );
      if (negated) {
        assert.ok(!hasReturn, `Expected mock not to have returned`);
      } else {
        assert.ok(hasReturn, `Expected mock to have returned`);
      }
    },

    toHaveReturnedTimes(n: number): void {
      trackAssertion();
      const mock = getMockState(actual);
      const returnCount = mock.results.filter(
        (r: { type: string }) => r.type === 'return',
      ).length;
      if (negated) {
        assert.ok(
          returnCount !== n,
          `Expected mock not to have returned ${n} times`,
        );
      } else {
        assert.strictEqual(
          returnCount,
          n,
          `Expected mock to have returned ${n} times, but returned ${returnCount} times`,
        );
      }
    },

    toHaveReturnedWith(value: unknown): void {
      trackAssertion();
      const mock = getMockState(actual);
      const found = mock.results.some(
        (r: { type: string; value: unknown }) =>
          r.type === 'return' && deepEqualWithAsymmetric(r.value, value),
      );
      if (negated) {
        assert.ok(
          !found,
          `Expected mock not to have returned with ${JSON.stringify(value)}`,
        );
      } else {
        assert.ok(
          found,
          `Expected mock to have returned with ${JSON.stringify(value)}`,
        );
      }
    },

    toHaveLastReturnedWith(value: unknown): void {
      trackAssertion();
      const mock = getMockState(actual);
      const lastResult = mock.results[mock.results.length - 1];
      const matches =
        lastResult &&
        lastResult.type === 'return' &&
        deepEqualWithAsymmetric(lastResult.value, value);
      if (negated) {
        assert.ok(
          !matches,
          `Expected last return not to be ${JSON.stringify(value)}`,
        );
      } else {
        assert.ok(
          matches,
          `Expected last return to be ${JSON.stringify(value)}, but got ${JSON.stringify(lastResult?.value)}`,
        );
      }
    },

    toMatchObject(expected: Record<string, unknown> | unknown[]): void {
      trackAssertion();
      const matches = deepMatchObject(actual, expected);
      if (negated) {
        assert.ok(
          !matches,
          `Expected ${JSON.stringify(actual)} not to match object ${JSON.stringify(expected)}`,
        );
      } else {
        assert.ok(
          matches,
          `Expected ${JSON.stringify(actual)} to match object ${JSON.stringify(expected)}`,
        );
      }
    },

    toHaveBeenCalledOnce(): void {
      trackAssertion();
      const mock = getMockState(actual);
      if (negated) {
        assert.ok(
          mock.calls.length !== 1,
          `Expected mock not to have been called exactly once, but it was called ${mock.calls.length} time(s)`,
        );
      } else {
        assert.strictEqual(
          mock.calls.length,
          1,
          `Expected mock to have been called once, but it was called ${mock.calls.length} time(s)`,
        );
      }
    },

    toSatisfy(predicate: (value: unknown) => boolean): void {
      trackAssertion();
      const result = predicate(actual);
      if (negated) {
        assert.ok(
          !result,
          `Expected ${JSON.stringify(actual)} not to satisfy predicate`,
        );
      } else {
        assert.ok(
          result,
          `Expected ${JSON.stringify(actual)} to satisfy predicate`,
        );
      }
    },

    toMatchSnapshot(snapshotName?: string): void {
      trackAssertion();
      const name = snapshotName ?? 'default';
      matchSnapshot(actual, name);
    },

    toMatchInlineSnapshot(inlineSnapshot?: string): void {
      trackAssertion();
      matchInlineSnapshot(actual, inlineSnapshot);
    },

    get not(): Matchers<T> {
      negated = !negated;
      return matchers;
    },

    get resolves(): AsyncMatchers<T> {
      return createAsyncMatchers(
        actual as unknown as Promise<unknown>,
        negated,
        'resolves',
      );
    },

    get rejects(): AsyncMatchers<T> {
      return createAsyncMatchers(
        actual as unknown as Promise<unknown>,
        negated,
        'rejects',
      );
    },
  };

  // Add custom matchers from the registry
  for (const [name, matcherFn] of customMatcherRegistry) {
    (matchers as Record<string, (...args: unknown[]) => void>)[name] = (
      ...args: unknown[]
    ): void => {
      const result = matcherFn(actual, ...args);
      if (negated) {
        if (result.pass) {
          throw new Error(result.message());
        }
      } else {
        if (!result.pass) {
          throw new Error(result.message());
        }
      }
    };
  }

  return matchers;
}

// --- Asymmetric matchers ---

expect.anything = (): AsymmetricMatcher => ({
  asymmetricMatch(actual: unknown): boolean {
    return actual !== null && actual !== undefined;
  },
});

expect.any = (
  constructor: new (...args: unknown[]) => unknown,
): AsymmetricMatcher => ({
  asymmetricMatch(actual: unknown): boolean {
    if (constructor === (Number as unknown)) return typeof actual === 'number';
    if (constructor === (String as unknown)) return typeof actual === 'string';
    if (constructor === (Boolean as unknown))
      return typeof actual === 'boolean';
    if (constructor === (BigInt as unknown)) return typeof actual === 'bigint';
    if (constructor === (Symbol as unknown)) return typeof actual === 'symbol';
    if (constructor === (Function as unknown))
      return typeof actual === 'function';
    return actual instanceof constructor;
  },
});

expect.stringContaining = (str: string): AsymmetricMatcher => ({
  asymmetricMatch(actual: unknown): boolean {
    return typeof actual === 'string' && actual.includes(str);
  },
});

expect.stringMatching = (pattern: string | RegExp): AsymmetricMatcher => ({
  asymmetricMatch(actual: unknown): boolean {
    if (typeof actual !== 'string') return false;
    if (typeof pattern === 'string') return actual.includes(pattern);
    return pattern.test(actual);
  },
});

expect.objectContaining = (
  obj: Record<string, unknown>,
): AsymmetricMatcher => ({
  asymmetricMatch(actual: unknown): boolean {
    if (actual === null || typeof actual !== 'object') return false;
    const actualObj = actual as Record<string, unknown>;
    return Object.keys(obj).every((key) =>
      deepEqualWithAsymmetric(actualObj[key], obj[key]),
    );
  },
});

expect.arrayContaining = (arr: unknown[]): AsymmetricMatcher => ({
  asymmetricMatch(actual: unknown): boolean {
    if (!Array.isArray(actual)) return false;
    return arr.every((item) =>
      actual.some((actualItem) => deepEqualWithAsymmetric(actualItem, item)),
    );
  },
});

expect.extend = (matchers: Record<string, CustomMatcherFn>): void => {
  for (const [name, fn] of Object.entries(matchers)) {
    customMatcherRegistry.set(name, fn);
  }
};

expect.not = {
  objectContaining: (obj: Record<string, unknown>): AsymmetricMatcher => ({
    asymmetricMatch(actual: unknown): boolean {
      return !expect.objectContaining(obj).asymmetricMatch(actual);
    },
  }),
  arrayContaining: (arr: unknown[]): AsymmetricMatcher => ({
    asymmetricMatch(actual: unknown): boolean {
      return !expect.arrayContaining(arr).asymmetricMatch(actual);
    },
  }),
  stringContaining: (str: string): AsymmetricMatcher => ({
    asymmetricMatch(actual: unknown): boolean {
      return !expect.stringContaining(str).asymmetricMatch(actual);
    },
  }),
  stringMatching: (pattern: string | RegExp): AsymmetricMatcher => ({
    asymmetricMatch(actual: unknown): boolean {
      return !expect.stringMatching(pattern).asymmetricMatch(actual);
    },
  }),
};

/** Set the expected number of assertions for the current test. */
expect.assertions = (count: number): void => {
  expectState.expectedAssertionCount = count;
};

/** Declare that at least one assertion must run in the current test. */
expect.hasAssertions = (): void => {
  expectState.isExpectingAssertions = true;
};

/** Get the current assertion tracking state. */
expect.getState = (): {
  assertionCount: number;
  expectedAssertionCount: number | null;
  isExpectingAssertions: boolean;
} => ({
  assertionCount: expectState.assertionCount,
  expectedAssertionCount: expectState.expectedAssertionCount,
  isExpectingAssertions: expectState.isExpectingAssertions,
});

/** Reset assertion tracking state (call at the start of each test). */
expect.resetState = (): void => {
  expectState.assertionCount = 0;
  expectState.expectedAssertionCount = null;
  expectState.isExpectingAssertions = false;
};

/** Verify assertion counts (call at the end of each test). Throws if expectations are not met. */
expect.verifyAssertions = (): void => {
  if (expectState.expectedAssertionCount !== null) {
    if (expectState.assertionCount !== expectState.expectedAssertionCount) {
      throw new Error(
        `Expected ${expectState.expectedAssertionCount} assertions, but ${expectState.assertionCount} were called`,
      );
    }
  }
  if (expectState.isExpectingAssertions) {
    if (expectState.assertionCount === 0) {
      throw new Error(`Expected at least one assertion, but none were called`);
    }
  }
};
