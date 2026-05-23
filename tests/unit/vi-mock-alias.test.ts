import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { fn, vi, mock } from '../../src/mocking/index.js';

describe('vi.mock alias', () => {
  afterEach(() => {
    mock.resetModules();
  });

  it('vi.mock exists and is a function', () => {
    assert.strictEqual(typeof vi.mock, 'function');
  });

  it('vi.mock(path, factory) registers a mock module', async () => {
    const writeSpy = fn();
    await vi.mock('fs', () => ({ writeFileSync: writeSpy }));
    const mocked = mock.getMockedModule('fs') as Record<string, unknown>;
    assert.ok(mocked, 'mock should be registered');
    assert.strictEqual(mocked.writeFileSync, writeSpy);
  });

  it('vi.mock without factory registers an auto-mock (empty object)', async () => {
    await vi.mock('some-module');
    const mocked = mock.getMockedModule('some-module');
    assert.ok(mocked !== undefined, 'mock should be registered');
    assert.deepStrictEqual(mocked, {});
  });

  it('mock.require returns the mock after vi.mock registers it', async () => {
    const readSpy = fn();
    await vi.mock('path', () => ({ resolve: readSpy }));
    const result = mock.require('path') as Record<string, unknown>;
    assert.strictEqual(result.resolve, readSpy);
  });
});
