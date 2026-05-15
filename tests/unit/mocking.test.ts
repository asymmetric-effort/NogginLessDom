import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  fn,
  spyOn,
  useFakeTimers,
  useRealTimers,
} from '../../src/mocking/index.js';

describe('mocking', () => {
  describe('fn()', () => {
    it('should create a callable mock', () => {
      const mock = fn();
      mock();
      assert.strictEqual(mock.mock.calls.length, 1);
    });

    it('should track arguments', () => {
      const mock = fn();
      mock('a', 'b');
      mock('c');
      assert.deepStrictEqual(mock.mock.calls[0], ['a', 'b']);
      assert.deepStrictEqual(mock.mock.calls[1], ['c']);
      assert.deepStrictEqual(mock.mock.lastCall, ['c']);
    });

    it('should track return values', () => {
      const mock = fn((x: number) => x * 2);
      mock(3);
      assert.deepStrictEqual(mock.mock.results[0], {
        type: 'return',
        value: 6,
      });
    });

    it('should track thrown errors', () => {
      const mock = fn(() => {
        throw new Error('fail');
      });
      assert.throws(() => mock());
      assert.strictEqual(mock.mock.results[0]?.type, 'throw');
    });

    it('should support mockReturnValue', () => {
      const mock = fn();
      mock.mockReturnValue(42);
      assert.strictEqual(mock(), 42);
      assert.strictEqual(mock(), 42);
    });

    it('should support mockReturnValueOnce', () => {
      const mock = fn();
      mock.mockReturnValueOnce(1);
      mock.mockReturnValueOnce(2);
      mock.mockReturnValue(99);
      assert.strictEqual(mock(), 1);
      assert.strictEqual(mock(), 2);
      assert.strictEqual(mock(), 99);
    });

    it('should support mockImplementation', () => {
      const mock = fn();
      mock.mockImplementation((x: number) => x + 1);
      assert.strictEqual(mock(5), 6);
    });

    it('should support mockImplementationOnce', () => {
      const mock = fn(() => 'default');
      mock.mockImplementationOnce(() => 'once');
      assert.strictEqual(mock(), 'once');
      assert.strictEqual(mock(), 'default');
    });

    it('should support mockClear', () => {
      const mock = fn();
      mock('a');
      mock('b');
      mock.mockClear();
      assert.strictEqual(mock.mock.calls.length, 0);
      assert.strictEqual(mock.mock.results.length, 0);
    });

    it('should support mockReset', () => {
      const mock = fn(() => 'impl');
      mock.mockReturnValue(42);
      mock.mockReset();
      assert.strictEqual(mock.mock.calls.length, 0);
      assert.strictEqual(mock(), undefined);
    });
  });

  describe('spyOn()', () => {
    it('should spy on object methods', () => {
      const obj = { greet: (name: string): string => `Hello ${name}` };
      const spy = spyOn(obj, 'greet');
      obj.greet('World');
      assert.strictEqual(spy.mock.calls.length, 1);
      assert.deepStrictEqual(spy.mock.calls[0], ['World']);
    });

    it('should preserve original behavior', () => {
      const obj = { add: (a: number, b: number): number => a + b };
      spyOn(obj, 'add');
      assert.strictEqual(obj.add(2, 3), 5);
    });

    it('should restore original on mockRestore', () => {
      const original = (x: number): number => x * 2;
      const obj = { calc: original };
      const spy = spyOn(obj, 'calc');
      spy.mockImplementation((x: number) => x * 10);
      assert.strictEqual(obj.calc(5), 50);
      spy.mockRestore();
      assert.strictEqual(obj.calc(5), 10);
    });

    it('should throw when spying on non-function', () => {
      const obj = { value: 42 } as Record<string, unknown>;
      assert.throws(() => spyOn(obj, 'value'), /not a function/);
    });
  });

  describe('useFakeTimers / useRealTimers', () => {
    it('should replace and restore timers', () => {
      const originalSetTimeout = globalThis.setTimeout;
      useFakeTimers();
      assert.notStrictEqual(globalThis.setTimeout, originalSetTimeout);
      useRealTimers();
      assert.strictEqual(globalThis.setTimeout, originalSetTimeout);
    });

    it('should advance timers and fire callbacks', () => {
      const timer = useFakeTimers();
      const calls: string[] = [];
      globalThis.setTimeout(() => calls.push('a'), 100);
      globalThis.setTimeout(() => calls.push('b'), 200);
      timer.advanceTimersByTime(150);
      assert.deepStrictEqual(calls, ['a']);
      timer.advanceTimersByTime(100);
      assert.deepStrictEqual(calls, ['a', 'b']);
      useRealTimers();
    });

    it('should support custom start time', () => {
      const timer = useFakeTimers(1000);
      assert.strictEqual(Date.now(), 1000);
      timer.advanceTimersByTime(500);
      assert.strictEqual(Date.now(), 1500);
      useRealTimers();
    });

    it('should handle clearTimeout', () => {
      const timer = useFakeTimers();
      const calls: string[] = [];
      const id = globalThis.setTimeout(
        () => calls.push('should not fire'),
        100,
      ) as unknown as number;
      globalThis.clearTimeout(id as unknown as ReturnType<typeof setTimeout>);
      timer.advanceTimersByTime(200);
      assert.deepStrictEqual(calls, []);
      useRealTimers();
    });

    it('should handle setInterval and clearInterval', () => {
      const timer = useFakeTimers();
      const calls: number[] = [];
      const id = globalThis.setInterval(
        () => calls.push(calls.length + 1),
        100,
      ) as unknown as number;
      timer.advanceTimersByTime(350);
      assert.ok(
        calls.length >= 3,
        `Expected at least 3 calls, got ${calls.length}`,
      );
      globalThis.clearInterval(id as unknown as ReturnType<typeof setInterval>);
      const countAfterClear = calls.length;
      timer.advanceTimersByTime(200);
      assert.strictEqual(calls.length, countAfterClear);
      useRealTimers();
    });

    it('should runAllTimers', () => {
      const timer = useFakeTimers();
      const calls: string[] = [];
      globalThis.setTimeout(() => calls.push('a'), 50);
      globalThis.setTimeout(() => calls.push('b'), 100);
      globalThis.setTimeout(() => calls.push('c'), 500);
      timer.runAllTimers();
      assert.strictEqual(calls.length, 3);
      useRealTimers();
    });
  });
});
