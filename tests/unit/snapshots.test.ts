import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { expect } from '../../src/assertions/index.js';
import { serialize } from '../../src/assertions/snapshots.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

const SNAPSHOTS_DIR = path.join(
  path.dirname(new URL(import.meta.url).pathname),
  '__snapshots__',
);

afterEach(() => {
  // Clean up snapshot files after each test
  if (fs.existsSync(SNAPSHOTS_DIR)) {
    fs.rmSync(SNAPSHOTS_DIR, { recursive: true, force: true });
  }
});

describe('serialize', () => {
  it('should serialize strings with quotes', () => {
    assert.strictEqual(serialize('hello'), '"hello"');
  });

  it('should serialize numbers', () => {
    assert.strictEqual(serialize(42), '42');
  });

  it('should serialize booleans', () => {
    assert.strictEqual(serialize(true), 'true');
    assert.strictEqual(serialize(false), 'false');
  });

  it('should serialize null', () => {
    assert.strictEqual(serialize(null), 'null');
  });

  it('should serialize undefined', () => {
    assert.strictEqual(serialize(undefined), 'undefined');
  });

  it('should serialize objects with pretty format', () => {
    const result = serialize({ a: 1, b: 'two' });
    assert.strictEqual(result, 'Object {\n  "a": 1,\n  "b": "two",\n}');
  });

  it('should serialize arrays with pretty format', () => {
    const result = serialize([1, 2, 3]);
    assert.strictEqual(result, 'Array [\n  1,\n  2,\n  3,\n]');
  });

  it('should serialize RegExp', () => {
    assert.strictEqual(serialize(/abc/gi), '/abc/gi');
  });

  it('should serialize functions', () => {
    function myFunc(): void {
      /* noop */
    }
    assert.strictEqual(serialize(myFunc), '[Function myFunc]');
  });

  it('should serialize anonymous functions', () => {
    assert.strictEqual(
      serialize(() => {}),
      '[Function anonymous]',
    );
  });

  it('should serialize Date', () => {
    const d = new Date('2024-01-15T00:00:00.000Z');
    assert.strictEqual(serialize(d), 'Date(2024-01-15T00:00:00.000Z)');
  });

  it('should serialize Error', () => {
    assert.strictEqual(serialize(new Error('oops')), '[Error: oops]');
  });

  it('should serialize Map', () => {
    const m = new Map<string, number>([
      ['a', 1],
      ['b', 2],
    ]);
    const result = serialize(m);
    assert.ok(result.includes('Map {'));
    assert.ok(result.includes('"a" => 1,'));
    assert.ok(result.includes('"b" => 2,'));
  });

  it('should serialize Set', () => {
    const s = new Set([1, 2, 3]);
    const result = serialize(s);
    assert.ok(result.includes('Set {'));
    assert.ok(result.includes('1,'));
    assert.ok(result.includes('2,'));
    assert.ok(result.includes('3,'));
  });
});

describe('toMatchSnapshot', () => {
  it('should create snapshot file on first run', () => {
    expect({ name: 'test' }).toMatchSnapshot('creates snapshot');
    assert.ok(fs.existsSync(SNAPSHOTS_DIR), 'snapshots dir should exist');
    const files = fs.readdirSync(SNAPSHOTS_DIR);
    assert.ok(files.length > 0, 'should have created a snapshot file');
  });

  it('should pass on matching snapshot', () => {
    const value = { x: 1, y: 2 };
    // First run creates the snapshot
    expect(value).toMatchSnapshot('matching test');
    // Second run should match
    expect(value).toMatchSnapshot('matching test');
  });

  it('should fail on mismatch', () => {
    expect({ a: 1 }).toMatchSnapshot('mismatch test');
    // Now change the value
    assert.throws(() => {
      expect({ a: 2 }).toMatchSnapshot('mismatch test');
    }, /Snapshot mismatch/);
  });

  it('should support custom snapshot name', () => {
    expect('hello').toMatchSnapshot('my custom name');
    // Verify snapshot file contains the custom name
    const files = fs.readdirSync(SNAPSHOTS_DIR);
    assert.ok(files.length > 0);
    const content = fs.readFileSync(
      path.join(SNAPSHOTS_DIR, files[0]),
      'utf-8',
    );
    assert.ok(content.includes('my custom name'));
  });
});

describe('toMatchInlineSnapshot', () => {
  it('should pass when inline snapshot matches', () => {
    expect(42).toMatchInlineSnapshot('42');
  });

  it('should fail when inline snapshot does not match', () => {
    assert.throws(() => {
      expect(42).toMatchInlineSnapshot('99');
    }, /Inline snapshot mismatch/);
  });

  it('should pass on first run with no snapshot argument', () => {
    // Should not throw when no inline snapshot provided (first run)
    expect({ a: 1 }).toMatchInlineSnapshot();
  });

  it('should match object serialization', () => {
    expect({ a: 1 }).toMatchInlineSnapshot('Object {\n  "a": 1,\n}');
  });

  it('should match string serialization', () => {
    expect('hello').toMatchInlineSnapshot('"hello"');
  });
});
