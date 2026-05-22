import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fn, mock } from '../../src/mocking/index.js';
import { autoMock } from '../../src/mocking/module-mock.js';

describe('withImplementation (#114)', () => {
  it('should temporarily change implementation for sync callback', () => {
    const mockFn = fn(() => 'original');
    assert.strictEqual(mockFn(), 'original');

    mockFn.withImplementation(
      () => 'temporary',
      () => {
        assert.strictEqual(mockFn(), 'temporary');
      },
    );

    assert.strictEqual(mockFn(), 'original');
  });

  it('should restore implementation after sync callback throws', () => {
    const mockFn = fn(() => 'original');

    assert.throws(() => {
      mockFn.withImplementation(
        () => 'temporary',
        () => {
          assert.strictEqual(mockFn(), 'temporary');
          throw new Error('boom');
        },
      );
    }, /boom/);

    assert.strictEqual(mockFn(), 'original');
  });

  it('should await async callback before restoring', async () => {
    const mockFn = fn(() => 'original');

    const result = mockFn.withImplementation(
      () => 'temporary',
      async () => {
        assert.strictEqual(mockFn(), 'temporary');
        await new Promise<void>((resolve) => setTimeout(resolve, 10));
        assert.strictEqual(mockFn(), 'temporary');
      },
    );

    // Should return a promise
    assert.ok(result instanceof Promise);
    await result;

    assert.strictEqual(mockFn(), 'original');
  });

  it('should restore implementation after async callback rejects', async () => {
    const mockFn = fn(() => 'original');

    await assert.rejects(
      () =>
        mockFn.withImplementation(
          () => 'temporary',
          async () => {
            throw new Error('async boom');
          },
        ) as Promise<void>,
      /async boom/,
    );

    assert.strictEqual(mockFn(), 'original');
  });

  it('should work when mock has no initial implementation', () => {
    const mockFn = fn<[], string>();

    mockFn.withImplementation(
      () => 'temporary',
      () => {
        assert.strictEqual(mockFn(), 'temporary');
      },
    );

    assert.strictEqual(mockFn(), undefined);
  });
});

describe('doMock and doUnmock (#115)', () => {
  it('doMock should register a module mock like mock.module', async () => {
    await mock.doMock('test-do-mock-module', () => ({
      foo: 'bar',
    }));
    const mocked = mock.getMockedModule('test-do-mock-module') as Record<
      string,
      string
    >;
    assert.strictEqual(mocked.foo, 'bar');
    mock.unmock('test-do-mock-module');
  });

  it('doMock should work without a factory', async () => {
    await mock.doMock('test-do-mock-no-factory');
    const mocked = mock.getMockedModule('test-do-mock-no-factory');
    assert.deepStrictEqual(mocked, {});
    mock.unmock('test-do-mock-no-factory');
  });

  it('doUnmock should remove a module mock', async () => {
    await mock.doMock('test-do-unmock-module', () => ({
      hello: 'world',
    }));
    assert.ok(mock.getMockedModule('test-do-unmock-module') !== undefined);
    mock.doUnmock('test-do-unmock-module');
    assert.strictEqual(
      mock.getMockedModule('test-do-unmock-module'),
      undefined,
    );
  });
});

describe('importMock (#116)', () => {
  it('should import and auto-mock a module', async () => {
    // We'll use node:path as a real module to import and auto-mock
    const mocked = (await mock.importMock('node:path')) as Record<
      string,
      unknown
    >;
    // All function exports should be replaced with mock functions
    assert.strictEqual(typeof mocked.join, 'function');
    assert.strictEqual(mock.isMockFunction(mocked.join), true);
    // Auto-mocked functions return undefined by default
    assert.strictEqual(
      (mocked.join as (...args: unknown[]) => unknown)('a', 'b'),
      undefined,
    );
  });

  it('should preserve non-function exports', async () => {
    const testModule = { version: '1.0.0', compute: () => 42 };
    // Use autoMock directly to verify behavior
    const mocked = autoMock(testModule);
    assert.strictEqual(mocked.version, '1.0.0');
    assert.strictEqual(mock.isMockFunction(mocked.compute), true);
  });
});
