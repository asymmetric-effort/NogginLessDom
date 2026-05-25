# Mocking API Reference

The mocking module provides comprehensive utilities for creating mock
functions, spying on object methods and accessors, controlling timers (with
full Date mocking), module mocking, global stubbing, environment variable
stubbing, and async test utilities. All mocking utilities are implemented from
scratch with zero dependencies.

```typescript
import {
  fn,
  spyOn,
  useFakeTimers,
  useRealTimers,
  mock,
  vi,
} from '@asymmetric-effort/nogginlessdom';
```

## Mock Functions

### `fn(implementation?)`

Create a mock function. Optionally provide an initial implementation. If no
implementation is provided, the mock function returns `undefined` when called.

**Parameters:**

| Parameter        | Type                       | Description                      |
| ---------------- | -------------------------- | -------------------------------- |
| `implementation` | `(...args) => TReturn`     | Optional function implementation |

**Returns:** A mock function with the `MockInstance` interface.

**Examples:**

```typescript
// Mock with no implementation (returns undefined)
const mockFn = fn();
mockFn('hello');
expect(mockFn.mock.calls).toHaveLength(1);
expect(mockFn.mock.calls[0]).toEqual(['hello']);

// Mock with implementation
const double = fn((x: number) => x * 2);
expect(double(5)).toBe(10);
expect(double.mock.results[0]).toEqual({ type: 'return', value: 10 });

// Mock that throws
const failing = fn(() => {
  throw new Error('fail');
});
expect(() => failing()).toThrow('fail');
expect(failing.mock.results[0].type).toBe('throw');
```

### `spyOn(object, method, accessorType?)`

Create a spy on an existing object method or accessor. The spy wraps the
original, tracking all calls and return values while still calling through to
the original implementation by default.

**Parameters:**

| Parameter      | Type              | Description                          |
| -------------- | ----------------- | ------------------------------------ |
| `object`       | `object`          | The object containing the method     |
| `method`       | `string`          | The name of the method to spy on     |
| `accessorType` | `'get' \| 'set'`  | Optional -- spy on getter or setter  |

**Returns:** A mock function (`MockInstance`) that replaces the original.

**Example -- method spy:**

```typescript
const api = {
  fetchUser(id: number) {
    return { id, name: 'Alice' };
  },
};

const spy = spyOn(api, 'fetchUser');
const user = api.fetchUser(1);
expect(user).toEqual({ id: 1, name: 'Alice' });
expect(spy.mock.calls[0]).toEqual([1]);

spy.mockReturnValue({ id: 99, name: 'Mock User' });
expect(api.fetchUser(1)).toEqual({ id: 99, name: 'Mock User' });

spy.mockRestore();
expect(api.fetchUser(1)).toEqual({ id: 1, name: 'Alice' });
```

**Example -- accessor spy:**

```typescript
const obj = {
  _value: 0,
  get value() { return this._value; },
  set value(v: number) { this._value = v; },
};

const getSpy = spyOn(obj, 'value', 'get');
obj.value;
expect(getSpy).toHaveBeenCalled();

const setSpy = spyOn(obj, 'value', 'set');
obj.value = 42;
expect(setSpy).toHaveBeenCalledWith(42);
```

## MockInstance Interface

Every mock function (created by `fn()` or `spyOn()`) implements the
`MockInstance` interface.

### Properties

#### `mock.calls: TArgs[]`

Array of argument arrays, one entry per call.

```typescript
const mockFn = fn();
mockFn('a', 'b');
mockFn('c');

expect(mockFn.mock.calls).toEqual([
  ['a', 'b'],
  ['c'],
]);
```

#### `mock.results: Array<{ type: 'return' | 'throw'; value: TReturn }>`

Array of result objects, one entry per call.

#### `mock.lastCall: TArgs | undefined`

The arguments of the most recent call, or `undefined` if not called.

#### `mock.instances: unknown[]`

Array of `this` values when the mock was called as a constructor (`new`).

#### `mock.contexts: unknown[]`

