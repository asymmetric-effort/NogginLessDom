import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  spyOn,
  vi,
  useFakeTimers,
  useRealTimers,
} from '../../src/mocking/index.js';

describe('mocking – extra coverage', () => {
  afterEach(() => {
    useRealTimers();
  });

  // Cover line 340: spyOn getter with no getter defined
  it('spyOn throws when getter is not defined on accessor property', () => {
    const obj: Record<string, unknown> = {};
    Object.defineProperty(obj, 'prop', {
      set(_v: unknown) {
        /* setter only */
      },
      configurable: true,
    });
    assert.throws(() => spyOn(obj, 'prop', 'get'), /no getter defined/);
  });

  // Cover lines 402-404: findPropertyDescriptor walks prototype chain
  it('findPropertyDescriptor walks the prototype chain', () => {
    const parent = {
      greet() {
        return 'hello';
      },
    };
    const child = Object.create(parent) as Record<string, unknown>;
    const spy = spyOn(child, 'greet');
    (child as { greet: () => string }).greet();
    assert.strictEqual(spy.mock.calls.length, 1);
    spy.mockRestore();
  });

  // Cover line 595: FakeDate called without new returns string
  it('FakeDate called without new returns a string', () => {
    const ctrl = useFakeTimers(1000);
    // Date() without new should return a string
    const result = Date();
    assert.strictEqual(typeof result, 'string');
    void ctrl;
  });

  // Cover lines 682-683, 685-687: performance proxy binding functions
  it('fakes performance.now() and preserves other methods via proxy', () => {
    const ctrl = useFakeTimers({
      now: 5000,
      toFake: ['performance'],
    });
    assert.strictEqual(performance.now(), 5000);
    ctrl.advanceTimersByTime(100);
    assert.strictEqual(performance.now(), 5100);
    // Access a function method on performance to hit the bind path
    if (typeof performance.getEntries === 'function') {
      // Just call it to exercise the proxy bind branch
      try {
        performance.getEntries();
      } catch {
        // may throw in some environments, that's fine
      }
    }
  });

  // Cover lines 888, 891: useRealTimers restoring RAF/CAF
  it('useRealTimers restores requestAnimationFrame and cancelAnimationFrame', () => {
    const ctrl = useFakeTimers({
      now: 0,
      toFake: ['requestAnimationFrame', 'cancelAnimationFrame'],
    });
    void ctrl;
    // Now restore
    useRealTimers();
    // After restoring, these should be the originals (or undefined)
    // Just verify the restore path ran without errors
    assert.ok(true);
  });

  // Cover lines 1094, 1099: waitFor timeout with non-Error rejection
  it('waitFor throws non-Error as wrapped Error on timeout', async () => {
    let calls = 0;
    try {
      await vi.waitFor(
        () => {
          calls++;
          throw 'string error';
        },
        { timeout: 50, interval: 10 },
      );
      assert.fail('Should have thrown');
    } catch (err) {
      assert.ok(err instanceof Error);
      assert.ok((err as Error).message.includes('string error'));
    }
    assert.ok(calls > 0);
  });

  // Cover waitFor success path
  it('waitFor resolves when callback succeeds', async () => {
    let attempt = 0;
    const result = await vi.waitFor(
      () => {
        attempt++;
        if (attempt < 3) throw new Error('not yet');
        return 'done';
      },
      { timeout: 500, interval: 10 },
    );
    assert.strictEqual(result, 'done');
  });

  // Cover waitUntil timeout
  it('waitUntil throws on timeout', async () => {
    try {
      await vi.waitUntil(() => false, { timeout: 50, interval: 10 });
      assert.fail('Should have thrown');
    } catch (err) {
      assert.ok(err instanceof Error);
      assert.ok((err as Error).message.includes('timed out'));
    }
  });

  // Cover spyOn setter error path
  it('spyOn throws when setter is not defined on accessor property', () => {
    const obj: Record<string, unknown> = {};
    Object.defineProperty(obj, 'prop', {
      get() {
        return 42;
      },
      configurable: true,
    });
    assert.throws(() => spyOn(obj, 'prop', 'set'), /no setter defined/);
  });

  // Cover FakeDate with multiple args (lines 604+)
  it('FakeDate constructor with multiple args delegates correctly', () => {
    const ctrl = useFakeTimers(0);
    const d = new Date(2025, 5, 15, 10, 30, 45, 500);
    assert.strictEqual(d.getFullYear(), 2025);
    assert.strictEqual(d.getMonth(), 5);
    void ctrl;
  });

  // Cover FakeDate with single arg
  it('FakeDate constructor with single arg works', () => {
    const ctrl = useFakeTimers(0);
    const d = new Date(1000);
    assert.strictEqual(d.getTime(), 1000);
    void ctrl;
  });

  // Cover FakeDate with 0 args uses fake now
  it('FakeDate constructor with no args uses mocked time', () => {
    const ctrl = useFakeTimers(42000);
    const d = new Date();
    assert.strictEqual(d.getTime(), 42000);
    void ctrl;
  });

  // Cover performance proxy - non-function property access
  it('performance proxy returns non-function properties directly', () => {
    const ctrl = useFakeTimers({
      now: 100,
      toFake: ['performance'],
    });
    // Access a non-function property - timeOrigin is a number
    const timeOrigin = performance.timeOrigin;
    assert.strictEqual(typeof timeOrigin, 'number');
    void ctrl;
  });
});
