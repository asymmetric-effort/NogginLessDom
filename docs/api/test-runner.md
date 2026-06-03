# Test Runner API Reference

The test runner module wraps Node.js's built-in `node:test` module to provide a
comprehensive interface for organizing and running tests, including test
filtering, watch mode, pluggable reporters, test isolation, mock hoisting, and
dependency analysis.

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
  setTestNamePattern,
  setTestFilePattern,
  configureIsolation,
  setSerialMode,
  configureReporters,
} from '@asymmetric-effort/nogginlessdom';
```

## Test Suites

### `describe(name, fn)`

Define a test suite. Suites can be nested to create hierarchical test
structures. When serial mode is enabled (via `setSerialMode(true)`), suites
default to `concurrency: 1`.

```typescript
function describe(name: string, fn: SuiteFn): void;
```

| Parameter | Type | Description |
| --------- | ------------------------------- | --------------------------- |
| `name` | `string` | Name of the test suite |
| `fn` | `() => void \| Promise<void>` | Suite body containing tests |

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

### `describe.skip(name, fn)`

Skip an entire test suite. The suite and all its tests are registered but not
executed.

```typescript
function describe.skip(name: string, fn: SuiteFn): void;
```

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
function describe.only(name: string, fn: SuiteFn): void;
```

```typescript
describe.only('Focus on this suite', () => {
  it('runs this test', () => {});
});
```

### `describe.todo(name, fn?)`

Mark a suite as a TODO placeholder. The suite is registered but the body is
never executed.

```typescript
function describe.todo(name: string, fn?: SuiteFn): void;
```

```typescript
describe.todo('Future feature');
```

### `describe.concurrent(name, fn)`

Run all tests within this suite concurrently by setting `concurrency: true` on
the underlying `node:test` describe call.

```typescript
function describe.concurrent(name: string, fn: SuiteFn): void;
```

```typescript
describe.concurrent('Parallel tests', () => {
  it('test A', async () => { /* ... */ });
  it('test B', async () => { /* ... */ });
});
```

### `describe.serial(name, fn)`

Force all tests within this suite to run sequentially by setting
`concurrency: 1`. Useful inside a concurrent parent suite where specific tests
must not overlap.

```typescript
function describe.serial(name: string, fn: SuiteFn): void;
```

```typescript
describe.concurrent('mostly parallel', () => {
  it('fast A', async () => { /* ... */ });

  describe.serial('database tests', () => {
    it('insert row', async () => { /* ... */ });
    it('read row', async () => { /* ... */ });
  });
});
```

### `describe.shuffle(name, fn)`

Run the tests within this suite in a randomized order using a seeded
Fisher-Yates shuffle. The seed defaults to `Date.now()` and can be overridden
via the `SHUFFLE_SEED` environment variable for reproducibility.

```typescript
function describe.shuffle(name: string, fn: SuiteFn): void;
```

```typescript
describe.shuffle('Randomized order', () => {
  it('test A', () => { /* ... */ });
  it('test B', () => { /* ... */ });
  it('test C', () => { /* ... */ });
});
```

Set `SHUFFLE_SEED` for reproducible ordering:

```bash
SHUFFLE_SEED=12345 bun test
```

### `describe.skipIf(condition)(name, fn)`

Conditionally skip a suite. If `condition` is truthy, the suite is skipped.

```typescript
function describe.skipIf(condition: unknown): (name: string, fn: SuiteFn) => void;
```

```typescript
describe.skipIf(process.platform === 'win32')('Unix-only tests', () => {
  it('uses /tmp', () => { /* ... */ });
});
```

### `describe.runIf(condition)(name, fn)`

Conditionally run a suite. If `condition` is truthy, the suite runs; otherwise
it is skipped.

```typescript
function describe.runIf(condition: unknown): (name: string, fn: SuiteFn) => void;
```

```typescript
describe.runIf(process.env.CI)('CI-only tests', () => {
  it('checks deployment', () => { /* ... */ });
});
```

### `describe.each(table)(name, fn)`

Generate a test suite for each entry in a data table. Supports printf-style
formatting (`%s`, `%d`, `%i`, `%f`, `%j`, `%o`, `%%`) and `$variable` syntax
for object entries.

```typescript
function describe.each(table: unknown[]): (
  name: string,
  fn: (...args: unknown[]) => void | Promise<void>,
) => void;
```

