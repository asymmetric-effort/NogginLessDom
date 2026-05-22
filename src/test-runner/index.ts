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

type TestFn = (...args: unknown[]) => void | Promise<void>;
type SuiteFn = (...args: unknown[]) => void | Promise<void>;

interface TestOptions {
  skip?: boolean | string;
  only?: boolean;
  todo?: boolean | string;
  timeout?: number;
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
        nodeDescribe(title, () => fn(...args));
      }
    };
  };
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
  skipIf: (condition: unknown) => (name: string, fn: SuiteFn) => void;
  runIf: (condition: unknown) => (name: string, fn: SuiteFn) => void;
}

/**
 * Define a test suite.
 */
const describe: DescribeFn = Object.assign(
  function describe(name: string, fn: SuiteFn): void {
    nodeDescribe(name, fn);
  },
  {
    skip(name: string, fn: SuiteFn): void {
      nodeDescribe(name, { skip: true }, fn);
    },
    only(name: string, fn: SuiteFn): void {
      nodeDescribe(name, { only: true }, fn);
    },
    todo(name: string, _fn?: SuiteFn): void {
      nodeDescribe(name, { todo: true }, () => {});
    },
    each: makeDescribeEach(),
    concurrent(name: string, fn: SuiteFn): void {
      nodeDescribe(name, { concurrency: true }, fn);
    },
    skipIf(condition: unknown): (name: string, fn: SuiteFn) => void {
      return (name: string, fn: SuiteFn): void => {
        if (condition) {
          nodeDescribe(name, { skip: true }, fn);
        } else {
          nodeDescribe(name, fn);
        }
      };
    },
    runIf(condition: unknown): (name: string, fn: SuiteFn) => void {
      return (name: string, fn: SuiteFn): void => {
        if (condition) {
          nodeDescribe(name, fn);
        } else {
          nodeDescribe(name, { skip: true }, fn);
        }
      };
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
}

function baseIt(name: string, fn: TestFn, options?: TestOptions): void {
  nodeIt(
    name,
    {
      skip: options?.skip,
      only: options?.only,
      todo: options?.todo,
      timeout: options?.timeout,
    },
    fn,
  );
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
      nodeIt(name, { only: true }, fn);
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
        fn,
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
  },
);

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
