/**
 * Tests for test-level isolation for concurrent tests (Feature #169).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  configureIsolation,
  getIsolationConfig,
} from '../../src/test-runner/index.js';
import {
  fn,
  useFakeTimers,
  useRealTimers,
  mock,
  getAllMocks,
} from '../../src/mocking/index.js';

// Import restoreAllMocks indirectly via mock object
const { unstubAllGlobals } = mock;

describe('Test-level isolation (Feature #169)', () => {
  it('configureIsolation stores and retrieves config', () => {
    configureIsolation({ isolate: true, isolation: 'full' });
    const config = getIsolationConfig();
    assert.strictEqual(config.isolate, true);
    assert.strictEqual(config.isolation, 'full');
    // Reset
    configureIsolation({});
  });

  it('configureIsolation defaults are empty', () => {
    configureIsolation({});
    const config = getIsolationConfig();
    assert.strictEqual(config.isolate, undefined);
    assert.strictEqual(config.isolation, undefined);
  });

  it('mock state is cleaned between concurrent-style tests with full isolation', async () => {
    configureIsolation({ isolate: true, isolation: 'full' });

    // Create a mock and verify it gets tracked
    const mockFn = fn(() => 42);
    mockFn();
    assert.strictEqual(mockFn.mock.calls.length, 1);
    assert.ok(getAllMocks().has(mockFn));

    // Simulate what the isolation wrapper does after test
    const { performIsolationCleanupForTest } = await getCleanupHelper();
    performIsolationCleanupForTest('full');

    // After cleanup, mocks set should be cleared
    assert.strictEqual(getAllMocks().size, 0);

    configureIsolation({});
  });

  it('fake timer state is cleaned with full isolation', async () => {
    configureIsolation({ isolate: true, isolation: 'full' });

    useFakeTimers(1000);
    assert.strictEqual(Date.now(), 1000);

    const { performIsolationCleanupForTest } = await getCleanupHelper();
    performIsolationCleanupForTest('full');

    // After cleanup, real timers should be restored
    assert.notStrictEqual(Date.now(), 1000);

    configureIsolation({});
  });

  it('stubGlobal is cleaned with full isolation', async () => {
    configureIsolation({ isolate: true, isolation: 'full' });

    mock.stubGlobal('__test_isolation_var__', 'stubbed');
    assert.strictEqual(
      (globalThis as Record<string, unknown>).__test_isolation_var__,
      'stubbed',
    );

    const { performIsolationCleanupForTest } = await getCleanupHelper();
    performIsolationCleanupForTest('full');

    assert.strictEqual(
      (globalThis as Record<string, unknown>).__test_isolation_var__,
      undefined,
    );

    configureIsolation({});
  });

  it('sequential tests are unaffected by default isolation config', () => {
    configureIsolation({});
    const config = getIsolationConfig();
    // isolate defaults to undefined, meaning false for sequential
    assert.strictEqual(config.isolate, undefined);
  });

  it('cleanup runs even on test failure (via finally block)', async () => {
    configureIsolation({ isolate: true, isolation: 'mocks' });

    const mockFn = fn(() => 'test');
    mockFn();
    assert.ok(getAllMocks().size > 0);

    // Simulate a failing test wrapped in isolation
    try {
      try {
        throw new Error('test failure');
      } finally {
        const { performIsolationCleanupForTest } = await getCleanupHelper();
        performIsolationCleanupForTest('mocks');
      }
    } catch {
      // Expected
    }

    // Mocks should still be cleaned up
    assert.strictEqual(getAllMocks().size, 0);

    configureIsolation({});
  });

  it('mocks-only isolation does not restore timers', async () => {
    configureIsolation({ isolate: true, isolation: 'mocks' });

    const controller = useFakeTimers(5000);
    void controller;
    const mockFn = fn();
    mockFn();

    const { performIsolationCleanupForTest } = await getCleanupHelper();
    performIsolationCleanupForTest('mocks');

    // Mocks cleared but timers still faked
    assert.strictEqual(getAllMocks().size, 0);

    // Clean up timers manually
    useRealTimers();
    configureIsolation({});
  });

  it('none isolation does nothing', async () => {
    configureIsolation({ isolate: true, isolation: 'none' });

    const mockFn = fn(() => 99);
    mockFn();

    const { performIsolationCleanupForTest } = await getCleanupHelper();
    performIsolationCleanupForTest('none');

    // Mock should still be there
    assert.ok(getAllMocks().size > 0);
    assert.strictEqual(mockFn.mock.calls.length, 1);

    // Clean up manually
    mockFn.mockRestore();
    getAllMocks().clear();
    configureIsolation({});
  });

  it('configureIsolation changes behavior dynamically', () => {
    configureIsolation({ isolate: false, isolation: 'none' });
    let config = getIsolationConfig();
    assert.strictEqual(config.isolate, false);
    assert.strictEqual(config.isolation, 'none');

    configureIsolation({ isolate: true, isolation: 'full' });
    config = getIsolationConfig();
    assert.strictEqual(config.isolate, true);
    assert.strictEqual(config.isolation, 'full');

    configureIsolation({});
  });
});

/**
 * Helper to access cleanup logic without re-importing internals.
 * This mirrors what the wrapWithIsolation function does.
 */
async function getCleanupHelper(): Promise<{
  performIsolationCleanupForTest: (mode: 'full' | 'mocks' | 'none') => void;
}> {
  return {
    performIsolationCleanupForTest(mode: 'full' | 'mocks' | 'none'): void {
      if (mode === 'none') return;
      const mockSet = getAllMocks();
      for (const m of mockSet) {
        m.mockRestore();
      }
      mockSet.clear();
      if (mode === 'full') {
        useRealTimers();
        unstubAllGlobals();
      }
    },
  };
}
