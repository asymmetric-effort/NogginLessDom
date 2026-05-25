# Assertions API Reference

The assertions module wraps Node.js's built-in `node:assert` module to provide
a full-featured `expect()` API with 30+ chainable matchers, asymmetric
matchers, assertion tracking, snapshot testing, and custom matcher support.

```typescript
import { expect } from '@asymmetric-effort/nogginlessdom';
```

## `expect(value)`

Create an expectation object for the given value. Chain matchers to make
assertions.

```typescript
expect(actual).toBe(expected);
```

## Equality Matchers

### `.toBe(expected)`

Assert strict equality (`===`). Use for primitives and reference identity.

```typescript
expect(1 + 1).toBe(2);
expect('hello').toBe('hello');
expect(true).toBe(true);

// Objects are compared by reference, not value
const obj = { a: 1 };
expect(obj).toBe(obj); // passes -- same reference
```

**Maps to:** `assert.strictEqual(actual, expected)`

### `.toEqual(expected)`

Assert deep equality. Recursively compares all properties of objects and arrays.
Does not check for strict prototype equality. Supports asymmetric matchers
within the expected value.

```typescript
expect({ a: 1, b: [2, 3] }).toEqual({ a: 1, b: [2, 3] });
expect([1, 2, 3]).toEqual([1, 2, 3]);

// With asymmetric matchers
expect({ name: 'Alice', age: 30 }).toEqual({
  name: expect.any(String),
  age: expect.any(Number),
});
```

**Maps to:** `assert.deepStrictEqual(actual, expected)`

### `.toStrictEqual(expected)`

Assert strict deep equality. Like `toEqual`, but also checks that objects have
the same prototype chain and that there are no undefined properties that exist
in one but not the other.

```typescript
class Point {
  constructor(public x: number, public y: number) {}
}

expect(new Point(1, 2)).toStrictEqual(new Point(1, 2)); // passes
expect(new Point(1, 2)).toStrictEqual({ x: 1, y: 2 }); // fails -- different prototype
```

**Maps to:** `assert.deepStrictEqual(actual, expected)` with additional
prototype checking.

## Truthiness Matchers

### `.toBeTruthy()`

Assert the value is truthy (i.e., not `false`, `0`, `""`, `null`, `undefined`,
or `NaN`).

```typescript
expect(1).toBeTruthy();
expect('non-empty').toBeTruthy();
expect([]).toBeTruthy(); // arrays are truthy, even empty ones
```

### `.toBeFalsy()`

Assert the value is falsy.

```typescript
expect(0).toBeFalsy();
expect('').toBeFalsy();
expect(null).toBeFalsy();
expect(undefined).toBeFalsy();
```

### `.toBeNull()`

Assert the value is exactly `null`.

```typescript
expect(null).toBeNull();
expect(undefined).not.toBeNull(); // undefined is not null
```

**Maps to:** `assert.strictEqual(actual, null)`

### `.toBeUndefined()`

Assert the value is exactly `undefined`.

```typescript
expect(undefined).toBeUndefined();
const obj: Record<string, unknown> = {};
expect(obj.missing).toBeUndefined();
```

**Maps to:** `assert.strictEqual(actual, undefined)`

### `.toBeDefined()`

Assert the value is not `undefined`. Note that `null` is considered "defined".

```typescript
expect(null).toBeDefined(); // passes -- null is not undefined
expect(42).toBeDefined();
```

**Maps to:** `assert.notStrictEqual(actual, undefined)`

### `.toBeNaN()`

Assert the value is `NaN`.

```typescript
expect(NaN).toBeNaN();
expect(parseInt('not a number')).toBeNaN();
```

## Type Matchers

### `.toBeInstanceOf(constructor)`

Assert the value is an instance of the given constructor.

```typescript
expect(new Date()).toBeInstanceOf(Date);
expect(new Error('fail')).toBeInstanceOf(Error);
expect([1, 2, 3]).toBeInstanceOf(Array);
```

### `.toBeTypeOf(type)`

Assert the `typeof` the value matches the given type string. Valid types:
`'string'`, `'number'`, `'boolean'`, `'function'`, `'object'`, `'undefined'`,
`'symbol'`, `'bigint'`.

