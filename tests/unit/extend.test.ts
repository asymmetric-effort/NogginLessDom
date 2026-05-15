import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { expect } from '../../src/assertions/index.js';

describe('expect.extend', () => {
  it('should add a custom matcher', () => {
    expect.extend({
      toBeEven(received: unknown): { pass: boolean; message: () => string } {
        const num = received as number;
        const pass = num % 2 === 0;
        return {
          pass,
          message: () =>
            pass
              ? `Expected ${num} not to be even`
              : `Expected ${num} to be even`,
        };
      },
    });

    // Should not throw for even number
    (expect(4) as Record<string, (...args: unknown[]) => void>).toBeEven();
  });

  it('should work with pass=true', () => {
    expect.extend({
      toBePositive(received: unknown): {
        pass: boolean;
        message: () => string;
      } {
        const num = received as number;
        const pass = num > 0;
        return {
          pass,
          message: () =>
            pass
              ? `Expected ${num} not to be positive`
              : `Expected ${num} to be positive`,
        };
      },
    });

    // Positive number, pass=true, no .not => passes
    (expect(5) as Record<string, (...args: unknown[]) => void>).toBePositive();
  });

  it('should work with pass=false', () => {
    expect.extend({
      toBePositive(received: unknown): {
        pass: boolean;
        message: () => string;
      } {
        const num = received as number;
        const pass = num > 0;
        return {
          pass,
          message: () =>
            pass
              ? `Expected ${num} not to be positive`
              : `Expected ${num} to be positive`,
        };
      },
    });

    // Negative number, pass=false, no .not => throws the message
    assert.throws(() => {
      (
        expect(-3) as Record<string, (...args: unknown[]) => void>
      ).toBePositive();
    }, /Expected -3 to be positive/);
  });

  it('should work with .not', () => {
    expect.extend({
      toBeEven(received: unknown): { pass: boolean; message: () => string } {
        const num = received as number;
        const pass = num % 2 === 0;
        return {
          pass,
          message: () =>
            pass
              ? `Expected ${num} not to be even`
              : `Expected ${num} to be even`,
        };
      },
    });

    // .not with pass=true => should throw
    assert.throws(() => {
      (
        expect(4).not as Record<string, (...args: unknown[]) => void>
      ).toBeEven();
    }, /Expected 4 not to be even/);

    // .not with pass=false => should pass
    (expect(3).not as Record<string, (...args: unknown[]) => void>).toBeEven();
  });

  it('should support multiple custom matchers', () => {
    expect.extend({
      toBeWithinRange(
        received: unknown,
        floor: unknown,
        ceiling: unknown,
      ): { pass: boolean; message: () => string } {
        const num = received as number;
        const f = floor as number;
        const c = ceiling as number;
        const pass = num >= f && num <= c;
        return {
          pass,
          message: () =>
            pass
              ? `Expected ${num} not to be within range ${f} - ${c}`
              : `Expected ${num} to be within range ${f} - ${c}`,
        };
      },
      toBeOdd(received: unknown): { pass: boolean; message: () => string } {
        const num = received as number;
        const pass = num % 2 !== 0;
        return {
          pass,
          message: () =>
            pass
              ? `Expected ${num} not to be odd`
              : `Expected ${num} to be odd`,
        };
      },
    });

    (expect(5) as Record<string, (...args: unknown[]) => void>).toBeWithinRange(
      1,
      10,
    );
    (expect(3) as Record<string, (...args: unknown[]) => void>).toBeOdd();

    assert.throws(() => {
      (
        expect(15) as Record<string, (...args: unknown[]) => void>
      ).toBeWithinRange(1, 10);
    }, /Expected 15 to be within range 1 - 10/);
  });

  it('should pass correct arguments to custom matcher', () => {
    let capturedReceived: unknown;
    let capturedArgs: unknown[] = [];

    expect.extend({
      toBeCloserTo(
        received: unknown,
        target: unknown,
        tolerance: unknown,
      ): { pass: boolean; message: () => string } {
        capturedReceived = received;
        capturedArgs = [target, tolerance];
        return {
          pass: true,
          message: () => 'ok',
        };
      },
    });

    (expect(10) as Record<string, (...args: unknown[]) => void>).toBeCloserTo(
      5,
      0.1,
    );

    assert.strictEqual(capturedReceived, 10);
    assert.deepStrictEqual(capturedArgs, [5, 0.1]);
  });
});
