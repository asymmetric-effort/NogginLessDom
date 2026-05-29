/**
 * Tests for requestAnimationFrame + fake timer integration (Feature #172).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { useFakeTimers, useRealTimers } from '../../src/mocking/index.js';

describe('requestAnimationFrame + fake timer integration (Feature #172)', () => {
  it('rAF callback fires via advanceTimersByTime(16)', () => {
    const controller = useFakeTimers({
      now: 1000,
      toFake: [
        'setTimeout',
        'clearTimeout',
        'requestAnimationFrame',
        'cancelAnimationFrame',
      ],
    });

    let called = false;
    let receivedTimestamp = -1;
    requestAnimationFrame((ts) => {
      called = true;
      receivedTimestamp = ts;
    });

    assert.strictEqual(called, false);
    controller.advanceTimersByTime(16);
    assert.strictEqual(called, true);
    assert.strictEqual(receivedTimestamp, 1016);

    useRealTimers();
  });

  it('multiple frames for larger advances', () => {
    const controller = useFakeTimers({
      now: 0,
      toFake: [
        'setTimeout',
        'clearTimeout',
        'requestAnimationFrame',
        'cancelAnimationFrame',
      ],
    });

    const timestamps: number[] = [];
    let frameCount = 0;

    function scheduleFrame(): void {
      requestAnimationFrame((ts) => {
        frameCount++;
        timestamps.push(ts);
        if (frameCount < 3) {
          scheduleFrame();
        }
      });
    }

    scheduleFrame();
    // Each frame takes 16ms, 3 frames = 48ms
    controller.advanceTimersByTime(48);
    assert.strictEqual(frameCount, 3);
    assert.strictEqual(timestamps[0], 16);
    assert.strictEqual(timestamps[1], 32);
    assert.strictEqual(timestamps[2], 48);

    useRealTimers();
  });

  it('cancelAnimationFrame prevents execution', () => {
    const controller = useFakeTimers({
      now: 0,
      toFake: [
        'setTimeout',
        'clearTimeout',
        'requestAnimationFrame',
        'cancelAnimationFrame',
      ],
    });

    let called = false;
    const id = requestAnimationFrame(() => {
      called = true;
    });

    cancelAnimationFrame(id);
    controller.advanceTimersByTime(16);
    assert.strictEqual(called, false);

    useRealTimers();
  });

  it('callback timestamp matches fake time', () => {
    const controller = useFakeTimers({
      now: 5000,
      toFake: [
        'setTimeout',
        'clearTimeout',
        'requestAnimationFrame',
        'cancelAnimationFrame',
      ],
    });

    let receivedTs = -1;
    requestAnimationFrame((ts) => {
      receivedTs = ts;
    });

    controller.advanceTimersByTime(16);
    // The timestamp should be 5000 + 16 = 5016
    assert.strictEqual(receivedTs, 5016);

    useRealTimers();
  });

  it('runAllTimers flushes rAF', () => {
    const controller = useFakeTimers({
      now: 0,
      toFake: [
        'setTimeout',
        'clearTimeout',
        'requestAnimationFrame',
        'cancelAnimationFrame',
      ],
    });

    let called = false;
    requestAnimationFrame(() => {
      called = true;
    });

    controller.runAllTimers();
    assert.strictEqual(called, true);

    useRealTimers();
  });

  it('useRealTimers restores original rAF', () => {
    // Save whatever rAF is before faking (may be undefined in some envs)
    const hadRAF = typeof globalThis.requestAnimationFrame !== 'undefined';

    useFakeTimers({
      now: 0,
      toFake: ['requestAnimationFrame', 'cancelAnimationFrame'],
    });

    // rAF should be faked (a new function)
    assert.strictEqual(typeof globalThis.requestAnimationFrame, 'function');

    useRealTimers();

    // After restore, rAF should match the original state
    if (hadRAF) {
      assert.strictEqual(typeof globalThis.requestAnimationFrame, 'function');
    }
    // The key thing: it should not be the fake anymore
    // Verify by checking that faking again creates a different function
    const afterRestore = globalThis.requestAnimationFrame;
    useFakeTimers({
      now: 0,
      toFake: ['requestAnimationFrame'],
    });
    // If rAF exists, verify it changed after re-faking
    if (afterRestore) {
      assert.notStrictEqual(globalThis.requestAnimationFrame, afterRestore);
    }
    useRealTimers();
  });

  it('performance.now returns fake time when faked', () => {
    const controller = useFakeTimers({
      now: 2000,
      toFake: ['setTimeout', 'clearTimeout', 'performance'],
    });

    assert.strictEqual(performance.now(), 2000);

    controller.advanceTimersByTime(500);
    assert.strictEqual(performance.now(), 2500);

    useRealTimers();
  });

  it('performance.now restored after useRealTimers', () => {
    const before = performance.now();
    useFakeTimers({
      now: 99999,
      toFake: ['performance'],
    });
    assert.strictEqual(performance.now(), 99999);

    useRealTimers();

    const after = performance.now();
    // Should be a real timestamp now, not 99999
    assert.notStrictEqual(after, 99999);
    assert.ok(after >= before);
  });
});
