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
