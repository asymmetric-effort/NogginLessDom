# Migration from Vitest

This guide walks you through migrating an existing vitest test suite to
NogginLessDom. The APIs are intentionally compatible, so migration is primarily
about changing imports and adjusting configuration.

## Overview

NogginLessDom provides the same core testing API as vitest (`describe`, `it`,
`expect`, `fn`, `spyOn`) but built on Node.js built-ins (`node:test`,
`node:assert`) instead of third-party dependencies. The goal is API
compatibility -- not implementation compatibility. Your tests should work the
same way, but the underlying engine is different.

## Step-by-Step Migration

### Step 1: Install NogginLessDom

```bash
bun add -d @asymmetric-effort/nogginlessdom
```

### Step 2: Update Imports

Replace vitest imports with NogginLessDom imports. This is the primary change
in most migrations.

**Before (vitest):**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
```

**After (NogginLessDom):**

```typescript
import {
  describe,
  it,
  expect,
  fn,
  spyOn,
  beforeEach,
  afterEach,
} from '@asymmetric-effort/nogginlessdom';
```

### Step 3: Replace `vi` Utilities

Vitest bundles mocking utilities under the `vi` namespace. NogginLessDom exports
them as top-level functions.

| Vitest                        | NogginLessDom                      |
| ----------------------------- | ---------------------------------- |
| `vi.fn()`                     | `fn()`                             |
| `vi.fn(impl)`                 | `fn(impl)`                         |
| `vi.spyOn(obj, method)`       | `spyOn(obj, method)`               |
| `vi.useFakeTimers()`          | `useFakeTimers()`                  |
| `vi.useRealTimers()`          | `useRealTimers()`                  |
| `vi.advanceTimersByTime(ms)`  | `advanceTimersByTime(ms)`          |
| `vi.runAllTimers()`           | `runAllTimers()`                   |

**Before:**

```typescript
const mockFn = vi.fn();
vi.spyOn(console, 'log');
vi.useFakeTimers();
vi.advanceTimersByTime(1000);
vi.useRealTimers();
```

**After:**

```typescript
const mockFn = fn();
spyOn(console, 'log');
useFakeTimers();
advanceTimersByTime(1000);
useRealTimers();
```

### Step 4: Update Configuration

Replace vitest configuration with Bun test configuration.

**Before (`vitest.config.ts`):**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      thresholds: {
        lines: 98,
        functions: 98,
        statements: 98,
      },
    },
    environment: 'jsdom',
    globals: false,
    include: ['tests/**/*.test.ts'],
  },
});
```

**After (`bunfig.toml`):**

```toml
[test]
coverage = true
coverageThreshold = { line = 98, function = 98, statement = 98 }
```

The `environment: 'jsdom'` setting is not needed because NogginLessDom includes
its own DOM simulation. Import `Document` directly instead.

### Step 5: Replace jsdom Environment with Explicit Document

If your vitest config used `environment: 'jsdom'` to provide a global
`document`, you need to create documents explicitly in NogginLessDom.

**Before (vitest with jsdom environment):**

```typescript
it('should find an element', () => {
  document.body.innerHTML = '<div id="app">Hello</div>';
  const el = document.getElementById('app');
  expect(el?.textContent).toBe('Hello');
});
```

**After (NogginLessDom):**

```typescript
import { Document } from '@asymmetric-effort/nogginlessdom';

it('should find an element', () => {
  const doc = new Document();
  const div = doc.createElement('div');
  div.id = 'app';
  div.textContent = 'Hello';
  doc.appendChild(div);

  const el = doc.getElementById('app');
  expect(el?.textContent).toBe('Hello');
});
```

### Step 6: Remove vitest

Once all tests are migrated and passing:

```bash
bun remove vitest @vitest/coverage-v8
```

Remove `vitest.config.ts` or `vitest.config.js` if it exists.

### Step 7: Update Scripts

**Before (`package.json`):**

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

**After (`package.json`):**

```json
{
  "scripts": {
    "test": "bun test"
  }
}
```

## API Comparison Table

