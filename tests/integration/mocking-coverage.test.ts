import { describe, it } from 'node:test';
import {
  expect,
  fn,
  spyOn,
  useFakeTimers,
  useRealTimers,
} from '../../src/index.js';
import { getDefaultConfig, mergeConfig } from '../../src/coverage/config.js';

describe('integration: Mocking + Coverage', () => {
  it('should create and verify mock functions alongside config', () => {
    const mockFn = fn((x: number) => x * 2);

    mockFn(5);
    mockFn(10);

    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(mockFn).toHaveBeenCalledWith(5);
    expect(mockFn).toHaveBeenCalledWith(10);
    expect(mockFn.mock.results[0].value).toBe(10);
    expect(mockFn.mock.results[1].value).toBe(20);

    // Verify coverage config is available alongside mocking
    const config = getDefaultConfig();
    expect(config.provider).toBe('v8');
    expect(config.reporter).toContain('text');
  });

  it('should spy on object methods and verify calls', () => {
    const calculator = {
      add(a: number, b: number): number {
        return a + b;
      },
      multiply(a: number, b: number): number {
        return a * b;
      },
    };

    const addSpy = spyOn(calculator, 'add');
    const multiplySpy = spyOn(calculator, 'multiply');

    calculator.add(2, 3);
    calculator.multiply(4, 5);

    expect(addSpy).toHaveBeenCalledOnce();
    expect(addSpy).toHaveBeenCalledWith(2, 3);
    expect(multiplySpy).toHaveBeenCalledOnce();
    expect(multiplySpy).toHaveBeenCalledWith(4, 5);

    addSpy.mockRestore();
    multiplySpy.mockRestore();
  });

  it('should use fake timers without interfering with assertions', () => {
    const timer = useFakeTimers();

    const callback = fn();
    setTimeout(callback, 1000);

    expect(callback).not.toHaveBeenCalled();

    timer.advanceTimersByTime(500);
    expect(callback).not.toHaveBeenCalled();

    timer.advanceTimersByTime(500);
    expect(callback).toHaveBeenCalledOnce();

    useRealTimers();
  });

  it('should handle mock return values and implementations', () => {
    const mockGreet = fn();
    mockGreet.mockReturnValue('hello');

    expect(mockGreet()).toBe('hello');
    expect(mockGreet()).toBe('hello');

    mockGreet.mockReturnValueOnce('first').mockReturnValueOnce('second');

    expect(mockGreet()).toBe('first');
    expect(mockGreet()).toBe('second');
    expect(mockGreet()).toBe('hello'); // falls back to default

    mockGreet.mockImplementation((name: string) => `hi ${name}`);
    expect(mockGreet('world')).toBe('hi world');
  });

  it('should merge coverage config with valid values', () => {
    const config = mergeConfig({
      enabled: true,
      reporter: ['text', 'json'],
      thresholds: { lines: 80, branches: 75 },
    });

    expect(config.enabled).toBe(true);
    expect(config.reporter).toEqual(['text', 'json']);
    expect(config.thresholds?.lines).toBe(80);
    expect(config.thresholds?.branches).toBe(75);
    expect(config.provider).toBe('v8'); // default preserved
  });

  it('should track mock call order across multiple mocks', () => {
    const first = fn();
    const second = fn();
    const third = fn();

    first();
    second();
    third();
    first();

    expect(first).toHaveBeenCalledTimes(2);
    expect(second).toHaveBeenCalledOnce();
    expect(third).toHaveBeenCalledOnce();
  });

  it('should handle fake timers with intervals', () => {
    const timer = useFakeTimers();
    const callback = fn();

    setInterval(callback, 100);

    timer.advanceTimersByTime(350);

    expect(callback).toHaveBeenCalledTimes(3);

    useRealTimers();
  });

  it('should mock and verify async-like patterns', () => {
    const mockFetch = fn();
    mockFetch.mockReturnValue({ ok: true, status: 200 });

    const result = mockFetch('/api/data');

    expect(result).toMatchObject({ ok: true, status: 200 });
    expect(mockFetch).toHaveBeenCalledWith('/api/data');
  });
});