```typescript
expect('hello').toBeTypeOf('string');
expect(42).toBeTypeOf('number');
expect(true).toBeTypeOf('boolean');
expect(() => {}).toBeTypeOf('function');
expect(null).toBeTypeOf('object');
expect(Symbol()).toBeTypeOf('symbol');
expect(BigInt(42)).toBeTypeOf('bigint');
```

## Collection Matchers

### `.toContain(item)`

Assert an array or string contains the given item. For arrays, uses strict
equality. For strings, checks for substring inclusion.

```typescript
expect([1, 2, 3]).toContain(2);
expect('hello world').toContain('world');
```

### `.toContainEqual(expected)`

Assert an array contains an element that is deeply equal to the expected value.
Unlike `toContain`, this uses deep equality comparison and supports asymmetric
matchers.

```typescript
expect([{ a: 1 }, { b: 2 }]).toContainEqual({ a: 1 });
expect([{ name: 'Alice' }]).toContainEqual(
  expect.objectContaining({ name: 'Alice' }),
);
```

### `.toHaveLength(length)`

Assert an array or string has the given length.

```typescript
expect([1, 2, 3]).toHaveLength(3);
expect('hello').toHaveLength(5);
expect([]).toHaveLength(0);
```

### `.toHaveProperty(key, value?)`

Assert an object has the given property. Optionally check the property's value.

```typescript
const user = { name: 'Alice', address: { city: 'Portland' } };

expect(user).toHaveProperty('name');
expect(user).toHaveProperty('name', 'Alice');
expect(user).toHaveProperty('address');
```

### `.toMatchObject(expected)`

Assert that an object contains all the key-value pairs in `expected`. The
actual object may have additional properties -- only the specified properties
are checked (partial/subset matching). Supports nested objects and asymmetric
matchers.

```typescript
expect({ a: 1, b: 2, c: 3 }).toMatchObject({ a: 1, b: 2 });
expect({ user: { name: 'Alice', age: 30 } }).toMatchObject({
  user: { name: 'Alice' },
});
```

## String Matchers

### `.toMatch(pattern)`

Assert a string matches the given regular expression or contains the given
substring.

```typescript
expect('hello world').toMatch(/hello/);
expect('hello world').toMatch('world');
expect('2024-01-15').toMatch(/\d{4}-\d{2}-\d{2}/);
```

## Numeric Matchers

### `.toBeGreaterThan(number)`

Assert the value is greater than the given number.

```typescript
expect(10).toBeGreaterThan(5);
expect(0.2).toBeGreaterThan(0.1);
```

### `.toBeGreaterThanOrEqual(number)`

Assert the value is greater than or equal to the given number.

```typescript
expect(10).toBeGreaterThanOrEqual(10);
expect(11).toBeGreaterThanOrEqual(10);
```

### `.toBeLessThan(number)`

Assert the value is less than the given number.

```typescript
expect(5).toBeLessThan(10);
```

### `.toBeLessThanOrEqual(number)`

Assert the value is less than or equal to the given number.

```typescript
expect(10).toBeLessThanOrEqual(10);
expect(9).toBeLessThanOrEqual(10);
```

### `.toBeCloseTo(number, precision?)`

Assert a floating-point number is close to the expected value within a given
precision. The default precision is 2 (i.e., numbers must be within
`0.5 * 10^-2` of each other). This is essential for floating-point arithmetic
where exact equality is unreliable.

```typescript
expect(0.1 + 0.2).toBeCloseTo(0.3);
expect(1.005).toBeCloseTo(1.0, 2); // within 0.005
```

## Exception Matchers

### `.toThrow(expected?)`

Assert that a function throws an error. Optionally check the error message or
error type.

```typescript
// Assert any throw
expect(() => {
  throw new Error('oops');
}).toThrow();

// Assert by message string
expect(() => {
  throw new Error('not found');
}).toThrow('not found');

// Assert by regex
expect(() => {
  throw new Error('Connection refused at port 8080');
}).toThrow(/port \d+/);

// Assert by error type
expect(() => {
  throw new TypeError('bad type');
}).toThrow(TypeError);
```

**Maps to:** `assert.throws(fn)` or `assert.throws(fn, expected)`

## Custom Predicate Matcher

### `.toSatisfy(predicate)`

Assert the value satisfies a custom predicate function. The predicate receives
the actual value and must return `true` or `false`.

```typescript
expect(42).toSatisfy((n: number) => n > 0 && n < 100);
expect('hello').toSatisfy((s: string) => s.startsWith('h'));
```

