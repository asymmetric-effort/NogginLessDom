# Assertions API Reference

The assertions module wraps Node.js's built-in `node:assert/strict` module to
provide a full-featured `expect()` API with 40+ chainable matchers, asymmetric
matchers, assertion tracking, snapshot testing, custom matchers, and error diffs.

```typescript
import { expect } from '@asymmetric-effort/nogginlessdom';
```

## Overview

All assertions start with `expect(actual)` and chain a matcher method.
Every matcher tracks the assertion count for `expect.assertions()` and
`expect.hasAssertions()` verification.

```typescript
expect(actual).toBe(expected);
expect(actual).not.toBe(unexpected);
await expect(promise).resolves.toBe(value);
await expect(promise).rejects.toThrow('error');
```

## Equality

### `.toBe(expected)`

Assert strict reference equality (`===`). Use for primitives and identity
checks.

```typescript
toBe(expected: T): void
```

```typescript
expect(1 + 1).toBe(2);
expect('hello').toBe('hello');
expect(true).toBe(true);

const obj = { a: 1 };
expect(obj).toBe(obj); // same reference
```

Negated:

```typescript
expect(1).not.toBe(2);
```

Maps to `assert.strictEqual` / `assert.notStrictEqual`.

### `.toEqual(expected)`

Assert deep equality. Recursively compares all properties of objects and arrays.
Supports asymmetric matchers within the expected value. On failure, produces a
colored diff of expected vs received.

```typescript
toEqual(expected: T): void
```

```typescript
expect({ a: 1, b: [2, 3] }).toEqual({ a: 1, b: [2, 3] });
expect([1, 2, 3]).toEqual([1, 2, 3]);

// With asymmetric matchers
expect({ name: 'Alice', age: 30 }).toEqual({
  name: expect.any(String),
  age: expect.any(Number),
});
```

Negated:

```typescript
expect({ a: 1 }).not.toEqual({ a: 2 });
```

Maps to `assert.deepStrictEqual` / `assert.notDeepStrictEqual`.

### `.toStrictEqual(expected)`

Assert strict deep equality. Like `toEqual`, but checks prototype chains and
does not allow undefined-valued properties to match missing properties.
Produces a colored diff on failure.

```typescript
toStrictEqual(expected: T): void
```

```typescript
class Point {
  constructor(public x: number, public y: number) {}
}

expect(new Point(1, 2)).toStrictEqual(new Point(1, 2));
```

Negated:

```typescript
expect(new Point(1, 2)).not.toStrictEqual({ x: 1, y: 2 });
```

Maps to `assert.deepStrictEqual` / `assert.notDeepStrictEqual`.

## Truthiness

### `.toBeTruthy()`

Assert the value is truthy (not `false`, `0`, `""`, `null`, `undefined`, or
`NaN`).

```typescript
toBeTruthy(): void
```

```typescript
expect(1).toBeTruthy();
expect('non-empty').toBeTruthy();
expect([]).toBeTruthy(); // arrays are truthy
```

Negated:

```typescript
expect(0).not.toBeTruthy();
```

### `.toBeFalsy()`

Assert the value is falsy.

```typescript
toBeFalsy(): void
```

```typescript
expect(0).toBeFalsy();
expect('').toBeFalsy();
expect(null).toBeFalsy();
```

Negated:

```typescript
expect(1).not.toBeFalsy();
```

### `.toBeNull()`

Assert the value is exactly `null`.

```typescript
toBeNull(): void
```

```typescript
expect(null).toBeNull();
```

Negated:

```typescript
expect(undefined).not.toBeNull();
```

Maps to `assert.strictEqual(actual, null)`.

### `.toBeUndefined()`

Assert the value is exactly `undefined`.

```typescript
toBeUndefined(): void
```

```typescript
expect(undefined).toBeUndefined();
const obj: Record<string, unknown> = {};
expect(obj.missing).toBeUndefined();
```

Negated:

```typescript
expect(42).not.toBeUndefined();
```

Maps to `assert.strictEqual(actual, undefined)`.

### `.toBeDefined()`

Assert the value is not `undefined`. Note: `null` is considered defined.

```typescript
toBeDefined(): void
```

```typescript
expect(null).toBeDefined();
expect(42).toBeDefined();
```

Negated:

