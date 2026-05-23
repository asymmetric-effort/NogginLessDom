import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { expect } from '../../src/assertions/index.js';

describe('toThrow substring matching', () => {
  it('should match a substring of the error message', () => {
    expect(() => {
      throw new Error('foo bar baz');
    }).toThrow('bar');
  });

  it('should match the exact error message', () => {
    expect(() => {
      throw new Error('exact');
    }).toThrow('exact');
  });

  it('should fail when substring is not found in error message', () => {
    assert.throws(() => {
      expect(() => {
        throw new Error('foo bar baz');
      }).toThrow('missing');
    });
  });

  it('should still work with RegExp', () => {
    expect(() => {
      throw new Error('foo bar baz');
    }).toThrow(/bar/);
  });

  it('should support .not.toThrow with a substring', () => {
    expect(() => {
      throw new Error('foo bar baz');
    }).not.toThrow('missing');
  });

  it('.not.toThrow with matching substring should fail', () => {
    assert.throws(() => {
      expect(() => {
        throw new Error('foo bar baz');
      }).not.toThrow('bar');
    });
  });

  it('should work when function does not throw and .not.toThrow is used with string', () => {
    expect(() => {
      /* no throw */
    }).not.toThrow('anything');
  });
});
