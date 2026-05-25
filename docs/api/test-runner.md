# Test Runner API Reference

The test runner module wraps Node.js's built-in `node:test` module to provide a
comprehensive interface for organizing and running tests.

```typescript
import {
  describe,
  it,
  test,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
  onTestFailed,
  onTestFinished,
} from '@asymmetric-effort/nogginlessdom';
```

## Suite Functions

### `describe(name, fn)`

Define a test suite. Suites can be nested to create hierarchical test
structures.

**Parameters:**

| Parameter | Type                            | Description                 |
| --------- | ------------------------------- | --------------------------- |
| `name`    | `string`                        | Name of the test suite      |
| `fn`      | `() => void \| Promise<void>`   | Suite body containing tests |

**Example:**

```typescript
describe('UserService', () => {
  describe('create', () => {
    it('should create a user with valid data', () => {
      // ...
    });

    it('should reject invalid email', () => {
      // ...
    });
  });
});
```

**How it works:** Delegates directly to `node:test`'s `describe()`. Suite
nesting, test isolation, and parallel execution are all handled by the Node.js
test runner.

### `describe.skip(name, fn)`

Skip an entire test suite. The suite and all its tests are registered but not
executed.

```typescript
describe.skip('Experimental feature', () => {
  it('should do something', () => {
    // not executed
  });
});
```

### `describe.only(name, fn)`

Run only this suite (and other suites/tests marked `only`). All other suites
are skipped.

```typescript
describe.only('Focus on this suite', () => {
  it('runs this test', () => {});
});
```

### `describe.todo(name, fn?)`

Mark a suite as a TODO. The suite is registered but not executed.

```typescript
describe.todo('Future feature');
```

### `describe.each(table)(name, fn)`

Generate a test suite for each entry in a data table. Supports printf-style
formatting (`%s`, `%d`, `%i`, `%f`, `%j`, `%o`) and `$variable` syntax for
object entries.

```typescript
describe.each([
  { input: 'hello', expected: 5 },
  { input: 'world', expected: 5 },
])('length of "$input"', ({ input, expected }) => {
  it(`should be ${expected}`, () => {
    expect(input.length).toBe(expected);
  });
});
```

### `describe.concurrent(name, fn)`

Run all tests within this suite concurrently.

```typescript
describe.concurrent('Parallel tests', () => {
  it('test A', async () => { /* ... */ });
  it('test B', async () => { /* ... */ });
});
```

### `describe.skipIf(condition)(name, fn)`

Conditionally skip a suite. If `condition` is truthy, the suite is skipped.

```typescript
describe.skipIf(process.platform === 'win32')('Unix-only tests', () => {
  it('uses /tmp', () => { /* ... */ });
});
```

### `describe.runIf(condition)(name, fn)`

Conditionally run a suite. If `condition` is truthy, the suite runs; otherwise
it is skipped.

```typescript
describe.runIf(process.env.CI)('CI-only tests', () => {
  it('checks deployment', () => { /* ... */ });
});
```

### `describe.shuffle(name, fn)`

Run the tests within this suite in a randomized order using a seeded
Fisher-Yates shuffle. The seed can be set via the `SHUFFLE_SEED` environment
variable for reproducibility.

```typescript
describe.shuffle('Randomized order', () => {
  it('test A', () => { /* ... */ });
  it('test B', () => { /* ... */ });
  it('test C', () => { /* ... */ });
});
```

## Test Functions

### `it(name, fn, options?)`

Define an individual test case.

**Parameters:**

| Parameter | Type                            | Description                |
| --------- | ------------------------------- | -------------------------- |
| `name`    | `string`                        | Name of the test case      |
| `fn`      | `() => void \| Promise<void>`   | Test function              |
| `options` | `TestOptions` (optional)        | Test configuration options |

**TestOptions:**

