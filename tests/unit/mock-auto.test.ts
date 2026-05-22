import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mock } from '../../src/mocking/index.js';
import { autoMock } from '../../src/mocking/module-mock.js';

describe('autoMock helper (#112)', () => {
  it('should replace functions with fn()', () => {
    const exports = {
      greet: () => 'hello',
      add: (a: number, b: number) => a + b,
    };
    const mocked = autoMock(exports);
    assert.strictEqual(typeof mocked.greet, 'function');
    assert.strictEqual(typeof mocked.add, 'function');
    // auto-mocked functions should return undefined by default
    assert.strictEqual(mocked.greet(), undefined);
    assert.strictEqual(mocked.add(1, 2), undefined);
    // should be mock functions
    assert.strictEqual(mock.isMockFunction(mocked.greet), true);
    assert.strictEqual(mock.isMockFunction(mocked.add), true);
  });

  it('should keep primitive values as-is', () => {
    const exports = {
      name: 'test',
      count: 42,
      flag: true,
      nothing: null,
      undef: undefined,
    };
    const mocked = autoMock(exports);
    assert.strictEqual(mocked.name, 'test');
    assert.strictEqual(mocked.count, 42);
    assert.strictEqual(mocked.flag, true);
    assert.strictEqual(mocked.nothing, null);
    assert.strictEqual(mocked.undef, undefined);
  });

  it('should recursively auto-mock nested objects', () => {
    const exports = {
      utils: {
        format: (s: string) => s.toUpperCase(),
        nested: {
          deep: () => 'deep',
          value: 99,
        },
      },
    };
    const mocked = autoMock(exports);
    assert.strictEqual(mock.isMockFunction(mocked.utils.format), true);
    assert.strictEqual(mock.isMockFunction(mocked.utils.nested.deep), true);
    assert.strictEqual(mocked.utils.nested.value, 99);
    assert.strictEqual(mocked.utils.format('hi'), undefined);
  });

  it('should handle arrays as primitives (keep as-is)', () => {
    const exports = {
      list: [1, 2, 3],
    };
    const mocked = autoMock(exports);
    assert.deepStrictEqual(mocked.list, [1, 2, 3]);
  });

  it('should handle empty objects', () => {
    const mocked = autoMock({});
    assert.deepStrictEqual(mocked, {});
  });
});

describe('mock.module auto-mock without factory (#112)', () => {
  it('should auto-mock is available via mock.module with no factory (returns empty for now)', async () => {
    // When no factory is provided and no real module exists, we just
    // confirm that mockModule doesn't throw and registers something
    await mock.module('auto-mock-test');
    const mod = mock.getMockedModule('auto-mock-test');
    assert.ok(mod !== undefined);
    mock.resetModules();
  });
});

describe('mock.module importOriginal helper (#117)', () => {
  it('should pass importOriginal to factory function', async () => {
    let receivedHelper = false;
    await mock.module('node:path', (helpers) => {
      const { importOriginal } = helpers as {
        importOriginal: () => Promise<Record<string, unknown>>;
      };
      receivedHelper = typeof importOriginal === 'function';
      return { join: () => 'mocked' };
    });
    assert.strictEqual(receivedHelper, true);
    mock.resetModules();
  });

  it('importOriginal should return the actual module', async () => {
    let actualModule: Record<string, unknown> | undefined;
    await mock.module('node:path', async (helpers) => {
      const { importOriginal } = helpers as {
        importOriginal: () => Promise<Record<string, unknown>>;
      };
      actualModule = await importOriginal();
      return { join: () => 'mocked' };
    });
    assert.ok(actualModule);
    assert.strictEqual(typeof actualModule.join, 'function');
    // The actual module's join should work normally
    assert.strictEqual(typeof actualModule.basename, 'function');
    mock.resetModules();
  });

  it('should allow factory to use importOriginal to extend module', async () => {
    await mock.module('node:path', async (helpers) => {
      const { importOriginal } = helpers as {
        importOriginal: () => Promise<Record<string, unknown>>;
      };
      const original = await importOriginal();
      return {
        ...original,
        join: () => 'overridden-join',
      };
    });
    const mod = mock.getMockedModule('node:path') as Record<string, unknown>;
    assert.strictEqual((mod.join as () => string)(), 'overridden-join');
    // original exports should still be present
    assert.strictEqual(typeof mod.basename, 'function');
    mock.resetModules();
  });
});
