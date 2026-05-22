import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { expect } from '../../src/assertions/index.js';

describe('toContainEqual', () => {
  it('should pass when array contains a deeply equal item', () => {
    expect([{ a: 1 }, { b: 2 }]).toContainEqual({ a: 1 });
  });

  it('should pass for primitive items', () => {
    expect([1, 2, 3]).toContainEqual(2);
  });

  it('should pass for nested objects', () => {
    expect([{ a: { b: 1 } }, { c: 2 }]).toContainEqual({ a: { b: 1 } });
  });

  it('should fail when no item deeply equals expected', () => {
    assert.throws(() => {
      expect([{ a: 1 }, { b: 2 }]).toContainEqual({ a: 3 });
    });
  });

  it('should fail for empty array', () => {
    assert.throws(() => {
      expect([]).toContainEqual({ a: 1 });
    });
  });

  describe('.not', () => {
    it('should pass when array does not contain a deeply equal item', () => {
      expect([{ a: 1 }, { b: 2 }]).not.toContainEqual({ a: 99 });
    });

    it('should fail when array does contain a deeply equal item', () => {
      assert.throws(() => {
        expect([{ a: 1 }, { b: 2 }]).not.toContainEqual({ a: 1 });
      });
    });

    it('should pass for empty arrays', () => {
      expect([]).not.toContainEqual(42);
    });
  });

  it('should distinguish toContain (===) from toContainEqual (deep)', () => {
    const obj = { x: 10 };
    // toContain uses === so a different object with same shape fails
    assert.throws(() => {
      expect([obj]).toContain({ x: 10 });
    });
    // toContainEqual uses deep equality so it passes
    expect([obj]).toContainEqual({ x: 10 });
  });

  it('should work with arrays containing arrays', () => {
    expect([
      [1, 2],
      [3, 4],
    ]).toContainEqual([3, 4]);
  });

  it('should not match partial objects', () => {
    assert.throws(() => {
      expect([{ a: 1, b: 2 }]).toContainEqual({ a: 1, b: 2, c: 3 });
    });
  });
});
