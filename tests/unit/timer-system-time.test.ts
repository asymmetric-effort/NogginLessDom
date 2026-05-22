/**
 * Tests for issues #119, #121, #122:
 * - #119: getMockedSystemTime() and getRealSystemTime()
 * - #121: Async timer methods should defer via event loop
 * - #122: useFakeTimers should mock Date constructor
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { useFakeTimers, useRealTimers, vi } from '../../src/mocking/index.js';

// Save originals before any test runs
const realDateNow = Date.now;
const OriginalDate = Date;

describe('#119: getMockedSystemTime and getRealSystemTime', () => {
  it('getMockedSystemTime returns null when not using fake timers', () => {
    const result = vi.getMockedSystemTime();
    assert.strictEqual(result, null);
  });

  it('getMockedSystemTime returns current fake time as Date', () => {
    useFakeTimers(5000);
    try {
      const mocked = vi.getMockedSystemTime();
      assert.ok(mocked instanceof Date);
      assert.strictEqual(mocked!.getTime(), 5000);
    } finally {
      useRealTimers();
    }
  });

  it('getMockedSystemTime tracks time after advanceTimersByTime', () => {
    const clock = useFakeTimers(1000);
    try {
      clock.advanceTimersByTime(500);
      const mocked = vi.getMockedSystemTime();
      assert.ok(mocked instanceof Date);
      assert.strictEqual(mocked!.getTime(), 1500);
    } finally {
      useRealTimers();
    }
  });

  it('getMockedSystemTime tracks time after setSystemTime', () => {
    const clock = useFakeTimers(0);
    try {
      clock.setSystemTime(9999);
      const mocked = vi.getMockedSystemTime();
      assert.ok(mocked instanceof Date);
      assert.strictEqual(mocked!.getTime(), 9999);
    } finally {
      useRealTimers();
    }
  });

  it('getMockedSystemTime returns null after useRealTimers', () => {
    useFakeTimers(1000);
    useRealTimers();
    assert.strictEqual(vi.getMockedSystemTime(), null);
  });

  it('getRealSystemTime returns actual wall-clock time regardless of fake timers', () => {
    useFakeTimers(0);
    try {
      const realTime = vi.getRealSystemTime();
      // Real time should be close to actual current time, not 0
      const actualNow = realDateNow.call(Date);
      assert.ok(
        Math.abs(realTime - actualNow) < 1000,
        `Expected real time (~${actualNow}) to be close to getRealSystemTime (${realTime})`,
      );
    } finally {
      useRealTimers();
    }
  });

  it('getRealSystemTime works when not using fake timers', () => {
    const realTime = vi.getRealSystemTime();
    const actualNow = realDateNow.call(Date);
    assert.ok(
      Math.abs(realTime - actualNow) < 1000,
      'getRealSystemTime should return actual time even without fake timers',
    );
  });

  it('controller also exposes getMockedSystemTime', () => {
    const clock = useFakeTimers(3000);
    try {
      const mocked = clock.getMockedSystemTime();
      assert.ok(mocked instanceof Date);
      assert.strictEqual(mocked!.getTime(), 3000);
    } finally {
      useRealTimers();
    }
  });

  it('controller also exposes getRealSystemTime', () => {
    const clock = useFakeTimers(0);
    try {
      const realTime = clock.getRealSystemTime();
      const actualNow = realDateNow.call(Date);
      assert.ok(Math.abs(realTime - actualNow) < 1000);
    } finally {
      useRealTimers();
    }
  });
});

describe('#121: Async timer methods should defer via event loop', () => {
  it('advanceTimersByTimeAsync yields to the event loop', async () => {
    const clock = useFakeTimers(0);
    try {
      let microtaskRan = false;
      queueMicrotask(() => {
        microtaskRan = true;
      });
      await clock.advanceTimersByTimeAsync(100);
      assert.strictEqual(microtaskRan, true, 'microtask should have run');
    } finally {
      useRealTimers();
    }
  });

  it('advanceTimersToNextTimerAsync yields to the event loop', async () => {
    const clock = useFakeTimers(0);
    try {
      setTimeout(() => {}, 50);
      let microtaskRan = false;
      queueMicrotask(() => {
        microtaskRan = true;
      });
      await clock.advanceTimersToNextTimerAsync();
      assert.strictEqual(microtaskRan, true, 'microtask should have run');
    } finally {
      useRealTimers();
    }
  });

  it('runAllTimersAsync yields to the event loop', async () => {
    const clock = useFakeTimers(0);
    try {
      setTimeout(() => {}, 50);
      let microtaskRan = false;
      queueMicrotask(() => {
        microtaskRan = true;
      });
      await clock.runAllTimersAsync();
      assert.strictEqual(microtaskRan, true, 'microtask should have run');
    } finally {
      useRealTimers();
    }
  });

  it('runOnlyPendingTimersAsync yields to the event loop', async () => {
    const clock = useFakeTimers(0);
    try {
      setTimeout(() => {}, 50);
      let microtaskRan = false;
      queueMicrotask(() => {
        microtaskRan = true;
      });
      await clock.runOnlyPendingTimersAsync();
      assert.strictEqual(microtaskRan, true, 'microtask should have run');
    } finally {
      useRealTimers();
    }
  });

  it('async methods still fire timers correctly', async () => {
    const clock = useFakeTimers(0);
    try {
      const calls: number[] = [];
      setTimeout(() => calls.push(1), 50);
      setTimeout(() => calls.push(2), 100);
      await clock.advanceTimersByTimeAsync(100);
      assert.deepStrictEqual(calls, [1, 2]);
    } finally {
      useRealTimers();
    }
  });
});

describe('#122: useFakeTimers should mock Date constructor', () => {
  it('new Date() returns fake time when fake timers are active', () => {
    useFakeTimers(5000);
    try {
      const d = new Date();
      assert.strictEqual(d.getTime(), 5000);
    } finally {
      useRealTimers();
    }
  });

  it('new Date(value) still uses the provided value', () => {
    useFakeTimers(5000);
    try {
      const d = new Date(12345);
      assert.strictEqual(d.getTime(), 12345);
    } finally {
      useRealTimers();
    }
  });

  it('new Date(string) still parses the string', () => {
    useFakeTimers(5000);
    try {
      const d = new Date('2025-01-01T00:00:00Z');
      assert.strictEqual(
        d.getTime(),
        new OriginalDate('2025-01-01T00:00:00Z').getTime(),
      );
    } finally {
      useRealTimers();
    }
  });

  it('new Date(y,m,...) still constructs from components', () => {
    useFakeTimers(5000);
    try {
      const d = new Date(2025, 0, 1);
      const expected = new OriginalDate(2025, 0, 1);
      assert.strictEqual(d.getTime(), expected.getTime());
    } finally {
      useRealTimers();
    }
  });

  it('Date.now() returns fake time', () => {
    useFakeTimers(7777);
    try {
      assert.strictEqual(Date.now(), 7777);
    } finally {
      useRealTimers();
    }
  });

  it('Date constructor is restored after useRealTimers', () => {
    useFakeTimers(5000);
    useRealTimers();
    const before = realDateNow.call(Date);
    const d = new Date();
    const after = realDateNow.call(Date);
    // new Date() should use real time after restore
    assert.ok(d.getTime() >= before && d.getTime() <= after + 1);
  });

  it('instanceof Date still works with mocked Date', () => {
    useFakeTimers(5000);
    try {
      const d = new Date();
      assert.ok(d instanceof Date);
    } finally {
      useRealTimers();
    }
  });

  it('Date.parse still works', () => {
    useFakeTimers(5000);
    try {
      const ts = Date.parse('2025-01-01T00:00:00Z');
      assert.strictEqual(ts, OriginalDate.parse('2025-01-01T00:00:00Z'));
    } finally {
      useRealTimers();
    }
  });

  it('Date.UTC still works', () => {
    useFakeTimers(5000);
    try {
      const ts = Date.UTC(2025, 0, 1);
      assert.strictEqual(ts, OriginalDate.UTC(2025, 0, 1));
    } finally {
      useRealTimers();
    }
  });

  it('toFake option selectively mocks only specified APIs', () => {
    const originalST = globalThis.setTimeout;
    useFakeTimers({ now: 5000, toFake: ['Date'] });
    try {
      // Date should be mocked
      assert.strictEqual(Date.now(), 5000);
      const d = new Date();
      assert.strictEqual(d.getTime(), 5000);
      // setTimeout should NOT be mocked (not in toFake)
      assert.strictEqual(globalThis.setTimeout, originalST);
    } finally {
      useRealTimers();
    }
  });

  it('toFake with setTimeout only mocks setTimeout', () => {
    const originalST = globalThis.setTimeout;
    useFakeTimers({ now: 5000, toFake: ['setTimeout'] });
    try {
      // setTimeout should be mocked
      assert.notStrictEqual(globalThis.setTimeout, originalST);
      // Date.now should NOT be mocked
      const realNow = realDateNow.call(Date);
      const dateNow = Date.now();
      assert.ok(
        Math.abs(dateNow - realNow) < 1000,
        'Date.now should not be mocked when not in toFake',
      );
    } finally {
      useRealTimers();
    }
  });

  it('toFake defaults to all APIs when not specified', () => {
    const originalST = globalThis.setTimeout;
    useFakeTimers({ now: 5000 });
    try {
      assert.notStrictEqual(globalThis.setTimeout, originalST);
      assert.strictEqual(Date.now(), 5000);
    } finally {
      useRealTimers();
    }
  });

  it('mocks setImmediate/clearImmediate when available and in toFake', () => {
    // setImmediate may not exist in all environments
    if (typeof globalThis.setImmediate === 'undefined') {
      return;
    }
    const originalSI = globalThis.setImmediate;
    useFakeTimers({ now: 0 });
    try {
      assert.notStrictEqual(globalThis.setImmediate, originalSI);
    } finally {
      useRealTimers();
    }
    // After restore, should be back
    assert.strictEqual(globalThis.setImmediate, originalSI);
  });

  it('mocked setImmediate fires callback on advanceTimersByTime(0)', () => {
    if (typeof globalThis.setImmediate === 'undefined') {
      return;
    }
    const clock = useFakeTimers(0);
    try {
      const calls: string[] = [];
      setImmediate(() => calls.push('immediate'));
      assert.deepStrictEqual(calls, []);
      clock.advanceTimersByTime(0);
      assert.deepStrictEqual(calls, ['immediate']);
    } finally {
      useRealTimers();
    }
  });

  it('clearImmediate cancels a pending immediate', () => {
    if (typeof globalThis.setImmediate === 'undefined') {
      return;
    }
    const clock = useFakeTimers(0);
    try {
      const calls: string[] = [];
      const id = setImmediate(() => calls.push('immediate'));
      clearImmediate(id);
      clock.advanceTimersByTime(0);
      assert.deepStrictEqual(calls, []);
    } finally {
      useRealTimers();
    }
  });
});
