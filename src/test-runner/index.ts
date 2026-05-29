/**
 * Test runner module — wraps node:test with a comprehensive testing API.
 * @module test-runner
 */

import {
  describe as nodeDescribe,
  it as nodeIt,
  before,
  after,
  beforeEach as nodeBE,
  afterEach as nodeAE,
} from 'node:test';
import {
  pushDescribe,
  popDescribe,
  buildFullName,
  shouldSkipTest,
} from './filter.js';
import {
  runAutoMockCleanup,
  useRealTimers,
  getAllMocks,
  mock as mockUtils,
} from '../mocking/index.js';

// ---------------------------------------------------------------------------
// Test-level isolation for concurrent tests (Feature #169)
// ---------------------------------------------------------------------------

export interface IsolationConfig {
  isolate?: boolean; // default: true for concurrent, false for sequential
  isolation?: 'full' | 'mocks' | 'none'; // default: 'full'
}

let isolationConfig: IsolationConfig = {};

export function configureIsolation(config: IsolationConfig): void {
  isolationConfig = { ...config };
}

export function getIsolationConfig(): IsolationConfig {
  return { ...isolationConfig };
}

/**
 * Perform cleanup based on isolation mode.
 * 'full': restoreAllMocks + useRealTimers + unstubAllGlobals
 * 'mocks': restoreAllMocks only
 * 'none': no cleanup
 */
function performIsolationCleanup(mode: 'full' | 'mocks' | 'none'): void {
  if (mode === 'none') return;
  // Import dynamically to avoid circular issues at module level
  const mockSet = getAllMocks();
  for (const m of mockSet) {
    m.mockRestore();
  }
  mockSet.clear();
  if (mode === 'full') {
    useRealTimers();
    mockUtils.unstubAllGlobals();
  }
}

/**
 * Wrap a test function for concurrent isolation.
 */
function wrapWithIsolation(testFn: TestFn, isConcurrent: boolean): TestFn {
  const shouldIsolate =
    isolationConfig.isolate !== undefined
      ? isolationConfig.isolate
      : isConcurrent;
  if (!shouldIsolate) return testFn;
  const mode = isolationConfig.isolation ?? 'full';
  if (mode === 'none') return testFn;

  return async (...args: unknown[]): Promise<void> => {
    try {
      await testFn(...args);
    } finally {
      performIsolationCleanup(mode);
    }
  };
}

type TestFn = (...args: unknown[]) => void | Promise<void>;
type SuiteFn = (...args: unknown[]) => void | Promise<void>;

interface TestOptions {
  skip?: boolean | string;
  only?: boolean;
  todo?: boolean | string;
  timeout?: number;
  retries?: number;
}

// ---------------------------------------------------------------------------
// Name formatting helpers
// ---------------------------------------------------------------------------

/**
 * Format a test name template using printf-style placeholders and $variable
 * references. Supports %s, %d, %i, %f, %j, %o, %%.
 */
function formatName(template: string, args: unknown[]): string {
  // If args is a single object (not array), handle $variable syntax
  if (
    args.length === 1 &&
    args[0] !== null &&
    typeof args[0] === 'object' &&
    !Array.isArray(args[0])
  ) {
    const obj = args[0] as Record<string, unknown>;
    let result = template;
    // Replace $variable patterns (but not $$)
    result = result.replace(/\$([a-zA-Z_][a-zA-Z0-9_]*)/g, (_match, key) => {
      return key in obj ? String(obj[key]) : `$${key}`;
    });
    return result;
  }

  // Printf-style formatting
  let argIndex = 0;
  return template.replace(/%([sdifjo%])/g, (_match, specifier) => {
    if (specifier === '%') return '%';
    if (argIndex >= args.length) return _match;
    const val = args[argIndex++];
    switch (specifier) {
      case 's':
        return String(val);
      case 'd':
      case 'i':
        return String(Math.trunc(Number(val)));
      case 'f':
        return String(Number(val));
      case 'j':
      case 'o':
        return JSON.stringify(val);
      default:
        return String(val);
    }
  });
}

/**
 * Normalise a table entry into an array of arguments for the test function.
 */
function toArgs(entry: unknown): unknown[] {
  if (Array.isArray(entry)) return entry;
  return [entry];
}

// ---------------------------------------------------------------------------
// each() factory — used by both it.each and describe.each
// ---------------------------------------------------------------------------