```typescript
describe.each([
  { input: 'hello', expected: 5 },
  { input: 'world', expected: 5 },
])('length of "$input"', ({ input, expected }) => {
  it(`should be ${expected}`, () => {
    expect(input.length).toBe(expected);
  });
});

// With array entries and printf formatting
describe.each([
  ['GET', 200],
  ['POST', 201],
])('HTTP %s returns %d', (method, status) => {
  it('responds correctly', async () => {
    const res = await request(method);
    expect(res.status).toBe(status);
  });
});
```

## Tests

### `it(name, fn, options?)` / `test(name, fn, options?)`

Define an individual test case. `test` is an alias for `it`.

```typescript
function it(name: string, fn: TestFn, options?: TestOptions): void;
function test(name: string, fn: TestFn, options?: TestOptions): void;
```

**TestOptions:**

| Option | Type | Description |
| --------- | --------------------- | -------------------------------------------------- |
| `skip` | `boolean \| string` | Skip this test. A string value is used as reason. |
| `only` | `boolean` | Run only this test (and others marked `only`). |
| `todo` | `boolean \| string` | Mark as TODO. Registered but not executed. |
| `timeout` | `number` | Maximum time in milliseconds before test fails. |
| `retries` | `number` | Number of additional retry attempts on failure. |

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

// With options
it('should handle edge case', () => {
  // ...
}, { skip: 'Not implemented yet' });

it('should complete quickly', async () => {
  await longRunningOperation();
}, { timeout: 5000 });
```

When a test name pattern is active (see Test Filtering below), tests whose full
name does not match the pattern are automatically skipped with the reason
`"filtered by test name pattern"`.

### `it.skip(name, fn?)`

Skip a test. The test is registered but not executed.

```typescript
function it.skip(name: string, fn?: TestFn): void;
```

```typescript
it.skip('not ready yet', () => {
  // not executed
});
```

### `it.only(name, fn)`

Run only this test (and others marked `only`). When a name pattern is active,
the pattern and `.only` are intersected: the test must match both.

```typescript
function it.only(name: string, fn: TestFn): void;
```

```typescript
it.only('debug this test', () => {
  expect(true).toBe(true);
});
```

### `it.todo(name, fn?)`

Mark a test as a TODO placeholder. The test body is never executed.

```typescript
function it.todo(name: string, fn?: TestFn): void;
```

```typescript
it.todo('implement error handling');
```

### `it.concurrent(name, fn, options?)`

Run this test concurrently with other concurrent tests. The test function is
automatically wrapped with isolation cleanup (see Test Isolation).

```typescript
function it.concurrent(name: string, fn: TestFn, options?: TestOptions): void;
```

```typescript
it.concurrent('async operation A', async () => {
  const result = await operationA();
  expect(result).toBeDefined();
});
```

### `it.each(table)(name, fn)`

Generate a test for each entry in a data table. Supports printf-style
formatting (`%s`, `%d`, `%i`, `%f`, `%j`, `%o`, `%%`) and `$variable` syntax
for object entries.

```typescript
function it.each(table: unknown[]): (
  name: string,
  fn: (...args: unknown[]) => void | Promise<void>,
) => void;
```

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

### `it.skipIf(condition)(name, fn)`

Conditionally skip a test based on a runtime condition.

```typescript
function it.skipIf(condition: unknown): (name: string, fn: TestFn) => void;
```

```typescript
it.skipIf(!process.env.API_KEY)('requires API key', () => {
  // only runs when API_KEY is set
});
```

### `it.runIf(condition)(name, fn)`

Conditionally run a test based on a runtime condition.

```typescript
function it.runIf(condition: unknown): (name: string, fn: TestFn) => void;
```

```typescript
it.runIf(process.env.CI)('CI-only test', () => {
  // only runs in CI
});
```

### `it.fails(name, fn)`

Assert that a test is expected to fail. The test passes if the test function
throws, and fails if the function completes without throwing.

```typescript
function it.fails(name: string, fn: TestFn): void;
```

```typescript
it.fails('known broken behavior', () => {
  expect(brokenFunction()).toBe('correct');
});
```

### `it.retry(n)(name, fn)`

Retry a test up to `n` additional times on failure. The test only fails after
all retries are exhausted.

```typescript
function it.retry(n: number): (name: string, fn: TestFn) => void;
```

```typescript
it.retry(3)('flaky network test', async () => {
  const response = await fetch('https://api.example.com/data');
  expect(response.ok).toBe(true);
});
```

### `it.shuffle`

Alias for `it`. Shuffling a single test is a no-op. Use `describe.shuffle` to
randomize test ordering within a suite.

## Lifecycle Hooks

### `beforeEach(fn)`

Register a function to run before each test in the current suite.

```typescript
function beforeEach(fn: TestFn): void;
```

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

### `afterEach(fn)`

Register a function to run after each test in the current suite.

```typescript
function afterEach(fn: TestFn): void;
```

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

### `beforeAll(fn)`

Register a function to run once before all tests in the current suite.
Delegates to `node:test`'s `before()`.

```typescript
function beforeAll(fn: TestFn): void;
```

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

### `afterAll(fn)`

Register a function to run once after all tests in the current suite. Delegates
to `node:test`'s `after()`.

```typescript
function afterAll(fn: TestFn): void;
```

### `onTestFailed(callback)`

Register a callback invoked when a test fails. The callback receives a context
object with the test name and the error that caused the failure.

```typescript
function onTestFailed(callback: (context: TestFailedContext) => void): void;

