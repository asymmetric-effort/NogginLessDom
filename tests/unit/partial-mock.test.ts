import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  mockModulePartial,
  getMockedModule,
  unmock,
  resetModules,
} from '../../src/mocking/module-mock.js';

describe('mockModulePartial', () => {
  it('should preserve non-overridden exports', async () => {
    await mockModulePartial('node:path', {
      join: () => 'mocked-join',
    });
    const mod = getMockedModule('node:path') as Record<string, unknown>;
    assert.strictEqual(typeof mod.join, 'function');
    assert.strictEqual((mod.join as () => string)(), 'mocked-join');
    // Non-overridden exports should still be present
    assert.strictEqual(typeof mod.resolve, 'function');
    assert.strictEqual(typeof mod.basename, 'function');
    resetModules();
  });

  it('should override specified exports', async () => {
    await mockModulePartial('node:path', {
      sep: '\\',
    });
    const mod = getMockedModule('node:path') as Record<string, unknown>;
    assert.strictEqual(mod.sep, '\\');
    resetModules();
  });

  it('should auto-mock remaining functions when autoMockRest is true', async () => {
    await mockModulePartial(
      'node:path',
      {
        join: () => 'custom',
      },
      { autoMockRest: true },
    );
    const mod = getMockedModule('node:path') as Record<string, unknown>;
    // The overridden function should be our custom one
    assert.strictEqual((mod.join as () => string)(), 'custom');
    // Non-overridden functions should be auto-mocked (have .mock property)
    const resolve = mod.resolve as unknown as {
      mock?: { calls: unknown[][] };
    };
    assert.ok(resolve.mock, 'resolve should be an auto-mocked function');
    assert.ok(Array.isArray(resolve.mock.calls));
    resetModules();
  });

  it('should not auto-mock non-function exports when autoMockRest is true', async () => {
    await mockModulePartial(
      'node:path',
      { join: () => 'mocked' },
      { autoMockRest: true },
    );
    const mod = getMockedModule('node:path') as Record<string, unknown>;
    // sep is a string, should remain a string
    assert.strictEqual(typeof mod.sep, 'string');
    resetModules();
  });

  it('should not auto-mock when autoMockRest is false/unset', async () => {
    await mockModulePartial('node:path', {
      join: () => 'mocked',
    });
    const mod = getMockedModule('node:path') as Record<string, unknown>;
    // resolve should still be the real function without .mock
    const resolve = mod.resolve as unknown as {
      mock?: unknown;
    };
    assert.strictEqual(resolve.mock, undefined);
    resetModules();
  });

  it('should be removable with unmock', async () => {
    await mockModulePartial('node:path', { join: () => 'x' });
    assert.ok(getMockedModule('node:path'));
    unmock('node:path');
    assert.strictEqual(getMockedModule('node:path'), undefined);
  });

  it('should overwrite existing mock registrations', async () => {
    await mockModulePartial('node:path', { join: () => 'first' });
    await mockModulePartial('node:path', { join: () => 'second' });
    const mod = getMockedModule('node:path') as Record<string, unknown>;
    assert.strictEqual((mod.join as () => string)(), 'second');
    resetModules();
  });

  it('should handle empty overrides', async () => {
    await mockModulePartial('node:path', {});
    const mod = getMockedModule('node:path') as Record<string, unknown>;
    assert.strictEqual(typeof mod.join, 'function');
    assert.strictEqual(typeof mod.resolve, 'function');
    resetModules();
  });

  it('should handle autoMockRest with empty overrides', async () => {
    await mockModulePartial('node:path', {}, { autoMockRest: true });
    const mod = getMockedModule('node:path') as Record<string, unknown>;
    // All functions should be auto-mocked
    const join = mod.join as unknown as { mock?: { calls: unknown[][] } };
    assert.ok(join.mock, 'join should be auto-mocked');
    resetModules();
  });
});
