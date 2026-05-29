/**
 * Tests for enhanced timer mocking and mock.hoisted().
 */
import { describe as nodeDescribe, it as nodeIt } from 'node:test';
import assert from 'node:assert/strict';
import { useFakeTimers, useRealTimers, mock } from '../../src/mocking/index.js';

nodeDescribe('enhanced timer mocking', () => {
  nodeIt('useFakeTimers(number) backward compat still works', () => {
    const clock = useFakeTimers(1000);
    try {
      assert.strictEqual(clock.now, 1000);
      assert.strictEqual(Date.now(), 1000);
    } finally {
      useRealTimers();
    }
  });

  nodeIt('useFakeTimers({ now }) accepts options object', () => {
    const clock = useFakeTimers({ now: 5000 });
    try {
      assert.strictEqual(clock.now, 5000);
      assert.strictEqual(Date.now(), 5000);
    } finally {
      useRealTimers();
    }
  });

  nodeIt('useFakeTimers({ now: Date }) accepts a Date object', () => {
    const date = new Date('2025-01-01T00:00:00Z');
    const clock = useFakeTimers({ now: date });
    try {
      assert.strictEqual(clock.now, date.getTime());
    } finally {
      useRealTimers();
    }
  });

  nodeIt('useFakeTimers({ shouldAdvanceTime }) stores the flag', () => {
    const clock = useFakeTimers({ now: 0, shouldAdvanceTime: true });
    try {
      // shouldAdvanceTime is accepted without error; stub behavior
      assert.strictEqual(clock.now, 0);
    } finally {
      useRealTimers();
    }
  });

  nodeIt('useFakeTimers({ toFake }) accepts a list of timer names', () => {
    const clock = useFakeTimers({
      now: 0,
      toFake: ['setTimeout', 'setInterval'],
    });
    try {
      assert.strictEqual(clock.now, 0);
    } finally {
      useRealTimers();
    }
  });

  nodeIt('useFakeTimers() with no args defaults now to 0', () => {
    const clock = useFakeTimers();
    try {
      assert.strictEqual(clock.now, 0);
    } finally {
      useRealTimers();
    }
  });

  nodeIt('getTimerCount returns number of pending timers', () => {
    const clock = useFakeTimers(0);
    try {
      assert.strictEqual(clock.getTimerCount(), 0);
      setTimeout(() => {}, 100);
      setTimeout(() => {}, 200);
      assert.strictEqual(clock.getTimerCount(), 2);
      clock.advanceTimersByTime(100);
      assert.strictEqual(clock.getTimerCount(), 1);
    } finally {
      useRealTimers();
    }
  });

  nodeIt(
    'advanceTimersToNextTimer advances to the next scheduled timer',
    () => {
      const clock = useFakeTimers(0);
      try {
        const calls: number[] = [];
        setTimeout(() => calls.push(1), 100);
        setTimeout(() => calls.push(2), 300);

        clock.advanceTimersToNextTimer();
        assert.deepStrictEqual(calls, [1]);
        assert.strictEqual(clock.now, 100);

        clock.advanceTimersToNextTimer();
        assert.deepStrictEqual(calls, [1, 2]);
        assert.strictEqual(clock.now, 300);
      } finally {
        useRealTimers();
      }
    },
  );

  nodeIt('advanceTimersToNextTimer does nothing when no timers', () => {
    const clock = useFakeTimers(0);
    try {
      clock.advanceTimersToNextTimer();
      assert.strictEqual(clock.now, 0);
    } finally {
      useRealTimers();
    }
  });

  nodeIt(
    'runOnlyPendingTimers does not run timers scheduled by callbacks',
    () => {
      const clock = useFakeTimers(0);
      try {
        const calls: string[] = [];
        setTimeout(() => {
          calls.push('first');
          setTimeout(() => {
            calls.push('nested');
          }, 50);
        }, 100);
        setTimeout(() => calls.push('second'), 200);

        clock.runOnlyPendingTimers();

        // Both originally pending timers ran
        assert.ok(calls.includes('first'));
        assert.ok(calls.includes('second'));
        // But the nested timer scheduled by the callback did NOT run
        assert.ok(!calls.includes('nested'));
        // The nested timer is still pending
        assert.strictEqual(clock.getTimerCount(), 1);
      } finally {
        useRealTimers();
      }
    },
  );

  nodeIt('setSystemTime changes fake time without advancing timers', () => {
    const clock = useFakeTimers(0);
    try {
      const calls: string[] = [];
      setTimeout(() => calls.push('fired'), 100);

      clock.setSystemTime(5000);
      assert.strictEqual(clock.now, 5000);
      assert.strictEqual(Date.now(), 5000);
      // Timer should NOT have fired — setSystemTime doesn't advance
      assert.deepStrictEqual(calls, []);
      assert.strictEqual(clock.getTimerCount(), 1);
    } finally {
      useRealTimers();
    }
  });

  nodeIt('setSystemTime accepts a Date object', () => {
    const clock = useFakeTimers(0);
    try {
      const date = new Date('2025-06-15T12:00:00Z');
      clock.setSystemTime(date);
      assert.strictEqual(clock.now, date.getTime());
    } finally {
      useRealTimers();
    }
  });

  nodeIt('advanceTimersByTimeAsync returns a Promise', async () => {
    const clock = useFakeTimers(0);
    try {
      const calls: number[] = [];
      setTimeout(() => calls.push(1), 50);
      const result = clock.advanceTimersByTimeAsync(100);
      assert.ok(result instanceof Promise);
      await result;
      assert.deepStrictEqual(calls, [1]);
    } finally {
      useRealTimers();
    }
  });

  nodeIt('advanceTimersToNextTimerAsync returns a Promise', async () => {
    const clock = useFakeTimers(0);
    try {
      const calls: number[] = [];
      setTimeout(() => calls.push(1), 50);
      const result = clock.advanceTimersToNextTimerAsync();
      assert.ok(result instanceof Promise);
      await result;
      assert.deepStrictEqual(calls, [1]);
    } finally {
      useRealTimers();
    }
  });

  nodeIt('runAllTimersAsync returns a Promise', async () => {
    const clock = useFakeTimers(0);
    try {
      const calls: number[] = [];
      setTimeout(() => calls.push(1), 50);
      setTimeout(() => calls.push(2), 100);
      const result = clock.runAllTimersAsync();
      assert.ok(result instanceof Promise);
      await result;
      assert.deepStrictEqual(calls, [1, 2]);
    } finally {
      useRealTimers();
    }
  });

  nodeIt('runOnlyPendingTimersAsync returns a Promise', async () => {
    const clock = useFakeTimers(0);
    try {
      const calls: string[] = [];
      setTimeout(() => {
        calls.push('first');
        setTimeout(() => calls.push('nested'), 50);
      }, 100);
      const result = clock.runOnlyPendingTimersAsync();
      assert.ok(result instanceof Promise);
      await result;
      assert.deepStrictEqual(calls, ['first']);
      assert.strictEqual(clock.getTimerCount(), 1);
    } finally {
      useRealTimers();
    }
  });
});

