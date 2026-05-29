import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { expect } from '../../src/assertions/index.js';
import { fn } from '../../src/mocking/index.js';

describe('toBeEmpty', () => {
  it('should pass for empty string', () => {
    expect('').toBeEmpty();
  });

  it('should fail for non-empty string', () => {
    assert.throws(() => expect('hello').toBeEmpty());
  });

  it('should pass for empty array', () => {
    expect([]).toBeEmpty();
  });

  it('should fail for non-empty array', () => {
    assert.throws(() => expect([1]).toBeEmpty());
  });

  it('should pass for empty object', () => {
    expect({}).toBeEmpty();
  });

  it('should fail for non-empty object', () => {
    assert.throws(() => expect({ a: 1 }).toBeEmpty());
  });

  it('should pass for empty Map', () => {
    expect(new Map()).toBeEmpty();
  });

  it('should fail for non-empty Map', () => {
    assert.throws(() => expect(new Map([['a', 1]])).toBeEmpty());
  });

  it('should pass for empty Set', () => {
    expect(new Set()).toBeEmpty();
  });

  it('should fail for non-empty Set', () => {
    assert.throws(() => expect(new Set([1])).toBeEmpty());
  });

  it('should support .not negation', () => {
    expect('hello').not.toBeEmpty();
    expect([1, 2]).not.toBeEmpty();
    expect({ a: 1 }).not.toBeEmpty();
  });

  it('.not should fail for empty values', () => {
    assert.throws(() => expect('').not.toBeEmpty());
    assert.throws(() => expect([]).not.toBeEmpty());
    assert.throws(() => expect({}).not.toBeEmpty());
  });
});

describe('toBeOneOf', () => {
  it('should pass when value is in the array', () => {
    expect(1).toBeOneOf([1, 2, 3]);
  });

  it('should fail when value is not in the array', () => {
    assert.throws(() => expect(4).toBeOneOf([1, 2, 3]));
  });

  it('should use strict equality', () => {
    assert.throws(() => expect('1').toBeOneOf([1, 2, 3]));
  });

  it('should work with strings', () => {
    expect('b').toBeOneOf(['a', 'b', 'c']);
  });

  it('should support .not negation', () => {
    expect(4).not.toBeOneOf([1, 2, 3]);
  });

  it('.not should fail when value is found', () => {
    assert.throws(() => expect(1).not.toBeOneOf([1, 2, 3]));
  });
});

describe('toBeWithin', () => {
  it('should pass when value is in [start, end)', () => {
    expect(5).toBeWithin(1, 10);
  });

  it('should pass for start boundary (inclusive)', () => {
    expect(1).toBeWithin(1, 10);
  });

  it('should fail for end boundary (exclusive)', () => {
    assert.throws(() => expect(10).toBeWithin(1, 10));
  });

  it('should fail when value is out of range', () => {
    assert.throws(() => expect(0).toBeWithin(1, 10));
  });

  it('should support .not negation', () => {
    expect(10).not.toBeWithin(1, 10);
    expect(0).not.toBeWithin(1, 10);
  });

  it('.not should fail when value is in range', () => {
    assert.throws(() => expect(5).not.toBeWithin(1, 10));
  });
});

describe('toThrowWithMessage', () => {
  it('should pass for matching error type and string message', () => {
    expect(() => {
      throw new TypeError('invalid type');
    }).toThrowWithMessage(TypeError, 'invalid type');
  });

  it('should pass for matching error type and regex message', () => {
    expect(() => {
      throw new RangeError('out of range');
    }).toThrowWithMessage(RangeError, /out of/);
  });

  it('should fail for wrong error type', () => {
    assert.throws(() =>
      expect(() => {
        throw new TypeError('msg');
      }).toThrowWithMessage(RangeError, 'msg'),
    );
  });

  it('should fail for wrong message', () => {
    assert.throws(() =>
      expect(() => {
        throw new TypeError('actual');
      }).toThrowWithMessage(TypeError, 'expected'),
    );
  });

  it('should fail when function does not throw', () => {
    assert.throws(() => expect(() => {}).toThrowWithMessage(Error, 'msg'));
  });

  it('should support .not negation', () => {
    expect(() => {
      throw new TypeError('actual');
    }).not.toThrowWithMessage(RangeError, 'actual');
  });

  it('.not should pass when nothing is thrown', () => {
    expect(() => {}).not.toThrowWithMessage(Error, 'anything');
  });

  it('.not should fail when type and message both match', () => {
    assert.throws(() =>
      expect(() => {
        throw new Error('exact');
      }).not.toThrowWithMessage(Error, 'exact'),
    );
  });
});