interface TestFailedContext {
  name: string;
  error: unknown;
}
```

```typescript
onTestFailed(({ name, error }) => {
  console.log(`Test "${name}" failed:`, error);
});
```

### `onTestFinished(callback)`

Register a callback invoked when a test finishes (pass or fail). The callback
receives a context object with the test name and whether it passed.

```typescript
function onTestFinished(callback: (context: TestFinishedContext) => void): void;

interface TestFinishedContext {
  name: string;
  passed: boolean;
}
```

```typescript
onTestFinished(({ name, passed }) => {
  console.log(`Test "${name}" ${passed ? 'passed' : 'failed'}`);
});
```

### `clearLifecycleHooks()`

Clear all registered `onTestFailed` and `onTestFinished` callbacks. Useful for
test isolation between suites.

```typescript
function clearLifecycleHooks(): void;
```

### `installAutoMockCleanup()`

Install an `afterEach` hook that automatically restores all mocks after each
test. Call once at the top of a suite where automatic mock cleanup is desired.

```typescript
function installAutoMockCleanup(): void;
```

```typescript
describe('with auto cleanup', () => {
  installAutoMockCleanup();

  it('mocks are restored automatically', () => {
    const spy = spyOn(console, 'log');
    console.log('test');
    expect(spy).toHaveBeenCalled();
    // spy is restored after this test completes
  });
});
```

## Test Filtering

Filter which tests run by name pattern or file pattern. Patterns can be set
programmatically or via environment variables.

### `setTestNamePattern(pattern, options?)`

Set a test name filter. Tests whose full name (describe names joined with
` > ` plus the test name) does not match the pattern are automatically skipped.

```typescript
function setTestNamePattern(
  pattern: string | RegExp,
  options?: { invert?: boolean },
): void;
```

| Parameter | Type | Description |
| ----------------- | ---------------------- | -------------------------------------------- |
| `pattern` | `string \| RegExp` | Pattern to match against full test names |
| `options.invert` | `boolean` | If `true`, skip tests that match the pattern |

```typescript
// Run only tests containing "auth"
setTestNamePattern('auth');

// Run only tests matching a regex
setTestNamePattern(/UserService > create/);

// Run all tests EXCEPT those matching the pattern
setTestNamePattern('slow', { invert: true });
```

Full test names are built from the nested describe stack joined with ` > `:

```text
UserService > create > should create a user with valid data
```

**Environment variable:** Set `TEST_NAME_PATTERN` to apply a name pattern
automatically on module load.

```bash
TEST_NAME_PATTERN="auth" bun test
```

### `clearTestNamePattern()`

Remove the active test name filter.

```typescript
function clearTestNamePattern(): void;
```

### `getTestNamePattern()`

Return the current name filter state.

```typescript
function getTestNamePattern(): { pattern: RegExp | null; invert: boolean };
```

### `setTestFilePattern(glob)`

Set a file glob pattern. Test files whose paths do not match are skipped
entirely.

```typescript
function setTestFilePattern(glob: string): void;
```

```typescript
setTestFilePattern('src/**/*.test.ts');
```

**Environment variable:** Set `TEST_FILE_PATTERN` to apply a file pattern
automatically on module load.

```bash
TEST_FILE_PATTERN="src/auth/**" bun test
```

### `clearTestFilePattern()`

Remove the active file pattern filter.

```typescript
function clearTestFilePattern(): void;
```

### `getTestFilePattern()`

Return the current file glob pattern, or `null` if none is set.

```typescript
function getTestFilePattern(): string | null;
```

## Watch Mode

Watch mode monitors source and test files for changes and re-runs affected
tests automatically.

### `watchTests(testRunner, options?)`

Start watching for file changes and re-run affected test files.

```typescript
function watchTests(
  testRunner: (files: string[]) => Promise<void>,
  options?: WatchOptions,
): WatchController;
```

**WatchOptions:**

| Option | Type | Default |
| -------------- | ---------- | ------------------------------ |
| `watchInclude` | `string[]` | `['src/**', 'tests/**']` |
| `watchExclude` | `string[]` | `['node_modules', '.git', 'build']` |
| `debounceMs` | `number` | `300` |
| `cwd` | `string` | `process.cwd()` |

```typescript
const controller = watchTests(
  async (files) => {
    console.log('Running tests:', files);
    // execute tests for the given files
  },
  {
    watchInclude: ['src/**', 'tests/**'],
    watchExclude: ['node_modules', '.git', 'build', 'coverage'],
    debounceMs: 500,
  },
);

