import { describe as nodeDescribe, it as nodeIt } from 'node:test';
import assert from 'node:assert/strict';
import {
  describe,
  it,
  test,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
} from '../../src/test-runner/index.js';

nodeDescribe('test-runner', () => {
  nodeIt('should export describe as a function', () => {
    assert.strictEqual(typeof describe, 'function');
  });

  nodeIt('should export it as a function', () => {
    assert.strictEqual(typeof it, 'function');
  });

  nodeIt('should export test as an alias for it', () => {
    assert.strictEqual(test, it);
  });

  nodeIt('should export lifecycle hooks as functions', () => {
    assert.strictEqual(typeof beforeEach, 'function');
    assert.strictEqual(typeof afterEach, 'function');
    assert.strictEqual(typeof beforeAll, 'function');
    assert.strictEqual(typeof afterAll, 'function');
  });

  nodeIt('should accept the correct number of parameters', () => {
    // Our wrappers: it(name, fn, options?) => 3 params, describe(name, fn) => 2 params
    assert.strictEqual(it.length, 3);
    assert.strictEqual(describe.length, 2);
  });
});
