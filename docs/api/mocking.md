# Mocking API Reference

The mocking module provides utilities for creating mock functions, spying on
object methods, and controlling timers. All mocking utilities are implemented
from scratch with zero dependencies.

```typescript
import {
  fn,
  spyOn,
  useFakeTimers,
  useRealTimers,
} from '@asymmetric-effort/nogginlessdom';
```

## Mock Functions

### `fn(implementation?)`

Create a mock function. Optionally provide an initial implementation. If no
implementation is provided, the mock function returns `undefined` when called.

**Parameters:**

| Parameter        | Type                       | Description                      |
| ---------------- | -------------------------- | -------------------------------- |
| `implementation` | `(...args: any[]) => any`  | Optional function implementation |

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
expect(failing.mock.results[0]).toEqual({
  type: 'throw',
  value: expect.any(Error),
});
```

### `spyOn(object, method)`

Create a spy on an existing object method. The spy wraps the original method,
tracking all calls and return values while still calling through to the original
implementation by default. The original method can be restored with
`mockRestore()`.

**Parameters:**

| Parameter | Type     | Description                          |
| --------- | -------- | ------------------------------------ |
| `object`  | `object` | The object containing the method     |
| `method`  | `string` | The name of the method to spy on     |

**Returns:** A mock function (with `MockInstance` interface) that replaces the
original method.

**Example:**

```typescript
const api = {
  fetchUser(id: number) {
    return { id, name: 'Alice' };
  },
};

const spy = spyOn(api, 'fetchUser');

// Calls through to original implementation
const user = api.fetchUser(1);
expect(user).toEqual({ id: 1, name: 'Alice' });
expect(spy.mock.calls[0]).toEqual([1]);

// Override the implementation
spy.mockReturnValue({ id: 99, name: 'Mock User' });
expect(api.fetchUser(1)).toEqual({ id: 99, name: 'Mock User' });

// Restore original
spy.mockRestore();
expect(api.fetchUser(1)).toEqual({ id: 1, name: 'Alice' });
```

## MockInstance Interface

Every mock function (created by `fn()` or `spyOn()`) implements the
`MockInstance` interface, which provides call tracking and behavior control.

### Properties

#### `mock.calls: any[][]`

Array of argument arrays, one entry per call. Each entry is an array of the
arguments passed to that invocation.

```typescript
const mockFn = fn();
mockFn('a', 'b');
mockFn('c');

expect(mockFn.mock.calls).toEqual([
  ['a', 'b'],
  ['c'],
]);
```

#### `mock.results: Array<{ type: 'return' | 'throw'; value: any }>`

Array of result objects, one entry per call. Each entry records whether the call
returned normally or threw, and the return value or thrown error.

```typescript
const mockFn = fn((x: number) => {
  if (x < 0) throw new Error('negative');
  return x * 2;
});

mockFn(3);
mockFn(-1); // throws

expect(mockFn.mock.results[0]).toEqual({ type: 'return', value: 6 });
expect(mockFn.mock.results[1].type).toBe('throw');
```

#### `mock.lastCall: any[] | undefined`

The arguments of the most recent call, or `undefined` if the mock has not been
called.

```typescript
const mockFn = fn();
mockFn('first');
mockFn('second', 'arg');

expect(mockFn.mock.lastCall).toEqual(['second', 'arg']);
```

### Return Value Methods

#### `mockReturnValue(value)`

Set the default return value for all subsequent calls. Overrides any
implementation provided to `fn()`.

```typescript
const mockFn = fn();
mockFn.mockReturnValue(42);

expect(mockFn()).toBe(42);
expect(mockFn()).toBe(42); // same value for every call
```

#### `mockReturnValueOnce(value)`

Set the return value for the next call only. Can be chained for multiple
one-time values. After all one-time values are consumed, the mock falls back
to `mockReturnValue` or the original implementation.

```typescript
const mockFn = fn();
mockFn.mockReturnValueOnce('first');
mockFn.mockReturnValueOnce('second');
mockFn.mockReturnValue('default');

expect(mockFn()).toBe('first');
expect(mockFn()).toBe('second');
expect(mockFn()).toBe('default');
expect(mockFn()).toBe('default');
```

### Implementation Methods

#### `mockImplementation(fn)`

Replace the mock's implementation for all subsequent calls.

```typescript
const mockFn = fn();
mockFn.mockImplementation((a: number, b: number) => a + b);

