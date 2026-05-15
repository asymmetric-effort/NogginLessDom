import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { expect } from '../../src/assertions/index.js';

describe('async assertions', () => {
  describe('resolves', () => {
    it('should resolve and check toBe', async () => {
      await expect(Promise.resolve(42)).resolves.toBe(42);
    });

    it('should resolve and check toEqual', async () => {
      await expect(Promise.resolve({ a: 1 })).resolves.toEqual({ a: 1 });
    });

    it('should resolve and check toBeTruthy', async () => {
      await expect(Promise.resolve(true)).resolves.toBeTruthy();
    });

    it('should resolve and check toBeNull', async () => {
      await expect(Promise.resolve(null)).resolves.toBeNull();
    });

    it('should resolve and check toContain', async () => {
      await expect(Promise.resolve([1, 2, 3])).resolves.toContain(2);
    });

    it('should resolve and check toHaveLength', async () => {
      await expect(Promise.resolve([1, 2, 3])).resolves.toHaveLength(3);
    });

    it('should resolve and check toMatch', async () => {
      await expect(Promise.resolve('hello')).resolves.toMatch(/ell/);
    });

    it('should resolve and check toBeGreaterThan', async () => {
      await expect(Promise.resolve(5)).resolves.toBeGreaterThan(3);
    });

    it('should resolve and check toStrictEqual', async () => {
      await expect(Promise.resolve({ a: 1 })).resolves.toStrictEqual({ a: 1 });
    });

    it('should resolve and check toBeFalsy', async () => {
      await expect(Promise.resolve(false)).resolves.toBeFalsy();
    });

    it('should resolve and check toBeUndefined', async () => {
      await expect(Promise.resolve(undefined)).resolves.toBeUndefined();
    });

    it('should resolve and check toBeDefined', async () => {
      await expect(Promise.resolve(42)).resolves.toBeDefined();
    });

    it('should resolve and check toBeNaN', async () => {
      await expect(Promise.resolve(NaN)).resolves.toBeNaN();
    });

    it('should resolve and check toBeInstanceOf', async () => {
      await expect(Promise.resolve(new Error('x'))).resolves.toBeInstanceOf(
        Error,
      );
    });

    it('should resolve and check toHaveProperty', async () => {
      await expect(Promise.resolve({ a: 1 })).resolves.toHaveProperty('a');
      await expect(Promise.resolve({ a: 1 })).resolves.toHaveProperty('a', 1);
    });

    it('should resolve and check toBeGreaterThanOrEqual', async () => {
      await expect(Promise.resolve(5)).resolves.toBeGreaterThanOrEqual(5);
    });

    it('should resolve and check toBeLessThan', async () => {
      await expect(Promise.resolve(3)).resolves.toBeLessThan(5);
    });

    it('should resolve and check toBeLessThanOrEqual', async () => {
      await expect(Promise.resolve(5)).resolves.toBeLessThanOrEqual(5);
    });

    it('should resolve and check toBeCloseTo', async () => {
      await expect(Promise.resolve(0.1 + 0.2)).resolves.toBeCloseTo(0.3);
    });

    it('should resolve and check toThrow on a function value', async () => {
      const thrower = (): void => {
        throw new Error('boom');
      };
      await expect(Promise.resolve(thrower)).resolves.toThrow();
    });

    it('should support resolves.not', async () => {
      await expect(Promise.resolve(42)).resolves.not.toBe(43);
      await expect(Promise.resolve(false)).resolves.not.toBeTruthy();
      await expect(Promise.resolve(1)).resolves.not.toBeFalsy();
      await expect(Promise.resolve(1)).resolves.not.toBeNull();
      await expect(Promise.resolve(1)).resolves.not.toBeUndefined();
      await expect(Promise.resolve(undefined)).resolves.not.toBeDefined();
      await expect(Promise.resolve(1)).resolves.not.toBeNaN();
      await expect(Promise.resolve([])).resolves.not.toBeInstanceOf(Error);
      await expect(Promise.resolve([1])).resolves.not.toContain(2);
      await expect(Promise.resolve([1])).resolves.not.toHaveLength(2);
      await expect(Promise.resolve({ a: 1 })).resolves.not.toHaveProperty('b');
      await expect(Promise.resolve('hello')).resolves.not.toMatch('xyz');
      await expect(Promise.resolve(() => {})).resolves.not.toThrow();
      await expect(Promise.resolve(3)).resolves.not.toBeGreaterThan(5);
      await expect(Promise.resolve(3)).resolves.not.toBeGreaterThanOrEqual(5);
      await expect(Promise.resolve(5)).resolves.not.toBeLessThan(3);
      await expect(Promise.resolve(5)).resolves.not.toBeLessThanOrEqual(3);
      await expect(Promise.resolve(0.1)).resolves.not.toBeCloseTo(0.5);
    });

    it('should fail when promise rejects but resolves is used', async () => {
      await assert.rejects(
        () => expect(Promise.reject('x')).resolves.toBe('x'),
        (err: unknown) => {
          return err instanceof Error || typeof err === 'string';
        },
      );
    });
  });

  describe('rejects', () => {
    it('should handle rejected promise with toThrow', async () => {
      await expect(Promise.reject(new Error('fail'))).rejects.toThrow();
    });

    it('should handle rejected promise with toBeInstanceOf', async () => {
      await expect(Promise.reject(new Error('fail'))).rejects.toBeInstanceOf(
        Error,
      );
    });

    it('should handle rejected promise with toBe for non-error rejections', async () => {
      await expect(Promise.reject('bad')).rejects.toBe('bad');
    });

    it('should handle rejected error with toThrow matching string', async () => {
      await expect(Promise.reject(new Error('specific error'))).rejects.toThrow(
        'specific error',
      );
    });

    it('should handle rejected error with toThrow matching regex', async () => {
      await expect(Promise.reject(new Error('specific error'))).rejects.toThrow(
        /specific/,
      );
    });

    it('should handle rejected error with toThrow matching Error', async () => {
      await expect(Promise.reject(new Error('msg'))).rejects.toThrow(
        new Error('msg'),
      );
    });

    it('should support rejects.not', async () => {
      await expect(Promise.reject('not an error')).rejects.not.toBeInstanceOf(
        Error,
      );
      await expect(Promise.reject('bad')).rejects.not.toBe('good');
      await expect(Promise.reject('not-error')).rejects.not.toThrow();
    });

    it('should fail when promise resolves but rejects is used', async () => {
      await assert.rejects(
        () => expect(Promise.resolve('x')).rejects.toBe('x'),
        (err: unknown) => {
          return err instanceof Error;
        },
      );
    });
  });
});