// Later: stop watching
controller.stop();
```

When a source file changes, the watch system rebuilds the import graph and
identifies which test files depend on the changed file. Only those test files
are re-run. If a test file itself changes, it is re-run directly. If a changed
source file has no known test dependents, all test files are re-run.

### WatchController

The object returned by `watchTests`.

```typescript
interface WatchController {
  stop(): void;
  runAll(): void;
  runFailed(): void;
  getWatchedFiles(): string[];
}
```

| Method | Description |
| ------------------- | --------------------------------------------------- |
| `stop()` | Stop all file watchers and cancel pending runs |
| `runAll()` | Re-run all discovered test files |
| `runFailed()` | Re-run only previously failed test files |
| `getWatchedFiles()` | Return the list of all currently watched file paths |

```typescript
// Re-run all tests on demand
controller.runAll();

// Re-run only failed tests
controller.runFailed();

// Inspect watched files
console.log(controller.getWatchedFiles());
```

### Utility Functions

#### `matchGlob(filePath, pattern)`

Match a file path against a glob pattern. Supports `*` (single segment) and
`**` (any depth).

```typescript
function matchGlob(filePath: string, pattern: string): boolean;
```

#### `filterPaths(paths, include, exclude)`

Filter an array of paths by include and exclude glob patterns.

```typescript
function filterPaths(
  paths: string[],
  include: string[],
  exclude: string[],
): string[];
```

#### `buildImportGraph(files)`

Build a reverse dependency map from a set of file paths. Each key is a resolved
import target; each value is the set of files that import it.

```typescript
function buildImportGraph(files: string[]): Map<string, Set<string>>;
```

## Reporters

The reporter system provides pluggable output formatting for test results.

### TestReporter Interface

All reporters implement this interface. Every method is optional.

```typescript
interface TestReporter {
  onSuiteStart?(event: TestEvent): void;
  onSuiteEnd?(event: TestEvent): void;
  onTestStart?(event: TestEvent): void;
  onTestPass?(event: TestEvent): void;
  onTestFail?(event: TestEvent): void;
  onTestSkip?(event: TestEvent): void;
  onTestTodo?(event: TestEvent): void;
  onRunStart?(info: { files: string[]; totalTests: number }): void;
  onRunEnd?(summary: RunSummary): void;
}

interface TestEvent {
  name: string;
  suite?: string;
  file?: string;
  duration?: number;
  error?: Error;
  reason?: string;
}

interface RunSummary {
  passed: number;
  failed: number;
  skipped: number;
  todo: number;
  duration: number;
}
```

### Built-in Reporters

Five built-in reporters are available by name:

| Name | Class | Description |
| ----------- | ------------------ | ----------------------------------------------------- |
| `default` | `DefaultReporter` | Compact PASS/FAIL output with summary |
| `verbose` | `VerboseReporter` | Full test names with checkmarks, durations, and suite headers |
| `dot` | `DotReporter` | Single character per test: `.` pass, `F` fail, `s` skip, `t` todo |
| `json` | `JsonReporter` | NDJSON output (one JSON object per event) |
| `silent` | `SilentReporter` | No output at all |

All reporters except `SilentReporter` accept `ReporterOptions`:

```typescript
interface ReporterOptions {
  outputFile?: string;   // Write output to a file instead of stdout
  colors?: boolean;      // Force color on/off (defaults to TTY detection)
}
```

```typescript
import { VerboseReporter } from '@asymmetric-effort/nogginlessdom';

const reporter = new VerboseReporter({ outputFile: 'test-results.txt' });
```

### `configureReporters(config)`

Configure the global reporter manager. Replaces any previously configured
reporters.

```typescript
function configureReporters(config: {
  reporter?: string | TestReporter;
  reporters?: Array<string | TestReporter>;
  outputFile?: string;
}): void;
```

Use `reporter` for a single reporter, or `reporters` for multiple. When
`outputFile` is specified, it is passed to each built-in reporter created by
name.

```typescript
// Single reporter by name
configureReporters({ reporter: 'verbose' });

