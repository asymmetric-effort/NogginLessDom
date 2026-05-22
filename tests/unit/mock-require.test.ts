import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mock } from '../../src/mocking/index.js';

describe('mock.require()', () => {
  it('should return mocked module when registered', async () => {
    await mock.module('mock-require-test', () => ({
      greeting: 'mocked hello',
    }));
    const mod = mock.require('mock-require-test') as Record<string, string>;
    assert.strictEqual(mod.greeting, 'mocked hello');
    mock.resetModules();
  });

  it('should return real module when no mock is registered', () => {
    const mod = mock.require('node:path') as Record<string, unknown>;
    assert.strictEqual(typeof mod.join, 'function');
  });

  it('should work after mock.module() + mock.unmock()', async () => {
    await mock.module('unmock-require-test', () => ({
      value: 'mocked',
    }));
    // Before unmock, should return mock
    const mocked = mock.require('unmock-require-test') as Record<
      string,
      string
    >;
    assert.strictEqual(mocked.value, 'mocked');

    // After unmock, should fall back to real require
    mock.unmock('unmock-require-test');
    // The module doesn't actually exist, so require will throw
    assert.throws(() => {
      mock.require('unmock-require-test');
    });
  });

  it('should work in a mock.module + mock.require roundtrip', async () => {
    const fakeFsModule = {
      readFileSync: () => 'fake content',
      existsSync: () => true,
    };
    await mock.module('roundtrip-lib', () => fakeFsModule);

    const mod = mock.require('roundtrip-lib') as typeof fakeFsModule;
    assert.strictEqual(mod.readFileSync(), 'fake content');
    assert.strictEqual(mod.existsSync(), true);

    mock.resetModules();
    // After reset, mock is gone
    assert.strictEqual(mock.getMockedModule('roundtrip-lib'), undefined);
  });
});

describe('mock.importMock()', () => {
  it('should return mocked module when registered via mock.module()', async () => {
    await mock.module('import-mock-test', () => ({
      status: 'mocked',
    }));
    const mod = (await mock.importMock('import-mock-test')) as Record<
      string,
      string
    >;
    assert.strictEqual(mod.status, 'mocked');
    mock.resetModules();
  });

  it('should auto-mock a real module when no mock is registered', async () => {
    const mod = (await mock.importMock('node:path')) as Record<string, unknown>;
    // Auto-mocked: functions should be replaced with mock fns
    assert.strictEqual(typeof mod.join, 'function');
    // The auto-mocked function should return undefined (it's a mock fn)
    assert.strictEqual(
      (mod.join as (...args: unknown[]) => unknown)('a', 'b'),
      undefined,
    );
  });
});
