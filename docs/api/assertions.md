# Assertions API Reference

The assertions module wraps Node.js's built-in `node:assert` module to provide
a full-featured `expect()` API with chainable matchers.

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
Does not check for strict prototype equality.

```typescript
expect({ a: 1, b: [2, 3] }).toEqual({ a: 1, b: [2, 3] });
expect([1, 2, 3]).toEqual([1, 2, 3]);
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

## Collection Matchers

### `.toContain(item)`

Assert an array or string contains the given item. For arrays, uses strict
equality. For strings, checks for substring inclusion.

```typescript
expect([1, 2, 3]).toContain(2);
expect('hello world').toContain('world');
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
precision. The default precision is 5 (i.e., numbers must be within
`0.5 * 10^-5` of each other). This is essential for floating-point arithmetic
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

## Modifiers

### `.not`

Invert the assertion. Can be chained before any matcher.

```typescript
expect(1).not.toBe(2);
expect('hello').not.toContain('goodbye');
expect([1, 2]).not.toHaveLength(3);
expect(null).not.toBeDefined(); // null IS defined, so this fails
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