function makeEach(
  register: (name: string, fn: TestFn, options?: TestOptions) => void,
): (
  table: unknown[],
) => (name: string, fn: (...args: unknown[]) => void | Promise<void>) => void {
  return (table: unknown[]) => {
    return (name: string, fn: (...args: unknown[]) => void | Promise<void>) => {
      for (const entry of table) {
        const args = toArgs(entry);
        const title = formatName(name, args);
        register(title, () => fn(...args));
      }
    };
  };
}

function makeDescribeEach(): (
  table: unknown[],
) => (name: string, fn: (...args: unknown[]) => void | Promise<void>) => void {
  return (table: unknown[]) => {
    return (name: string, fn: (...args: unknown[]) => void | Promise<void>) => {
      for (const entry of table) {
        const args = toArgs(entry);
        const title = formatName(name, args);
        const suiteFn = (): void | Promise<void> => fn(...args);
        nodeDescribe(title, wrapSuiteFn(title, suiteFn));
      }
    };
  };
}

// ---------------------------------------------------------------------------
// Shuffle helpers (Fisher-Yates with seeded PRNG)
// ---------------------------------------------------------------------------

/**
 * Simple seeded pseudo-random number generator (mulberry32).
 * Returns a function that produces values in [0, 1).
 */
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return (): number => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fisher-Yates in-place shuffle using a seeded PRNG.
 */
function fisherYatesShuffle<T>(arr: T[], rand: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp: T = arr[i] as T;
    arr[i] = arr[j] as T;
    arr[j] = tmp;
  }
  return arr;
}

/**
 * Get the shuffle seed — from SHUFFLE_SEED env var or Date.now().
 */
