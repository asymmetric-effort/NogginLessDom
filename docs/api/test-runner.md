# Test Runner API Reference

The test runner module wraps Node.js's built-in `node:test` module to provide a
familiar interface for organizing and running tests.

```typescript
import {
  describe,
  it,
  test,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
} from '@asymmetric-effort/nogginlessdom';
```

## Functions

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

### `beforeEach(fn)`

Register a function to run before each test in the current suite. Use this for
setup that must be fresh for every test (resetting state, creating fixtures,
etc.).

**Parameters:**

| Parameter | Type                            | Description      |
| --------- | ------------------------------- | ---------------- |
| `fn`      | `() => void \| Promise<void>`   | Setup function   |

**Example:**

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

**Parameters:**

| Parameter | Type                            | Description       |
| --------- | ------------------------------- | ----------------- |
| `fn`      | `() => void \| Promise<void>`   | Teardown function |

**Example:**

```typescript
describe('FileWriter', () => {
  afterEach(() => {
    // Clean up any files created during the test
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
for expensive setup that can be shared across tests (starting servers, loading
large datasets).

**Parameters:**

| Parameter | Type                            | Description             |
| --------- | ------------------------------- | ----------------------- |
| `fn`      | `() => void \| Promise<void>`   | One-time setup function |

**Example:**

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

**Parameters:**

| Parameter | Type                            | Description                |
| --------- | ------------------------------- | -------------------------- |
| `fn`      | `() => void \| Promise<void>`   | One-time teardown function |

**How it works:** Delegates to `node:test`'s `after()`.

## Mapping to node:test

| NogginLessDom   | node:test        | Notes                          |
| --------------- | ---------------- | ------------------------------ |
| `describe`      | `describe`       | Direct delegation              |
| `it`            | `it`             | Options object mapped          |
| `test`          | `it`             | Alias for `it`                 |
| `beforeEach`    | `beforeEach`     | Direct delegation              |
| `afterEach`     | `afterEach`      | Direct delegation              |
| `beforeAll`     | `before`         | Conventional naming            |
| `afterAll`      | `after`          | Conventional naming            |

## Type Definitions

```typescript
type TestFn = () => void | Promise<void>;
type SuiteFn = () => void | Promise<void>;

interface TestOptions {
  skip?: boolean | string;
  only?: boolean;
  todo?: boolean | string;
  timeout?: number;
}
```