## Mock Matchers

These matchers work with mock functions created by `fn()` or `spyOn()`.

### `.toHaveBeenCalled()`

Assert the mock was called at least once.

```typescript
const mockFn = fn();
mockFn();
expect(mockFn).toHaveBeenCalled();
```

### `.toHaveBeenCalledTimes(n)`

Assert the mock was called exactly `n` times.

```typescript
const mockFn = fn();
mockFn();
mockFn();
expect(mockFn).toHaveBeenCalledTimes(2);
```

### `.toHaveBeenCalledWith(...args)`

Assert the mock was called at least once with the specified arguments.
Supports asymmetric matchers.

```typescript
const mockFn = fn();
mockFn('hello', 42);
expect(mockFn).toHaveBeenCalledWith('hello', 42);
expect(mockFn).toHaveBeenCalledWith(expect.any(String), expect.any(Number));
```

### `.toHaveBeenLastCalledWith(...args)`

Assert the most recent call to the mock used the specified arguments.

```typescript
const mockFn = fn();
mockFn('first');
mockFn('second');
expect(mockFn).toHaveBeenLastCalledWith('second');
```

### `.toHaveBeenNthCalledWith(n, ...args)`

Assert the nth call (1-indexed) to the mock used the specified arguments.

```typescript
const mockFn = fn();
mockFn('a');
mockFn('b');
mockFn('c');
expect(mockFn).toHaveBeenNthCalledWith(2, 'b');
```

### `.toHaveBeenCalledOnce()`

Assert the mock was called exactly once.

```typescript
const mockFn = fn();
mockFn();
expect(mockFn).toHaveBeenCalledOnce();
```

### `.toHaveReturned()`

Assert the mock returned at least once (did not throw).

```typescript
const mockFn = fn(() => 42);
mockFn();
expect(mockFn).toHaveReturned();
```

### `.toHaveReturnedTimes(n)`

Assert the mock returned exactly `n` times.

### `.toHaveReturnedWith(value)`

Assert the mock returned the specified value at least once. Supports asymmetric
matchers.

### `.toHaveLastReturnedWith(value)`

Assert the most recent return value matches the specified value.

## Snapshot Matchers

### `.toMatchSnapshot(snapshotName?, hint?, propertyMatchers?)`

Compare the value against a stored snapshot. On first run, the snapshot is
created. On subsequent runs, the value is compared against the stored snapshot.

```typescript
expect({ name: 'Alice', items: [1, 2, 3] }).toMatchSnapshot();
expect(data).toMatchSnapshot('custom name');
```

### `.toMatchInlineSnapshot(inlineSnapshot?)`

Compare the value against an inline snapshot string. On first run, the snapshot
is written into the test file itself.

```typescript
expect({ greeting: 'hello' }).toMatchInlineSnapshot();
```

### `.toMatchFileSnapshot(filePath)`

Compare the value against a snapshot stored in a separate file.

```typescript
expect(generatedOutput).toMatchFileSnapshot('./fixtures/expected-output.txt');
```

### `.toThrowErrorMatchingSnapshot()`

Assert the function throws, then compare the error message against a stored
snapshot.

```typescript
expect(() => {
  throw new Error('specific error message');
}).toThrowErrorMatchingSnapshot();
```

### `.toThrowErrorMatchingInlineSnapshot(snapshot?)`

Assert the function throws, then compare the error message against an inline
snapshot.

```typescript
expect(() => {
  throw new Error('something went wrong');
}).toThrowErrorMatchingInlineSnapshot();
```

## Modifiers

### `.not`

Invert the assertion. Can be chained before most matchers.

```typescript
expect(1).not.toBe(2);
expect('hello').not.toContain('goodbye');
expect([1, 2]).not.toHaveLength(3);
expect(null).not.toBeUndefined();
expect(() => {}).not.toThrow();
expect({ a: 1 }).not.toEqual({ b: 2 });
```

**Maps to:** The corresponding `assert.not*` variant (e.g.,
`assert.notStrictEqual`, `assert.notDeepStrictEqual`, `assert.doesNotThrow`).

### `.resolves`

Unwrap a resolved promise before applying the matcher. The test function must
be `async` and you must `await` the assertion.