```typescript
expect(undefined).not.toBeDefined();
```

Maps to `assert.notStrictEqual(actual, undefined)`.

### `.toBeNaN()`

Assert the value is `NaN`. Uses `Number.isNaN()`.

```typescript
toBeNaN(): void
```

```typescript
expect(NaN).toBeNaN();
expect(parseInt('not a number')).toBeNaN();
```

Negated:

```typescript
expect(42).not.toBeNaN();
```

## Type

### `.toBeInstanceOf(constructor)`

Assert the value is an instance of the given constructor.

```typescript
toBeInstanceOf(expected: abstract new (...args: unknown[]) => unknown): void
```

```typescript
expect(new Date()).toBeInstanceOf(Date);
expect(new Error('fail')).toBeInstanceOf(Error);
expect([1, 2, 3]).toBeInstanceOf(Array);
```

Negated:

```typescript
expect('hello').not.toBeInstanceOf(Number);
```

### `.toBeTypeOf(type)`

Assert that `typeof actual` matches the given type string.

```typescript
toBeTypeOf(type: string): void
```

Valid types: `'string'`, `'number'`, `'boolean'`, `'function'`, `'object'`,
`'undefined'`, `'symbol'`, `'bigint'`.

```typescript
expect('hello').toBeTypeOf('string');
expect(42).toBeTypeOf('number');
expect(true).toBeTypeOf('boolean');
expect(() => {}).toBeTypeOf('function');
expect(null).toBeTypeOf('object');
expect(Symbol()).toBeTypeOf('symbol');
expect(BigInt(42)).toBeTypeOf('bigint');
```

Negated:

```typescript
expect('hello').not.toBeTypeOf('number');
```

Throws if the type string is not one of the valid types.

## Numbers

### `.toBeGreaterThan(number)`

Assert the value is greater than the given number.

```typescript
toBeGreaterThan(expected: number): void
```

```typescript
expect(10).toBeGreaterThan(5);
```

Negated:

```typescript
expect(5).not.toBeGreaterThan(10);
```

### `.toBeGreaterThanOrEqual(number)`

Assert the value is greater than or equal to the given number.

```typescript
toBeGreaterThanOrEqual(expected: number): void
```

```typescript
expect(10).toBeGreaterThanOrEqual(10);
expect(11).toBeGreaterThanOrEqual(10);
```

Negated:

```typescript
expect(9).not.toBeGreaterThanOrEqual(10);
```

### `.toBeLessThan(number)`

Assert the value is less than the given number.

```typescript
toBeLessThan(expected: number): void
```

```typescript
expect(5).toBeLessThan(10);
```

Negated:

```typescript
expect(10).not.toBeLessThan(5);
```

### `.toBeLessThanOrEqual(number)`

Assert the value is less than or equal to the given number.

```typescript
toBeLessThanOrEqual(expected: number): void
```

```typescript
expect(10).toBeLessThanOrEqual(10);
expect(9).toBeLessThanOrEqual(10);
```

Negated:

```typescript
expect(11).not.toBeLessThanOrEqual(10);
```

### `.toBeCloseTo(number, precision?)`

Assert a floating-point number is close to the expected value. The default
precision is `2`, meaning numbers must differ by less than `0.5 * 10^-2`
(0.005).

```typescript
toBeCloseTo(expected: number, precision?: number): void
```

```typescript
expect(0.1 + 0.2).toBeCloseTo(0.3);
expect(1.005).toBeCloseTo(1.0, 2);
expect(Math.PI).toBeCloseTo(3.14159, 4);
```

Negated:

```typescript
expect(0.1 + 0.2).not.toBeCloseTo(0.4);
```

### `.toBeWithin(start, end)`

Assert a number is within the half-open range `[start, end)`.

```typescript
toBeWithin(start: number, end: number): void
```

```typescript
expect(5).toBeWithin(1, 10);
expect(1).toBeWithin(1, 10);   // inclusive start
```

Negated:

```typescript
expect(10).not.toBeWithin(1, 10); // exclusive end
```

## Strings

### `.toMatch(pattern)`

Assert a string matches a regular expression or contains a substring.

```typescript
toMatch(expected: string | RegExp): void
```