| Option    | Type                  | Description                                            |
| --------- | --------------------- | ------------------------------------------------------ |
| `skip`    | `boolean \| string`   | Skip this test. String value is the reason.            |
| `only`    | `boolean`             | Run only this test (and others marked `only`).         |
| `todo`    | `boolean \| string`   | Mark as a TODO. Test runs but failure is not reported. |
| `timeout` | `number`              | Maximum time in milliseconds before the test fails.    |
| `retries` | `number`              | Number of retry attempts on failure.                   |

**Examples:**

```typescript
// Basic test
it('should return the sum', () => {
  expect(add(1, 2)).toBe(3);
});

// Async test
it('should fetch data', async () => {
  const data = await fetchData();
  expect(data).toBeDefined();
});

// Skip a test
it('should handle edge case', () => {
  // ...
}, { skip: 'Not implemented yet' });

// Mark as TODO
it('should support pagination', () => {
  // ...
}, { todo: true });

// Run only this test
it('should work', () => {
  // ...
}, { only: true });

// Set a timeout
it('should complete within 5 seconds', async () => {
  await longRunningOperation();
}, { timeout: 5000 });
```

**How it works:** Delegates to `node:test`'s `it()`. The `options` object is
translated to `node:test`'s option format: `{ skip, only, todo, timeout }`.

### `test(name, fn, options?)`

Alias for `it`. Identical in every way -- use whichever reads better in your
test suite.

```typescript
test('1 + 1 equals 2', () => {
  expect(1 + 1).toBe(2);
});
```

### `it.skip(name, fn?)`

Skip a test. The test is registered but not executed.

```typescript
it.skip('not ready yet', () => {
  // not executed
});
```

### `it.only(name, fn)`

Run only this test (and others marked `only`).

```typescript
it.only('debug this test', () => {
  expect(true).toBe(true);
});
```

### `it.todo(name, fn?)`

Mark a test as a TODO placeholder.

```typescript
it.todo('implement error handling');
```

### `it.each(table)(name, fn)`

Generate a test for each entry in a data table. Supports printf-style
formatting and `$variable` syntax.

```typescript
it.each([
  [1, 2, 3],
  [2, 3, 5],
  [10, 20, 30],
])('add(%d, %d) = %d', (a, b, expected) => {
  expect(a + b).toBe(expected);
});

it.each([
  { a: 1, b: 2, sum: 3 },
  { a: 5, b: 5, sum: 10 },
])('$a + $b = $sum', ({ a, b, sum }) => {
  expect(a + b).toBe(sum);
});
```

### `it.concurrent(name, fn, options?)`

Run this test concurrently with other concurrent tests.

```typescript
it.concurrent('async operation A', async () => {
  const result = await operationA();
  expect(result).toBeDefined();
});
```

### `it.skipIf(condition)(name, fn)`

Conditionally skip a test based on a runtime condition.

```typescript
it.skipIf(!process.env.API_KEY)('requires API key', () => {
  // only runs when API_KEY is set
});
```

### `it.runIf(condition)(name, fn)`

Conditionally run a test based on a runtime condition.

```typescript
it.runIf(process.env.CI)('CI-only test', () => {
  // only runs in CI
});
```

### `it.fails(name, fn)`

Assert that a test is expected to fail. The test passes if the test function
throws, and fails if it does not throw.

```typescript
it.fails('known broken behavior', () => {
  expect(brokenFunction()).toBe('correct');
});
```

### `it.retry(n)(name, fn)`

Retry a test up to `n` additional times on failure. The test only fails after
all retries are exhausted.

```typescript
it.retry(3)('flaky network test', async () => {
  const response = await fetch('https://api.example.com/data');
  expect(response.ok).toBe(true);
});
```

### `it.shuffle`

Alias for `it` -- shuffling a single test is a no-op. Use `describe.shuffle`
to randomize test ordering within a suite.

## Lifecycle Hooks

### `beforeEach(fn)`

Register a function to run before each test in the current suite. Use this for
setup that must be fresh for every test.

