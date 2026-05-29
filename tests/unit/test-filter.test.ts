import { describe as nodeDescribe, it as nodeIt } from 'node:test';
import assert from 'node:assert/strict';
import {
  setTestNamePattern,
  clearTestNamePattern,
  getTestNamePattern,
  setTestFilePattern,
  clearTestFilePattern,
  getTestFilePattern,
} from '../../src/test-runner/filter.js';
import {
  pushDescribe,
  popDescribe,
  buildFullName,
  shouldSkipTest,
  resetDescribeStack,
  getDescribeStack,
  fileMatchesPattern,
  initFromEnv,
} from '../../src/test-runner/filter.js';

nodeDescribe('test-filter', () => {
  // Reset state before each test to avoid leaks
  nodeIt('setup: clear all filter state', () => {
    clearTestNamePattern();
    clearTestFilePattern();
    resetDescribeStack();
  });

  // -------------------------------------------------------------------------
  // 1. setTestNamePattern with string — converted to regex
  // -------------------------------------------------------------------------
  nodeIt('setTestNamePattern(string) converts to RegExp', () => {
    setTestNamePattern('auth');
    const state = getTestNamePattern();
    assert.ok(state.pattern instanceof RegExp);
    assert.strictEqual(state.pattern!.source, 'auth');
    assert.strictEqual(state.invert, false);
    clearTestNamePattern();
  });

  // -------------------------------------------------------------------------
  // 2. setTestNamePattern with RegExp — used directly
  // -------------------------------------------------------------------------
  nodeIt('setTestNamePattern(RegExp) uses regex directly', () => {
    const re = /^User/;
    setTestNamePattern(re);
    const state = getTestNamePattern();
    assert.strictEqual(state.pattern, re);
    assert.strictEqual(state.invert, false);
    clearTestNamePattern();
  });

  // -------------------------------------------------------------------------
  // 3. Pattern matching against full test name (suite > test)
  // -------------------------------------------------------------------------
  nodeIt('shouldSkipTest matches against full name from describe stack', () => {
    setTestNamePattern('Auth > login');
    pushDescribe('Auth');
    const fullName = buildFullName('login works');

    assert.strictEqual(fullName, 'Auth > login works');
    assert.strictEqual(shouldSkipTest(fullName), false); // matches

    const noMatch = buildFullName('signup works');
    assert.strictEqual(noMatch, 'Auth > signup works');
    assert.strictEqual(shouldSkipTest(noMatch), true); // does not match

    popDescribe();
    clearTestNamePattern();
    resetDescribeStack();
  });

  // -------------------------------------------------------------------------
  // 4. Inverse filtering skips matched tests
  // -------------------------------------------------------------------------
  nodeIt('invert option skips tests that match', () => {
    setTestNamePattern('slow', { invert: true });
    const state = getTestNamePattern();
    assert.strictEqual(state.invert, true);

    // "slow test" matches the pattern → invert means it should be skipped
    assert.strictEqual(shouldSkipTest('slow test'), true);
    // "fast test" does NOT match → invert means it should NOT be skipped
    assert.strictEqual(shouldSkipTest('fast test'), false);

    clearTestNamePattern();
  });

  // -------------------------------------------------------------------------
  // 5. clearTestNamePattern removes filter
  // -------------------------------------------------------------------------
  nodeIt('clearTestNamePattern removes the active filter', () => {
    setTestNamePattern('something');
    assert.ok(getTestNamePattern().pattern !== null);

    clearTestNamePattern();
    const state = getTestNamePattern();
    assert.strictEqual(state.pattern, null);
    assert.strictEqual(state.invert, false);
  });

  // -------------------------------------------------------------------------
  // 6. getTestNamePattern returns current state
  // -------------------------------------------------------------------------
  nodeIt('getTestNamePattern returns current state', () => {
    // Initially null
    clearTestNamePattern();
    assert.deepStrictEqual(getTestNamePattern(), {
      pattern: null,
      invert: false,
    });

    // After setting pattern
    setTestNamePattern('foo');
    const state = getTestNamePattern();
    assert.ok(state.pattern instanceof RegExp);
    assert.strictEqual(state.pattern!.source, 'foo');
    assert.strictEqual(state.invert, false);

    // After setting with invert
    setTestNamePattern('bar', { invert: true });
    const state2 = getTestNamePattern();
    assert.strictEqual(state2.pattern!.source, 'bar');
    assert.strictEqual(state2.invert, true);

    clearTestNamePattern();
  });

  // -------------------------------------------------------------------------
  // 7. TEST_NAME_PATTERN env var works
  // -------------------------------------------------------------------------
  nodeIt('initFromEnv reads TEST_NAME_PATTERN', () => {
    clearTestNamePattern();
    clearTestFilePattern();

    const original = process.env.TEST_NAME_PATTERN;
    try {
      process.env.TEST_NAME_PATTERN = 'envPattern';
      initFromEnv();
      const state = getTestNamePattern();
      assert.ok(state.pattern instanceof RegExp);
      assert.strictEqual(state.pattern!.source, 'envPattern');
    } finally {
      if (original === undefined) {
        delete process.env.TEST_NAME_PATTERN;
      } else {
        process.env.TEST_NAME_PATTERN = original;
      }
      clearTestNamePattern();
    }
  });

  // -------------------------------------------------------------------------
  // 8. Pattern reset between runs (no state leak)
  // -------------------------------------------------------------------------
  nodeIt('patterns can be reset to prevent state leaks', () => {
    setTestNamePattern('leak');
    setTestFilePattern('**/*.test.ts');
    pushDescribe('suite');

    // Reset everything
    clearTestNamePattern();
    clearTestFilePattern();
    resetDescribeStack();

    assert.strictEqual(getTestNamePattern().pattern, null);
    assert.strictEqual(getTestFilePattern(), null);
    assert.deepStrictEqual(getDescribeStack(), []);
  });

  // -------------------------------------------------------------------------
  // 9. Pattern + .only = intersection
  //    (tests it.only integration — here we test the shouldSkipTest logic)
  // -------------------------------------------------------------------------
  nodeIt('shouldSkipTest works correctly for intersection with .only', () => {
    setTestNamePattern('auth');

    // A test that matches the pattern should NOT be skipped
    assert.strictEqual(shouldSkipTest('auth login'), false);
    // A test that does not match should be skipped (even if it would be .only)
    assert.strictEqual(shouldSkipTest('profile view'), true);

    clearTestNamePattern();
  });

  // -------------------------------------------------------------------------
  // 10. Pattern works with describe.each and it.each parameterized names
  //     (test full name building with nested describes)
  // -------------------------------------------------------------------------
  nodeIt(
    'buildFullName works with nested describes for parameterized names',
    () => {
      pushDescribe('Math');
      pushDescribe('add(%d, %d)');

      const full = buildFullName('returns %d');
      assert.strictEqual(full, 'Math > add(%d, %d) > returns %d');

      popDescribe();
      popDescribe();
      resetDescribeStack();
    },
  );

  nodeIt('pattern matches parameterized full names', () => {
    setTestNamePattern('add');
    pushDescribe('Math');

    assert.strictEqual(shouldSkipTest(buildFullName('add works')), false);
    assert.strictEqual(shouldSkipTest(buildFullName('subtract works')), true);

    popDescribe();
    clearTestNamePattern();
    resetDescribeStack();
  });

  // -------------------------------------------------------------------------
  // 11. File pattern matching
  // -------------------------------------------------------------------------
  nodeIt(
    'setTestFilePattern / getTestFilePattern / clearTestFilePattern',
    () => {
      assert.strictEqual(getTestFilePattern(), null);

      setTestFilePattern('**/*.test.ts');
      assert.strictEqual(getTestFilePattern(), '**/*.test.ts');

      clearTestFilePattern();
      assert.strictEqual(getTestFilePattern(), null);
    },
  );

  nodeIt('fileMatchesPattern uses glob matching', () => {
    setTestFilePattern('**/*.test.ts');

    assert.strictEqual(fileMatchesPattern('tests/unit/foo.test.ts'), true);
    assert.strictEqual(fileMatchesPattern('src/index.ts'), false);

    clearTestFilePattern();
  });

  nodeIt('fileMatchesPattern returns true when no pattern set', () => {
    clearTestFilePattern();
    assert.strictEqual(fileMatchesPattern('anything.ts'), true);
  });

  nodeIt('initFromEnv reads TEST_FILE_PATTERN', () => {
    clearTestNamePattern();
    clearTestFilePattern();

    const originalName = process.env.TEST_NAME_PATTERN;
    const originalFile = process.env.TEST_FILE_PATTERN;
    try {
      delete process.env.TEST_NAME_PATTERN;
      process.env.TEST_FILE_PATTERN = 'src/**/*.ts';
      initFromEnv();
      assert.strictEqual(getTestFilePattern(), 'src/**/*.ts');
    } finally {
      if (originalName === undefined) {
        delete process.env.TEST_NAME_PATTERN;
      } else {
        process.env.TEST_NAME_PATTERN = originalName;
      }
      if (originalFile === undefined) {
        delete process.env.TEST_FILE_PATTERN;
      } else {
        process.env.TEST_FILE_PATTERN = originalFile;
      }
      clearTestNamePattern();
      clearTestFilePattern();
    }
  });

  // -------------------------------------------------------------------------
  // 12. Non-matching tests are reported as skipped
  //     (verify the skip mechanism — shouldSkipTest returns true)
  // -------------------------------------------------------------------------
  nodeIt('non-matching tests are flagged for skipping', () => {
    setTestNamePattern('only-this');

    // Matching test should NOT be skipped
    assert.strictEqual(shouldSkipTest('only-this test'), false);
    // Non-matching test should be skipped
    assert.strictEqual(shouldSkipTest('some other test'), true);

    clearTestNamePattern();
  });

  // -------------------------------------------------------------------------
  // Additional edge cases
  // -------------------------------------------------------------------------
  nodeIt('shouldSkipTest returns false when no pattern is set', () => {
    clearTestNamePattern();
    assert.strictEqual(shouldSkipTest('anything'), false);
  });

  nodeIt('describe stack tracks push/pop correctly', () => {
    resetDescribeStack();
    pushDescribe('a');
    pushDescribe('b');
    pushDescribe('c');
    assert.deepStrictEqual(getDescribeStack(), ['a', 'b', 'c']);
    assert.strictEqual(buildFullName('test'), 'a > b > c > test');

    popDescribe();
    assert.deepStrictEqual(getDescribeStack(), ['a', 'b']);
    assert.strictEqual(buildFullName('test'), 'a > b > test');

    resetDescribeStack();
    assert.deepStrictEqual(getDescribeStack(), []);
    assert.strictEqual(buildFullName('test'), 'test');
  });

  nodeIt(
    'buildFullName with empty describe stack returns test name only',
    () => {
      resetDescribeStack();
      assert.strictEqual(buildFullName('standalone'), 'standalone');
    },
  );

  nodeIt('initFromEnv ignores empty strings', () => {
    clearTestNamePattern();
    clearTestFilePattern();

    const originalName = process.env.TEST_NAME_PATTERN;
    const originalFile = process.env.TEST_FILE_PATTERN;
    try {
      process.env.TEST_NAME_PATTERN = '';
      process.env.TEST_FILE_PATTERN = '';
      initFromEnv();
      assert.strictEqual(getTestNamePattern().pattern, null);
      assert.strictEqual(getTestFilePattern(), null);
    } finally {
      if (originalName === undefined) {
        delete process.env.TEST_NAME_PATTERN;
      } else {
        process.env.TEST_NAME_PATTERN = originalName;
      }
      if (originalFile === undefined) {
        delete process.env.TEST_FILE_PATTERN;
      } else {
        process.env.TEST_FILE_PATTERN = originalFile;
      }
    }
  });

  nodeIt('setTestNamePattern with invert undefined defaults to false', () => {
    setTestNamePattern('test', {});
    assert.strictEqual(getTestNamePattern().invert, false);

    setTestNamePattern('test', { invert: undefined });
    assert.strictEqual(getTestNamePattern().invert, false);

    clearTestNamePattern();
  });

  // Cleanup
  nodeIt('cleanup: clear all filter state', () => {
    clearTestNamePattern();
    clearTestFilePattern();
    resetDescribeStack();
  });
});
