import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { expect, argsMatch } from '../../src/assertions/index.js';

describe('assertions – extra coverage', () => {
  // Cover toContainEqual negated
  it('not.toContainEqual passes when item not found', () => {
    expect([{ a: 1 }, { b: 2 }]).not.toContainEqual({ c: 3 });
  });

  // Cover toContainEqual negated failure
  it('not.toContainEqual throws when item found', () => {
    assert.throws(() => {
      expect([{ a: 1 }, { b: 2 }]).not.toContainEqual({ a: 1 });
    });
  });

  // Cover toSatisfy negated
  it('not.toSatisfy passes when predicate returns false', () => {
    expect(5).not.toSatisfy((v) => (v as number) > 10);
  });

  // Cover toBeEmpty with Map
  it('toBeEmpty works with empty Map', () => {
    expect(new Map()).toBeEmpty();
  });

  // Cover toBeEmpty with Set
  it('toBeEmpty works with empty Set', () => {
    expect(new Set()).toBeEmpty();
  });

  // Cover toBeEmpty with non-empty Map (negated)
  it('not.toBeEmpty works with non-empty Map', () => {
    expect(new Map([['a', 1]])).not.toBeEmpty();
  });

  // Cover toBeEmpty with non-object (false case)
  it('toBeEmpty treats non-object/string/array as not empty', () => {
    assert.throws(() => {
      expect(42).toBeEmpty();
    });
  });

  // Cover toBeOneOf negated
  it('not.toBeOneOf passes when value not in list', () => {
    expect(5).not.toBeOneOf([1, 2, 3]);
  });

  // Cover toBeWithin negated
  it('not.toBeWithin passes when value outside range', () => {
    expect(10).not.toBeWithin(0, 5);
  });

  // Cover toThrowWithMessage negated path
  it('not.toThrowWithMessage passes when function does not throw', () => {
    expect(() => {}).not.toThrowWithMessage(Error, 'anything');
  });

  // Cover toThrowWithMessage negated - throws but different type
  it('not.toThrowWithMessage passes with wrong error type', () => {
    expect(() => {
      throw new TypeError('wrong');
    }).not.toThrowWithMessage(RangeError, 'wrong');
  });

  // Cover toThrowWithMessage with RegExp
  it('toThrowWithMessage matches with RegExp', () => {
    expect(() => {
      throw new Error('hello world 42');
    }).toThrowWithMessage(Error, /world \d+/);
  });

  // Cover toHaveNthReturnedWith negated
  it('not.toHaveNthReturnedWith passes when value differs', () => {
    const mockFn = Object.assign((..._args: unknown[]) => 'result', {
      mock: {
        calls: [[]],
        results: [{ type: 'return' as const, value: 'result' }],
        lastCall: [] as unknown[],
        instances: [],
        contexts: [],
      },
    });
    expect(mockFn).not.toHaveNthReturnedWith(1, 'other');
  });

  // Cover toContainAllEntries with Map
  it('toContainAllEntries works with Map', () => {
    const m = new Map<string, number>([
      ['a', 1],
      ['b', 2],
    ]);
    expect(m).toContainAllEntries([
      ['a', 1],
      ['b', 2],
    ]);
  });

  // Cover toContainAllEntries negated
  it('not.toContainAllEntries passes when not all match', () => {
    expect({ a: 1 }).not.toContainAllEntries([
      ['a', 1],
      ['b', 2],
    ]);
  });

  // Cover toContainAnyEntries with Map
  it('toContainAnyEntries works with Map', () => {
    const m = new Map<string, number>([['a', 1]]);
    expect(m).toContainAnyEntries([
      ['a', 1],
      ['c', 3],
    ]);
  });

  // Cover toContainAnyEntries negated
  it('not.toContainAnyEntries passes when none match', () => {
    expect({ a: 1 }).not.toContainAnyEntries([
      ['b', 2],
      ['c', 3],
    ]);
  });

  // Cover toSatisfyAll negated
  it('not.toSatisfyAll passes when not all match', () => {
    expect([1, 2, 3]).not.toSatisfyAll((v) => (v as number) > 2);
  });

  // Cover resolves.toThrow with rejected value matching string
  it('rejects.toThrow matches error message with string', async () => {
    const p = Promise.reject(new Error('test error'));
    await expect(p).rejects.toThrow('test error');
  });

  // Cover rejects.toThrow with RegExp
  it('rejects.toThrow matches error with RegExp', async () => {
    const p = Promise.reject(new Error('test error'));
    await expect(p).rejects.toThrow(/test/);
  });

  // Cover rejects.toThrow with Error object
  it('rejects.toThrow matches error with Error instance', async () => {
    const p = Promise.reject(new Error('specific'));
    await expect(p).rejects.toThrow(new Error('specific'));
  });

  // Cover rejects.toThrow negated with string
  it('rejects.not.toThrow passes when message does not contain string', async () => {
    const p = Promise.reject(new Error('test error'));
    await expect(p).rejects.not.toThrow('different');
  });

  // Cover rejects.toThrow negated without expected
  it('rejects.not.toThrow negated checks for non-Error', async () => {
    const p = Promise.reject('not an error');
    await expect(p).rejects.not.toThrow();
  });

  // Cover rejects.toThrow without expected (just checks is Error)
  it('rejects.toThrow without expected checks value is Error', async () => {
    const p = Promise.reject(new Error('err'));
    await expect(p).rejects.toThrow();
  });

  // Cover resolves path where promise rejects
  it('resolves throws when promise rejects', async () => {
    const p = Promise.reject(new Error('fail'));
    try {
      await expect(p).resolves.toBe('value');
      assert.fail('Should have thrown');
    } catch (err) {
      assert.ok((err as Error).message.includes('Expected promise to resolve'));
    }
  });

  // Cover rejects path where promise resolves
  it('rejects throws when promise resolves', async () => {
    const p = Promise.resolve('ok');
    try {
      await expect(p).rejects.toBe('value');
      assert.fail('Should have thrown');
    } catch (err) {
      assert.ok((err as Error).message.includes('Expected promise to reject'));
    }
  });

  // Cover deepEqualWithAsymmetric depth overflow
  it('toEqual throws on deeply nested structures with asymmetric matchers', () => {
    // Need to use an asymmetric matcher so it goes through deepEqualWithAsymmetric
    let obj: Record<string, unknown> = { val: expect.anything() };
    for (let i = 0; i < 110; i++) {
      obj = { nested: obj };
    }
    let actual: Record<string, unknown> = { val: 1 };
    for (let i = 0; i < 110; i++) {
      actual = { nested: actual };
    }
    assert.throws(() => expect(actual).toEqual(obj), /maximum depth/);
  });

  // Cover deepMatchObject with asymmetric matcher
  it('toMatchObject works with asymmetric matchers', () => {
    expect({ a: 1, b: 'hello' }).toMatchObject({
      a: expect.any(Number),
    });
  });

  // Cover custom matcher via expect.extend
  it('custom matchers work with expect.extend', () => {
    expect.extend({
      toBeEven(received: unknown) {
        const pass = (received as number) % 2 === 0;
        return {
          pass,
          message: () =>
            pass
              ? `Expected ${received} not to be even`
              : `Expected ${received} to be even`,
        };
      },
    });
    (expect(4) as unknown as Record<string, () => void>).toBeEven();
  });

  // Cover custom matcher negated
  it('custom matchers work negated', () => {
    expect.extend({
      toBePositive(received: unknown) {
        const pass = (received as number) > 0;
        return {
          pass,
          message: () =>
            pass
              ? `Expected ${received} not to be positive`
              : `Expected ${received} to be positive`,
        };
      },
    });
    (expect(-1).not as unknown as Record<string, () => void>).toBePositive();
  });

  // Cover expect.not.stringContaining
  it('expect.not.stringContaining works', () => {
    const matcher = expect.not.stringContaining('hello');
    assert.ok(matcher.asymmetricMatch('world'));
    assert.ok(!matcher.asymmetricMatch('hello world'));
  });

  // Cover expect.not.stringMatching
  it('expect.not.stringMatching works', () => {
    const matcher = expect.not.stringMatching(/hello/);
    assert.ok(matcher.asymmetricMatch('world'));
    assert.ok(!matcher.asymmetricMatch('hello'));
  });

  // Cover argsMatch
  it('argsMatch returns false for different lengths', () => {
    assert.strictEqual(argsMatch([1, 2], [1]), false);
  });

  // Cover expect.assertions and verifyAssertions
  it('expect.assertions validates count', () => {
    expect.resetState();
    expect.assertions(2);
    expect(1).toBe(1);
    expect(2).toBe(2);
    expect.verifyAssertions();
    expect.resetState();
  });

  // Cover expect.assertions failure
  it('expect.assertions throws on wrong count', () => {
    expect.resetState();
    expect.assertions(2);
    expect(1).toBe(1);
    assert.throws(
      () => expect.verifyAssertions(),
      /Expected 2 assertions, but 1 were called/,
    );
    expect.resetState();
  });

  // Cover expect.hasAssertions
  it('expect.hasAssertions passes with at least one assertion', () => {
    expect.resetState();
    expect.hasAssertions();
    expect(1).toBe(1);
    expect.verifyAssertions();
    expect.resetState();
  });

  // Cover expect.hasAssertions failure
  it('expect.hasAssertions throws when no assertions called', () => {
    expect.resetState();
    expect.hasAssertions();
    assert.throws(
      () => expect.verifyAssertions(),
      /Expected at least one assertion/,
    );
    expect.resetState();
  });

  // Cover toBeTypeOf with invalid type
  it('toBeTypeOf throws on invalid type', () => {
    assert.throws(() => expect(1).toBeTypeOf('integer'), /Invalid type/);
  });

  // Cover toBeTypeOf negated
  it('not.toBeTypeOf passes when types differ', () => {
    expect('hello').not.toBeTypeOf('number');
  });

  // Cover not.toMatchObject
  it('not.toMatchObject passes when object does not match', () => {
    expect({ a: 1 }).not.toMatchObject({ b: 2 });
  });

  // Cover deepMatchObject with arrays
  it('toMatchObject works with arrays', () => {
    expect([1, 2, 3]).toMatchObject([1, 2]);
  });

  // Cover deepMatchObject - array expected, non-array actual
  it('toMatchObject throws when expected array but actual is not', () => {
    assert.throws(() => {
      expect({ a: 1 }).toMatchObject([1, 2]);
    });
  });

  // Cover async matchers - toBeCloseTo
  it('resolves.toBeCloseTo works', async () => {
    await expect(Promise.resolve(0.1 + 0.2)).resolves.toBeCloseTo(0.3, 5);
  });

  // Cover not.toHaveBeenCalledOnce
  it('not.toHaveBeenCalledOnce passes when not called once', () => {
    const mockFn = Object.assign(() => {}, {
      mock: {
        calls: [[], []],
        results: [] as Array<{ type: string; value: unknown }>,
        lastCall: undefined,
        instances: [],
        contexts: [],
      },
    });
    expect(mockFn).not.toHaveBeenCalledOnce();
  });

  // Cover async toThrow with function that throws (negated with string) - lines 371-378
  it('resolves.not.toThrow with string checks error message', async () => {
    const throwFn = () => {
      throw new Error('bad thing');
    };
    await expect(Promise.resolve(throwFn)).resolves.not.toThrow('different');
  });

  // Cover async toThrow with function that throws (with string expected) - lines 384-393
  it('resolves.toThrow with string matches error message', async () => {
    const throwFn = () => {
      throw new Error('expected error');
    };
    await expect(Promise.resolve(throwFn)).resolves.toThrow('expected error');
  });

  // Cover async toThrow with function that throws (with RegExp) - line 395-396
  it('resolves.toThrow with RegExp matches', async () => {
    const throwFn = () => {
      throw new Error('test 123');
    };
    await expect(Promise.resolve(throwFn)).resolves.toThrow(/test \d+/);
  });

  // Cover async toThrow with function that throws (with Error) - line 397-398
  it('resolves.toThrow with Error object matches message', async () => {
    const throwFn = () => {
      throw new Error('specific');
    };
    await expect(Promise.resolve(throwFn)).resolves.toThrow(
      new Error('specific'),
    );
  });

  // Cover async toThrow with function (no expected, negated) - line 381
  it('resolves.not.toThrow with no expected uses doesNotThrow', async () => {
    const noThrowFn = () => 42;
    await expect(Promise.resolve(noThrowFn)).resolves.not.toThrow();
  });

  // Cover async toThrow with function (no expected) - line 401
  it('resolves.toThrow with no expected checks any throw', async () => {
    const throwFn = () => {
      throw new Error('any');
    };
    await expect(Promise.resolve(throwFn)).resolves.toThrow();
  });

  // Cover getMockState error path - line 501
  it('toHaveBeenCalled throws for non-mock value', () => {
    assert.throws(
      () => expect('not a function').toHaveBeenCalled(),
      /Value is not a mock function/,
    );
  });

  // Cover negated toEqual with asymmetric matchers - line 570
  it('not.toEqual with asymmetric matchers works', () => {
    expect({ a: 1 }).not.toEqual({ a: expect.any(String) });
  });

  // Cover expect.getState - lines 1477-1483
  it('expect.getState returns current tracking state', () => {
    expect.resetState();
    expect.assertions(5);
    expect.hasAssertions();
    const state = expect.getState();
    assert.strictEqual(state.expectedAssertionCount, 5);
    assert.strictEqual(state.isExpectingAssertions, true);
    assert.strictEqual(state.assertionCount, 0);
    expect.resetState();
  });

  // Cover toMatchFileSnapshot through expect() - lines 1264-1265
  it('toMatchFileSnapshot through expect throws for path outside project', () => {
    assert.throws(
      () => expect('test data').toMatchFileSnapshot('../../../etc/passwd'),
      /must be within the project directory/,
    );
  });
});
