import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fn } from '../../src/mocking/index.js';

describe('mock.instances and mock.contexts tracking (#113)', () => {
  describe('mock.instances', () => {
    it('should start as an empty array', () => {
      const mockFn = fn();
      assert.deepStrictEqual(mockFn.mock.instances, []);
    });

    it('should track this when used as constructor with new', () => {
      const mockFn = fn();
      const instance = new (mockFn as unknown as new () => object)();
      assert.strictEqual(mockFn.mock.instances.length, 1);
      assert.strictEqual(mockFn.mock.instances[0], instance);
    });

    it('should track multiple constructor invocations', () => {
      const mockFn = fn();
      const Ctor = mockFn as unknown as new () => object;
      const a = new Ctor();
      const b = new Ctor();
      const c = new Ctor();
      assert.strictEqual(mockFn.mock.instances.length, 3);
      assert.strictEqual(mockFn.mock.instances[0], a);
      assert.strictEqual(mockFn.mock.instances[1], b);
      assert.strictEqual(mockFn.mock.instances[2], c);
    });

    it('should not track instances on regular calls', () => {
      const mockFn = fn();
      mockFn();
      mockFn();
      assert.strictEqual(mockFn.mock.instances.length, 0);
    });

    it('should be cleared by mockClear', () => {
      const mockFn = fn();
      new (mockFn as unknown as new () => object)();
      assert.strictEqual(mockFn.mock.instances.length, 1);
      mockFn.mockClear();
      assert.strictEqual(mockFn.mock.instances.length, 0);
    });

    it('should be cleared by mockReset', () => {
      const mockFn = fn();
      new (mockFn as unknown as new () => object)();
      assert.strictEqual(mockFn.mock.instances.length, 1);
      mockFn.mockReset();
      assert.strictEqual(mockFn.mock.instances.length, 0);
    });
  });

  describe('mock.contexts', () => {
    it('should start as an empty array', () => {
      const mockFn = fn();
      assert.deepStrictEqual(mockFn.mock.contexts, []);
    });

    it('should track this context on regular calls', () => {
      const mockFn = fn();
      const ctx = { name: 'test' };
      mockFn.call(ctx);
      assert.strictEqual(mockFn.mock.contexts.length, 1);
      assert.strictEqual(mockFn.mock.contexts[0], ctx);
    });

    it('should track undefined context for unbound calls', () => {
      const mockFn = fn();
      mockFn();
      assert.strictEqual(mockFn.mock.contexts.length, 1);
      assert.strictEqual(mockFn.mock.contexts[0], undefined);
    });

    it('should track multiple call contexts', () => {
      const mockFn = fn();
      const ctx1 = { a: 1 };
      const ctx2 = { b: 2 };
      mockFn.call(ctx1);
      mockFn.call(ctx2);
      mockFn();
      assert.strictEqual(mockFn.mock.contexts.length, 3);
      assert.strictEqual(mockFn.mock.contexts[0], ctx1);
      assert.strictEqual(mockFn.mock.contexts[1], ctx2);
      assert.strictEqual(mockFn.mock.contexts[2], undefined);
    });

    it('should track context when used as constructor', () => {
      const mockFn = fn();
      const instance = new (mockFn as unknown as new () => object)();
      assert.strictEqual(mockFn.mock.contexts.length, 1);
      assert.strictEqual(mockFn.mock.contexts[0], instance);
    });

    it('should be cleared by mockClear', () => {
      const mockFn = fn();
      mockFn.call({ x: 1 });
      assert.strictEqual(mockFn.mock.contexts.length, 1);
      mockFn.mockClear();
      assert.strictEqual(mockFn.mock.contexts.length, 0);
    });

    it('should be cleared by mockReset', () => {
      const mockFn = fn();
      mockFn.call({ x: 1 });
      assert.strictEqual(mockFn.mock.contexts.length, 1);
      mockFn.mockReset();
      assert.strictEqual(mockFn.mock.contexts.length, 0);
    });
  });
});
