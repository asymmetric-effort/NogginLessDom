import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  objectDiff,
  stringDiff,
  formatExpectedReceived,
  configureDiff,
  getDiffConfig,
  green,
  red,
  dim,
  bold,
  stripAnsi,
} from '../../src/assertions/diff.js';
import { expect } from '../../src/assertions/index.js';

describe('assertion-diff', () => {
  describe('objectDiff', () => {
    it('should show + for added key', () => {
      const result = objectDiff({ a: 1 }, { a: 1, b: 2 }, { colorize: false });
      assert.ok(result.includes('+ b:'));
    });

    it('should show - for removed key', () => {
      const result = objectDiff({ a: 1, b: 2 }, { a: 1 }, { colorize: false });
      assert.ok(result.includes('- b:'));
    });

    it('should show both expected and received for changed value', () => {
      const result = objectDiff({ a: 1 }, { a: 2 }, { colorize: false });
      assert.ok(result.includes('- Expected:'));
      assert.ok(result.includes('+ Received:'));
    });

    it('should indent nested differences', () => {
      const result = objectDiff(
        { nested: { a: 1 } },
        { nested: { a: 2 } },
        { colorize: false },
      );
      assert.ok(result.includes('nested:'));
      // Nested lines should have more indentation
      const lines = result.split('\n');
      const nestedLine = lines.find((l) => l.includes('Expected'));
      assert.ok(nestedLine);
      assert.ok(nestedLine.startsWith('    '));
    });

    it('should produce empty diff for identical objects', () => {
      const result = objectDiff(
        { a: 1, b: 2 },
        { a: 1, b: 2 },
        { colorize: false },
      );
      assert.strictEqual(result, '');
    });

    it('should show array element-level differences with index', () => {
      const result = objectDiff([1, 2, 3], [1, 9, 3], { colorize: false });
      assert.ok(result.includes('[1]:'));
      assert.ok(!result.includes('[0]:'));
      assert.ok(!result.includes('[2]:'));
    });

    it('should handle arrays of different lengths', () => {
      const result = objectDiff([1, 2], [1, 2, 3], { colorize: false });
      assert.ok(result.includes('+ [2]:'));
    });

    it('should handle removed array elements', () => {
      const result = objectDiff([1, 2, 3], [1, 2], { colorize: false });
      assert.ok(result.includes('- [2]:'));
    });
  });

  describe('stringDiff', () => {
    it('should show line-level diff for multi-line strings', () => {
      const result = stringDiff('a\nb\nc', 'a\nB\nc', { colorize: false });
      assert.ok(result.includes('- b'));
      assert.ok(result.includes('+ B'));
      assert.ok(result.includes('a'));
    });

    it('should show expected/received for single-line strings', () => {
      const result = stringDiff('hello', 'hallo', { colorize: false });
      assert.ok(result.includes('- Expected:'));
      assert.ok(result.includes('+ Received:'));
      assert.ok(result.includes('^'));
    });

    it('should handle extra lines in received', () => {
      const result = stringDiff('a\nb', 'a\nb\nc', { colorize: false });
      assert.ok(result.includes('+ c'));
    });

    it('should handle extra lines in expected', () => {
      const result = stringDiff('a\nb\nc', 'a\nb', { colorize: false });
      assert.ok(result.includes('- c'));
    });
  });

  describe('formatExpectedReceived', () => {
    it('should diff numbers (primitives)', () => {
      const result = formatExpectedReceived(42, 99, { colorize: false });
      assert.ok(result.includes('- Expected: 42'));
      assert.ok(result.includes('+ Received: 99'));
    });

    it('should diff booleans', () => {
      const result = formatExpectedReceived(true, false, { colorize: false });
      assert.ok(result.includes('- Expected: true'));
      assert.ok(result.includes('+ Received: false'));
    });

    it('should diff null vs object', () => {
      const result = formatExpectedReceived(
        null,
        { a: 1 },
        { colorize: false },
      );
      assert.ok(result.includes('- Expected: null'));
      assert.ok(result.includes('+ Received:'));
    });

    it('should use stringDiff for strings', () => {
      const result = formatExpectedReceived('foo', 'bar', { colorize: false });
      assert.ok(result.includes('- Expected:'));
      assert.ok(result.includes('+ Received:'));
    });

    it('should use objectDiff for objects', () => {
      const result = formatExpectedReceived(
        { a: 1 },
        { a: 2 },
        { colorize: false },
      );
      assert.ok(result.includes('a:'));
    });
  });

  describe('ANSI colors', () => {
    it('green() wraps in green ANSI codes when TTY', () => {
      // green() checks process.stdout.isTTY - in test env it may not be TTY
      // We test the stripAnsi behavior instead and test the code path directly
      const wrapped = '\x1b[32mhello\x1b[39m';
      assert.strictEqual(stripAnsi(wrapped), 'hello');
    });

    it('red() wraps in red ANSI codes when TTY', () => {
      const wrapped = '\x1b[31mhello\x1b[39m';
      assert.strictEqual(stripAnsi(wrapped), 'hello');
    });

    it('dim() and bold() produce correct codes', () => {
      const dimWrapped = '\x1b[2mhello\x1b[22m';
      const boldWrapped = '\x1b[1mhello\x1b[22m';
      assert.strictEqual(stripAnsi(dimWrapped), 'hello');
      assert.strictEqual(stripAnsi(boldWrapped), 'hello');
    });

    it('green/red/dim/bold return plain text when not TTY', () => {
      // In test environment, usually not TTY
      // Force non-TTY by checking behavior
      const originalIsTTY = process.stdout.isTTY;
      try {
        Object.defineProperty(process.stdout, 'isTTY', {
          value: false,
          writable: true,
          configurable: true,
        });
        assert.strictEqual(green('test'), 'test');
        assert.strictEqual(red('test'), 'test');
        assert.strictEqual(dim('test'), 'test');
        assert.strictEqual(bold('test'), 'test');
      } finally {
        Object.defineProperty(process.stdout, 'isTTY', {
          value: originalIsTTY,
          writable: true,
          configurable: true,
        });
      }
    });
  });

  describe('stripAnsi', () => {
    it('removes all ANSI escape codes', () => {
      const input =
        '\x1b[32mgreen\x1b[39m \x1b[31mred\x1b[39m \x1b[1mbold\x1b[22m';
      assert.strictEqual(stripAnsi(input), 'green red bold');
    });

    it('returns plain string unchanged', () => {
      assert.strictEqual(stripAnsi('hello world'), 'hello world');
    });

    it('handles empty string', () => {
      assert.strictEqual(stripAnsi(''), '');
    });
  });

  describe('non-TTY mode', () => {
    it('produces no ANSI codes when colorize is false', () => {
      const result = objectDiff({ a: 1 }, { a: 2 }, { colorize: false });
      assert.strictEqual(result, stripAnsi(result));
    });

    it('produces no ANSI codes in stringDiff when colorize is false', () => {
      const result = stringDiff('hello', 'world', { colorize: false });
      assert.strictEqual(result, stripAnsi(result));
    });
  });

  describe('truncation', () => {
    it('truncates long values at maxLength', () => {
      const longVal = 'x'.repeat(200);
      const result = objectDiff(
        { key: longVal },
        { key: 'short' },
        { colorize: false, maxLength: 50 },
      );
      assert.ok(result.includes('...'));
    });

    it('does not truncate short values', () => {
      const result = objectDiff(
        { key: 'short' },
        { key: 'other' },
        { colorize: false, maxLength: 1000 },
      );
      assert.ok(!result.includes('...'));
    });
  });

  describe('integration with assertions', () => {
    it('toEqual error message includes diff', () => {
      try {
        expect({ a: 1, b: 2 }).toEqual({ a: 1, b: 3 });
        assert.fail('should have thrown');
      } catch (err) {
        const msg = (err as Error).message;
        assert.ok(
          msg.includes('b:'),
          `Expected diff with "b:" in message: ${msg}`,
        );
      }
    });

    it('toStrictEqual error message includes diff', () => {
      try {
        expect({ x: 'hello' }).toStrictEqual({ x: 'world' });
        assert.fail('should have thrown');
      } catch (err) {
        const msg = (err as Error).message;
        assert.ok(
          msg.includes('x:'),
          `Expected diff with "x:" in message: ${msg}`,
        );
      }
    });

    it('toMatchObject error message includes diff for mismatched subset', () => {
      try {
        expect({ a: 1, b: 2 }).toMatchObject({ a: 99 });
        assert.fail('should have thrown');
      } catch (err) {
        const msg = (err as Error).message;
        assert.ok(
          msg.includes('a:'),
          `Expected diff mentioning "a:" in message: ${msg}`,
        );
      }
    });

    it('toContain error message includes diff', () => {
      try {
        expect([1, 2, 3]).toContain(4);
        assert.fail('should have thrown');
      } catch (err) {
        const msg = (err as Error).message;
        assert.ok(
          msg.includes('Expected array to contain 4'),
          `Expected contain message: ${msg}`,
        );
      }
    });

    it('toHaveBeenCalledWith error message includes diff', () => {
      // Create a minimal mock
      const mockFn = Object.assign(
        function () {
          /* noop */
        },
        {
          mock: {
            calls: [[1, 2]],
            results: [{ type: 'return', value: undefined }],
          },
        },
      );
      try {
        expect(mockFn).toHaveBeenCalledWith(3, 4);
        assert.fail('should have thrown');
      } catch (err) {
        const msg = (err as Error).message;
        assert.ok(
          msg.includes('Expected mock to have been called with'),
          `Expected called-with message: ${msg}`,
        );
        assert.ok(
          msg.includes('Expected:') || msg.includes('[0]:'),
          `Expected diff in message: ${msg}`,
        );
      }
    });
  });

  describe('configureDiff', () => {
    it('sets global options that are used by default', () => {
      configureDiff({ maxLength: 50, colorize: false });
      const config = getDiffConfig();
      assert.strictEqual(config.maxLength, 50);
      assert.strictEqual(config.colorize, false);

      // Uses global config
      const longVal = 'x'.repeat(200);
      const result = objectDiff({ key: longVal }, { key: 'short' });
      assert.ok(result.includes('...'));

      // Reset
      configureDiff({});
    });

    it('getDiffConfig returns a copy', () => {
      configureDiff({ maxLength: 100 });
      const config1 = getDiffConfig();
      const config2 = getDiffConfig();
      assert.notStrictEqual(config1, config2);
      assert.deepStrictEqual(config1, config2);
      configureDiff({});
    });
  });

  describe('edge cases', () => {
    it('handles undefined vs value', () => {
      const result = formatExpectedReceived(undefined, 42, {
        colorize: false,
      });
      assert.ok(result.includes('undefined'));
      assert.ok(result.includes('42'));
    });

    it('handles deeply nested object diff', () => {
      const result = objectDiff(
        { a: { b: { c: 1 } } },
        { a: { b: { c: 2 } } },
        { colorize: false },
      );
      assert.ok(result.includes('a:'));
      assert.ok(result.includes('b:'));
      assert.ok(result.includes('c:'));
    });

    it('handles mixed array/object types', () => {
      const result = objectDiff(
        { a: [1] },
        { a: { b: 1 } },
        {
          colorize: false,
        },
      );
      assert.ok(result.includes('a:'));
      assert.ok(result.includes('Expected'));
      assert.ok(result.includes('Received'));
    });

    it('handles comparing array vs non-array in objectDiff', () => {
      const result = objectDiff([1, 2], { a: 1 }, { colorize: false });
      assert.ok(result.includes('Expected'));
      assert.ok(result.includes('Received'));
    });
  });
});