```typescript
describe('Database', () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)');
  });

  it('should insert a row', () => {
    db.exec("INSERT INTO users (name) VALUES ('Alice')");
    expect(db.query('SELECT * FROM users')).toHaveLength(1);
  });
});
```

**How it works:** Delegates to `node:test`'s `beforeEach()`.

### `afterEach(fn)`

Register a function to run after each test in the current suite. Use this for
teardown: closing connections, restoring mocks, cleaning up files.

```typescript
describe('FileWriter', () => {
  afterEach(() => {
    fs.rmSync('/tmp/test-output', { recursive: true, force: true });
  });

  it('should write a file', () => {
    writeFile('/tmp/test-output/data.txt', 'hello');
    expect(fs.existsSync('/tmp/test-output/data.txt')).toBe(true);
  });
});
```

**How it works:** Delegates to `node:test`'s `afterEach()`.

### `beforeAll(fn)`

Register a function to run once before all tests in the current suite. Use this
for expensive setup that can be shared across tests.

```typescript
describe('API Integration', () => {
  let server: Server;

  beforeAll(async () => {
    server = await startTestServer();
  });

  afterAll(async () => {
    await server.close();
  });

  it('should respond to GET /', async () => {
    const res = await fetch(`http://localhost:${server.port}/`);
    expect(res.status).toBe(200);
  });
});
```

**How it works:** Delegates to `node:test`'s `before()` (note the name
difference -- `node:test` uses `before`, NogginLessDom uses `beforeAll` to match
the conventional `beforeAll`/`afterAll` naming).

### `afterAll(fn)`

Register a function to run once after all tests in the current suite. Use this
for cleanup that corresponds to `beforeAll` setup.

**How it works:** Delegates to `node:test`'s `after()`.

## Test Lifecycle Callbacks

### `onTestFailed(callback)`

Register a callback invoked when a test fails. The callback receives the test
name and the error that caused the failure.

```typescript
onTestFailed(({ name, error }) => {
  console.log(`Test "${name}" failed:`, error);
});
```

### `onTestFinished(callback)`

Register a callback invoked when a test finishes (pass or fail). The callback
receives the test name and whether it passed.

```typescript
onTestFinished(({ name, passed }) => {
  console.log(`Test "${name}" ${passed ? 'passed' : 'failed'}`);
});
```

## Mapping to node:test

| NogginLessDom          | node:test    | Notes                                |
| ---------------------- | ------------ | ------------------------------------ |
| `describe`             | `describe`   | Direct delegation                    |
| `describe.skip`        | `describe`   | With `{ skip: true }` option         |
| `describe.only`        | `describe`   | With `{ only: true }` option         |
| `describe.todo`        | `describe`   | With `{ todo: true }` option         |
| `describe.concurrent`  | `describe`   | With `{ concurrency: true }` option  |
| `it`                   | `it`         | Options object mapped                |
| `test`                 | `it`         | Alias for `it`                       |
| `it.skip`              | `it`         | With `{ skip: true }` option         |
| `it.only`              | `it`         | With `{ only: true }` option         |
| `it.todo`              | `it`         | With `{ todo: true }` option         |
| `it.concurrent`        | `it`         | With `{ concurrency: true }` option  |
| `it.fails`             | `it`         | Wrapped to invert pass/fail          |
| `it.retry`             | `it`         | Wrapped with retry loop              |
| `beforeEach`           | `beforeEach` | Direct delegation                    |
| `afterEach`            | `afterEach`  | Direct delegation                    |
| `beforeAll`            | `before`     | Conventional naming                  |
| `afterAll`             | `after`      | Conventional naming                  |

## Type Definitions

```typescript
type TestFn = (...args: unknown[]) => void | Promise<void>;
type SuiteFn = (...args: unknown[]) => void | Promise<void>;

interface TestOptions {
  skip?: boolean | string;
  only?: boolean;
  todo?: boolean | string;
  timeout?: number;
  retries?: number;
}
```