```typescript
it('should resolve with a value', async () => {
  const promise = Promise.resolve(42);
  await expect(promise).resolves.toBe(42);
});

it('should resolve with an object', async () => {
  const promise = fetchUser(1);
  await expect(promise).resolves.toHaveProperty('name');
});
```

### `.rejects`

Assert that a promise rejects, then optionally apply matchers to the rejection
reason.

```typescript
it('should reject with an error', async () => {
  const promise = Promise.reject(new Error('network failure'));
  await expect(promise).rejects.toThrow('network failure');
});
```

**Maps to:** `assert.rejects(promise)` or `assert.rejects(promise, expected)`

## Asymmetric Matchers

Asymmetric matchers can be used inside `toEqual`, `toHaveBeenCalledWith`, and
other matchers that perform deep comparison.

### `expect.anything()`

Matches anything except `null` and `undefined`.

```typescript
expect({ a: 1 }).toEqual({ a: expect.anything() });
```

### `expect.any(constructor)`

Matches values that are instances of the given constructor, or primitive types
for `String`, `Number`, `Boolean`, `BigInt`, `Symbol`, and `Function`.

```typescript
expect({ id: 1, name: 'Alice' }).toEqual({
  id: expect.any(Number),
  name: expect.any(String),
});
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

Matches objects that contain at least the specified key-value pairs.

```typescript
expect(fn).toHaveBeenCalledWith(
  expect.objectContaining({ type: 'click' }),
);
```

### `expect.arrayContaining(array)`

Matches arrays that contain all elements in the specified array.

```typescript
expect([1, 2, 3, 4]).toEqual(expect.arrayContaining([1, 3]));
```

### `expect.not.*`

Negated asymmetric matchers: `expect.not.objectContaining()`,
`expect.not.arrayContaining()`, `expect.not.stringContaining()`,
`expect.not.stringMatching()`.

```typescript
expect([1, 2, 3]).toEqual(expect.not.arrayContaining([4, 5]));
```

## Custom Matchers

### `expect.extend(matchers)`

Register custom matchers that can be used with `expect()`. Each matcher
receives the actual value and must return `{ pass, message }`.

```typescript
expect.extend({
  toBeEven(received: number) {
    const pass = received % 2 === 0;
    return {
      pass,
      message: () => `Expected ${received} ${pass ? 'not ' : ''}to be even`,
    };
  },
});

expect(4).toBeEven();
expect(3).not.toBeEven();
```

## Snapshot Serializers

### `expect.addSnapshotSerializer(serializer)`

Register a custom snapshot serializer.

```typescript
expect.addSnapshotSerializer({
  test(val: unknown): boolean {
    return val instanceof Date;
  },
  serialize(val: unknown): string {
    return `Date(${(val as Date).toISOString()})`;
  },
});
```

## Assertion Tracking

### `expect.assertions(count)`

Assert that exactly `count` assertions are called during the test. Useful for
verifying that assertions inside callbacks or async code actually run.

```typescript
it('should call both callbacks', () => {
  expect.assertions(2);
  forEach([1, 2], (item) => {
    expect(item).toBeGreaterThan(0);
  });
});
```

### `expect.hasAssertions()`

Assert that at least one assertion is called during the test.

```typescript
it('should make at least one assertion', async () => {
  expect.hasAssertions();
  const data = await fetchData();
  if (data.length > 0) {
    expect(data[0]).toBeDefined();
  }
});
```

## Mapping to node:assert

| Matcher                   | node:assert equivalent               |
| ------------------------- | ------------------------------------ |
| `.toBe(x)`                | `assert.strictEqual(a, x)`           |
| `.not.toBe(x)`            | `assert.notStrictEqual(a, x)`        |
| `.toEqual(x)`             | `assert.deepStrictEqual(a, x)`       |
| `.not.toEqual(x)`         | `assert.notDeepStrictEqual(a, x)`    |
| `.toBeTruthy()`           | `assert.ok(a)`                       |
| `.toBeFalsy()`            | `assert.ok(!a)`                      |
| `.toBeNull()`             | `assert.strictEqual(a, null)`        |
| `.toBeUndefined()`        | `assert.strictEqual(a, undefined)`   |
| `.toBeDefined()`          | `assert.notStrictEqual(a, undefined)`|
| `.toThrow()`              | `assert.throws(a)`                   |
| `.not.toThrow()`          | `assert.doesNotThrow(a)`             |
| `.rejects.toThrow()`      | `assert.rejects(a)`                  |