Array of `this` values for all calls (both regular and constructor).

### Return Value Methods

#### `mockReturnValue(value): MockInstance`

Set the default return value for all subsequent calls.

```typescript
const mockFn = fn();
mockFn.mockReturnValue(42);
expect(mockFn()).toBe(42);
```

#### `mockReturnValueOnce(value): MockInstance`

Set the return value for the next call only. Chainable.

```typescript
const mockFn = fn();
mockFn.mockReturnValueOnce('first').mockReturnValueOnce('second');
mockFn.mockReturnValue('default');

expect(mockFn()).toBe('first');
expect(mockFn()).toBe('second');
expect(mockFn()).toBe('default');
```

#### `mockResolvedValue(value): MockInstance`

Set the mock to return `Promise.resolve(value)`.

```typescript
const mockFn = fn();
mockFn.mockResolvedValue({ id: 1, name: 'Alice' });
await expect(mockFn()).resolves.toEqual({ id: 1, name: 'Alice' });
```

#### `mockResolvedValueOnce(value): MockInstance`

Set the mock to return `Promise.resolve(value)` for the next call only.

#### `mockRejectedValue(value): MockInstance`

Set the mock to return `Promise.reject(value)`.

#### `mockRejectedValueOnce(value): MockInstance`

Set the mock to return `Promise.reject(value)` for the next call only.

### Implementation Methods

#### `mockImplementation(fn): MockInstance`

Replace the mock's implementation for all subsequent calls.

```typescript
const mockFn = fn();
mockFn.mockImplementation((a: number, b: number) => a + b);
expect(mockFn(2, 3)).toBe(5);
```

#### `mockImplementationOnce(fn): MockInstance`

Replace the mock's implementation for the next call only. Chainable.

#### `withImplementation(impl, callback)`

Temporarily replace the implementation for the duration of a callback.
Supports both sync and async callbacks.

```typescript
const mockFn = fn(() => 'original');
mockFn.withImplementation(() => 'temporary', () => {
  expect(mockFn()).toBe('temporary');
});
expect(mockFn()).toBe('original');
```

### Name Methods

#### `mockName(name): MockInstance`

Set a name for the mock (useful for debugging).

#### `getMockName(): string`

Get the mock's name (defaults to `'vi.fn()'`).

#### `getMockImplementation()`

Get the current implementation function, or `undefined`.

### Reset Methods

#### `mockClear()`

Reset `mock.calls`, `mock.results`, `mock.instances`, `mock.contexts`, and
`mock.lastCall`. Does not change implementation or return values.

#### `mockReset()`

Like `mockClear()`, but also removes configured return values and
implementations.

#### `mockRestore()`

Restore the original implementation. For spies created with `spyOn()`,
restores the original method on the object. For `fn()` mocks, behaves like
`mockReset()`.

## Timer Mocking

Timer mocking replaces the global `setTimeout`, `setInterval`, `clearTimeout`,
`clearInterval`, `setImmediate`, `clearImmediate`, and `Date` with
deterministic fake implementations.

### `useFakeTimers(optionsOrNow?)`

Replace global timer functions with fakes. Returns a `FakeTimerController`.

**Parameters:**

| Parameter       | Type                         | Description                    |
| --------------- | ---------------------------- | ------------------------------ |
| `optionsOrNow`  | `number \| FakeTimerOptions` | Initial time or options object |

**FakeTimerOptions:**

| Option              | Type             | Description                                          |
| ------------------- | ---------------- | ---------------------------------------------------- |
| `now`               | `number \| Date` | Initial timestamp (default: 0)                       |
| `shouldAdvanceTime` | `boolean`        | Auto-advance time (accepted, stubbed)                |
| `toFake`            | `string[]`       | Which APIs to fake (e.g., `['setTimeout', 'Date']`)  |

```typescript
// Simple usage
const clock = useFakeTimers();

// With initial time
const clock = useFakeTimers(Date.now());

// With options
const clock = useFakeTimers({ now: new Date('2026-01-01'), toFake: ['setTimeout', 'Date'] });
```

