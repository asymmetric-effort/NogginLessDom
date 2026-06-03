# Mocking API Reference

The mocking module provides comprehensive utilities for creating mock functions,
spying on object methods and accessors, controlling timers, mocking modules,
stubbing globals and environment variables, and async test helpers.

```typescript
import {
  fn, spyOn, mock, vi,
  useFakeTimers, useRealTimers,
} from '@asymmetric-effort/nogginlessdom';
```

---

## Mock Functions

### fn()

Creates a mock function that tracks calls, arguments, return values, and
instances.

```typescript
const mockFn = fn();
mockFn('a', 'b');
mockFn('c');

mockFn.mock.calls;    // [['a', 'b'], ['c']]
mockFn.mock.results;  // [{ type: 'return', value: undefined }, ...]
```

With an implementation:

```typescript
const add = fn((a: number, b: number) => a + b);
add(1, 2);  // 3
```

### Mock Return Values

```typescript
const mockFn = fn();

// Return the same value every time
mockFn.mockReturnValue(42);
mockFn();  // 42
mockFn();  // 42

// Return a value only for the next call
mockFn.mockReturnValueOnce('first');
mockFn.mockReturnValueOnce('second');
mockFn();  // 'first'
mockFn();  // 'second'
mockFn();  // 42 (falls back to mockReturnValue)
```

### Mock Implementations

```typescript
const mockFn = fn();

// Set a persistent implementation
mockFn.mockImplementation((x: number) => x * 2);
mockFn(5);  // 10

// Set a one-time implementation
mockFn.mockImplementationOnce((x: number) => x * 3);
mockFn(5);  // 15 (one-time)
mockFn(5);  // 10 (falls back to mockImplementation)
```

### Async Mocks

```typescript
const mockFn = fn();

mockFn.mockResolvedValue({ data: 'ok' });
await mockFn();  // { data: 'ok' }

mockFn.mockResolvedValueOnce({ data: 'once' });
await mockFn();  // { data: 'once' }
await mockFn();  // { data: 'ok' }

mockFn.mockRejectedValue(new Error('fail'));
await mockFn();  // throws Error('fail')

mockFn.mockRejectedValueOnce(new Error('once'));
await mockFn();  // throws Error('once')
```

### Mock Naming

```typescript
const mockFn = fn();
mockFn.mockName('myFunction');
mockFn.getMockName();  // 'myFunction'
```

### getMockImplementation

```typescript
const impl = (x: number) => x + 1;
const mockFn = fn(impl);
mockFn.getMockImplementation();  // impl
```

### withImplementation

Temporarily replaces the implementation for the duration of a callback.

```typescript
const mockFn = fn(() => 'original');

mockFn.withImplementation(
  () => 'temporary',
  () => {
    mockFn();  // 'temporary'
  },
);
mockFn();  // 'original'

// Also works with async callbacks
await mockFn.withImplementation(
  () => 'async-temp',
  async () => {
    mockFn();  // 'async-temp'
  },
);
```

---

## Mock Properties

### .mock.calls

Array of argument arrays for each call.

```typescript
mockFn('a', 1);
mockFn('b', 2);
mockFn.mock.calls;  // [['a', 1], ['b', 2]]
```

### .mock.results

Array of `{ type, value }` objects for each call.

```typescript
const mockFn = fn(() => 42);
mockFn();
mockFn.mock.results;  // [{ type: 'return', value: 42 }]

const throwing = fn(() => { throw new Error('oops'); });
try { throwing(); } catch {}
throwing.mock.results;  // [{ type: 'throw', value: Error('oops') }]
```

### .mock.lastCall

The arguments of the most recent call, or `undefined` if never called.

```typescript
mockFn('x', 'y');
mockFn.mock.lastCall;  // ['x', 'y']
```

### .mock.instances

Array of `this` values when the mock was called with `new`.

```typescript
const MockClass = fn();
const instance = new MockClass();
MockClass.mock.instances;  // [instance]
```

### .mock.contexts

Array of `this` values for every call (both regular and constructor calls).

---

## Mock Control

### mockClear()

Resets call tracking (calls, results, instances, contexts) but preserves the
implementation and return values.

```typescript
mockFn('a');
mockFn.mockClear();
mockFn.mock.calls;  // []
```

### mockReset()

Calls `mockClear()` and also removes the implementation and return values.

```typescript
mockFn.mockReturnValue(42);
mockFn.mockReset();
mockFn();  // undefined
```

### mockRestore()

Calls `mockReset()`. For spies created with `spyOn`, also restores the original
function or accessor on the object.

```typescript
const spy = spyOn(obj, 'method');
spy.mockRestore();
// obj.method is now the original function
```

---

## Spies

### spyOn

Creates a spy on an object method. The spy wraps the original function and
tracks calls while still invoking the original by default.