| Feature                     | Vitest               | NogginLessDom            | Status       |
| --------------------------- | -------------------- | ------------------------ | ------------ |
| `describe(name, fn)`        | `describe`           | `describe`               | Compatible   |
| `it(name, fn)`              | `it`                 | `it`                     | Compatible   |
| `test(name, fn)`            | `test`               | `test`                   | Compatible   |
| `expect(value)`             | `expect`             | `expect`                 | Compatible   |
| `.toBe()`                   | Supported            | Supported                | Compatible   |
| `.toEqual()`                | Supported            | Supported                | Compatible   |
| `.toStrictEqual()`          | Supported            | Supported                | Compatible   |
| `.toBeTruthy()`             | Supported            | Supported                | Compatible   |
| `.toBeFalsy()`              | Supported            | Supported                | Compatible   |
| `.toBeNull()`               | Supported            | Supported                | Compatible   |
| `.toBeUndefined()`          | Supported            | Supported                | Compatible   |
| `.toBeDefined()`            | Supported            | Supported                | Compatible   |
| `.toBeNaN()`                | Supported            | Supported                | Compatible   |
| `.toBeInstanceOf()`         | Supported            | Supported                | Compatible   |
| `.toContain()`              | Supported            | Supported                | Compatible   |
| `.toHaveLength()`           | Supported            | Supported                | Compatible   |
| `.toHaveProperty()`         | Supported            | Supported                | Compatible   |
| `.toMatch()`                | Supported            | Supported                | Compatible   |
| `.toThrow()`                | Supported            | Supported                | Compatible   |
| `.toBeGreaterThan()`        | Supported            | Supported                | Compatible   |
| `.toBeLessThan()`           | Supported            | Supported                | Compatible   |
| `.toBeCloseTo()`            | Supported            | Supported                | Compatible   |
| `.not` modifier             | Supported            | Supported                | Compatible   |
| `.resolves`                 | Supported            | Supported                | Compatible   |
| `.rejects`                  | Supported            | Supported                | Compatible   |
| `beforeEach` / `afterEach`  | Supported            | Supported                | Compatible   |
| `beforeAll` / `afterAll`    | Supported            | Supported                | Compatible   |
| `vi.fn()` / `fn()`         | `vi.fn()`            | `fn()`                   | Compatible   |
| `vi.spyOn()`               | `vi.spyOn()`         | `spyOn()`                | Compatible   |
| Fake timers                 | `vi.useFakeTimers()` | `useFakeTimers()`        | Compatible   |
| `skip` / `only` / `todo`   | Supported            | Supported                | Compatible   |
| Snapshot testing            | `toMatchSnapshot()`  | Not yet available        | Not available|
| `vi.mock()` module mocking  | Supported            | Not yet available        | Not available|
| `vi.stubGlobal()`          | Supported            | Not yet available        | Not available|
| In-source testing           | Supported            | Not supported            | Not available|
| Benchmark mode              | `vitest bench`       | Not supported            | Not available|
| Browser mode                | Supported            | Not supported            | Not available|
| Type testing                | `expectTypeOf()`     | Not yet available        | Not available|

## Known Differences

### Error Messages

Assertion error messages come from `node:assert` and may differ in format from
vitest's custom error messages. The assertions are functionally identical, but
the error output on failure will look different.

### Test Execution Model

Vitest has its own test scheduler with features like test isolation via worker
threads and file-level parallelism. NogginLessDom delegates to `node:test`,
which has its own scheduling model. In practice, this difference is rarely
observable, but test execution order may differ.

### Global Setup

Vitest supports `globalSetup` files that run in a separate context before any
test files are loaded. NogginLessDom uses Bun's `preload` feature for similar
functionality, but the execution model is different.

### Module Mocking

Vitest's `vi.mock()` intercepts module imports at the bundler level.
NogginLessDom does not currently support module-level mocking. Use dependency
injection or `spyOn()` on imported objects as an alternative.

## Workarounds for Missing Features

### Snapshot Testing

Use explicit assertions instead:

```typescript
// Instead of: expect(output).toMatchSnapshot()
expect(output).toEqual({
  name: 'Alice',
  age: 30,
  active: true,
});
```

### Module Mocking

Use dependency injection:

```typescript
// Instead of vi.mock('./database')
function createService(db = realDatabase) {
  return new UserService(db);
}

it('should use the mock database', () => {
  const mockDb = { query: fn() };
  const service = createService(mockDb);
  // ...
});
```
