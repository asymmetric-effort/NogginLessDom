import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fn, spyOn } from '../../src/mocking/index.js';
import { mock } from '../../src/mocking/index.js';

describe('mock object', () => {
  describe('mock.module()', () => {
    it('should register a mock with a factory', async () => {
      await mock.module('my-lib', () => ({
        greet: () => 'hello',
      }));
      const mod = mock.getMockedModule('my-lib');
      assert.ok(mod);
      assert.strictEqual(
        (mod as Record<string, () => string>).greet(),
        'hello',
      );
      mock.resetModules();
    });

    it('should register a mock without a factory (auto-mock)', async () => {
      await mock.module('auto-lib');
      const mod = mock.getMockedModule('auto-lib');
      assert.ok(mod);
      assert.deepStrictEqual(mod, {});
      mock.resetModules();
    });

    it('should overwrite a previously registered mock', async () => {
      await mock.module('overwrite-lib', () => ({ a: 1 }));
      await mock.module('overwrite-lib', () => ({ b: 2 }));
      const mod = mock.getMockedModule('overwrite-lib') as Record<
        string,
        number
      >;
      assert.strictEqual(mod.b, 2);
      assert.strictEqual(mod.a, undefined);
      mock.resetModules();
    });
  });

  describe('mock.getMockedModule()', () => {
    it('should return the mocked module', async () => {
      await mock.module('get-test', () => ({ value: 42 }));
      const mod = mock.getMockedModule('get-test') as Record<string, number>;
      assert.strictEqual(mod.value, 42);
      mock.resetModules();
    });

    it('should return undefined for unregistered modules', () => {
      const mod = mock.getMockedModule('nonexistent');
      assert.strictEqual(mod, undefined);
    });
  });

  describe('mock.unmock()', () => {
    it('should remove a registered mock', async () => {
      await mock.module('unmock-lib', () => ({ x: 1 }));
      mock.unmock('unmock-lib');
      assert.strictEqual(mock.getMockedModule('unmock-lib'), undefined);
    });

    it('should not throw when unmocking a non-registered module', () => {
      assert.doesNotThrow(() => mock.unmock('never-registered'));
    });
  });

  describe('mock.resetModules()', () => {
    it('should clear all registered mocks', async () => {
      await mock.module('mod-a', () => ({ a: 1 }));
      await mock.module('mod-b', () => ({ b: 2 }));
      mock.resetModules();
      assert.strictEqual(mock.getMockedModule('mod-a'), undefined);
      assert.strictEqual(mock.getMockedModule('mod-b'), undefined);
    });
  });

  describe('mock.module with factory function', () => {
    it('should call the factory and use its return value', async () => {
      let factoryCalled = false;
      await mock.module('factory-lib', () => {
        factoryCalled = true;
        return { computed: 10 + 5 };
      });
      assert.strictEqual(factoryCalled, true);
      const mod = mock.getMockedModule('factory-lib') as Record<string, number>;
      assert.strictEqual(mod.computed, 15);
      mock.resetModules();
    });

    it('should support async factory', async () => {
      await mock.module('async-lib', async () => {
        return { asyncVal: 'resolved' };
      });
      const mod = mock.getMockedModule('async-lib') as Record<string, string>;
      assert.strictEqual(mod.asyncVal, 'resolved');
      mock.resetModules();
    });
  });

  describe('mock.importActual()', () => {
    it('should return the actual module via dynamic import', async () => {
      const actual = (await mock.importActual('node:path')) as Record<
        string,
        unknown
      >;
      assert.strictEqual(typeof actual.join, 'function');
    });
  });

  describe('mock.stubGlobal()', () => {
    it('should replace a global property', () => {
      const originalPi = Math.PI;
      mock.stubGlobal('Math', { ...Math, PI: 3 });
      assert.strictEqual(
        (
          globalThis as Record<string, unknown> as Record<
            string,
            Record<string, number>
          >
        ).Math.PI,
        3,
      );
      mock.unstubAllGlobals();
      assert.strictEqual(Math.PI, originalPi);
    });

    it('should handle stubbing a non-existent global', () => {
      mock.stubGlobal('__test_custom_global__', 'hello');
      assert.strictEqual(
        (globalThis as Record<string, unknown>)['__test_custom_global__'],
        'hello',
      );
      mock.unstubAllGlobals();
      assert.strictEqual(
        (globalThis as Record<string, unknown>)['__test_custom_global__'],
        undefined,
      );
    });
  });

  describe('mock.unstubAllGlobals()', () => {
    it('should restore all stubbed globals', () => {
      const origPI = Math.PI;
      mock.stubGlobal('Math', { PI: 0 });
      mock.stubGlobal('__stub_test_a__', 'aaa');
      mock.unstubAllGlobals();
      assert.strictEqual(Math.PI, origPI);
      assert.strictEqual(
        (globalThis as Record<string, unknown>)['__stub_test_a__'],
        undefined,
      );
    });

    it('should be safe to call when no globals are stubbed', () => {
      assert.doesNotThrow(() => mock.unstubAllGlobals());
    });
  });

  describe('mock.isMockFunction()', () => {
    it('should return true for fn()', () => {
      const mockFn = fn();
      assert.strictEqual(mock.isMockFunction(mockFn), true);
    });

    it('should return true for spyOn()', () => {
      const obj = { method: (): string => 'hi' };
      const spy = spyOn(obj, 'method');
      assert.strictEqual(mock.isMockFunction(spy), true);
      spy.mockRestore();
    });

    it('should return false for regular functions', () => {
      assert.strictEqual(
        mock.isMockFunction(() => {}),
        false,
      );
    });

    it('should return false for non-functions', () => {
      assert.strictEqual(mock.isMockFunction(42 as unknown), false);
      assert.strictEqual(mock.isMockFunction(null as unknown), false);
      assert.strictEqual(mock.isMockFunction(undefined as unknown), false);
    });
  });

  describe('mock.clearAllMocks()', () => {
    it('should clear all tracked mocks', () => {
      const m1 = fn();
      const m2 = fn();
      m1('a');
      m2('b');
      assert.strictEqual(m1.mock.calls.length, 1);
      assert.strictEqual(m2.mock.calls.length, 1);
      mock.clearAllMocks();
      assert.strictEqual(m1.mock.calls.length, 0);
      assert.strictEqual(m2.mock.calls.length, 0);
    });
  });

  describe('mock.resetAllMocks()', () => {
    it('should reset all tracked mocks', () => {
      const m1 = fn(() => 'impl1');
      const m2 = fn();
      m2.mockReturnValue(99);
      m1('x');
      m2('y');
      mock.resetAllMocks();
      assert.strictEqual(m1.mock.calls.length, 0);
      assert.strictEqual(m2.mock.calls.length, 0);
      // After reset, implementations are cleared
      assert.strictEqual(m1(), undefined);
      assert.strictEqual(m2(), undefined);
    });
  });

  describe('mock.restoreAllMocks()', () => {
    it('should restore spies and unstub globals', () => {
      const obj = { calc: (x: number): number => x * 2 };
      const spy = spyOn(obj, 'calc');
      spy.mockImplementation((x: number) => x * 100);
      assert.strictEqual(obj.calc(5), 500);

      mock.stubGlobal('__restore_test__', 'stubbed');

      mock.restoreAllMocks();

      // spy is restored
      assert.strictEqual(obj.calc(5), 10);
      // globals are unstubbed
      assert.strictEqual(
        (globalThis as Record<string, unknown>)['__restore_test__'],
        undefined,
      );
    });
  });
});