### FakeTimerController Methods

| Method                            | Description                                            |
| --------------------------------- | ------------------------------------------------------ |
| `advanceTimersByTime(ms)`         | Advance time by `ms`, firing scheduled timers          |
| `advanceTimersByTimeAsync(ms)`    | Async version of `advanceTimersByTime`                 |
| `advanceTimersToNextTimer()`      | Advance to the next scheduled timer                    |
| `advanceTimersToNextTimerAsync()` | Async version of `advanceTimersToNextTimer`            |
| `runAllTimers()`                  | Run all pending timers recursively (safety limit: 1000)|
| `runAllTimersAsync()`             | Async version of `runAllTimers`                        |
| `runOnlyPendingTimers()`          | Run only currently pending timers (not newly scheduled)|
| `runOnlyPendingTimersAsync()`     | Async version of `runOnlyPendingTimers`                |
| `getTimerCount()`                 | Return the number of pending timers                    |
| `setSystemTime(time)`             | Set the current fake time (number or Date)             |
| `getMockedSystemTime()`           | Get the current fake time as a Date                    |
| `getRealSystemTime()`             | Get the real system time (bypassing fakes)             |
| `now`                             | Current fake timestamp (readonly property)             |

### `useRealTimers()`

Restore the original global timer functions and `Date`. Always call this in
`afterEach` or `afterAll` to avoid leaking fake timers.

### `getMockedSystemTime()`

Return the current mocked system time as a Date, or `null` if not using fake
timers.

### `getRealSystemTime()`

Return the real system time (`Date.now()`) regardless of fake timer state.

## Module Mocking

### `mock.module(moduleName, factory)`

Register a mock for a module path. The factory function returns the mock
module's exports.

```typescript
mock.module('fs', () => ({
  readFileSync: fn(() => 'mocked content'),
  writeFileSync: fn(),
}));

const { myFunction } = await import('./my-module.js');
```

### `mock.doMock(moduleName, factory)`

Alias for `mock.module()` -- explicitly non-hoisted module mock.

### `mock.importActual(moduleName)`

Import the real module, bypassing any registered mocks.

```typescript
const actualFs = await mock.importActual('fs');
```

### `mock.importMock(moduleName)`

Import a module with mock-awareness: if a mock is registered, return it.
Otherwise, dynamically import the real module and auto-mock all exports
(functions become mock functions, primitives are kept as-is).

### `mock.require(moduleName)`

Mock-aware require: returns mock if registered, otherwise the real module.

### `mock.unmock(moduleName)`

Remove the mock for a module path.

### `mock.doUnmock(moduleName)`

Alias for `mock.unmock()`.

### `mock.resetModules()`

Clear all registered module mocks.

### `mock.getMockedModule(moduleName)`

Get the mocked module exports, or `undefined` if not mocked.

### `mock.hoisted(factory)`

Execute a factory function immediately and return its result. Useful for
variable declarations that need to be available before `mock.module()` calls.

```typescript
const mocks = mock.hoisted(() => ({
  myFn: fn(),
}));

mock.module('./my-module', () => ({
  myFn: mocks.myFn,
}));
```

## Global Stubbing

### `mock.stubGlobal(name, value)`

Replace a global property with a value, storing the original for later
restoration.

```typescript
mock.stubGlobal('fetch', fn());
// ... test code that uses fetch ...
```

### `mock.unstubAllGlobals()`

Restore all stubbed globals to their original values.

### `mock.isMockFunction(value): boolean`

Check if a value is a mock function created by `fn()` or `spyOn()`.

## Bulk Mock Operations

### `mock.clearAllMocks()`

Call `mockClear()` on all tracked mock functions.

### `mock.resetAllMocks()`

Call `mockReset()` on all tracked mock functions.

### `mock.restoreAllMocks()`

Call `mockRestore()` on all active mocks/spies and unstub all globals.

## The `vi` Namespace