function getShuffleSeed(): number {
  const envSeed = process.env.SHUFFLE_SEED;
  if (envSeed !== undefined && envSeed !== '') {
    const parsed = Number(envSeed);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return Date.now();
}

// ---------------------------------------------------------------------------
// describe
// ---------------------------------------------------------------------------

interface DescribeFn {
  (name: string, fn: SuiteFn): void;
  skip: (name: string, fn: SuiteFn) => void;
  only: (name: string, fn: SuiteFn) => void;
  todo: (name: string, fn?: SuiteFn) => void;
  each: ReturnType<typeof makeDescribeEach>;
  concurrent: (name: string, fn: SuiteFn) => void;
  serial: (name: string, fn: SuiteFn) => void;
  skipIf: (condition: unknown) => (name: string, fn: SuiteFn) => void;
  runIf: (condition: unknown) => (name: string, fn: SuiteFn) => void;
  shuffle: (name: string, fn: SuiteFn) => void;
}

/**
 * Define a test suite.
 */
/**
 * Wrap a suite callback so that the describe stack is maintained.
 */
function wrapSuiteFn(name: string, fn: SuiteFn): SuiteFn {
  return (...args: unknown[]): void | Promise<void> => {
    pushDescribe(name);
    try {
      const result = fn(...args);
      // Handle async suite functions (unlikely but safe)
      if (result && typeof (result as Promise<void>).then === 'function') {
        return (result as Promise<void>).finally(() => popDescribe());
      }
      popDescribe();
      return result;
    } catch (err) {
      popDescribe();
      throw err;
    }
  };
}

let serialMode = false;

/**
 * Enable or disable global serial mode.
 */
export function setSerialMode(serial: boolean): void {
  serialMode = serial;
}

/**
 * Get the current serial mode setting.
 */
export function getSerialMode(): boolean {
  return serialMode;
}

const describe: DescribeFn = Object.assign(
  function describe(name: string, fn: SuiteFn): void {
    if (serialMode) {
      nodeDescribe(name, { concurrency: 1 }, wrapSuiteFn(name, fn));
    } else {
      nodeDescribe(name, wrapSuiteFn(name, fn));
    }
  },
  {
    skip(name: string, fn: SuiteFn): void {
      nodeDescribe(name, { skip: true }, wrapSuiteFn(name, fn));
    },
    only(name: string, fn: SuiteFn): void {
      nodeDescribe(name, { only: true }, wrapSuiteFn(name, fn));
    },
    todo(name: string, _fn?: SuiteFn): void {
      nodeDescribe(name, { todo: true }, () => {});
    },
    each: makeDescribeEach(),
    concurrent(name: string, fn: SuiteFn): void {
      nodeDescribe(name, { concurrency: true }, wrapSuiteFn(name, fn));
    },
    serial(name: string, fn: SuiteFn): void {
      nodeDescribe(name, { concurrency: 1 }, wrapSuiteFn(name, fn));
    },
    skipIf(condition: unknown): (name: string, fn: SuiteFn) => void {
      return (name: string, fn: SuiteFn): void => {
        if (condition) {
          nodeDescribe(name, { skip: true }, wrapSuiteFn(name, fn));
        } else {
          nodeDescribe(name, wrapSuiteFn(name, fn));
        }
      };
    },
    runIf(condition: unknown): (name: string, fn: SuiteFn) => void {
      return (name: string, fn: SuiteFn): void => {
        if (condition) {
          nodeDescribe(name, wrapSuiteFn(name, fn));
        } else {
          nodeDescribe(name, { skip: true }, wrapSuiteFn(name, fn));
        }
      };
    },
    shuffle(name: string, fn: SuiteFn): void {
      nodeDescribe(
        name,
        wrapSuiteFn(name, () => {
          // Enable collection mode so baseIt captures instead of registering
          shuffleCollecting = true;
          shuffleCollected.length = 0;

          fn();

          shuffleCollecting = false;
          const tests = shuffleCollected.slice();
          shuffleCollected.length = 0;

          // Shuffle with Fisher-Yates using a seeded PRNG
          const seed = getShuffleSeed();
          const rand = mulberry32(seed);
          fisherYatesShuffle(tests, rand);

          // Re-register in shuffled order
          for (const t of tests) {
            registerIt(t.name, t.fn, t.options);
          }
        }),
      );
    },
  },
);

// ---------------------------------------------------------------------------
// it / test
// ---------------------------------------------------------------------------

interface ItFn {
  (name: string, fn: TestFn, options?: TestOptions): void;
  skip: (name: string, fn?: TestFn) => void;
  only: (name: string, fn: TestFn) => void;
  todo: (name: string, fn?: TestFn) => void;
  each: ReturnType<typeof makeEach>;
  concurrent: (name: string, fn: TestFn, options?: TestOptions) => void;
  skipIf: (condition: unknown) => (name: string, fn: TestFn) => void;
  runIf: (condition: unknown) => (name: string, fn: TestFn) => void;
  fails: (name: string, fn: TestFn) => void;
  retry: (n: number) => (name: string, fn: TestFn) => void;
  shuffle: ItFn;
}

/**
 * Wrap a test function with retry logic. On failure, re-run up to `retries`
 * additional times. Only fail after all retries are exhausted.
 */
function wrapWithRetries(fn: TestFn, retries: number): TestFn {
  return async (...args: unknown[]): Promise<void> => {
    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        await fn(...args);
        return;
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError;
  };
}

// ---------------------------------------------------------------------------
// Shuffle collection state
// ---------------------------------------------------------------------------

interface CollectedTest {
  name: string;
  fn: TestFn;
  options?: TestOptions;
}

let shuffleCollecting = false;
const shuffleCollected: CollectedTest[] = [];

/**
 * Register a test directly with node:test (bypasses shuffle collection).
 */
function registerIt(name: string, fn: TestFn, options?: TestOptions): void {
  const testFn =
    options?.retries !== undefined && options.retries > 0
      ? wrapWithRetries(fn, options.retries)
      : fn;
  nodeIt(
    name,
    {
      skip: options?.skip,
      only: options?.only,
      todo: options?.todo,
      timeout: options?.timeout,
    },
    testFn,
  );
}

function baseIt(name: string, fn: TestFn, options?: TestOptions): void {
  if (shuffleCollecting) {
    shuffleCollected.push({ name, fn, options });
    return;
  }

  // When a name pattern is active, skip non-matching tests.
  // Tests already marked with `only` still respect the pattern (intersection).
  const fullName = buildFullName(name);
  if (shouldSkipTest(fullName)) {
    registerIt(name, fn, { ...options, skip: 'filtered by test name pattern' });
    return;
  }

  registerIt(name, fn, options);
}

/**
 * Define a test case.
 */
const it: ItFn = Object.assign(
  function it(name: string, fn: TestFn, options?: TestOptions): void {
    baseIt(name, fn, options);
  },
  {
    skip(name: string, fn?: TestFn): void {
      nodeIt(name, { skip: true }, fn ?? ((): void => {}));
    },
    only(name: string, fn: TestFn): void {
      // Pattern + .only = intersection: skip if pattern doesn't match
      const fullName = buildFullName(name);
      if (shouldSkipTest(fullName)) {
        nodeIt(name, { skip: 'filtered by test name pattern' }, fn);
      } else {
        nodeIt(name, { only: true }, fn);
      }
    },
    todo(name: string, _fn?: TestFn): void {
      nodeIt(name, { todo: true }, () => {});
    },
    each: makeEach(baseIt),
    concurrent(name: string, fn: TestFn, options?: TestOptions): void {
      nodeIt(
        name,
        {
          concurrency: true,
          skip: options?.skip,
          only: options?.only,
          todo: options?.todo,
          timeout: options?.timeout,
        },
        wrapWithIsolation(fn, true),
      );
    },
    skipIf(condition: unknown): (name: string, fn: TestFn) => void {
      return (name: string, fn: TestFn): void => {
        if (condition) {
          nodeIt(name, { skip: true }, fn);
        } else {
          nodeIt(name, fn);
        }
      };
    },
    runIf(condition: unknown): (name: string, fn: TestFn) => void {
      return (name: string, fn: TestFn): void => {
        if (condition) {
          nodeIt(name, fn);
        } else {
          nodeIt(name, { skip: true }, fn);
        }
      };
    },
    fails(name: string, fn: TestFn): void {
      nodeIt(name, async () => {
        let threw = false;
        try {
          await fn();
        } catch {
          threw = true;
        }
        if (!threw) {
          throw new Error('Expected test to fail but it passed');
        }
      });
    },
    retry(n: number): (name: string, fn: TestFn) => void {
      return (name: string, fn: TestFn): void =>
        baseIt(name, fn, { retries: n });
    },
    shuffle: undefined as unknown as ItFn, // assigned below
  },
);

// it.shuffle is an alias for it — shuffling a single test is a no-op
(it as unknown as Record<string, unknown>).shuffle = it;

/**
 * Alias for `it`.
 */
const test: ItFn = it;

export { describe, it, test };

/**
 * Run a setup function before each test in the current suite.
 */
export function beforeEach(fn: TestFn): void {
  nodeBE(fn);
}

/**
 * Run a teardown function after each test in the current suite.
 */
export function afterEach(fn: TestFn): void {
  nodeAE(fn);
}

/**
 * Install automatic mock cleanup as an afterEach hook.
 * Should be called once at the top of a test suite where auto-restore is desired.
 */
export function installAutoMockCleanup(): void {
  nodeAE(() => {
    runAutoMockCleanup();
  });
}

/**
 * Run a setup function once before all tests in the current suite.
 */
export function beforeAll(fn: TestFn): void {
  before(fn);
}

/**
 * Run a teardown function once after all tests in the current suite.
 */
export function afterAll(fn: TestFn): void {
  after(fn);
}

// ---------------------------------------------------------------------------
// Test lifecycle hooks
// ---------------------------------------------------------------------------

interface TestFailedContext {
  name: string;
  error: unknown;
}

interface TestFinishedContext {
  name: string;
  passed: boolean;
}

type OnTestFailedCallback = (context: TestFailedContext) => void;
type OnTestFinishedCallback = (context: TestFinishedContext) => void;

const onTestFailedCallbacks: OnTestFailedCallback[] = [];
const onTestFinishedCallbacks: OnTestFinishedCallback[] = [];

/**
 * Register a callback to be invoked when a test fails.
 * The callback receives the test name and the error that caused the failure.
 */
export function onTestFailed(
  callback: (context: TestFailedContext) => void,
): void {
  onTestFailedCallbacks.push(callback);
}

/**
 * Register a callback to be invoked when a test finishes (pass or fail).
 * The callback receives the test name and whether it passed.
 */
export function onTestFinished(
  callback: (context: TestFinishedContext) => void,
): void {
  onTestFinishedCallbacks.push(callback);
}

/**
 * Notify all registered onTestFailed callbacks.
 * Called internally by the test runner when a test fails.
 */
export function notifyTestFailed(context: TestFailedContext): void {
  for (const cb of onTestFailedCallbacks) {
    cb(context);
  }
}

/**
 * Notify all registered onTestFinished callbacks.
 * Called internally by the test runner when a test completes.
 */
export function notifyTestFinished(context: TestFinishedContext): void {
  for (const cb of onTestFinishedCallbacks) {
    cb(context);
  }
}

/**
 * Clear all registered lifecycle hook callbacks.
 * Useful for test isolation.
 */
export function clearLifecycleHooks(): void {
  onTestFailedCallbacks.length = 0;
  onTestFinishedCallbacks.length = 0;
}

// ---------------------------------------------------------------------------
// Re-export filter API
// ---------------------------------------------------------------------------

export {
  setTestNamePattern,
  clearTestNamePattern,
  getTestNamePattern,
  setTestFilePattern,
  clearTestFilePattern,
  getTestFilePattern,
} from './filter.js';