describe('toHaveNthReturnedWith', () => {
  it('should pass for matching nth return value', () => {
    const mockFn = fn((x: number) => x * 2);
    mockFn(1);
    mockFn(2);
    mockFn(3);
    expect(mockFn).toHaveNthReturnedWith(1, 2);
    expect(mockFn).toHaveNthReturnedWith(2, 4);
    expect(mockFn).toHaveNthReturnedWith(3, 6);
  });

  it('should fail for non-matching value', () => {
    const mockFn = fn(() => 'hello');
    mockFn();
    assert.throws(() => expect(mockFn).toHaveNthReturnedWith(1, 'world'));
  });

  it('should support .not negation', () => {
    const mockFn = fn(() => 42);
    mockFn();
    expect(mockFn).not.toHaveNthReturnedWith(1, 99);
  });

  it('.not should fail when it matches', () => {
    const mockFn = fn(() => 42);
    mockFn();
    assert.throws(() => expect(mockFn).not.toHaveNthReturnedWith(1, 42));
  });
});

describe('toContainAllEntries', () => {
  it('should pass when object contains all entries', () => {
    expect({ a: 1, b: 2, c: 3 }).toContainAllEntries([
      ['a', 1],
      ['b', 2],
    ]);
  });

  it('should fail when object is missing an entry', () => {
    assert.throws(() =>
      expect({ a: 1 }).toContainAllEntries([
        ['a', 1],
        ['b', 2],
      ]),
    );
  });

  it('should fail when value does not match', () => {
    assert.throws(() => expect({ a: 1 }).toContainAllEntries([['a', 2]]));
  });

  it('should work with Maps', () => {
    const map = new Map<string, number>([
      ['x', 10],
      ['y', 20],
    ]);
    expect(map).toContainAllEntries([
      ['x', 10],
      ['y', 20],
    ]);
  });

  it('should fail for Maps with missing entries', () => {
    const map = new Map([['x', 10]]);
    assert.throws(() =>
      expect(map).toContainAllEntries([
        ['x', 10],
        ['y', 20],
      ]),
    );
  });

  it('should support .not negation', () => {
    expect({ a: 1 }).not.toContainAllEntries([
      ['a', 1],
      ['b', 2],
    ]);
  });

  it('.not should fail when all entries are present', () => {
    assert.throws(() =>
      expect({ a: 1, b: 2 }).not.toContainAllEntries([
        ['a', 1],
        ['b', 2],
      ]),
    );
  });
});

describe('toContainAnyEntries', () => {
  it('should pass when object contains at least one entry', () => {
    expect({ a: 1, b: 2 }).toContainAnyEntries([
      ['a', 1],
      ['c', 3],
    ]);
  });

  it('should fail when object contains none of the entries', () => {
    assert.throws(() =>
      expect({ a: 1 }).toContainAnyEntries([
        ['b', 2],
        ['c', 3],
      ]),
    );
  });

  it('should work with Maps', () => {
    const map = new Map([
      ['a', 1],
      ['b', 2],
    ]);
    expect(map).toContainAnyEntries([
      ['a', 1],
      ['x', 99],
    ]);
  });

  it('should fail for Maps with no matching entries', () => {
    const map = new Map([['a', 1]]);
    assert.throws(() => expect(map).toContainAnyEntries([['b', 2]]));
  });

  it('should support .not negation', () => {
    expect({ a: 1 }).not.toContainAnyEntries([
      ['b', 2],
      ['c', 3],
    ]);
  });

  it('.not should fail when at least one entry matches', () => {
    assert.throws(() =>
      expect({ a: 1 }).not.toContainAnyEntries([
        ['a', 1],
        ['b', 2],
      ]),
    );
  });
});

describe('toSatisfyAll', () => {
  it('should pass when all elements satisfy the predicate', () => {
    expect([2, 4, 6]).toSatisfyAll((x) => (x as number) % 2 === 0);
  });

  it('should fail when not all elements satisfy the predicate', () => {
    assert.throws(() =>
      expect([2, 3, 6]).toSatisfyAll((x) => (x as number) % 2 === 0),
    );
  });

  it('should pass for empty array', () => {
    expect([]).toSatisfyAll(() => false);
  });

  it('should support .not negation', () => {
    expect([2, 3, 6]).not.toSatisfyAll((x) => (x as number) % 2 === 0);
  });

  it('.not should fail when all satisfy', () => {
    assert.throws(() =>
      expect([2, 4, 6]).not.toSatisfyAll((x) => (x as number) % 2 === 0),
    );
  });
});