// Multiple reporters (multi-reporter)
configureReporters({
  reporters: ['default', new JsonReporter({ outputFile: 'results.ndjson' })],
});

// With output file
configureReporters({ reporter: 'json', outputFile: 'results.json' });
```

### ReporterManager

The `ReporterManager` class manages a collection of reporters and dispatches
events to all of them.

```typescript
class ReporterManager {
  addReporter(reporter: TestReporter | string): void;
  removeReporter(reporter: TestReporter): void;
  notify(event: string, data: unknown): void;
  getReporters(): TestReporter[];
  static create(name: string, options?: ReporterOptions): TestReporter;
}
```

```typescript
import { ReporterManager } from '@asymmetric-effort/nogginlessdom';

const manager = new ReporterManager();
manager.addReporter('verbose');
manager.addReporter(new JsonReporter({ outputFile: 'log.json' }));

// Dispatch an event to all reporters
manager.notify('onTestPass', { name: 'my test', duration: 42 });
```

Errors thrown by individual reporters are swallowed so a broken reporter never
crashes the test run.

### `getReporterManager()`

Get the global singleton `ReporterManager`. Creates one with a
`DefaultReporter` if none exists yet.

```typescript
function getReporterManager(): ReporterManager;
```

### `resetReporterManager()`

Reset the global reporter manager to `undefined`, so the next call to
`getReporterManager()` creates a fresh instance.

```typescript
function resetReporterManager(): void;
```

## Test Isolation

Configure how concurrent tests are isolated from each other.

### `configureIsolation(config)`

Set the isolation mode for concurrent tests.

```typescript
function configureIsolation(config: IsolationConfig): void;

interface IsolationConfig {
  isolate?: boolean;                      // default: true for concurrent, false for sequential
  isolation?: 'full' | 'mocks' | 'none'; // default: 'full'
}
```

**Isolation modes:**

| Mode | Behavior |
| ------- | ---------------------------------------------------- |
| `full` | Restore all mocks, use real timers, unstub all globals |
| `mocks` | Restore all mocks only |
| `none` | No automatic cleanup |

By default, concurrent tests (`it.concurrent`) run with `full` isolation.
Sequential tests run without isolation. Use `configureIsolation` to override
these defaults.

```typescript
// Only restore mocks, keep fake timers
configureIsolation({ isolation: 'mocks' });

// Disable all automatic cleanup
configureIsolation({ isolation: 'none' });

// Force isolation even for sequential tests
configureIsolation({ isolate: true, isolation: 'full' });
```

### `getIsolationConfig()`

Return the current isolation configuration.

```typescript
function getIsolationConfig(): IsolationConfig;
```

## Serial Execution

### `setSerialMode(serial)`

Enable or disable global serial mode. When enabled, all `describe()` calls
automatically use `concurrency: 1`.

```typescript
function setSerialMode(serial: boolean): void;
```

```typescript
// Force all suites to run sequentially
setSerialMode(true);

describe('Suite A', () => {
  it('test 1', () => { /* ... */ });
  it('test 2', () => { /* ... */ });
});
```

### `getSerialMode()`

Return the current serial mode setting.

```typescript
function getSerialMode(): boolean;
```

### `describe.serial(name, fn)`

Force a single suite to run sequentially regardless of the global mode.
See the Test Suites section above.

## Mock Hoisting

Mock hoisting reorders `mock.module()`, `mock.modulePartial()`, `vi.mock()`,
and `vi.hoisted()` calls so they appear before all import declarations in test
files. This is necessary for ESM because import bindings are evaluated before
any module-level statements execute.

### `hoistMocks(source, filename?)`

Transform test source code to hoist mock calls above import declarations.

```typescript
function hoistMocks(
  source: string,
  filename?: string,
): { code: string; hoisted: boolean };
```

| Parameter | Type | Description |
| ---------- | -------- | ------------------------------------------ |
| `source` | `string` | The original test file source code |
| `filename` | `string` | File path (reserved for source-map support) |

Returns `{ code, hoisted }` where `code` is the transformed source and
`hoisted` is `true` if any calls were moved.

```typescript
import { hoistMocks } from '@asymmetric-effort/nogginlessdom';

const result = hoistMocks(`
import { myModule } from './my-module';
mock.module('./my-module', () => ({ myModule: () => 42 }));
`);

