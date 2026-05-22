import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { vi } from '../../src/mocking/index.js';

describe('vi namespace', () => {
  describe('vi.fn', () => {
    it('should create a mock function', () => {
      const mock = vi.fn();
      assert.strictEqual(typeof mock, 'function');
      mock('hello');
      assert.strictEqual(mock.mock.calls.length, 1);
      assert.deepStrictEqual(mock.mock.calls[0], ['hello']);
    });
  });

  describe('vi.spyOn', () => {
    it('should create a spy on an object method', () => {
      const obj = { greet: (name: string): string => `hello ${name}` };
      const spy = vi.spyOn(obj, 'greet');
      obj.greet('world');
      assert.strictEqual(spy.mock.calls.length, 1);
      assert.deepStrictEqual(spy.mock.calls[0], ['world']);
      spy.mockRestore();
    });
  });

  describe('vi.stubEnv / vi.unstubAllEnvs', () => {
    it('should stub an environment variable', () => {
      const original = process.env.NODE_ENV;
      vi.stubEnv('NODE_ENV', 'test-stubbed');
      assert.strictEqual(process.env.NODE_ENV, 'test-stubbed');
      vi.unstubAllEnvs();
      assert.strictEqual(process.env.NODE_ENV, original);
    });

    it('should handle new env vars that did not exist', () => {
      const key = '__NLD_TEST_STUB_ENV_NEW__';
      assert.strictEqual(process.env[key], undefined);
      vi.stubEnv(key, 'value');
      assert.strictEqual(process.env[key], 'value');
      vi.unstubAllEnvs();
      assert.strictEqual(process.env[key], undefined);
    });

    it('should restore multiple stubs in reverse order', () => {
      const key = '__NLD_TEST_MULTI__';
      process.env[key] = 'original';
      vi.stubEnv(key, 'first');
      vi.stubEnv(key, 'second');
      assert.strictEqual(process.env[key], 'second');
      vi.unstubAllEnvs();
      assert.strictEqual(process.env[key], 'original');
      delete process.env[key];
    });
  });

  describe('vi.waitFor', () => {
    it('should retry until callback succeeds', async () => {
      let attempts = 0;
      const result = await vi.waitFor(
        () => {
          attempts++;
          if (attempts < 3) throw new Error('not yet');
          return 'done';
        },
        { timeout: 1000, interval: 10 },
      );
      assert.strictEqual(result, 'done');
      assert.ok(attempts >= 3);
    });

    it('should throw on timeout', async () => {
      await assert.rejects(
        () =>
          vi.waitFor(
            () => {
              throw new Error('always fails');
            },
            { timeout: 100, interval: 10 },
          ),
        (err: unknown) => {
          assert.ok(err instanceof Error);
          return true;
        },
      );
    });

    it('should use default timeout and interval', async () => {
      let called = false;
      await vi.waitFor(() => {
        called = true;
      });
      assert.strictEqual(called, true);
    });
  });

  describe('vi.waitUntil', () => {
    it('should retry until callback returns truthy value', async () => {
      let attempts = 0;
      const result = await vi.waitUntil(
        () => {
          attempts++;
          if (attempts < 3) return null;
          return { ready: true };
        },
        { timeout: 1000, interval: 10 },
      );
      assert.deepStrictEqual(result, { ready: true });
      assert.ok(attempts >= 3);
    });

    it('should throw on timeout when callback never returns truthy', async () => {
      await assert.rejects(
        () => vi.waitUntil(() => false, { timeout: 100, interval: 10 }),
        (err: unknown) => {
          assert.ok(err instanceof Error);
          return true;
        },
      );
    });

    it('should resolve with truthy value immediately', async () => {
      const result = await vi.waitUntil(() => 42, {
        timeout: 1000,
        interval: 10,
      });
      assert.strictEqual(result, 42);
    });
  });

  describe('vi has mock utilities', () => {
    it('should expose mock methods', () => {
      assert.strictEqual(typeof vi.stubGlobal, 'function');
      assert.strictEqual(typeof vi.unstubAllGlobals, 'function');
      assert.strictEqual(typeof vi.clearAllMocks, 'function');
      assert.strictEqual(typeof vi.resetAllMocks, 'function');
      assert.strictEqual(typeof vi.restoreAllMocks, 'function');
      assert.strictEqual(typeof vi.isMockFunction, 'function');
      assert.strictEqual(typeof vi.useFakeTimers, 'function');
      assert.strictEqual(typeof vi.useRealTimers, 'function');
      assert.strictEqual(typeof vi.hoisted, 'function');
    });
  });
});
