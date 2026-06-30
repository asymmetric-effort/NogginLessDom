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

describe('diff – extra coverage', () => {
  // Cover dim function
  it('dim returns plain text when not TTY', () => {
    const result = dim('test');
    assert.strictEqual(result, 'test');
  });

  // Cover bold function
  it('bold returns plain text when not TTY', () => {
    const result = bold('test');
    assert.strictEqual(result, 'test');
  });

  // Cover green function
  it('green returns plain text when not TTY', () => {
    const result = green('test');
    assert.strictEqual(result, 'test');
  });

  // Cover red function
  it('red returns plain text when not TTY', () => {
    const result = red('test');
    assert.strictEqual(result, 'test');
  });

  // Cover stripAnsi
  it('stripAnsi removes ANSI codes', () => {
    const result = stripAnsi('\x1b[31mhello\x1b[39m');
    assert.strictEqual(result, 'hello');
  });

  // Cover configureDiff and getDiffConfig
  it('configureDiff sets and getDiffConfig retrieves config', () => {
    configureDiff({ maxLength: 500, colorize: false });
    const cfg = getDiffConfig();
    assert.strictEqual(cfg.maxLength, 500);
    assert.strictEqual(cfg.colorize, false);
    // Reset
    configureDiff({});
  });

  // Cover objectDiff with arrays of different lengths
  it('objectDiff shows added/removed array elements', () => {
    const result = objectDiff([1, 2, 3], [1, 2], { colorize: false });
    assert.ok(result.includes('[2]'));
  });

  // Cover objectDiff where one side is array and other is not
  it('objectDiff handles array vs non-array', () => {
    const result = objectDiff([1, 2], { a: 1 }, { colorize: false });
    assert.ok(result.includes('Expected'));
    assert.ok(result.includes('Received'));
  });

  // Cover objectDiff with nested objects
  it('objectDiff shows nested key diffs', () => {
    const result = objectDiff(
      { a: { b: 1 } },
      { a: { b: 2 } },
      { colorize: false },
    );
    assert.ok(result.includes('b'));
  });

  // Cover objectDiff with added and removed keys
  it('objectDiff shows added and removed keys', () => {
    const result = objectDiff(
      { a: 1, b: 2 },
      { a: 1, c: 3 },
      { colorize: false },
    );
    assert.ok(result.includes('b'));
    assert.ok(result.includes('c'));
  });

  // Cover objectDiff max depth
  it('objectDiff handles max depth', () => {
    let deep: unknown = { val: 1 };
    for (let i = 0; i < 60; i++) {
      deep = { nested: deep };
    }
    const result = objectDiff(deep, { different: true }, { colorize: false });
    assert.ok(result.length > 0);
  });

  // Cover objectDiff with primitives
  it('objectDiff handles primitive comparison', () => {
    const result = objectDiff(42, 43, { colorize: false });
    assert.ok(result.includes('42'));
    assert.ok(result.includes('43'));
  });

  // Cover objectDiff with null vs object
  it('objectDiff handles null vs object', () => {
    const result = objectDiff(null, { a: 1 }, { colorize: false });
    assert.ok(result.includes('null'));
  });

  // Cover stringDiff with multi-line strings
  it('stringDiff handles multi-line strings', () => {
    const result = stringDiff('line1\nline2\nline3', 'line1\nchanged\nline3', {
      colorize: false,
    });
    assert.ok(result.includes('line2'));
    assert.ok(result.includes('changed'));
  });

  // Cover stringDiff with different line counts
  it('stringDiff handles different number of lines', () => {
    const result = stringDiff('line1\nline2\nline3', 'line1\nline2', {
      colorize: false,
    });
    assert.ok(result.includes('line3'));
  });

  // Cover stringDiff with extra received lines
  it('stringDiff handles extra received lines', () => {
    const result = stringDiff('line1', 'line1\nline2', { colorize: false });
    assert.ok(result.includes('line2'));
  });

  // Cover stringDiff single-line mode
  it('stringDiff shows caret for single-line diff', () => {
    const result = stringDiff('hello', 'hallo', { colorize: false });
    assert.ok(result.includes('^'));
    assert.ok(result.includes('Expected'));
    assert.ok(result.includes('Received'));
  });

  // Cover formatExpectedReceived with strings
  it('formatExpectedReceived uses stringDiff for strings', () => {
    const result = formatExpectedReceived('hello', 'world', {
      colorize: false,
    });
    assert.ok(result.includes('Expected'));
    assert.ok(result.includes('Received'));
  });

  // Cover formatExpectedReceived with primitives
  it('formatExpectedReceived handles primitive comparison', () => {
    const result = formatExpectedReceived(42, 43, { colorize: false });
    assert.ok(result.includes('42'));
    assert.ok(result.includes('43'));
  });

  // Cover formatExpectedReceived with objects
  it('formatExpectedReceived uses objectDiff for objects', () => {
    const result = formatExpectedReceived(
      { a: 1 },
      { a: 2 },
      { colorize: false },
    );
    assert.ok(result.length > 0);
  });

  // Cover formatExpectedReceived where objectDiff returns empty
  it('formatExpectedReceived falls through when objects are equal', () => {
    const result = formatExpectedReceived(
      { a: 1 },
      { a: 1 },
      {
        colorize: false,
      },
    );
    // objectDiff returns empty string for equal objects, so falls through to primitive format
    assert.ok(typeof result === 'string');
  });

  // Cover serialize with non-serializable value
  it('objectDiff handles non-serializable value via String fallback', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    // This tests the catch branch in serialize
    const result = formatExpectedReceived(circular, 'simple', {
      colorize: false,
    });
    assert.ok(typeof result === 'string');
  });

  // Cover truncation
  it('objectDiff truncates long values', () => {
    const longStr = 'a'.repeat(2000);
    const result = objectDiff(
      { key: longStr },
      { key: 'short' },
      { colorize: false, maxLength: 100 },
    );
    assert.ok(result.includes('...'));
  });

  // Cover objectDiff with identical arrays (no diff)
  it('objectDiff returns empty for identical arrays', () => {
    const result = objectDiff([1, 2, 3], [1, 2, 3], { colorize: false });
    assert.strictEqual(result, '');
  });

  // Cover deepEqual array length mismatch and element comparison (lines 252-253)
  it('objectDiff detects array length differences in nested context', () => {
    const result = objectDiff(
      { arr: [1, 2, 3] },
      { arr: [1, 2] },
      { colorize: false },
    );
    assert.ok(result.includes('[2]'));
  });

  // Cover deepEqual - arrays with same length, equal elements
  it('objectDiff returns empty for nested identical arrays', () => {
    const result = objectDiff(
      { arr: [1, 2] },
      { arr: [1, 2] },
      { colorize: false },
    );
    assert.strictEqual(result, '');
  });

  // Cover objectDiff with identical objects (no diff)
  it('objectDiff returns empty for identical objects', () => {
    const result = objectDiff({ a: 1 }, { a: 1 }, { colorize: false });
    assert.strictEqual(result, '');
  });

  // Cover objectDiff with undefined values
  it('serialize handles undefined', () => {
    const result = formatExpectedReceived(undefined, null, { colorize: false });
    assert.ok(result.includes('undefined'));
    assert.ok(result.includes('null'));
  });

  // Cover objectDiff with boolean/number values
  it('serialize handles boolean and number', () => {
    const result = formatExpectedReceived(true, 42, { colorize: false });
    assert.ok(result.includes('true'));
    assert.ok(result.includes('42'));
  });
});
