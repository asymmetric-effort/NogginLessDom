import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { expect } from '../../src/assertions/index.js';
import { fn } from '../../src/mocking/index.js';

describe('asymmetric matchers', () => {
  describe('expect.anything()', () => {
    it('should match any non-null/undefined value', () => {
      expect(42).toEqual(expect.anything());
      expect('hello').toEqual(expect.anything());
      expect(true).toEqual(expect.anything());
      expect({}).toEqual(expect.anything());
      expect([]).toEqual(expect.anything());
      expect(0).toEqual(expect.anything());
      expect('').toEqual(expect.anything());
    });

    it('should not match null or undefined', () => {
      assert.throws(() => expect(null).toEqual(expect.anything()));
      assert.throws(() => expect(undefined).toEqual(expect.anything()));
    });
  });

  describe('expect.any()', () => {
    it('should match instances of Number', () => {
      expect(42).toEqual(expect.any(Number));
    });

    it('should match instances of String', () => {
      expect('hello').toEqual(expect.any(String));
    });

    it('should match instances of Boolean', () => {
      expect(true).toEqual(expect.any(Boolean));
    });

    it('should match instances of Array', () => {
      expect([1, 2]).toEqual(expect.any(Array));
    });

    it('should match instances of Object', () => {
      expect({ a: 1 }).toEqual(expect.any(Object));
    });

    it('should not match wrong type', () => {
      assert.throws(() => expect(42).toEqual(expect.any(String)));
    });
  });

  describe('expect.stringContaining()', () => {
    it('should match strings containing substring', () => {
      expect('hello world').toEqual(expect.stringContaining('world'));
    });

    it('should not match strings without substring', () => {
      assert.throws(() =>
        expect('hello').toEqual(expect.stringContaining('world')),
      );
    });
  });

  describe('expect.stringMatching()', () => {
    it('should match strings matching regex', () => {
      expect('hello world').toEqual(expect.stringMatching(/world$/));
    });

    it('should match strings matching string pattern', () => {
      expect('hello world').toEqual(expect.stringMatching('world'));
    });

    it('should not match non-matching strings', () => {
      assert.throws(() =>
        expect('hello').toEqual(expect.stringMatching(/world/)),
      );
    });
  });

  describe('expect.objectContaining()', () => {
    it('should match objects containing subset of properties', () => {
      expect({ a: 1, b: 2, c: 3 }).toEqual(
        expect.objectContaining({ a: 1, b: 2 }),
      );
    });

    it('should fail when property values differ', () => {
      assert.throws(() =>
        expect({ a: 1, b: 2 }).toEqual(expect.objectContaining({ a: 99 })),
      );
    });

    it('should fail when property is missing', () => {
      assert.throws(() =>
        expect({ a: 1 }).toEqual(expect.objectContaining({ b: 2 })),
      );
    });

    it('should support nested asymmetric matchers', () => {
      expect({ a: 1, b: 'hello' }).toEqual(
        expect.objectContaining({ b: expect.stringContaining('ell') }),
      );
    });
  });

  describe('expect.arrayContaining()', () => {
    it('should match arrays containing all expected items', () => {
      expect([1, 2, 3, 4]).toEqual(expect.arrayContaining([2, 4]));
    });

    it('should fail when items are missing', () => {
      assert.throws(() => expect([1, 2]).toEqual(expect.arrayContaining([3])));
    });
  });

  describe('expect.not.objectContaining()', () => {
    it('should match objects NOT containing the subset', () => {
      expect({ a: 1 }).toEqual(expect.not.objectContaining({ b: 2 }));
    });

    it('should fail when object contains the subset', () => {
      assert.throws(() =>
        expect({ a: 1, b: 2 }).toEqual(expect.not.objectContaining({ a: 1 })),
      );
    });
  });

  describe('expect.not.arrayContaining()', () => {
    it('should match arrays NOT containing all items', () => {
      expect([1, 2]).toEqual(expect.not.arrayContaining([3, 4]));
    });

    it('should fail when array contains all items', () => {
      assert.throws(() =>
        expect([1, 2, 3]).toEqual(expect.not.arrayContaining([1, 2])),
      );
    });
  });

  describe('expect.not.stringContaining()', () => {
    it('should match strings NOT containing substring', () => {
      expect('hello').toEqual(expect.not.stringContaining('world'));
    });

    it('should fail when string contains substring', () => {
      assert.throws(() =>
        expect('hello world').toEqual(expect.not.stringContaining('world')),
      );
    });
  });

  describe('expect.not.stringMatching()', () => {
    it('should match strings NOT matching pattern', () => {
      expect('hello').toEqual(expect.not.stringMatching(/world/));
    });

    it('should fail when string matches pattern', () => {
      assert.throws(() =>
        expect('hello world').toEqual(expect.not.stringMatching(/world/)),
      );
    });
  });

  describe('asymmetric matchers with toHaveBeenCalledWith', () => {
    it('should work with toHaveBeenCalledWith', () => {
      const mock = fn();
      mock('hello', 42, { key: 'value' });
      expect(mock).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Number),
        expect.objectContaining({ key: 'value' }),
      );
    });

    it('should work with toHaveBeenLastCalledWith', () => {
      const mock = fn();
      mock('first');
      mock('second', 99);
      expect(mock).toHaveBeenLastCalledWith(
        expect.stringContaining('sec'),
        expect.anything(),
      );
    });

    it('should work with toHaveBeenNthCalledWith', () => {
      const mock = fn();
      mock('aaa');
      mock('bbb');
      expect(mock).toHaveBeenNthCalledWith(1, expect.stringMatching(/^a/));
    });
  });

  describe('asymmetric matchers nested in toEqual', () => {
    it('should work with nested objects', () => {
      expect({
        name: 'test',
        id: 123,
        nested: { arr: [1, 2, 3] },
      }).toEqual({
        name: expect.any(String),
        id: expect.any(Number),
        nested: expect.objectContaining({
          arr: expect.arrayContaining([1, 3]),
        }),
      });
    });
  });
});