expect(mockFn(2, 3)).toBe(5);
```

#### `mockImplementationOnce(fn)`

Replace the mock's implementation for the next call only. Can be chained.

```typescript
const mockFn = fn(() => 'default');
mockFn.mockImplementationOnce(() => 'special');

expect(mockFn()).toBe('special');
expect(mockFn()).toBe('default');
```

### Reset Methods

#### `mockClear()`

Reset `mock.calls`, `mock.results`, and `mock.lastCall` to empty/undefined.
Does not change the mock's implementation or return value configuration.

```typescript
const mockFn = fn();
mockFn('a');
mockFn('b');
expect(mockFn.mock.calls).toHaveLength(2);

mockFn.mockClear();
expect(mockFn.mock.calls).toHaveLength(0);
expect(mockFn.mock.lastCall).toBeUndefined();
```

#### `mockReset()`

Like `mockClear()`, but also removes any configured return values and
implementations, resetting the mock to its initial state (returns `undefined`).

```typescript
const mockFn = fn(() => 42);
mockFn.mockReturnValue(100);

mockFn.mockReset();
expect(mockFn()).toBeUndefined();
expect(mockFn.mock.calls).toHaveLength(1); // call is tracked
```

#### `mockRestore()`

Restore the original implementation. Only meaningful for spies created with
`spyOn()`. For mocks created with `fn()`, behaves like `mockReset()`.

```typescript
const obj = { greet: () => 'hello' };
const spy = spyOn(obj, 'greet');
spy.mockReturnValue('mocked');

expect(obj.greet()).toBe('mocked');

spy.mockRestore();
expect(obj.greet()).toBe('hello');
```

## Timer Mocking

Timer mocking replaces the global `setTimeout`, `setInterval`, `clearTimeout`,
and `clearInterval` with deterministic fake implementations. This lets you test
time-dependent code without waiting for real time to pass.

### `useFakeTimers(now?)`

Replace global timer functions with fake implementations. Optionally set the
initial "current time".

**Parameters:**

| Parameter | Type     | Description                              |
| --------- | -------- | ---------------------------------------- |
| `now`     | `number` | Optional initial timestamp (default: 0)  |

```typescript
useFakeTimers();
// All setTimeout/setInterval calls now use fake timers

useFakeTimers(Date.now());
// Fake timers starting at the current real time
```

### `useRealTimers()`

Restore the original global timer functions. Always call this in `afterEach`
or `afterAll` to avoid leaking fake timers between tests.

```typescript
afterEach(() => {
  useRealTimers();
});
```

### `advanceTimersByTime(ms)`

Advance fake time by the given number of milliseconds, firing any timers that
are scheduled within that window.

```typescript
useFakeTimers();

const callback = fn();
setTimeout(callback, 500);
setTimeout(callback, 1500);

advanceTimersByTime(1000);
expect(callback.mock.calls).toHaveLength(1); // only the 500ms timer fired

advanceTimersByTime(1000);
expect(callback.mock.calls).toHaveLength(2); // now the 1500ms timer fired too

useRealTimers();
```

### `runAllTimers()`

Run all pending timers immediately, regardless of their scheduled delay. Also
runs any timers that are scheduled by the fired timers (recursively), up to a
safety limit to prevent infinite loops.

```typescript
useFakeTimers();

const results: string[] = [];
setTimeout(() => results.push('first'), 100);
setTimeout(() => results.push('second'), 5000);
setTimeout(() => results.push('third'), 99999);

runAllTimers();
expect(results).toEqual(['first', 'second', 'third']);

useRealTimers();
```

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
} from '@asymmetric-effort/nogginlessdom';

describe('NotificationService', () => {
  afterEach(() => {
    useRealTimers();
  });

  it('should debounce notifications', () => {
    useFakeTimers();

    const send = fn();
    const debounced = debounce(send, 300);

    debounced('msg1');
    debounced('msg2');
    debounced('msg3');

    // Nothing sent yet -- still within debounce window
    expect(send.mock.calls).toHaveLength(0);

    advanceTimersByTime(300);

    // Only the last call goes through
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
});
```