```typescript
expect('hello world').toMatch(/hello/);
expect('hello world').toMatch('world');
expect('2024-01-15').toMatch(/\d{4}-\d{2}-\d{2}/);
```

Negated:

```typescript
expect('hello').not.toMatch('goodbye');
expect('hello').not.toMatch(/\d+/);
```

## Collections

### `.toContain(item)`

Assert an array includes the given item (strict equality) or a string contains
the given substring.

```typescript
toContain(expected: unknown): void
```

```typescript
expect([1, 2, 3]).toContain(2);
expect('hello world').toContain('world');
```

Negated:

```typescript
expect([1, 2, 3]).not.toContain(4);
```

### `.toContainEqual(expected)`

Assert an array contains an element that is deeply equal to the expected value.
Supports asymmetric matchers.

```typescript
toContainEqual(expected: unknown): void
```

```typescript
expect([{ a: 1 }, { b: 2 }]).toContainEqual({ a: 1 });
expect([{ name: 'Alice' }]).toContainEqual(
  expect.objectContaining({ name: 'Alice' }),
);
```

Negated:

```typescript
expect([{ a: 1 }]).not.toContainEqual({ a: 2 });
```

### `.toHaveLength(length)`

Assert an array, string, or any object with a `.length` property has the
given length.

```typescript
toHaveLength(expected: number): void
```

```typescript
expect([1, 2, 3]).toHaveLength(3);
expect('hello').toHaveLength(5);
expect([]).toHaveLength(0);
```

Negated:

```typescript
expect([1, 2]).not.toHaveLength(3);
```

### `.toHaveProperty(key, value?)`

Assert an object has the given property. Optionally check the property's value
using deep equality.

```typescript
toHaveProperty(key: string, value?: unknown): void
```

```typescript
const user = { name: 'Alice', address: { city: 'Portland' } };

expect(user).toHaveProperty('name');
expect(user).toHaveProperty('name', 'Alice');
expect(user).toHaveProperty('address');
```

Negated:

```typescript
expect(user).not.toHaveProperty('age');
```

### `.toBeEmpty()`

Assert a value is empty. Works with strings, arrays, Maps, Sets, and plain
objects.

```typescript
toBeEmpty(): void
```

```typescript
expect('').toBeEmpty();
expect([]).toBeEmpty();
expect(new Map()).toBeEmpty();
expect(new Set()).toBeEmpty();
expect({}).toBeEmpty();
```

Negated:

```typescript
expect([1]).not.toBeEmpty();
```

### `.toContainAllEntries(entries)`

Assert an object or Map contains all the specified `[key, value]` entries.
Values are compared using deep equality with asymmetric matcher support.

```typescript
toContainAllEntries(entries: [string, unknown][]): void
```

```typescript
expect({ a: 1, b: 2, c: 3 }).toContainAllEntries([
  ['a', 1],
  ['b', 2],
]);

const map = new Map([['x', 10], ['y', 20]]);
expect(map).toContainAllEntries([['x', 10], ['y', 20]]);
```

Negated:

```typescript
expect({ a: 1 }).not.toContainAllEntries([['a', 1], ['b', 2]]);
```

### `.toContainAnyEntries(entries)`

Assert an object or Map contains at least one of the specified
`[key, value]` entries.

```typescript
toContainAnyEntries(entries: [string, unknown][]): void
```

```typescript
expect({ a: 1, b: 2 }).toContainAnyEntries([
  ['a', 1],
  ['c', 3],
]);
```

Negated:

```typescript
expect({ a: 1 }).not.toContainAnyEntries([['b', 2], ['c', 3]]);
```

## Objects

### `.toMatchObject(expected)`

Assert that an object contains all the key-value pairs in `expected` (partial
matching). Extra keys in actual are allowed. Supports nested objects and
asymmetric matchers. Produces a diff on failure.

```typescript
toMatchObject(expected: Record<string, unknown> | unknown[]): void
```

```typescript
expect({ a: 1, b: 2, c: 3 }).toMatchObject({ a: 1, b: 2 });
expect({ user: { name: 'Alice', age: 30 } }).toMatchObject({
  user: { name: 'Alice' },
});
```

Negated:

```typescript
expect({ a: 1, b: 2 }).not.toMatchObject({ a: 1, b: 3 });
```

### `.toSatisfy(predicate)`

