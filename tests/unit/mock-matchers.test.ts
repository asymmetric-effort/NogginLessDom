import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { expect } from '../../src/assertions/index.js';
import { fn } from '../../src/mocking/index.js';

describe('mock matchers', () => {
  describe('toHaveBeenCalled', () => {
    it('should pass when mock was called', () => {
      const mock = fn();
      mock();
      expect(mock).toHaveBeenCalled();
    });

    it('should fail when mock was not called', () => {
      const mock = fn();
      assert.throws(() => expect(mock).toHaveBeenCalled());
    });

    it('should work with .not', () => {
      const mock = fn();
      expect(mock).not.toHaveBeenCalled();
    });

    it('should fail with .not when mock was called', () => {
      const mock = fn();
      mock();
      assert.throws(() => expect(mock).not.toHaveBeenCalled());
    });
  });

  describe('toHaveBeenCalledTimes', () => {
    it('should pass when called exact number of times', () => {
      const mock = fn();
      mock();
      mock();
      mock();
      expect(mock).toHaveBeenCalledTimes(3);
    });

    it('should fail when called different number of times', () => {
      const mock = fn();
      mock();
      assert.throws(() => expect(mock).toHaveBeenCalledTimes(2));
    });

    it('should work with .not', () => {
      const mock = fn();
      mock();
      expect(mock).not.toHaveBeenCalledTimes(2);
    });
  });

  describe('toHaveBeenCalledWith', () => {
    it('should pass when called with matching args', () => {
      const mock = fn();
      mock('a', 1);
      mock('b', 2);
      expect(mock).toHaveBeenCalledWith('a', 1);
    });

    it('should fail when never called with those args', () => {
      const mock = fn();
      mock('a', 1);
      assert.throws(() => expect(mock).toHaveBeenCalledWith('b', 2));
    });

    it('should work with .not', () => {
      const mock = fn();
      mock('a', 1);
      expect(mock).not.toHaveBeenCalledWith('b', 2);
    });

    it('should match deep objects', () => {
      const mock = fn();
      mock({ x: 1, y: { z: 2 } });
      expect(mock).toHaveBeenCalledWith({ x: 1, y: { z: 2 } });
    });
  });

  describe('toHaveBeenLastCalledWith', () => {
    it('should match last call args', () => {
      const mock = fn();
      mock('first');
      mock('second');
      expect(mock).toHaveBeenLastCalledWith('second');
    });

    it('should fail when last call has different args', () => {
      const mock = fn();
      mock('first');
      mock('second');
      assert.throws(() => expect(mock).toHaveBeenLastCalledWith('first'));
    });

    it('should work with .not', () => {
      const mock = fn();
      mock('first');
      mock('second');
      expect(mock).not.toHaveBeenLastCalledWith('first');
    });
  });

  describe('toHaveBeenNthCalledWith', () => {
    it('should match nth call args (1-indexed)', () => {
      const mock = fn();
      mock('a');
      mock('b');
      mock('c');
      expect(mock).toHaveBeenNthCalledWith(1, 'a');
      expect(mock).toHaveBeenNthCalledWith(2, 'b');
      expect(mock).toHaveBeenNthCalledWith(3, 'c');
    });

    it('should fail for wrong args at nth call', () => {
      const mock = fn();
      mock('a');
      mock('b');
      assert.throws(() => expect(mock).toHaveBeenNthCalledWith(1, 'b'));
    });

    it('should work with .not', () => {
      const mock = fn();
      mock('a');
      mock('b');
      expect(mock).not.toHaveBeenNthCalledWith(1, 'b');
    });
  });

  describe('toHaveReturned', () => {
    it('should pass when mock returned successfully', () => {
      const mock = fn(() => 42);
      mock();
      expect(mock).toHaveReturned();
    });

    it('should fail when mock never called', () => {
      const mock = fn();
      assert.throws(() => expect(mock).toHaveReturned());
    });

    it('should fail when all calls threw', () => {
      const mock = fn(() => {
        throw new Error('oops');
      });
      try {
        mock();
      } catch {}
      assert.throws(() => expect(mock).toHaveReturned());
    });

    it('should work with .not', () => {
      const mock = fn();
      expect(mock).not.toHaveReturned();
    });
  });

  describe('toHaveReturnedTimes', () => {
    it('should pass when returned exact number of times', () => {
      const mock = fn(() => 42);
      mock();
      mock();
      expect(mock).toHaveReturnedTimes(2);
    });

    it('should not count throws as returns', () => {
      let count = 0;
      const mock = fn(() => {
        count++;
        if (count === 2) throw new Error('oops');
        return count;
      });
      mock();
      try {
        mock();
      } catch {}
      mock();
      expect(mock).toHaveReturnedTimes(2);
    });

    it('should work with .not', () => {
      const mock = fn(() => 42);
      mock();
      expect(mock).not.toHaveReturnedTimes(2);
    });
  });

  describe('toHaveReturnedWith', () => {
    it('should pass when mock returned the value', () => {
      const mock = fn((x: number) => x * 2);
      mock(3);
      mock(5);
      expect(mock).toHaveReturnedWith(6);
      expect(mock).toHaveReturnedWith(10);
    });

    it('should fail when value was never returned', () => {
      const mock = fn(() => 42);
      mock();
      assert.throws(() => expect(mock).toHaveReturnedWith(99));
    });

    it('should work with .not', () => {
      const mock = fn(() => 42);
      mock();
      expect(mock).not.toHaveReturnedWith(99);
    });
  });

  describe('toHaveLastReturnedWith', () => {
    it('should match last return value', () => {
      const mock = fn((x: number) => x * 2);
      mock(3);
      mock(5);
      expect(mock).toHaveLastReturnedWith(10);
    });

    it('should fail when last return was different', () => {
      const mock = fn((x: number) => x * 2);
      mock(3);
      mock(5);
      assert.throws(() => expect(mock).toHaveLastReturnedWith(6));
    });

    it('should work with .not', () => {
      const mock = fn((x: number) => x * 2);
      mock(3);
      mock(5);
      expect(mock).not.toHaveLastReturnedWith(6);
    });
  });
});
