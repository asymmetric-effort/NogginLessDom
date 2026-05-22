import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  onTestFailed,
  onTestFinished,
  notifyTestFailed,
  notifyTestFinished,
  clearLifecycleHooks,
} from '../../src/test-runner/index.js';

describe('onTestFailed', () => {
  it('should be a function', () => {
    assert.strictEqual(typeof onTestFailed, 'function');
  });

  it('should register and invoke callback on failure notification', () => {
    clearLifecycleHooks();
    const contexts: Array<{ name: string; error: unknown }> = [];
    onTestFailed((ctx) => {
      contexts.push(ctx);
    });
    const error = new Error('test failed');
    notifyTestFailed({ name: 'my-test', error });
    assert.strictEqual(contexts.length, 1);
    assert.strictEqual(contexts[0]!.name, 'my-test');
    assert.strictEqual(contexts[0]!.error, error);
    clearLifecycleHooks();
  });

  it('should support multiple callbacks', () => {
    clearLifecycleHooks();
    let count = 0;
    onTestFailed(() => {
      count++;
    });
    onTestFailed(() => {
      count++;
    });
    notifyTestFailed({ name: 'test', error: new Error('err') });
    assert.strictEqual(count, 2);
    clearLifecycleHooks();
  });
});

describe('onTestFinished', () => {
  it('should be a function', () => {
    assert.strictEqual(typeof onTestFinished, 'function');
  });

  it('should register and invoke callback on finished notification', () => {
    clearLifecycleHooks();
    const contexts: Array<{ name: string; passed: boolean }> = [];
    onTestFinished((ctx) => {
      contexts.push(ctx);
    });
    notifyTestFinished({ name: 'passing-test', passed: true });
    assert.strictEqual(contexts.length, 1);
    assert.strictEqual(contexts[0]!.name, 'passing-test');
    assert.strictEqual(contexts[0]!.passed, true);
    clearLifecycleHooks();
  });

  it('should receive passed=false for failing tests', () => {
    clearLifecycleHooks();
    const contexts: Array<{ name: string; passed: boolean }> = [];
    onTestFinished((ctx) => {
      contexts.push(ctx);
    });
    notifyTestFinished({ name: 'failing-test', passed: false });
    assert.strictEqual(contexts.length, 1);
    assert.strictEqual(contexts[0]!.passed, false);
    clearLifecycleHooks();
  });

  it('should support multiple callbacks', () => {
    clearLifecycleHooks();
    let count = 0;
    onTestFinished(() => {
      count++;
    });
    onTestFinished(() => {
      count++;
    });
    notifyTestFinished({ name: 'test', passed: true });
    assert.strictEqual(count, 2);
    clearLifecycleHooks();
  });
});

describe('clearLifecycleHooks', () => {
  it('should clear all registered callbacks', () => {
    clearLifecycleHooks();
    let failedCalled = false;
    let finishedCalled = false;
    onTestFailed(() => {
      failedCalled = true;
    });
    onTestFinished(() => {
      finishedCalled = true;
    });
    clearLifecycleHooks();
    notifyTestFailed({ name: 'test', error: new Error('err') });
    notifyTestFinished({ name: 'test', passed: true });
    assert.strictEqual(failedCalled, false);
    assert.strictEqual(finishedCalled, false);
  });
});
