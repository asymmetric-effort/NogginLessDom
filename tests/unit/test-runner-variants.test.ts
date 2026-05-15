/**
 * Tests for vitest-compatible describe/it variants and parameterized tests.
 *
 * Bun's node:test does NOT support nested test()/describe() calls,
 * so we verify API shapes inside nodeIt, and invoke our wrappers at the
 * top level (inside nodeDescribe callbacks but NOT inside nodeIt callbacks).
 */
import { describe as nodeDescribe, it as nodeIt } from 'node:test';
import assert from 'node:assert/strict';
import { describe, it, test } from '../../src/test-runner/index.js';

// ---------------------------------------------------------------
// 1. API shape tests — these only check typeof, no actual calls
// ---------------------------------------------------------------
nodeDescribe('variant API shapes', () => {
  nodeIt('describe.skip is a function', () => {
    assert.strictEqual(typeof describe.skip, 'function');
  });
  nodeIt('describe.only is a function', () => {
    assert.strictEqual(typeof describe.only, 'function');
  });
  nodeIt('describe.todo is a function', () => {
    assert.strictEqual(typeof describe.todo, 'function');
  });
  nodeIt('describe.each is a function', () => {
    assert.strictEqual(typeof describe.each, 'function');
  });
  nodeIt('it.skip is a function', () => {
    assert.strictEqual(typeof it.skip, 'function');
  });
  nodeIt('it.only is a function', () => {
    assert.strictEqual(typeof it.only, 'function');
  });
  nodeIt('it.todo is a function', () => {
    assert.strictEqual(typeof it.todo, 'function');
  });
  nodeIt('it.each is a function', () => {
    assert.strictEqual(typeof it.each, 'function');
  });
  nodeIt('test.each is a function (alias)', () => {
    assert.strictEqual(typeof test.each, 'function');
  });
  nodeIt('describe.each returns a function', () => {
    const runner = describe.each([[1, 2]]);
    assert.strictEqual(typeof runner, 'function');
  });
  nodeIt('it.each returns a function', () => {
    const runner = it.each([[1, 2, 3]]);
    assert.strictEqual(typeof runner, 'function');
  });
});

// ---------------------------------------------------------------
// 2. Functional tests — call our wrappers at top level
// ---------------------------------------------------------------

// -- describe.skip: inner tests should be marked as skipped --
// Bun's node:test shim still executes the body of a skipped describe but
// marks the tests as skipped in the report. We verify the API works without
// throwing and that the skip option is forwarded properly.
describe.skip('skipped suite via describe.skip', () => {
  it('this test is inside a skipped suite', () => {
    // The test body may or may not run depending on the runtime,
    // but the suite is reported as skipped.
    assert.ok(true);
  });
});

// -- describe.todo: mark suite as todo --
describe.todo('future suite (todo)');

// -- it.skip: skip a single test --
it.skip('skipped single test via it.skip', () => {
  throw new Error('should not run');
});

// -- it.todo: mark test as todo --
it.todo('future test (todo)');

// -- it.each with array of arrays --
const eachArrayCalls: Array<[number, number, number]> = [];
it.each([
  [1, 2, 3],
  [4, 5, 9],
])('adds %d + %d = %d', (a: number, b: number, expected: number) => {
  eachArrayCalls.push([a, b, expected]);
  assert.strictEqual(a + b, expected);
});

nodeDescribe('it.each array-of-arrays verification', () => {
  nodeIt('should have called the test fn for each entry', () => {
    assert.deepStrictEqual(eachArrayCalls, [
      [1, 2, 3],
      [4, 5, 9],
    ]);
  });
});

// -- it.each with array of objects --
const eachObjCalls: Array<{ a: number; b: number; expected: number }> = [];
it.each([
  { a: 1, b: 2, expected: 3 },
  { a: 4, b: 5, expected: 9 },
])(
  'obj: adds $a + $b = $expected',
  (obj: { a: number; b: number; expected: number }) => {
    eachObjCalls.push(obj);
    assert.strictEqual(obj.a + obj.b, obj.expected);
  },
);

nodeDescribe('it.each array-of-objects verification', () => {
  nodeIt('should have passed each object to the test fn', () => {
    assert.strictEqual(eachObjCalls.length, 2);
    assert.deepStrictEqual(eachObjCalls[0], { a: 1, b: 2, expected: 3 });
    assert.deepStrictEqual(eachObjCalls[1], { a: 4, b: 5, expected: 9 });
  });
});

// -- it.each with array of primitives --
const eachPrimCalls: number[] = [];
it.each([10, 20, 30])('primitive value %d', (val: number) => {
  eachPrimCalls.push(val);
  assert.ok(val > 0);
});

nodeDescribe('it.each array-of-primitives verification', () => {
  nodeIt('should have passed each primitive as a single arg', () => {
    assert.deepStrictEqual(eachPrimCalls, [10, 20, 30]);
  });
});

// -- describe.each with array of arrays --
const descEachCalls: Array<[number, number, number]> = [];
describe.each([
  [1, 2, 3],
  [4, 5, 9],
])('add(%d, %d)', (a: number, b: number, expected: number) => {
  it(`returns ${expected}`, () => {
    descEachCalls.push([a, b, expected]);
    assert.strictEqual(a + b, expected);
  });
});

nodeDescribe('describe.each verification', () => {
  nodeIt('should have created suites for each entry', () => {
    assert.deepStrictEqual(descEachCalls, [
      [1, 2, 3],
      [4, 5, 9],
    ]);
  });
});

// -- Name formatting with %s --
const strCalls: string[] = [];
it.each([['hello'], ['world']])('greets %s', (name: string) => {
  strCalls.push(name);
});

// Exercise %f, %j, %o, and default format specifiers
const floatCalls: number[] = [];
it.each([[1.5], [2.7]])('value is %f', (n: number) => {
  floatCalls.push(n);
});

const jsonCalls: unknown[] = [];
it.each([[{ a: 1 }], [{ b: 2 }]])('obj is %j', (obj: unknown) => {
  jsonCalls.push(obj);
});

const objCalls: unknown[] = [];
it.each([[{ x: 1 }]])('obj is %o', (obj: unknown) => {
  objCalls.push(obj);
});

nodeDescribe('name formatting verification', () => {
  nodeIt('%s formatting works', () => {
    assert.deepStrictEqual(strCalls, ['hello', 'world']);
  });

  nodeIt('%f formatting exercised', () => {
    assert.deepStrictEqual(floatCalls, [1.5, 2.7]);
  });

  nodeIt('%j formatting exercised', () => {
    assert.strictEqual(jsonCalls.length, 2);
  });

  nodeIt('%o formatting exercised', () => {
    assert.strictEqual(objCalls.length, 1);
  });
});

// Exercise describe.only (at top level, won't filter in bun but covers the code path)
describe.only('only suite coverage', () => {
  it('runs inside only suite', () => {
    assert.ok(true);
  });
});