```typescript
const obj = {
  greet(name: string) { return `Hello, ${name}`; },
};

const spy = spyOn(obj, 'greet');
obj.greet('World');          // 'Hello, World'
spy.mock.calls;              // [['World']]

// Override the implementation
spy.mockReturnValue('Hi');
obj.greet('World');          // 'Hi'

// Restore the original
spy.mockRestore();
obj.greet('World');          // 'Hello, World'
```

### Spying on Getters

```typescript
const obj = {
  get value() { return 42; },
};

const spy = spyOn(obj, 'value', 'get');
spy.mockReturnValue(100);
obj.value;  // 100

spy.mockRestore();
obj.value;  // 42
```

### Spying on Setters

```typescript
const obj = {
  _data: '',
  set data(v: string) { this._data = v; },
};

const spy = spyOn(obj, 'data', 'set');
obj.data = 'hello';
spy.mock.calls;  // [['hello']]

spy.mockRestore();
```

---

## Module Mocking

### mock.module

Registers a mock for a module path. The factory function receives an
`importOriginal` helper to access the real module.

```typescript
await mock.module('fs', () => ({
  readFileSync: fn(() => 'mocked content'),
  writeFileSync: fn(),
}));

// With importOriginal to keep some real exports
await mock.module('fs', async ({ importOriginal }) => {
  const actual = await importOriginal();
  return {
    ...actual,
    readFileSync: fn(() => 'mocked'),
  };
});
```

Mocks must be set up before the module under test is imported.

### mock.modulePartial

Partially mocks a module: imports the real module, overlays overrides, and
optionally auto-mocks remaining functions.

```typescript
await mock.modulePartial('fs', {
  readFileSync: fn(() => 'mocked'),
}, { autoMockRest: true });
```

### importActual

Dynamically imports the real module, bypassing any registered mocks.

```typescript
const realFs = await mock.importActual('fs');
```

### importMock

Imports a module with mock awareness. If a mock is registered, returns it.
Otherwise, auto-mocks all function exports.

```typescript
const mockedFs = await mock.importMock('fs');
// All functions are replaced with fn() mocks
```

### mock.require

Synchronous mock-aware require. Returns the mock if registered, otherwise
falls back to the real module.

```typescript
const fs = mock.require('fs');
```

### mock.unmock and mock.doUnmock

Removes the mock registration for a module.

```typescript
mock.unmock('fs');
```

### mock.resetModules

Clears all registered module mocks.

```typescript
mock.resetModules();
```

### mock.getMockedModule

Returns the mock for a given module, or undefined.

```typescript
const m = mock.getMockedModule('fs');
```

### mock.hoisted

Executes a factory function immediately and returns its result. Useful for
variable declarations that need to be available before `mock.module()` calls.

```typescript
const mocks = mock.hoisted(() => ({
  readFile: fn(),
}));
await mock.module('fs', () => mocks);
```

---

## Fake Timers

### useFakeTimers

Replaces `setTimeout`, `setInterval`, `clearTimeout`, `clearInterval`, `Date`,
`Date.now`, `setImmediate`, `clearImmediate`, `requestAnimationFrame`,
`cancelAnimationFrame`, and `performance.now` with controllable fakes.

```typescript
const clock = useFakeTimers();

setTimeout(() => console.log('fired'), 1000);
clock.advanceTimersByTime(1000);  // 'fired'
```

With options:

```typescript
const clock = useFakeTimers({
  now: new Date('2025-01-01'),
  toFake: ['setTimeout', 'Date'],  // only fake specific APIs
});

Date.now();  // 1735689600000 (2025-01-01)
```

### FakeTimerController Methods

| Method | Description |
|---|---|
| `advanceTimersByTime(ms)` | Advance clock by ms, firing timers along the way |
| `advanceTimersByTimeAsync(ms)` | Same as above, returns Promise |
| `advanceTimersToNextTimer()` | Advance to the next scheduled timer |
| `advanceTimersToNextTimerAsync()` | Same as above, returns Promise |
| `getTimerCount()` | Number of pending timers |
| `runAllTimers()` | Run all pending timers (max 1000 iterations) |
| `runAllTimersAsync()` | Same as above, returns Promise |
| `runOnlyPendingTimers()` | Run only currently pending timers (not new ones) |
| `runOnlyPendingTimersAsync()` | Same as above, returns Promise |
| `setSystemTime(time)` | Set the current fake time (number or Date) |
| `getMockedSystemTime()` | Get current fake time as Date |
| `getRealSystemTime()` | Get real system time |
| `now` | Current fake time in milliseconds |

### useRealTimers

Restores all original timer functions, Date, requestAnimationFrame, and
performance.now.

```typescript
useRealTimers();
```

### requestAnimationFrame Integration

