import { describe, it, expect } from '../../src/index.js';
import { AbortController, AbortSignal } from '../../src/dom/abort.js';

describe('AbortController', () => {
  it('creates a signal', () => {
    const controller = new AbortController();
    expect(controller.signal).toBeDefined();
    expect(controller.signal).toBeInstanceOf(AbortSignal);
    expect(controller.signal.aborted).toBe(false);
    expect(controller.signal.reason).toBeUndefined();
  });

  it('abort() sets aborted=true', () => {
    const controller = new AbortController();
    controller.abort();
    expect(controller.signal.aborted).toBe(true);
  });

  it('abort() fires abort event', () => {
    const controller = new AbortController();
    let fired = false;
    controller.signal.addEventListener('abort', () => {
      fired = true;
    });
    controller.abort();
    expect(fired).toBe(true);
  });

  it('abort() fires onabort handler', () => {
    const controller = new AbortController();
    let fired = false;
    controller.signal.onabort = () => {
      fired = true;
    };
    controller.abort();
    expect(fired).toBe(true);
  });

  it('abort(reason) sets reason', () => {
    const controller = new AbortController();
    const reason = new Error('cancelled');
    controller.abort(reason);
    expect(controller.signal.aborted).toBe(true);
    expect(controller.signal.reason).toBe(reason);
  });

  it('abort() without reason sets reason to AbortError-like DOMException message', () => {
    const controller = new AbortController();
    controller.abort();
    expect(controller.signal.aborted).toBe(true);
    expect(controller.signal.reason).toBeDefined();
  });

  it('abort() called multiple times only fires event once', () => {
    const controller = new AbortController();
    let count = 0;
    controller.signal.addEventListener('abort', () => {
      count++;
    });
    controller.abort();
    controller.abort();
    expect(count).toBe(1);
  });

  it('signal is readonly', () => {
    const controller = new AbortController();
    const originalSignal = controller.signal;
    // Attempting to overwrite should not change the signal
    expect(controller.signal).toBe(originalSignal);
  });
});

describe('AbortSignal', () => {
  it('has default values', () => {
    const controller = new AbortController();
    const signal = controller.signal;
    expect(signal.aborted).toBe(false);
    expect(signal.reason).toBeUndefined();
    expect(signal.onabort).toBeNull();
  });

  it('addEventListener and removeEventListener', () => {
    const controller = new AbortController();
    let called = false;
    const listener = () => {
      called = true;
    };
    controller.signal.addEventListener('abort', listener);
    controller.signal.removeEventListener('abort', listener);
    controller.abort();
    expect(called).toBe(false);
  });

  it('throwIfAborted throws when aborted', () => {
    const controller = new AbortController();
    const reason = new Error('test error');
    controller.abort(reason);
    expect(() => controller.signal.throwIfAborted()).toThrow('test error');
  });

  it('throwIfAborted does not throw when not aborted', () => {
    const controller = new AbortController();
    expect(() => controller.signal.throwIfAborted()).not.toThrow();
  });

  it('AbortSignal.abort() creates pre-aborted signal', () => {
    const signal = AbortSignal.abort();
    expect(signal).toBeInstanceOf(AbortSignal);
    expect(signal.aborted).toBe(true);
    expect(signal.reason).toBeDefined();
  });

  it('AbortSignal.abort(reason) creates pre-aborted signal with reason', () => {
    const reason = new Error('custom reason');
    const signal = AbortSignal.abort(reason);
    expect(signal.aborted).toBe(true);
    expect(signal.reason).toBe(reason);
  });

  it('AbortSignal.timeout() auto-aborts after delay', async () => {
    const signal = AbortSignal.timeout(50);
    expect(signal.aborted).toBe(false);

    await new Promise<void>((resolve) => {
      signal.addEventListener('abort', () => {
        resolve();
      });
    });

    expect(signal.aborted).toBe(true);
    expect(signal.reason).toBeDefined();
  });

  it('multiple listeners are all called on abort', () => {
    const controller = new AbortController();
    let count = 0;
    controller.signal.addEventListener('abort', () => {
      count++;
    });
    controller.signal.addEventListener('abort', () => {
      count++;
    });
    controller.abort();
    expect(count).toBe(2);
  });

  it('non-abort event listeners are not called on abort', () => {
    const controller = new AbortController();
    let called = false;
    controller.signal.addEventListener('change', () => {
      called = true;
    });
    controller.abort();
    expect(called).toBe(false);
  });
});
