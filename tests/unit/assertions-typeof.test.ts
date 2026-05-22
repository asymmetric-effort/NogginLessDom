import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { expect } from '../../src/assertions/index.js';

describe('toBeTypeOf', () => {
  it('should match string type', () => {
    expect('hello').toBeTypeOf('string');
  });

  it('should match number type', () => {
    expect(42).toBeTypeOf('number');
  });

  it('should match boolean type', () => {
    expect(true).toBeTypeOf('boolean');
  });

  it('should match function type', () => {
    expect(() => {}).toBeTypeOf('function');
  });

  it('should match object type', () => {
    expect({}).toBeTypeOf('object');
    expect(null).toBeTypeOf('object');
  });

  it('should match undefined type', () => {
    expect(undefined).toBeTypeOf('undefined');
  });

  it('should match symbol type', () => {
    expect(Symbol('test')).toBeTypeOf('symbol');
  });

  it('should match bigint type', () => {
    expect(BigInt(123)).toBeTypeOf('bigint');
  });

  it('should fail for wrong type', () => {
    assert.throws(() => expect('hello').toBeTypeOf('number'));
  });

  it('should throw for invalid type string', () => {
    assert.throws(
      () => expect('hello').toBeTypeOf('invalid'),
      /Invalid type "invalid"/,
    );
  });

  it('should work with .not', () => {
    expect('hello').not.toBeTypeOf('number');
    expect(42).not.toBeTypeOf('string');
  });

  it('should fail .not when types match', () => {
    assert.throws(() => expect('hello').not.toBeTypeOf('string'));
  });
});

describe('toThrowErrorMatchingSnapshot', () => {
  it('should catch and snapshot error message', () => {
    const thrower = (): void => {
      throw new Error('snapshot error message');
    };
    // First call creates the snapshot, subsequent calls compare
    expect(thrower).toThrowErrorMatchingSnapshot();
  });

  it('should fail if function does not throw', () => {
    const noThrow = (): void => {
      /* no-op */
    };
    assert.throws(
      () => expect(noThrow).toThrowErrorMatchingSnapshot(),
      /Expected function to throw an error/,
    );
  });
});

describe('toThrowErrorMatchingInlineSnapshot', () => {
  it('should compare error message to inline snapshot', () => {
    const thrower = (): void => {
      throw new Error('inline snapshot error');
    };
    expect(thrower).toThrowErrorMatchingInlineSnapshot(
      '"inline snapshot error"',
    );
  });

  it('should fail if function does not throw', () => {
    const noThrow = (): void => {
      /* no-op */
    };
    assert.throws(
      () => expect(noThrow).toThrowErrorMatchingInlineSnapshot('"nope"'),
      /Expected function to throw an error/,
    );
  });

  it('should fail if error message does not match inline snapshot', () => {
    const thrower = (): void => {
      throw new Error('actual error');
    };
    assert.throws(
      () =>
        expect(thrower).toThrowErrorMatchingInlineSnapshot('"different error"'),
      /Inline snapshot mismatch/,
    );
  });

  it('should pass with no inline snapshot provided (first-run mode)', () => {
    const thrower = (): void => {
      throw new Error('some error');
    };
    // When no snapshot is provided, it logs and passes
    expect(thrower).toThrowErrorMatchingInlineSnapshot();
  });
});
