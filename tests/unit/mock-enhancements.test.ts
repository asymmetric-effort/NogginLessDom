import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fn, vi } from '../../src/mocking/index.js';

describe('mockResolvedValue', () => {
  it('should return a resolved promise', async () => {
    const mock = fn<[], Promise<string>>();
    mock.mockResolvedValue('hello');
    const result = await mock();
    assert.strictEqual(result, 'hello');
  });

  it('should return the mock for chaining', () => {
    const mock = fn<[], Promise<number>>();
    const returned = mock.mockResolvedValue(42);
    assert.strictEqual(returned, mock);
  });
});

describe('mockResolvedValueOnce', () => {
  it('should return a resolved promise once', async () => {
    const mock = fn<[], Promise<string>>();
    mock.mockResolvedValueOnce('first');
    mock.mockResolvedValue('default');
    const result1 = await mock();
    const result2 = await mock();
    assert.strictEqual(result1, 'first');
    assert.strictEqual(result2, 'default');
  });
});

describe('mockRejectedValue', () => {
  it('should return a rejected promise', async () => {
    const mock = fn<[], Promise<string>>();
    mock.mockRejectedValue(new Error('fail'));
    await assert.rejects(() => mock(), { message: 'fail' });
  });

  it('should return the mock for chaining', () => {
    const mock = fn<[], Promise<string>>();
    const returned = mock.mockRejectedValue(new Error('fail'));
    assert.strictEqual(returned, mock);
    // Prevent unhandled rejection by catching
    mock().catch(() => {});
  });
});

describe('mockRejectedValueOnce', () => {
  it('should return a rejected promise once', async () => {
    const mock = fn<[], Promise<string>>();
    mock.mockRejectedValueOnce(new Error('once'));
    mock.mockResolvedValue('ok');
    await assert.rejects(() => mock(), { message: 'once' });
    const result = await mock();
    assert.strictEqual(result, 'ok');
  });
});

describe('getMockName / mockName', () => {
  it('should have a default mock name', () => {
    const mock = fn();
    assert.strictEqual(mock.getMockName(), 'vi.fn()');
  });

  it('should set and get mock name', () => {
    const mock = fn();
    const returned = mock.mockName('myMock');
    assert.strictEqual(returned, mock);
    assert.strictEqual(mock.getMockName(), 'myMock');
  });
});

describe('getMockImplementation', () => {
  it('should return undefined when no implementation is set', () => {
    const mock = fn();
    assert.strictEqual(mock.getMockImplementation(), undefined);
  });

  it('should return the initial implementation', () => {
    const impl = (): number => 42;
    const mock = fn(impl);
    assert.strictEqual(mock.getMockImplementation(), impl);
  });

  it('should return the current implementation after mockImplementation', () => {
    const mock = fn();
    const impl = (): number => 99;
    mock.mockImplementation(impl);
    assert.strictEqual(mock.getMockImplementation(), impl);
  });
});

describe('vi.mocked', () => {
  it('should return the same value (identity function)', () => {
    const obj = { foo: 'bar' };
    const result = vi.mocked(obj);
    assert.strictEqual(result, obj);
  });

  it('should work with functions', () => {
    const myFn = (): number => 42;
    const result = vi.mocked(myFn);
    assert.strictEqual(result, myFn);
  });

  it('should work with mock functions', () => {
    const mock = fn();
    const result = vi.mocked(mock);
    assert.strictEqual(result, mock);
  });
});