// result.code has mock.module() before the import
// result.hoisted === true
```

The implementation is regex-based (no AST parser) to preserve the project's
zero-dependency constraint. It correctly handles:

- Multi-line mock calls with balanced parentheses
- String literals and template literals inside mock calls
- Only top-level calls (brace depth 0) are hoisted
- Optional `const x = vi.hoisted(...)` assignments

### `registerHoistPlugin(options?)`

Register a Bun loader plugin that transparently hoists mock calls above imports
in test files during module loading.

```typescript
function registerHoistPlugin(options?: { filter?: RegExp }): void;
```

| Parameter | Type | Default |
| ---------------- | -------- | ---------------------------------------- |
| `options.filter` | `RegExp` | `/\.(test\|spec)\.(ts\|tsx\|js\|jsx)$/` |

```typescript
import { registerHoistPlugin } from '@asymmetric-effort/nogginlessdom';

registerHoistPlugin();
```

Or configure in `bunfig.toml`:

```toml
preload = ["@asymmetric-effort/nogginlessdom/hoist"]
```

## Dependency Analysis

### Circular Dependencies

Detect circular import chains in your codebase using DFS-based back-edge
detection.

#### `detectCircularImports(entryFiles, options?)`

Find circular import chains starting from the given entry files.

```typescript
function detectCircularImports(
  entryFiles: string[],
  options?: {
    cwd?: string;
    exclude?: string[];
    maxCycles?: number;
  },
): CircularDependency[];
```

| Parameter | Type | Default |
| ------------------- | ---------- | ---------------- |
| `entryFiles` | `string[]` | (required) |
| `options.cwd` | `string` | `process.cwd()` |
| `options.exclude` | `string[]` | `[]` |
| `options.maxCycles` | `number` | `50` |

```typescript
interface CircularDependency {
  cycle: string[];       // File paths forming the cycle (last === first)
  files: Set<string>;    // Set of all files in the cycle
}
```

```typescript
import { detectCircularImports } from '@asymmetric-effort/nogginlessdom';

const cycles = detectCircularImports(['src/index.ts'], {
  exclude: ['node_modules'],
  maxCycles: 10,
});

for (const { cycle } of cycles) {
  console.log('Cycle:', cycle.join(' -> '));
}
```

Cycles are deduplicated and normalized to start with the lexicographically
smallest file path.

#### `formatCycleReport(cycles)`

Format detected cycles as a human-readable report with arrow-separated paths.

```typescript
function formatCycleReport(cycles: CircularDependency[]): string;
```

```typescript
const report = formatCycleReport(cycles);
console.log(report);
// Found 2 circular dependencies:
//
// src/a.ts -> src/b.ts -> src/a.ts
// src/c.ts -> src/d.ts -> src/e.ts -> src/c.ts
```

#### `configureCycleDetection(config)`

Enable cycle detection during test runs.

```typescript
function configureCycleDetection(config: CycleDetectionConfig): void;

interface CycleDetectionConfig {
  enabled?: boolean;     // Enable detection
  strict?: boolean;      // true = fail test run; false = warn only
  exclude?: string[];    // Glob patterns to skip
  maxCycles?: number;    // Stop after N cycles (default: 50)
}
```

```typescript
configureCycleDetection({
  enabled: true,
  strict: true,
  exclude: ['node_modules', 'build'],
  maxCycles: 20,
});
```

**Environment variable:** Set `DETECT_CYCLES=1` or `DETECT_CYCLES=true` to
enable cycle detection when `enabled` is not explicitly set.

```bash
DETECT_CYCLES=1 bun test
```

#### `buildForwardGraph(entryFiles, options?)`

Build a forward dependency graph (file to the set of files it imports). Only
relative imports are included; bare specifiers and `node:` built-ins are
skipped.

```typescript
function buildForwardGraph(
  entryFiles: string[],
  options?: { cwd?: string; exclude?: string[] },
): Map<string, Set<string>>;
```

### Import Depth

Analyze the longest import chain depth for each file in the dependency tree.

#### `analyzeImportDepth(entryFiles, options?)`

Calculate import depth metrics for a set of entry files.

```typescript
function analyzeImportDepth(
  entryFiles: string[],
  options?: {
    cwd?: string;
    exclude?: string[];
    threshold?: number;
  },
): DepthAnalysisResult;
```

```typescript
interface DepthAnalysis {
  file: string;
  depth: number;
  longestChain: string[];
  directImports: number;
  transitiveImports: number;
}

interface DepthAnalysisResult {
  entries: DepthAnalysis[];
  maxDepth: number;
  averageDepth: number;
  filesExceedingThreshold: DepthAnalysis[];
}
```

```typescript
import { analyzeImportDepth } from '@asymmetric-effort/nogginlessdom';

const result = analyzeImportDepth(['src/index.ts'], {
  threshold: 8,
});