Assert the value satisfies a custom predicate function.

```typescript
toSatisfy(predicate: (value: unknown) => boolean): void
```

```typescript
expect(42).toSatisfy((n) => n > 0 && n < 100);
expect('hello').toSatisfy((s) => s.startsWith('h'));
```

Negated:

```typescript
expect(-1).not.toSatisfy((n) => n > 0);
```

### `.toSatisfyAll(predicate)`

Assert that every element in an array satisfies the predicate.

```typescript
toSatisfyAll(predicate: (value: unknown) => boolean): void
```

```typescript
expect([2, 4, 6]).toSatisfyAll((n) => n % 2 === 0);
```

Negated:

```typescript
expect([1, 2, 3]).not.toSatisfyAll((n) => n % 2 === 0);
```

### `.toBeOneOf(values)`

Assert the value is strictly equal to one of the values in the array.

```typescript
toBeOneOf(values: unknown[]): void
```

```typescript
expect('active').toBeOneOf(['active', 'inactive', 'pending']);
expect(1).toBeOneOf([1, 2, 3]);
```

Negated:

```typescript
expect('deleted').not.toBeOneOf(['active', 'inactive']);
```

## Functions and Errors

### `.toThrow(expected?)`

Assert that a function throws an error. Optionally match the error message
(string or RegExp) or error object.

```typescript
toThrow(expected?: string | RegExp | Error): void
```

```typescript
// Any throw
expect(() => { throw new Error('oops'); }).toThrow();

// By message substring
expect(() => { throw new Error('not found'); }).toThrow('not found');

// By regex
expect(() => {
  throw new Error('Connection refused at port 8080');
}).toThrow(/port \d+/);

// By error object
expect(() => {
  throw new TypeError('bad type');
}).toThrow(new TypeError('bad type'));
```

Negated:

```typescript
expect(() => {}).not.toThrow();
expect(() => { throw new Error('oops'); }).not.toThrow('different message');
```

Maps to `assert.throws` / `assert.doesNotThrow`.

### `.toThrowWithMessage(ErrorType, message)`

Assert that a function throws an error that is an instance of `ErrorType` and
whose message matches the given string (substring) or RegExp.

```typescript
toThrowWithMessage(
  ErrorType: new (...args: unknown[]) => Error,
  message: string | RegExp,
): void
```

```typescript
expect(() => {
  throw new TypeError('invalid argument');
}).toThrowWithMessage(TypeError, 'invalid argument');

expect(() => {
  throw new RangeError('out of bounds');
}).toThrowWithMessage(RangeError, /out of/);
```

Negated:

```typescript
expect(() => {
  throw new TypeError('invalid');
}).not.toThrowWithMessage(RangeError, 'invalid');
```

## Mock Matchers

These matchers work with mock functions created by `fn()` or `spyOn()`. They
read from the `.mock` property on the function.

### `.toHaveBeenCalled()`

Assert the mock was called at least once.

```typescript
toHaveBeenCalled(): void
```

```typescript
const mockFn = fn();
mockFn();
expect(mockFn).toHaveBeenCalled();
```

Negated:

```typescript
const mockFn = fn();
expect(mockFn).not.toHaveBeenCalled();
```

### `.toHaveBeenCalledTimes(n)`

Assert the mock was called exactly `n` times.

```typescript
toHaveBeenCalledTimes(n: number): void
```

```typescript
const mockFn = fn();
mockFn();
mockFn();
expect(mockFn).toHaveBeenCalledTimes(2);
```

Negated:

```typescript
expect(mockFn).not.toHaveBeenCalledTimes(3);
```

### `.toHaveBeenCalledWith(...args)`

Assert the mock was called at least once with the specified arguments. Uses
deep equality with asymmetric matcher support.

```typescript
toHaveBeenCalledWith(...args: unknown[]): void
```

```typescript
const mockFn = fn();
mockFn('hello', 42);
expect(mockFn).toHaveBeenCalledWith('hello', 42);
expect(mockFn).toHaveBeenCalledWith(expect.any(String), expect.any(Number));
```

Negated:

```typescript
expect(mockFn).not.toHaveBeenCalledWith('goodbye', 0);
```

### `.toHaveBeenLastCalledWith(...args)`

Assert the most recent call to the mock used the specified arguments.

