import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createWindow } from '../../src/dom/window.js';

describe('requestAnimationFrame', () => {
  it('should return an id', () => {
    const win = createWindow();
    const id = win.requestAnimationFrame(() => {});
    assert.strictEqual(typeof id, 'number');
    assert.ok(id > 0);
  });

  it('should return incrementing ids', () => {
    const win = createWindow();
    const id1 = win.requestAnimationFrame(() => {});
    const id2 = win.requestAnimationFrame(() => {});
    assert.ok(id2 > id1);
  });

  it('should queue callback to run on flushAnimationFrames', () => {
    const win = createWindow();
    let called = false;
    win.requestAnimationFrame(() => {
      called = true;
    });
    assert.strictEqual(called, false);
    win.flushAnimationFrames();
    assert.strictEqual(called, true);
  });

  it('should pass a timestamp to the callback', () => {
    const win = createWindow();
    let receivedTimestamp: number | undefined;
    win.requestAnimationFrame((timestamp) => {
      receivedTimestamp = timestamp;
    });
    win.flushAnimationFrames();
    assert.strictEqual(typeof receivedTimestamp, 'number');
    assert.ok(receivedTimestamp! >= 0);
  });

  it('should run multiple queued callbacks', () => {
    const win = createWindow();
    const order: number[] = [];
    win.requestAnimationFrame(() => order.push(1));
    win.requestAnimationFrame(() => order.push(2));
    win.requestAnimationFrame(() => order.push(3));
    win.flushAnimationFrames();
    assert.deepStrictEqual(order, [1, 2, 3]);
  });

  it('should clear the queue after flushAnimationFrames', () => {
    const win = createWindow();
    let count = 0;
    win.requestAnimationFrame(() => count++);
    win.flushAnimationFrames();
    win.flushAnimationFrames();
    assert.strictEqual(count, 1);
  });
});

describe('cancelAnimationFrame', () => {
  it('should cancel a queued callback', () => {
    const win = createWindow();
    let called = false;
    const id = win.requestAnimationFrame(() => {
      called = true;
    });
    win.cancelAnimationFrame(id);
    win.flushAnimationFrames();
    assert.strictEqual(called, false);
  });

  it('should only cancel the specified callback', () => {
    const win = createWindow();
    const order: number[] = [];
    win.requestAnimationFrame(() => order.push(1));
    const id2 = win.requestAnimationFrame(() => order.push(2));
    win.requestAnimationFrame(() => order.push(3));
    win.cancelAnimationFrame(id2);
    win.flushAnimationFrames();
    assert.deepStrictEqual(order, [1, 3]);
  });

  it('should not throw for invalid id', () => {
    const win = createWindow();
    // Should not throw
    win.cancelAnimationFrame(999);
  });
});

describe('flushAnimationFrames', () => {
  it('should be a no-op when no callbacks are queued', () => {
    const win = createWindow();
    // Should not throw
    win.flushAnimationFrames();
  });
});