When fake timers are active, `requestAnimationFrame` callbacks are scheduled
with a virtual 16ms delay and receive the current fake timestamp.

```typescript
const clock = useFakeTimers();
let frame = 0;
requestAnimationFrame((ts) => { frame = ts; });
clock.advanceTimersByTime(16);
// frame === 16
```

### Date and performance Mocking

When fake timers are active:

- `Date.now()` returns the fake time
- `new Date()` (no arguments) uses the fake time
- `new Date(value)` still works with explicit values
- `performance.now()` returns the fake time

```typescript
const clock = useFakeTimers({ now: 1000 });
Date.now();           // 1000
new Date().getTime(); // 1000
performance.now();    // 1000

clock.advanceTimersByTime(500);
Date.now();           // 1500
```

---

## Global Stubs

### mock.stubGlobal

Replaces a global property with a value, storing the original for later
restoration.

```typescript
mock.stubGlobal('fetch', fn(() => Promise.resolve(new Response('ok'))));
globalThis.fetch('/api');
```

### mock.unstubAllGlobals

Restores all stubbed globals to their original values.

```typescript
mock.unstubAllGlobals();
```

### stubEnv

Stubs an environment variable, storing the original for restoration.

```typescript
vi.stubEnv('NODE_ENV', 'test');
process.env.NODE_ENV;  // 'test'
```

### unstubAllEnvs

Restores all stubbed environment variables.

```typescript
vi.unstubAllEnvs();
```

---

## Auto-Cleanup

### configureMockBehavior

Configures automatic mock cleanup behavior. Called by the test runner after each
test.

```typescript
import { configureMockBehavior } from '@asymmetric-effort/nogginlessdom';

configureMockBehavior({
  clearMocks: true,       // call mockClear() on all mocks after each test
  resetMocks: false,      // call mockReset() on all mocks after each test
  restoreMocks: false,    // call mockRestore() on all mocks after each test
  unstubGlobals: false,   // call unstubAllGlobals() after each test
  fakeTimers: {
    autoRestore: false,   // call useRealTimers() after each test
  },
});
```

Priority: `restoreMocks` > `resetMocks` > `clearMocks`. Only one is applied.

### Bulk Operations

```typescript
mock.clearAllMocks();    // mockClear() on every tracked mock
mock.resetAllMocks();    // mockReset() on every tracked mock
mock.restoreAllMocks();  // mockRestore() on every tracked mock + unstubAllGlobals
mock.isMockFunction(fn); // true if value was created by fn() or spyOn()
```

---

## Async Utilities

### waitFor

Retries a callback until it does not throw. Returns the callback's return value.

```typescript
const result = await vi.waitFor(() => {
  const el = document.querySelector('.loaded');
  if (!el) throw new Error('not loaded');
  return el;
}, {
  timeout: 5000,   // max wait time in ms (default: 1000)
  interval: 100,   // retry interval in ms (default: 50)
});
```

Works with async callbacks:

```typescript
await vi.waitFor(async () => {
  const res = await fetch('/status');
  if (!res.ok) throw new Error('not ready');
});
```

### waitUntil

Retries a callback until it returns a truthy value. Returns the truthy value.

```typescript
const element = await vi.waitUntil(() => {
  return document.querySelector('.ready');
}, {
  timeout: 3000,
  interval: 50,
});
```

---

## vi Namespace

The `vi` object provides a single namespace that mirrors established testing
conventions for compatibility. It re-exports all mocking utilities.

```typescript
import { vi } from '@asymmetric-effort/nogginlessdom';

vi.fn();
vi.spyOn(obj, 'method');
vi.useFakeTimers();
vi.useRealTimers();
vi.getMockedSystemTime();
vi.getRealSystemTime();
vi.stubEnv('KEY', 'value');
vi.unstubAllEnvs();
vi.waitFor(callback, options);
vi.waitUntil(callback, options);
vi.mocked(value);            // identity function for type narrowing
vi.configureMockBehavior(config);
vi.getMockConfig();
vi.mock('module', factory);  // alias for mock.module
vi.module('module', factory);
vi.modulePartial('module', overrides, options);
vi.doMock('module', factory);
vi.importActual('module');
vi.importMock('module');
vi.require('module');
vi.unmock('module');
vi.doUnmock('module');
vi.resetModules();
vi.getMockedModule('module');
vi.stubGlobal('name', value);
vi.unstubAllGlobals();
vi.isMockFunction(value);
vi.clearAllMocks();
vi.resetAllMocks();
vi.restoreAllMocks();
vi.hoisted(factory);
```

### vi.mocked

Identity function used for TypeScript type narrowing of mocked values.

```typescript
const mockedFetch = vi.mocked(fetch);
// TypeScript now treats mockedFetch as a mock function type
```
