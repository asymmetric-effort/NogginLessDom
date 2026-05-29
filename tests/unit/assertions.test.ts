import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { expect } from '../../src/assertions/index.js';

describe('assertions', () => {
  describe('toBe', () => {
    it('should pass for strict equality', () => {
      expect(1).toBe(1);
      expect('hello').toBe('hello');
      expect(true).toBe(true);
      expect(null).toBe(null);
      expect(undefined).toBe(undefined);
    });

    it('should fail for different values', () => {
      assert.throws(() => expect(1).toBe(2));
    });

    it('should fail for different types', () => {
      assert.throws(() =>
        (expect as (v: unknown) => ReturnType<typeof expect>)(1).toBe(
          '1' as unknown as number,
        ),
      );
    });
  });

  describe('toEqual', () => {
    it('should pass for deep equality', () => {
      expect({ a: 1, b: { c: 2 } }).toEqual({ a: 1, b: { c: 2 } });
      expect([1, 2, 3]).toEqual([1, 2, 3]);
    });

    it('should fail for different objects', () => {
      assert.throws(() => expect({ a: 1 }).toEqual({ a: 2 }));
    });
  });

  describe('toStrictEqual', () => {
    it('should pass for strict deep equality', () => {
      expect({ a: 1 }).toStrictEqual({ a: 1 });
    });
  });

  describe('toBeTruthy / toBeFalsy', () => {
    it('should identify truthy values', () => {
      expect(1).toBeTruthy();
      expect('hello').toBeTruthy();
      expect(true).toBeTruthy();
      expect({}).toBeTruthy();
      expect([]).toBeTruthy();
    });

    it('should identify falsy values', () => {
      expect(0).toBeFalsy();
      expect('').toBeFalsy();
      expect(false).toBeFalsy();
      expect(null).toBeFalsy();
      expect(undefined).toBeFalsy();
    });
  });

  describe('toBeNull / toBeUndefined / toBeDefined', () => {
    it('should check null', () => {
      expect(null).toBeNull();
      assert.throws(() => expect(1).toBeNull());
    });

    it('should check undefined', () => {
      expect(undefined).toBeUndefined();
      assert.throws(() => expect(1).toBeUndefined());
    });

    it('should check defined', () => {
      expect(1).toBeDefined();
      expect('').toBeDefined();
      assert.throws(() => expect(undefined).toBeDefined());
    });
  });

  describe('toBeNaN', () => {
    it('should identify NaN', () => {
      expect(NaN).toBeNaN();
      assert.throws(() => expect(1).toBeNaN());
    });
  });

  describe('toBeInstanceOf', () => {
    it('should check instance', () => {
      expect(new Error('test')).toBeInstanceOf(Error);
      expect([]).toBeInstanceOf(Array);
      assert.throws(() => expect({}).toBeInstanceOf(Array));
    });
  });

  describe('toContain', () => {
    it('should check array contents', () => {
      expect([1, 2, 3]).toContain(2);
      assert.throws(() => expect([1, 2, 3]).toContain(4));
    });
  });

  describe('toHaveLength', () => {
    it('should check length', () => {
      expect([1, 2, 3]).toHaveLength(3);
      expect('hello').toHaveLength(5);
      assert.throws(() => expect([1]).toHaveLength(2));
    });
  });

  describe('toHaveProperty', () => {
    it('should check property existence', () => {
      expect({ a: 1, b: 2 }).toHaveProperty('a');
      expect({ a: 1 }).toHaveProperty('a', 1);
      assert.throws(() => expect({ a: 1 }).toHaveProperty('b'));
    });
  });

  describe('toMatch', () => {
    it('should match string patterns', () => {
      expect('hello world').toMatch('world');
      expect('hello world').toMatch(/world/);
      assert.throws(() => expect('hello').toMatch('world'));
    });
  });

  describe('toThrow', () => {
    it('should check that a function throws', () => {
      expect(() => {
        throw new Error('fail');
      }).toThrow();
      assert.throws(() => expect(() => {}).toThrow());
    });

    it('should check thrown error matches regex', () => {
      expect(() => {
        throw new Error('something went wrong');
      }).toThrow(/went wrong/);
    });
  });

  describe('numeric comparisons', () => {
    it('toBeGreaterThan', () => {
      expect(5).toBeGreaterThan(3);
      assert.throws(() => expect(3).toBeGreaterThan(5));
    });

    it('toBeGreaterThanOrEqual', () => {
      expect(5).toBeGreaterThanOrEqual(5);
      expect(5).toBeGreaterThanOrEqual(3);
      assert.throws(() => expect(3).toBeGreaterThanOrEqual(5));
    });

    it('toBeLessThan', () => {
      expect(3).toBeLessThan(5);
      assert.throws(() => expect(5).toBeLessThan(3));
    });

    it('toBeLessThanOrEqual', () => {
      expect(5).toBeLessThanOrEqual(5);
      expect(3).toBeLessThanOrEqual(5);
      assert.throws(() => expect(5).toBeLessThanOrEqual(3));
    });

    it('toBeCloseTo', () => {
      expect(0.1 + 0.2).toBeCloseTo(0.3);
      assert.throws(() => expect(0.1).toBeCloseTo(0.5));
    });
  });

  describe('not modifier', () => {
    it('should negate matchers', () => {
      expect(1).not.toBe(2);
      expect({ a: 1 }).not.toEqual({ a: 2 });
      expect({ a: 1 }).not.toStrictEqual({ a: 2 });
      expect(0).not.toBeTruthy();
      expect(1).not.toBeFalsy();
      expect(1).not.toBeNull();
      expect(1).not.toBeUndefined();
      expect(undefined).not.toBeDefined();
      expect(1).not.toBeNaN();
      expect({}).not.toBeInstanceOf(Array);
      expect([1, 2]).not.toContain(3);
      expect([1]).not.toHaveLength(2);
      expect({ a: 1 }).not.toHaveProperty('b');
      expect('hello').not.toMatch('world');
      expect('hello').not.toMatch(/xyz/);
      expect(() => {}).not.toThrow();
      expect(3).not.toBeGreaterThan(5);
      expect(3).not.toBeGreaterThanOrEqual(5);
      expect(5).not.toBeLessThan(3);
      expect(5).not.toBeLessThanOrEqual(3);
      expect(0.1).not.toBeCloseTo(0.5);
    });
  });

  describe('toThrow with specific matchers', () => {
    it('should match thrown error by string message', () => {
      expect(() => {
        throw new Error('expected message');
      }).toThrow('expected message');
    });

    it('should match thrown error by Error instance', () => {
      expect(() => {
        throw new Error('my error');
      }).toThrow(new Error('my error'));
    });

    it('should match thrown error by regex', () => {
      expect(() => {
        throw new Error('something bad happened');
      }).toThrow(/bad/);
    });
  });

  // GHSA-62rx-59cp-5fcr: Stack overflow in deep comparison
  describe('deep comparison depth limit', () => {
    it('should throw when deeply nested objects exceed depth 100 (toEqual)', () => {
      // Build a deeply nested object (depth > 100)
      // Use an asymmetric matcher at leaf to trigger deepEqualWithAsymmetric
      let actual: Record<string, unknown> = { value: 'leaf' };
      let expected: Record<string, unknown> = {
        value: expect.anything() as unknown,
      };
      for (let i = 0; i < 110; i++) {
        actual = { nested: actual };
        expected = { nested: expected };
      }
      assert.throws(
        () => expect(actual).toEqual(expected as never),
        /Deep comparison exceeded maximum depth/,
      );
    });

    it('should throw when deeply nested objects exceed depth 100 (toMatchObject)', () => {
      let actual: Record<string, unknown> = { value: 'leaf' };
      let expected: Record<string, unknown> = { value: 'leaf' };
      for (let i = 0; i < 110; i++) {
        actual = { nested: actual };
        expected = { nested: expected };
      }
      assert.throws(
        () => expect(actual).toMatchObject(expected as Record<string, unknown>),
        /Deep comparison exceeded maximum depth/,
      );
    });

    it('should succeed for objects within depth 100', () => {
      let actual: Record<string, unknown> = { value: 'leaf' };
      let expected: Record<string, unknown> = { value: 'leaf' };
      for (let i = 0; i < 50; i++) {
        actual = { nested: actual };
        expected = { nested: expected };
      }
      // Should not throw
      expect(actual).toEqual(expected as never);
    });
  });
});