```typescript
toHaveBeenLastCalledWith(...args: unknown[]): void
```

```typescript
const mockFn = fn();
mockFn('first');
mockFn('second');
expect(mockFn).toHaveBeenLastCalledWith('second');
```

Negated:

```typescript
expect(mockFn).not.toHaveBeenLastCalledWith('first');
```

### `.toHaveBeenNthCalledWith(n, ...args)`

Assert the nth call (1-indexed) to the mock used the specified arguments.

```typescript
toHaveBeenNthCalledWith(n: number, ...args: unknown[]): void
```

```typescript
const mockFn = fn();
mockFn('a');
mockFn('b');
mockFn('c');
expect(mockFn).toHaveBeenNthCalledWith(2, 'b');
```

Negated:

```typescript
expect(mockFn).not.toHaveBeenNthCalledWith(1, 'b');
```

### `.toHaveBeenCalledOnce()`

Assert the mock was called exactly once. Convenience for
`toHaveBeenCalledTimes(1)`.

```typescript
toHaveBeenCalledOnce(): void
```

```typescript
const mockFn = fn();
mockFn();
expect(mockFn).toHaveBeenCalledOnce();
```

Negated:

```typescript
const mockFn = fn();
mockFn();
mockFn();
expect(mockFn).not.toHaveBeenCalledOnce();
```

### `.toHaveReturned()`

Assert the mock successfully returned (did not throw) at least once.

```typescript
toHaveReturned(): void
```

```typescript
const mockFn = fn(() => 42);
mockFn();
expect(mockFn).toHaveReturned();
```

Negated:

```typescript
expect(throwingMock).not.toHaveReturned();
```

### `.toHaveReturnedTimes(n)`

Assert the mock successfully returned exactly `n` times.

```typescript
toHaveReturnedTimes(n: number): void
```

```typescript
const mockFn = fn(() => 'ok');
mockFn();
mockFn();
expect(mockFn).toHaveReturnedTimes(2);
```

Negated:

```typescript
expect(mockFn).not.toHaveReturnedTimes(3);
```

### `.toHaveReturnedWith(value)`

Assert the mock returned the specified value at least once. Uses deep equality
with asymmetric matcher support.

```typescript
toHaveReturnedWith(value: unknown): void
```

```typescript
const mockFn = fn(() => 42);
mockFn();
expect(mockFn).toHaveReturnedWith(42);
```

Negated:

```typescript
expect(mockFn).not.toHaveReturnedWith(99);
```

### `.toHaveLastReturnedWith(value)`

Assert the most recent return value from the mock matches the specified value.

```typescript
toHaveLastReturnedWith(value: unknown): void
```

```typescript
const mockFn = fn();
mockFn.mockReturnValueOnce(1).mockReturnValueOnce(2);
mockFn();
mockFn();
expect(mockFn).toHaveLastReturnedWith(2);
```

Negated:

```typescript
expect(mockFn).not.toHaveLastReturnedWith(1);
```

### `.toHaveNthReturnedWith(n, value)`

Assert the nth call (1-indexed) returned the specified value.

```typescript
toHaveNthReturnedWith(n: number, value: unknown): void
```

```typescript
const mockFn = fn();
mockFn.mockReturnValueOnce('a').mockReturnValueOnce('b');
mockFn();
mockFn();
expect(mockFn).toHaveNthReturnedWith(1, 'a');
expect(mockFn).toHaveNthReturnedWith(2, 'b');
```

Negated:

```typescript
expect(mockFn).not.toHaveNthReturnedWith(1, 'b');
```

## Negation

### `.not`

Invert any matcher. Can be chained before any matcher method.

```typescript
expect(1).not.toBe(2);
expect('hello').not.toContain('goodbye');
expect([1, 2]).not.toHaveLength(3);
expect(null).not.toBeUndefined();
expect(() => {}).not.toThrow();
expect({ a: 1 }).not.toEqual({ b: 2 });
```

Toggling `.not` flips the negation state, so `.not.not` is a double negation
that behaves like no negation at all.

## Async

### `.resolves`

Unwrap a resolved promise before applying the matcher. The test function must
be `async` and you must `await` the assertion.

