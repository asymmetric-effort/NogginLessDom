import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { expect } from '../../src/assertions/index.js';
import { fn } from '../../src/mocking/index.js';

describe('toMatchObject', () => {
  it('should pass for exact match', () => {
    expect({ a: 1, b: 2 }).toMatchObject({ a: 1, b: 2 });
  });

  it('should pass for partial match (extra keys in actual)', () => {
    expect({ a: 1, b: 2, c: 3 }).toMatchObject({ a: 1, b: 2 });
  });

  it('should fail when expected key is missing from actual', () => {
    assert.throws(() => {
      expect({ a: 1 }).toMatchObject({ a: 1, b: 2 });
    });
  });

  it('should fail when values differ', () => {
    assert.throws(() => {
      expect({ a: 1, b: 2 }).toMatchObject({ a: 1, b: 99 });
    });
  });

  it('should work with nested objects', () => {
    expect({ a: { b: { c: 1 }, d: 2 }, e: 3 }).toMatchObject({
      a: { b: { c: 1 } },
    });
  });

  it('should fail on nested mismatch', () => {
    assert.throws(() => {
      expect({ a: { b: 1 } }).toMatchObject({ a: { b: 2 } });
    });
  });

  it('should work with arrays', () => {
    expect([{ a: 1, extra: true }, { b: 2 }]).toMatchObject([{ a: 1 }]);
  });

  it('should work with .not', () => {
    expect({ a: 1, b: 2 }).not.toMatchObject({ a: 99 });
  });

  it('.not should fail when object matches', () => {
    assert.throws(() => {
      expect({ a: 1, b: 2 }).not.toMatchObject({ a: 1 });
    });
  });
});

describe('toHaveBeenCalledOnce', () => {
  it('should pass when called exactly once', () => {
    const mock = fn();
    mock();
    expect(mock).toHaveBeenCalledOnce();
  });

  it('should fail when called twice', () => {
    const mock = fn();
    mock();
    mock();
    assert.throws(() => {
      expect(mock).toHaveBeenCalledOnce();
    });
  });

  it('should fail when not called', () => {
    const mock = fn();
    assert.throws(() => {
      expect(mock).toHaveBeenCalledOnce();
    });
  });

  it('should work with .not', () => {
    const mock = fn();
    expect(mock).not.toHaveBeenCalledOnce();
  });

  it('.not should fail when called once', () => {
    const mock = fn();
    mock();
    assert.throws(() => {
      expect(mock).not.toHaveBeenCalledOnce();
    });
  });
});

describe('toSatisfy', () => {
  it('should pass when predicate returns true', () => {
    expect(2).toSatisfy((n: unknown) => (n as number) % 2 === 0);
  });

  it('should fail when predicate returns false', () => {
    assert.throws(() => {
      expect(3).toSatisfy((n: unknown) => (n as number) % 2 === 0);
    });
  });

  it('should work with .not', () => {
    expect(3).not.toSatisfy((n: unknown) => (n as number) % 2 === 0);
  });

  it('.not should fail when predicate returns true', () => {
    assert.throws(() => {
      expect(2).not.toSatisfy((n: unknown) => (n as number) % 2 === 0);
    });
  });
});

describe('expect.assertions', () => {
  it('correct count passes', () => {
    expect.resetState();
    expect.assertions(2);
    expect(1).toBe(1);
    expect(2).toBe(2);
    // Manually verify — in real runner this would happen automatically
    expect.verifyAssertions();
  });

  it('wrong count throws', () => {
    expect.resetState();
    expect.assertions(3);
    expect(1).toBe(1);
    expect(2).toBe(2);
    assert.throws(() => {
      expect.verifyAssertions();
    });
  });

  it('too many assertions throws', () => {
    expect.resetState();
    expect.assertions(1);
    expect(1).toBe(1);
    expect(2).toBe(2);
    assert.throws(() => {
      expect.verifyAssertions();
    });
  });
});

describe('expect.hasAssertions', () => {
  it('with assertions passes', () => {
    expect.resetState();
    expect.hasAssertions();
    expect(1).toBe(1);
    expect.verifyAssertions();
  });

  it('without assertions throws', () => {
    expect.resetState();
    expect.hasAssertions();
    assert.throws(() => {
      expect.verifyAssertions();
    });
  });
});