console.log('Max depth:', result.maxDepth);
console.log('Average depth:', result.averageDepth);

for (const entry of result.filesExceedingThreshold) {
  console.log(`${entry.file}: depth ${entry.depth}`);
  console.log('  Chain:', entry.longestChain.join(' -> '));
}
```

#### `configureDepthCheck(config)`

Enable import depth checking during test runs.

```typescript
function configureDepthCheck(config: DepthCheckConfig): void;

interface DepthCheckConfig {
  enabled?: boolean;      // Enable depth checking
  threshold?: number;     // Max allowed depth (default: 10)
  strict?: boolean;       // true = fail test run; false = warn only
}
```

```typescript
configureDepthCheck({
  enabled: true,
  threshold: 8,
  strict: true,
});
```

**Environment variable:** Set `IMPORT_DEPTH_THRESHOLD` to a number to both
enable depth checking and set the threshold.

```bash
IMPORT_DEPTH_THRESHOLD=8 bun test
```

### Unused Imports

Detect imported symbols that are never referenced in the file body.

#### `detectUnusedImports(files, options?)`

Scan files for imports whose symbols are never used.

```typescript
function detectUnusedImports(
  files: string[],
  options?: {
    cwd?: string;
    exclude?: string[];
    ignoreTypeImports?: boolean;
    ignoreSideEffectImports?: boolean;
  },
): UnusedImport[];
```

| Parameter | Type | Default |
| -------------------------------- | ---------- | ---------------- |
| `files` | `string[]` | (required) |
| `options.cwd` | `string` | `process.cwd()` |
| `options.exclude` | `string[]` | config default |
| `options.ignoreTypeImports` | `boolean` | `true` |
| `options.ignoreSideEffectImports` | `boolean` | `true` |

```typescript
interface UnusedImport {
  file: string;
  importSource: string;
  importedSymbols: string[];
  line: number;
  isNamespaceImport: boolean;
  isTypeOnly: boolean;
}
```

```typescript
import { detectUnusedImports } from '@asymmetric-effort/nogginlessdom';

const unused = detectUnusedImports(['src/index.ts', 'src/utils.ts']);

for (const entry of unused) {
  console.log(`${entry.file}:${entry.line} - unused: ${entry.importedSymbols.join(', ')}`);
}
```

The detector handles named imports, default imports, namespace imports
(`* as ns`), aliased imports (`a as b`), and correctly ignores re-exported
symbols. Single-line comments are stripped before checking usage.

**Environment variable:** Set `DETECT_UNUSED_IMPORTS=0` or
`DETECT_UNUSED_IMPORTS=false` to disable detection.

#### `formatUnusedImportReport(unused)`

Format unused imports as a human-readable report.

```typescript
function formatUnusedImportReport(unused: UnusedImport[]): string;
```

```typescript
const report = formatUnusedImportReport(unused);
console.log(report);
```

#### `configureUnusedImportDetection(config)`

Configure unused import detection settings.

```typescript
function configureUnusedImportDetection(config: UnusedImportConfig): void;

interface UnusedImportConfig {
  enabled?: boolean;                // Enable detection (default: true)
  strict?: boolean;                 // true = fail; false = warn
  ignoreTypeImports?: boolean;      // Skip `import type` (default: true)
  ignoreSideEffectImports?: boolean; // Skip `import './setup'` (default: true)
  exclude?: string[];               // Patterns to skip
}
```

```typescript
configureUnusedImportDetection({
  enabled: true,
  strict: false,
  ignoreTypeImports: true,
  exclude: ['generated/'],
});
```

### Graph Visualization

Build and export full dependency graphs in multiple formats.

#### `buildDependencyGraph(entryFiles, options?)`

Build a complete dependency graph from entry points, including nodes, edges,
depth analysis, cycle detection, and summary statistics.

```typescript
function buildDependencyGraph(
  entryFiles: string[],
  options?: {
    cwd?: string;
    exclude?: string[];
    includeMetadata?: boolean;
    relativePaths?: boolean;
  },
): DependencyGraph;
```

| Parameter | Type | Default |
| ----------------------- | ---------- | ---------------- |
| `entryFiles` | `string[]` | (required) |
| `options.cwd` | `string` | `process.cwd()` |
| `options.exclude` | `string[]` | `[]` |
| `options.includeMetadata` | `boolean` | `false` |
| `options.relativePaths` | `boolean` | `true` |

When `includeMetadata` is `true`, each node includes lines of code and export
count.

```typescript
interface DependencyGraph {
  version: 1;
  generated: string;
  root: string;
  entryPoints: string[];
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  summary: {
    totalFiles: number;
    totalEdges: number;
    maxDepth: number;
    averageImports: number;
    cycleCount: number;
    leafCount: number;
    hubFiles: string[];    // Top 5 most-imported files
  };
}