```typescript
it('resolves with a value', async () => {
  await expect(Promise.resolve(42)).resolves.toBe(42);
  await expect(fetchUser(1)).resolves.toHaveProperty('name');
});
```

If the promise rejects, the assertion fails with an error message indicating
the unexpected rejection.

Available matchers on `.resolves`: `toBe`, `toEqual`, `toStrictEqual`,
`toBeTruthy`, `toBeFalsy`, `toBeNull`, `toBeUndefined`, `toBeDefined`,
`toBeNaN`, `toBeInstanceOf`, `toContain`, `toHaveLength`, `toHaveProperty`,
`toMatch`, `toThrow`, `toBeGreaterThan`, `toBeGreaterThanOrEqual`,
`toBeLessThan`, `toBeLessThanOrEqual`, `toBeCloseTo`.

`.resolves.not` is also supported:

```typescript
await expect(Promise.resolve(42)).resolves.not.toBe(0);
```

### `.rejects`

Assert that a promise rejects, then apply matchers to the rejection reason.

```typescript
it('rejects with an error', async () => {
  await expect(Promise.reject(new Error('fail'))).rejects.toThrow('fail');
  await expect(failingFetch()).rejects.toBeInstanceOf(Error);
});
```

If the promise resolves, the assertion fails with an error message indicating
the unexpected resolution.

`.rejects.not` is also supported:

```typescript
await expect(Promise.reject(new Error('x'))).rejects.not.toThrow('y');
```

## Asymmetric Matchers

Asymmetric matchers can be used inside `toEqual`, `toHaveBeenCalledWith`,
`toContainEqual`, and other matchers that perform deep comparison. They
implement an `asymmetricMatch(actual)` method.

### `expect.anything()`

Matches anything except `null` and `undefined`.

```typescript
expect({ a: 1 }).toEqual({ a: expect.anything() });
expect(mockFn).toHaveBeenCalledWith(expect.anything());
```

### `expect.any(constructor)`

Matches values that are instances of the given constructor. For primitive
wrappers (`String`, `Number`, `Boolean`, `BigInt`, `Symbol`, `Function`),
matches the corresponding `typeof` check instead.

```typescript
expect({ id: 1, name: 'Alice' }).toEqual({
  id: expect.any(Number),
  name: expect.any(String),
});
expect(true).toEqual(expect.any(Boolean));
expect(() => {}).toEqual(expect.any(Function));
expect(new Date()).toEqual(expect.any(Date));
```

### `expect.stringContaining(string)`

Matches strings that contain the specified substring.

```typescript
expect({ message: 'hello world' }).toEqual({
  message: expect.stringContaining('world'),
});
```

### `expect.stringMatching(pattern)`

Matches strings that match the given string or regular expression.

```typescript
expect({ email: 'alice@example.com' }).toEqual({
  email: expect.stringMatching(/@example\.com$/),
});
```

### `expect.objectContaining(object)`

Matches objects that contain at least the specified key-value pairs. Supports
nested asymmetric matchers.

```typescript
expect(mockFn).toHaveBeenCalledWith(
  expect.objectContaining({ type: 'click' }),
);
```

### `expect.arrayContaining(array)`

Matches arrays that contain all elements in the specified array (order does
not matter). Each element is compared using deep equality.

```typescript
expect([1, 2, 3, 4]).toEqual(expect.arrayContaining([3, 1]));
```

### `expect.not.objectContaining(object)`

Matches objects that do NOT contain all the specified key-value pairs.

```typescript
expect({ a: 1, b: 2 }).toEqual(
  expect.not.objectContaining({ c: 3 }),
);
```

### `expect.not.arrayContaining(array)`

Matches arrays that do NOT contain all the specified elements.

```typescript
expect([1, 2, 3]).toEqual(expect.not.arrayContaining([4, 5]));
```

### `expect.not.stringContaining(string)`

Matches strings that do NOT contain the specified substring.

```typescript
expect({ msg: 'hello' }).toEqual({
  msg: expect.not.stringContaining('goodbye'),
});
```

### `expect.not.stringMatching(pattern)`

Matches strings that do NOT match the given pattern.

```typescript
expect({ code: 'ABC' }).toEqual({
  code: expect.not.stringMatching(/\d+/),
});
```

## Custom Matchers

### `expect.extend(matchers)`

