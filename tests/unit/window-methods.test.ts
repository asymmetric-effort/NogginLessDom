import { describe, it, expect } from '../../src/index.js';
import { Window, createWindow } from '../../src/dom/window.js';
import { MessageEvent } from '../../src/dom/events.js';

describe('Window.postMessage', () => {
  it('fires message event with data asynchronously', async () => {
    const win = createWindow();
    let receivedData: unknown = null;
    let receivedOrigin: string = '';
    win.addEventListener('message', (event: unknown) => {
      const msgEvent = event as MessageEvent;
      receivedData = msgEvent.data;
      receivedOrigin = msgEvent.origin;
    });
    win.postMessage({ hello: 'world' }, 'http://example.com');
    // Should not have fired yet (microtask)
    expect(receivedData).toBe(null);
    // Wait for microtask
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(receivedData).toEqual({ hello: 'world' });
    expect(receivedOrigin).toBe('http://example.com');
  });

  it('defaults targetOrigin to *', async () => {
    const win = createWindow();
    let receivedOrigin: string = '';
    win.addEventListener('message', (event: unknown) => {
      receivedOrigin = (event as MessageEvent).origin;
    });
    win.postMessage('test');
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(receivedOrigin).toBe('*');
  });

  it('can post string data', async () => {
    const win = createWindow();
    let receivedData: unknown = null;
    win.addEventListener('message', (event: unknown) => {
      receivedData = (event as MessageEvent).data;
    });
    win.postMessage('simple string');
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(receivedData).toBe('simple string');
  });
});

describe('Window.open', () => {
  it('returns window reference', () => {
    const win = new Window();
    const result = win.open('http://example.com', '_blank', 'width=500');
    expect(result).toBe(win);
  });

  it('works with no arguments', () => {
    const win = new Window();
    const result = win.open();
    expect(result).toBe(win);
  });
});

describe('Window.close', () => {
  it('does not throw', () => {
    const win = new Window();
    expect(() => win.close()).not.toThrow();
  });
});

describe('Window.requestIdleCallback / cancelIdleCallback', () => {
  it('returns incrementing IDs', () => {
    const win = new Window();
    const id1 = win.requestIdleCallback(() => {});
    const id2 = win.requestIdleCallback(() => {});
    expect(id1).toBe(1);
    expect(id2).toBe(2);
  });

  it('flushIdleCallbacks runs all queued callbacks', () => {
    const win = new Window();
    const results: number[] = [];
    win.requestIdleCallback((deadline) => {
      results.push(deadline.timeRemaining());
    });
    win.requestIdleCallback((deadline) => {
      results.push(deadline.didTimeout ? 1 : 0);
    });
    win.flushIdleCallbacks();
    expect(results).toEqual([50, 0]);
  });

  it('cancelIdleCallback prevents callback from running', () => {
    const win = new Window();
    let called = false;
    const id = win.requestIdleCallback(() => {
      called = true;
    });
    win.cancelIdleCallback(id);
    win.flushIdleCallbacks();
    expect(called).toBe(false);
  });

  it('flushIdleCallbacks clears the queue', () => {
    const win = new Window();
    let count = 0;
    win.requestIdleCallback(() => {
      count++;
    });
    win.flushIdleCallbacks();
    win.flushIdleCallbacks(); // second flush should be a no-op
    expect(count).toBe(1);
  });

  it('requestIdleCallback accepts options parameter', () => {
    const win = new Window();
    const id = win.requestIdleCallback(() => {}, { timeout: 1000 });
    expect(id).toBeGreaterThan(0);
    win.cancelIdleCallback(id);
  });

  it('cancelIdleCallback with non-existent id does not throw', () => {
    const win = new Window();
    expect(() => win.cancelIdleCallback(999)).not.toThrow();
  });
});