The `vi` object provides a single namespace that combines all mocking
utilities for convenience. It includes everything from the `mock` object plus
additional utilities:

### `vi.fn(implementation?)`

Alias for `fn()`.

### `vi.spyOn(object, method, accessorType?)`

Alias for `spyOn()`.

### `vi.useFakeTimers(options?)`

Alias for `useFakeTimers()`.

### `vi.useRealTimers()`

Alias for `useRealTimers()`.

### Environment Variables

#### `vi.stubEnv(name, value)`

Stub an environment variable. The original value is stored for restoration.

```typescript
vi.stubEnv('NODE_ENV', 'test');
expect(process.env.NODE_ENV).toBe('test');
```

#### `vi.unstubAllEnvs()`

Restore all stubbed environment variables to their original values.

### Async Utilities

#### `vi.waitFor(callback, options?)`

Retry a callback until it does not throw. Returns the callback's return value
on success.

```typescript
const result = await vi.waitFor(() => {
  const el = document.getElementById('loaded');
  if (!el) throw new Error('Not ready');
  return el;
}, { timeout: 5000, interval: 100 });
```

| Option     | Type     | Default | Description                           |
| ---------- | -------- | ------- | ------------------------------------- |
| `timeout`  | `number` | 1000    | Maximum time to wait in milliseconds  |
| `interval` | `number` | 50      | Time between retries in milliseconds  |

#### `vi.waitUntil(callback, options?)`

Retry a callback until it returns a truthy value. Returns the truthy value.

```typescript
const element = await vi.waitUntil(() => document.getElementById('ready'), {
  timeout: 3000,
});
```

### Type Utilities

#### `vi.mocked(item)`

Identity function for TypeScript type narrowing of mocked values. Returns the
item as-is but narrows the type.

### Module Mocking via `vi`

All `mock.*` methods are also available on `vi`:

- `vi.mock(moduleName, factory)` -- alias for `mock.module()`
- `vi.doMock(moduleName, factory)`
- `vi.importActual(moduleName)`
- `vi.importMock(moduleName)`
- `vi.require(moduleName)`
- `vi.unmock(moduleName)`
- `vi.doUnmock(moduleName)`
- `vi.resetModules()`
- `vi.getMockedModule(moduleName)`
- `vi.hoisted(factory)`
- `vi.stubGlobal(name, value)`
- `vi.unstubAllGlobals()`
- `vi.isMockFunction(value)`
- `vi.clearAllMocks()`
- `vi.resetAllMocks()`
- `vi.restoreAllMocks()`

## Complete Example

```typescript
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  fn,
  spyOn,
  useFakeTimers,
  useRealTimers,
  vi,
} from '@asymmetric-effort/nogginlessdom';

describe('NotificationService', () => {
  afterEach(() => {
    useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('should debounce notifications', () => {
    const clock = useFakeTimers();

    const send = fn();
    const debounced = debounce(send, 300);

    debounced('msg1');
    debounced('msg2');
    debounced('msg3');

    expect(send.mock.calls).toHaveLength(0);

    clock.advanceTimersByTime(300);

    expect(send.mock.calls).toHaveLength(1);
    expect(send.mock.lastCall).toEqual(['msg3']);
  });

  it('should log errors via console.error', () => {
    const spy = spyOn(console, 'error');

    try {
      processInvalidInput(null);
    } catch {
      // expected
    }

    expect(spy.mock.calls).toHaveLength(1);
    expect(spy.mock.calls[0][0]).toMatch(/invalid input/i);

    spy.mockRestore();
  });

  it('should use environment-specific config', () => {
    vi.stubEnv('API_URL', 'https://test.example.com');
    const config = loadConfig();
    expect(config.apiUrl).toBe('https://test.example.com');
  });

  it('should wait for async condition', async () => {
    let ready = false;
    setTimeout(() => { ready = true; }, 100);

    await vi.waitUntil(() => ready, { timeout: 500 });
    expect(ready).toBe(true);
  });
});
```