// GHSA-ghwv-f6jh-fmpm: Infinite loop prevention in fake timers
nodeDescribe('fake timer infinite loop protection', () => {
  nodeIt('advanceTimersByTime throws on zero-delay interval loops', () => {
    const clock = useFakeTimers(0);
    try {
      // A zero-delay interval that never clears itself
      setInterval(() => {}, 0);
      assert.throws(
        () => clock.advanceTimersByTime(1000),
        /exceeded 10000 iterations/,
      );
    } finally {
      useRealTimers();
    }
  });

  nodeIt('runOnlyPendingTimers throws on zero-delay interval loops', () => {
    const clock = useFakeTimers(0);
    try {
      setInterval(() => {}, 0);
      assert.throws(
        () => clock.runOnlyPendingTimers(),
        /exceeded 10000 iterations/,
      );
    } finally {
      useRealTimers();
    }
  });
});

nodeDescribe('mock.hoisted', () => {
  nodeIt('mock.hoisted is a function', () => {
    assert.strictEqual(typeof mock.hoisted, 'function');
  });

  nodeIt('mock.hoisted executes factory and returns result', () => {
    const result = mock.hoisted(() => ({ value: 42 }));
    assert.deepStrictEqual(result, { value: 42 });
  });

  nodeIt('mock.hoisted returns primitive values', () => {
    const result = mock.hoisted(() => 'hello');
    assert.strictEqual(result, 'hello');
  });

  nodeIt('mock.hoisted executes immediately', () => {
    let executed = false;
    mock.hoisted(() => {
      executed = true;
      return undefined;
    });
    assert.strictEqual(executed, true);
  });
});