Register custom matchers. Each matcher function receives the actual value as
its first argument and any additional arguments from the call. It must return
`{ pass: boolean, message: () => string }`.

```typescript
expect.extend(matchers: Record<string, CustomMatcherFn>): void

type CustomMatcherFn = (
  received: unknown,
  ...args: unknown[],
) => { pass: boolean; message: () => string };
```

```typescript
expect.extend({
  toBeEven(received: number) {
    const pass = received % 2 === 0;
    return {
      pass,
      message: () =>
        `Expected ${received} ${pass ? 'not ' : ''}to be even`,
    };
  },
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    return {
      pass,
      message: () =>
        `Expected ${received} ${pass ? 'not ' : ''}to be within [${floor}, ${ceiling}]`,
    };
  },
});

expect(4).toBeEven();
expect(3).not.toBeEven();
expect(50).toBeWithinRange(1, 100);
```

Custom matchers respect `.not` negation automatically.

## Assertion Tracking

### `expect.assertions(count)`

Declare that exactly `count` assertions must be called during the current test.
Useful for verifying assertions inside callbacks or conditional branches
actually execute.

```typescript
expect.assertions(count: number): void
```

```typescript
it('calls both callbacks', () => {
  expect.assertions(2);
  forEach([1, 2], (item) => {
    expect(item).toBeGreaterThan(0);
  });
});
```

If the actual count differs, `expect.verifyAssertions()` throws.

### `expect.hasAssertions()`

Declare that at least one assertion must run during the current test.

```typescript
expect.hasAssertions(): void
```

```typescript
it('makes at least one assertion', async () => {
  expect.hasAssertions();
  const data = await fetchData();
  if (data.length > 0) {
    expect(data[0]).toBeDefined();
  }
});
```

### `expect.getState()`

Return the current assertion tracking state.

```typescript
expect.getState(): {
  assertionCount: number;
  expectedAssertionCount: number | null;
  isExpectingAssertions: boolean;
}
```

### `expect.resetState()`

Reset the assertion counter and expected counts. Call at the start of each test
for clean tracking.

```typescript
expect.resetState(): void
```

### `expect.verifyAssertions()`

Verify that assertion count expectations are met. Throws if
`expect.assertions(n)` was called and the count does not match, or if
`expect.hasAssertions()` was called and no assertions ran. Call at the end of
each test.

```typescript
expect.verifyAssertions(): void
```

## Snapshot Testing

### `.toMatchSnapshot(snapshotName?, hint?, propertyMatchers?)`

Compare the value against a stored snapshot. On first run, the snapshot is
created. On subsequent runs, the value is compared. Negation is not supported.

```typescript
toMatchSnapshot(
  snapshotName?: string,
  hint?: string,
  propertyMatchers?: Record<string, unknown>,
): void
```

```typescript
expect({ name: 'Alice', items: [1, 2, 3] }).toMatchSnapshot();
expect(data).toMatchSnapshot('user data');
```

### `.toMatchInlineSnapshot(inlineSnapshot?)`

Compare the value against an inline snapshot embedded in the test source file.
On first run, the snapshot string is written into the test file.

```typescript
toMatchInlineSnapshot(inlineSnapshot?: string): void
```

```typescript
expect({ greeting: 'hello' }).toMatchInlineSnapshot();
```

### `.toMatchFileSnapshot(filePath)`

Compare the value against a snapshot stored in a separate file.

```typescript
toMatchFileSnapshot(filePath: string): void
```

```typescript
expect(generatedOutput).toMatchFileSnapshot('./fixtures/expected-output.txt');
```

### `.toThrowErrorMatchingSnapshot()`

Assert the function throws, then compare the error message against a stored
snapshot.

```typescript
toThrowErrorMatchingSnapshot(): void
```

```typescript
expect(() => {
  throw new Error('specific error message');
}).toThrowErrorMatchingSnapshot();
```

### `.toThrowErrorMatchingInlineSnapshot(snapshot?)`

Assert the function throws, then compare the error message against an inline
snapshot.

```typescript
toThrowErrorMatchingInlineSnapshot(snapshot?: string): void
```

```typescript
expect(() => {
  throw new Error('something went wrong');
}).toThrowErrorMatchingInlineSnapshot();
```

### Snapshot Auto-Update

