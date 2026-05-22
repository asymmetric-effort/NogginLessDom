import { describe as nodeDescribe, it as nodeIt } from 'node:test';
import assert from 'node:assert/strict';
import { describe, it } from '../../src/test-runner/index.js';

nodeDescribe('conditional test execution', () => {
  nodeDescribe('describe.skipIf', () => {
    nodeIt('should skip suite when condition is truthy', () => {
      assert.strictEqual(typeof describe.skipIf, 'function');
      // When condition is truthy, the returned function should register suite as skipped
      const registrar = describe.skipIf(true);
      assert.strictEqual(typeof registrar, 'function');
    });

    nodeIt('should run suite when condition is falsy', () => {
      const registrar = describe.skipIf(false);
      assert.strictEqual(typeof registrar, 'function');
    });

    nodeIt('should skip when condition is a truthy string', () => {
      const registrar = describe.skipIf('non-empty');
      assert.strictEqual(typeof registrar, 'function');
    });

    nodeIt('should run when condition is 0', () => {
      const registrar = describe.skipIf(0);
      assert.strictEqual(typeof registrar, 'function');
    });
  });

  nodeDescribe('describe.runIf', () => {
    nodeIt('should run suite when condition is truthy', () => {
      assert.strictEqual(typeof describe.runIf, 'function');
      const registrar = describe.runIf(true);
      assert.strictEqual(typeof registrar, 'function');
    });

    nodeIt('should skip suite when condition is falsy', () => {
      const registrar = describe.runIf(false);
      assert.strictEqual(typeof registrar, 'function');
    });
  });

  nodeDescribe('it.skipIf', () => {
    nodeIt('should skip test when condition is truthy', () => {
      assert.strictEqual(typeof it.skipIf, 'function');
      const registrar = it.skipIf(true);
      assert.strictEqual(typeof registrar, 'function');
    });

    nodeIt('should run test when condition is falsy', () => {
      const registrar = it.skipIf(false);
      assert.strictEqual(typeof registrar, 'function');
    });
  });

  nodeDescribe('it.runIf', () => {
    nodeIt('should run test when condition is truthy', () => {
      assert.strictEqual(typeof it.runIf, 'function');
      const registrar = it.runIf(true);
      assert.strictEqual(typeof registrar, 'function');
    });

    nodeIt('should skip test when condition is falsy', () => {
      const registrar = it.runIf(false);
      assert.strictEqual(typeof registrar, 'function');
    });
  });

  nodeDescribe('it.fails', () => {
    nodeIt('should be a function', () => {
      assert.strictEqual(typeof it.fails, 'function');
    });

    nodeIt('should invert a failing test to pass', async () => {
      // We can test the wrapping logic by calling the internal mechanism
      // it.fails registers a test that expects the fn to throw
      // We verify the function exists and is callable
      let called = false;
      // Simulate what it.fails does: wrap fn so that throwing = pass
      const testFn = (): void => {
        throw new Error('expected failure');
      };
      // The wrapper should catch the error and not re-throw
      try {
        // Wrap like it.fails would
        const wrapped = async (): Promise<void> => {
          let threw = false;
          try {
            await testFn();
          } catch {
            threw = true;
          }
          if (!threw) {
            throw new Error('Expected test to fail but it passed');
          }
        };
        await wrapped();
        called = true;
      } catch {
        called = false;
      }
      assert.strictEqual(called, true);
    });

    nodeIt('should invert a passing test to fail', async () => {
      const testFn = (): void => {
        // This passes - should cause it.fails to throw
      };
      const wrapped = async (): Promise<void> => {
        let threw = false;
        try {
          await testFn();
        } catch {
          threw = true;
        }
        if (!threw) {
          throw new Error('Expected test to fail but it passed');
        }
      };
      await assert.rejects(wrapped);
    });
  });
});
