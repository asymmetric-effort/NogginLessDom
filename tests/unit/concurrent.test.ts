/**
 * Tests for concurrent test variants: describe.concurrent, it.concurrent, test.concurrent.
 *
 * Bun's node:test does NOT support nested test()/describe() calls,
 * so we verify API shapes inside nodeIt, and invoke our wrappers at the
 * top level (inside nodeDescribe callbacks but NOT inside nodeIt callbacks).
 */
import { describe as nodeDescribe, it as nodeIt } from 'node:test';
import assert from 'node:assert/strict';
import { describe, it, test } from '../../src/test-runner/index.js';

// ---------------------------------------------------------------
// 1. API shape tests
// ---------------------------------------------------------------
nodeDescribe('concurrent API shapes', () => {
  nodeIt('describe.concurrent is a function', () => {
    assert.strictEqual(typeof describe.concurrent, 'function');
  });

  nodeIt('it.concurrent is a function', () => {
    assert.strictEqual(typeof it.concurrent, 'function');
  });

  nodeIt('test.concurrent is a function', () => {
    assert.strictEqual(typeof test.concurrent, 'function');
  });

  nodeIt('test.concurrent is the same as it.concurrent', () => {
    assert.strictEqual(test.concurrent, it.concurrent);
  });

  nodeIt('describe.concurrent accepts (name, fn) like describe', () => {
    assert.strictEqual(describe.concurrent.length, 2);
  });

  nodeIt('it.concurrent accepts (name, fn) like it', () => {
    // it.concurrent(name, fn, options?) — at least 2 params
    assert.ok(it.concurrent.length >= 2);
  });
});

// ---------------------------------------------------------------
// 2. Top-level invocations (not nested inside nodeIt)
// ---------------------------------------------------------------
describe.concurrent('concurrent suite', () => {
  it('test inside concurrent suite', () => {
    assert.ok(true);
  });
});

it.concurrent('concurrent individual test', () => {
  assert.ok(true);
});

test.concurrent('concurrent individual test via test alias', () => {
  assert.ok(true);
});
