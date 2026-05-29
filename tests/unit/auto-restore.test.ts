/**
 * Tests for automatic mock restoration (Feature #173).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  fn,
  spyOn,
  useFakeTimers,
  mock,
  configureMockBehavior,
  getMockConfig,
  runAutoMockCleanup,
  getAllMocks,
} from '../../src/mocking/index.js';

describe('Automatic mock restoration (Feature #173)', () => {
  it('configureMockBehavior stores config', () => {
    configureMockBehavior({
      clearMocks: true,
      resetMocks: false,
      restoreMocks: false,
    });
    const config = getMockConfig();
    assert.strictEqual(config.clearMocks, true);
    assert.strictEqual(config.resetMocks, false);
    assert.strictEqual(config.restoreMocks, false);
    configureMockBehavior({});
  });

  it('restoreMocks cleans up spyOn between tests', () => {
    const obj = { greet: () => 'hello' };
    spyOn(obj as Record<string, unknown>, 'greet');

    configureMockBehavior({ restoreMocks: true });
    runAutoMockCleanup();

    // After restore, the original should be back
    assert.strictEqual(obj.greet(), 'hello');
    configureMockBehavior({});
  });

  it('clearMocks clears call history', () => {
    const mockFn = fn(() => 42);
    mockFn();
    mockFn();
    assert.strictEqual(mockFn.mock.calls.length, 2);

    configureMockBehavior({ clearMocks: true });
    runAutoMockCleanup();

    assert.strictEqual(mockFn.mock.calls.length, 0);
    // But implementation should still work
    assert.strictEqual(mockFn(), 42);

    configureMockBehavior({});
    mockFn.mockRestore();
    getAllMocks().clear();
  });

  it('unstubGlobals removes stubs', () => {
    mock.stubGlobal('__auto_restore_test__', 'stubbed_value');
    assert.strictEqual(
      (globalThis as Record<string, unknown>).__auto_restore_test__,
      'stubbed_value',
    );

    configureMockBehavior({ unstubGlobals: true });
    runAutoMockCleanup();

    assert.strictEqual(
      (globalThis as Record<string, unknown>).__auto_restore_test__,
      undefined,
    );
    configureMockBehavior({});
  });

  it('fakeTimers.autoRestore restores real timers', () => {
    useFakeTimers(5000);
    assert.strictEqual(Date.now(), 5000);

    configureMockBehavior({ fakeTimers: { autoRestore: true } });
    runAutoMockCleanup();

    // Timers should be restored
    assert.notStrictEqual(Date.now(), 5000);
    configureMockBehavior({});
  });

  it('backward compatible when all false', () => {
    const mockFn = fn(() => 'original');
    mockFn();
    assert.strictEqual(mockFn.mock.calls.length, 1);

    configureMockBehavior({
      clearMocks: false,
      resetMocks: false,
      restoreMocks: false,
      unstubGlobals: false,
    });
    runAutoMockCleanup();

    // Nothing should change
    assert.strictEqual(mockFn.mock.calls.length, 1);
    assert.strictEqual(mockFn(), 'original');

    configureMockBehavior({});
    mockFn.mockRestore();
    getAllMocks().clear();
  });

  it('allMocks Set shrinks after restore', () => {
    const m1 = fn();
    const m2 = fn();
    const m3 = fn();
    void m1;
    void m2;
    void m3;

    assert.ok(getAllMocks().size >= 3);

    configureMockBehavior({ restoreMocks: true });
    runAutoMockCleanup();

    assert.strictEqual(getAllMocks().size, 0);
    configureMockBehavior({});
  });

  it('resetMocks resets implementation but keeps tracking', () => {
    const mockFn = fn(() => 'impl');
    mockFn();
    assert.strictEqual(mockFn.mock.calls.length, 1);
    assert.strictEqual(mockFn(), 'impl');

    configureMockBehavior({ resetMocks: true });
    runAutoMockCleanup();

    // Calls should be cleared
    assert.strictEqual(mockFn.mock.calls.length, 0);
    // Implementation should be reset (returns undefined)
    assert.strictEqual(mockFn(), undefined);

    configureMockBehavior({});
    mockFn.mockRestore();
    getAllMocks().clear();
  });

  it('getMockConfig returns a copy', () => {
    configureMockBehavior({ clearMocks: true });
    const config1 = getMockConfig();
    const config2 = getMockConfig();
    assert.deepStrictEqual(config1, config2);
    assert.notStrictEqual(config1, config2);
    configureMockBehavior({});
  });
});