interface DependencyNode {
  id: string;
  imports: string[];
  importedBy: string[];
  depth: number;
  directImportCount: number;
  transitiveImportCount: number;
  isEntryPoint: boolean;
  isLeaf: boolean;
  inCycle: boolean;
  metadata?: { loc?: number; exportCount?: number };
}

interface DependencyEdge {
  from: string;
  to: string;
  type: 'static' | 'dynamic';
  symbols?: string[];
}
```

```typescript
import { buildDependencyGraph } from '@asymmetric-effort/nogginlessdom';

const graph = buildDependencyGraph(['src/index.ts'], {
  includeMetadata: true,
  exclude: ['node_modules'],
});

console.log('Total files:', graph.summary.totalFiles);
console.log('Max depth:', graph.summary.maxDepth);
console.log('Cycles:', graph.summary.cycleCount);
console.log('Hub files:', graph.summary.hubFiles);
```

**Environment variable:** Set `EXPORT_DEPENDENCY_GRAPH=0` or
`EXPORT_DEPENDENCY_GRAPH=false` to return an empty graph.

#### `exportGraphJSON(graph, pretty?)`

Serialize a `DependencyGraph` to a JSON string.

```typescript
function exportGraphJSON(graph: DependencyGraph, pretty?: boolean): string;
```

```typescript
const json = exportGraphJSON(graph, true);
fs.writeFileSync('deps.json', json);
```

#### `exportGraphDOT(graph)`

Convert a `DependencyGraph` to Graphviz DOT format.

```typescript
function exportGraphDOT(graph: DependencyGraph): string;
```

```typescript
const dot = exportGraphDOT(graph);
// digraph dependencies {
//   rankdir=LR;
//   "src/a.ts" -> "src/b.ts";
//   ...
// }
```

#### `exportGraphMermaid(graph)`

Convert a `DependencyGraph` to Mermaid flowchart format.

```typescript
function exportGraphMermaid(graph: DependencyGraph): string;
```

```typescript
const mermaid = exportGraphMermaid(graph);
// graph LR
//   src_a.ts["src/a.ts"] --> src_b.ts["src/b.ts"]
//   ...
```

#### `saveGraph(entryFiles, outputPath, options?)`

Build a dependency graph and write it to disk. The output format is
auto-detected from the file extension (`.json`, `.dot`, `.mmd`/`.mermaid`) or
can be specified explicitly.

```typescript
function saveGraph(
  entryFiles: string[],
  outputPath: string,
  options?: {
    format?: 'json' | 'dot' | 'mermaid';
    pretty?: boolean;
    cwd?: string;
    exclude?: string[];
  },
): void;
```

```typescript
import { saveGraph } from '@asymmetric-effort/nogginlessdom';

// Auto-detect format from extension
saveGraph(['src/index.ts'], 'deps.json', { pretty: true });
saveGraph(['src/index.ts'], 'deps.dot');
saveGraph(['src/index.ts'], 'deps.mmd');

// Explicit format
saveGraph(['src/index.ts'], 'output.txt', { format: 'mermaid' });
```

The output directory is created recursively if it does not exist.

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

## Mapping to node:test

| NogginLessDom | node:test | Notes |
| ---------------------- | ------------ | ------------------------------------- |
| `describe` | `describe` | Direct delegation |
| `describe.skip` | `describe` | With `{ skip: true }` option |
| `describe.only` | `describe` | With `{ only: true }` option |
| `describe.todo` | `describe` | With `{ todo: true }` option |
| `describe.concurrent` | `describe` | With `{ concurrency: true }` option |
| `describe.serial` | `describe` | With `{ concurrency: 1 }` option |
| `it` | `it` | Options object mapped |
| `test` | `it` | Alias for `it` |
| `it.skip` | `it` | With `{ skip: true }` option |
| `it.only` | `it` | With `{ only: true }` option |
| `it.todo` | `it` | With `{ todo: true }` option |
| `it.concurrent` | `it` | With `{ concurrency: true }` option |
| `it.fails` | `it` | Wrapped to invert pass/fail |
| `it.retry` | `it` | Wrapped with retry loop |
| `beforeEach` | `beforeEach` | Direct delegation |
| `afterEach` | `afterEach` | Direct delegation |
| `beforeAll` | `before` | Conventional naming |
| `afterAll` | `after` | Conventional naming |