Snapshots can be automatically updated when the actual value changes. Use
`setUpdateMode('all')` to update all snapshots during a test run, or
`setUpdateMode('new')` to only create new snapshots without updating existing
ones.

```typescript
import { setUpdateMode, getUpdateMode } from '@asymmetric-effort/nogginlessdom';

setUpdateMode('all');   // Update all snapshots
setUpdateMode('new');   // Only create new, don't update existing
setUpdateMode('none');  // Default: never auto-update
```

## Snapshot Serializers

### `expect.addSnapshotSerializer(serializer)`

Register a custom snapshot serializer. Serializers control how values are
formatted when stored as snapshots.

```typescript
expect.addSnapshotSerializer(serializer: SnapshotSerializer): void

interface SnapshotSerializer {
  test(value: unknown): boolean;
  serialize(
    value: unknown,
    config: SerializeConfig,
    indentation: string,
    depth: number,
    refs: Set<unknown>,
    printer: PrinterFn,
  ): string;
}

interface SerializeConfig {
  indent?: number;
  maxDepth?: number;
  min?: boolean;
  printBasicPrototype?: boolean;
}
```

```typescript
expect.addSnapshotSerializer({
  test(val: unknown): boolean {
    return val instanceof Date;
  },
  serialize(val: unknown): string {
    return `Date(${(val as Date).toISOString()})`;
  },
});

// Now snapshots of Date objects use custom formatting
expect(new Date('2024-01-15')).toMatchSnapshot();
```

The `printer` parameter allows recursively serializing nested values through
the standard serialization pipeline:

```typescript
expect.addSnapshotSerializer({
  test(val) {
    return val instanceof MyClass;
  },
  serialize(val, config, indentation, depth, refs, printer) {
    const obj = val as MyClass;
    return `MyClass(${printer(obj.data, config, indentation, depth + 1, refs)})`;
  },
});
```

## Error Diffs

The diff engine produces colored, human-readable diffs for assertion errors.

### `objectDiff(expected, received, options?)`

Produce a diff between two objects, arrays, or primitives. Shows
`- Expected` (green) / `+ Received` (red) format with nested key-level
granularity.

```typescript
function objectDiff(
  expected: unknown,
  received: unknown,
  options?: DiffOptions,
): string;
```

```typescript
import { objectDiff } from '@asymmetric-effort/nogginlessdom';

const diff = objectDiff(
  { a: 1, b: 2 },
  { a: 1, b: 3, c: 4 },
);
console.log(diff);
//   b:
//     - Expected: 2
//     + Received: 3
//   + c: 4
```

### `stringDiff(expected, received, options?)`

Produce a diff between two strings. Multi-line strings use line-by-line
comparison. Single-line strings show expected vs received with a caret at the
first difference.

```typescript
function stringDiff(
  expected: string,
  received: string,
  options?: DiffOptions,
): string;
```

```typescript
import { stringDiff } from '@asymmetric-effort/nogginlessdom';

const diff = stringDiff('hello world', 'hello earth');
console.log(diff);
```

### `formatExpectedReceived(expected, received, options?)`

Automatically choose the best diff format based on the types of the values.
Uses `stringDiff` for two strings, `objectDiff` for objects, and a simple
expected/received display for primitives.

```typescript
function formatExpectedReceived(
  expected: unknown,
  received: unknown,
  options?: DiffOptions,
): string;
```

### `configureDiff(options)`

Set global diff configuration that applies to all assertion error messages.

```typescript
function configureDiff(options: DiffOptions): void;

interface DiffOptions {
  maxLength?: number;  // Max string length before truncation (default: 1000)
  colorize?: boolean;  // Force color on/off (default: TTY detection)
}
```

```typescript
import { configureDiff } from '@asymmetric-effort/nogginlessdom';

configureDiff({ maxLength: 500, colorize: false });
```

### `getDiffConfig()`

Return the current global diff configuration.

```typescript
function getDiffConfig(): DiffOptions;
```

### ANSI Helpers

Utility functions for colored output, respecting TTY detection:

```typescript
function green(s: string): string;  // Green text
function red(s: string): string;    // Red text
function dim(s: string): string;    // Dimmed text
function bold(s: string): string;   // Bold text
function stripAnsi(s: string): string;  // Remove all ANSI codes
```
