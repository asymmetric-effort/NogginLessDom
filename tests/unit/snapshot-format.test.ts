import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { expect } from '../../src/assertions/index.js';
import {
  serialize,
  matchSnapshot,
  setCurrentTestName,
  resetSnapshotCounter,
  setUpdateMode,
  removeSerializer,
} from '../../src/assertions/snapshots.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

const SNAPSHOTS_DIR = path.join(
  path.dirname(new URL(import.meta.url).pathname),
  '__snapshots__',
);

afterEach(() => {
  if (fs.existsSync(SNAPSHOTS_DIR)) {
    fs.rmSync(SNAPSHOTS_DIR, { recursive: true, force: true });
  }
  setUpdateMode('none');
});

// ---------------------------------------------------------------------------
// #139: Snapshot diff output with +/- markers
// ---------------------------------------------------------------------------
describe('#139: Snapshot diff output', () => {
  it('should show diff with - and + markers on mismatch', () => {
    // Create initial snapshot
    expect({ a: 1, b: 2 }).toMatchSnapshot('diff test');
    // Now change value
    try {
      expect({ a: 1, b: 3 }).toMatchSnapshot('diff test');
      assert.fail('should have thrown');
    } catch (err) {
      const msg = (err as Error).message;
      assert.ok(msg.includes('Snapshot mismatch'), 'should mention mismatch');
      assert.ok(msg.includes('-'), 'should have - marker for expected');
      assert.ok(msg.includes('+'), 'should have + marker for received');
    }
  });

  it('should show line-by-line diff for multiline snapshots', () => {
    expect({ x: 'hello', y: 'world' }).toMatchSnapshot('multiline diff');
    try {
      expect({ x: 'hello', y: 'changed' }).toMatchSnapshot('multiline diff');
      assert.fail('should have thrown');
    } catch (err) {
      const msg = (err as Error).message;
      // Lines that differ should be prefixed with - and +
      assert.ok(msg.includes('-'), 'diff should contain - lines');
      assert.ok(msg.includes('+'), 'diff should contain + lines');
      // Unchanged lines should appear without prefix or with space prefix
      assert.ok(
        msg.includes('"x": "hello"'),
        'unchanged content should appear',
      );
    }
  });

  it('should show clean diff for identical snapshots (no error)', () => {
    expect({ a: 1 }).toMatchSnapshot('no diff');
    // Should not throw
    expect({ a: 1 }).toMatchSnapshot('no diff');
  });
});

// ---------------------------------------------------------------------------
// #141: expect.addSnapshotSerializer() — verify already implemented
// ---------------------------------------------------------------------------
describe('#141: expect.addSnapshotSerializer()', () => {
  it('should be a function on expect', () => {
    assert.strictEqual(typeof expect.addSnapshotSerializer, 'function');
  });

  it('should register a serializer that affects serialize output', () => {
    const serializer = {
      test(value: unknown): boolean {
        return (
          typeof value === 'object' &&
          value !== null &&
          'tag' in value &&
          (value as Record<string, unknown>).tag === 'custom141'
        );
      },
      serialize(): string {
        return 'Custom141';
      },
    };
    expect.addSnapshotSerializer(serializer);
    try {
      const result = serialize({ tag: 'custom141' });
      assert.strictEqual(result, 'Custom141');
    } finally {
      removeSerializer(serializer);
    }
  });
});

// ---------------------------------------------------------------------------
// #142: Error/Map/Set serialization format
// ---------------------------------------------------------------------------
describe('#142: Error/Map/Set serialization format', () => {
  it('should serialize Error as [Error: message]', () => {
    const result = serialize(new Error('something went wrong'));
    assert.strictEqual(result, '[Error: something went wrong]');
  });

  it('should serialize Error with empty message', () => {
    const result = serialize(new Error(''));
    assert.strictEqual(result, '[Error: ]');
  });

  it('should serialize Map entries with key => value on separate lines', () => {
    const m = new Map<string, number>([
      ['a', 1],
      ['b', 2],
    ]);
    const result = serialize(m);
    const expected = 'Map {\n  "a" => 1,\n  "b" => 2,\n}';
    assert.strictEqual(result, expected);
  });

  it('should serialize empty Map', () => {
    assert.strictEqual(serialize(new Map()), 'Map {}');
  });

  it('should serialize Set entries on separate lines', () => {
    const s = new Set([1, 2, 3]);
    const result = serialize(s);
    const expected = 'Set {\n  1,\n  2,\n  3,\n}';
    assert.strictEqual(result, expected);
  });

  it('should serialize empty Set', () => {
    assert.strictEqual(serialize(new Set()), 'Set {}');
  });

  it('should serialize nested Map with proper indentation', () => {
    const m = new Map<string, Record<string, number>>([
      ['key', { nested: 42 }],
    ]);
    const result = serialize(m);
    assert.ok(result.includes('Map {'));
    assert.ok(result.includes('"key" => Object {'));
  });
});

// ---------------------------------------------------------------------------
// #143: Circular reference detection — verify already implemented
// ---------------------------------------------------------------------------
describe('#143: Circular reference detection', () => {
  it('should detect circular references in objects', () => {
    const obj: Record<string, unknown> = { name: 'circular' };
    obj.self = obj;
    const result = serialize(obj);
    assert.ok(result.includes('[Circular]'));
  });

  it('should detect circular references in arrays', () => {
    const arr: unknown[] = [1];
    arr.push(arr);
    const result = serialize(arr);
    assert.ok(result.includes('[Circular]'));
  });

  it('should detect circular references in nested structures', () => {
    const parent: Record<string, unknown> = { name: 'parent' };
    const child: Record<string, unknown> = { name: 'child', parent };
    parent.child = child;
    const result = serialize(parent);
    assert.ok(result.includes('[Circular]'));
  });
});

// ---------------------------------------------------------------------------
// #144: toMatchSnapshot hint parameter
// ---------------------------------------------------------------------------
describe('#144: toMatchSnapshot hint parameter', () => {
  it('should include hint in snapshot key as "test name: hint N"', () => {
    setCurrentTestName('my test');
    resetSnapshotCounter();
    matchSnapshot({ a: 1 }, undefined, 'my hint');

    assert.ok(fs.existsSync(SNAPSHOTS_DIR));
    const files = fs.readdirSync(SNAPSHOTS_DIR);
    const content = fs.readFileSync(
      path.join(SNAPSHOTS_DIR, files[0]!),
      'utf-8',
    );
    assert.ok(
      content.includes('my test: my hint 1'),
      `expected "my test: my hint 1" in snapshot, got:\n${content}`,
    );
  });

  it('should auto-increment with hint', () => {
    setCurrentTestName('counter test');
    resetSnapshotCounter();
    matchSnapshot('first', undefined, 'hint');
    matchSnapshot('second', undefined, 'hint');

    const files = fs.readdirSync(SNAPSHOTS_DIR);
    const content = fs.readFileSync(
      path.join(SNAPSHOTS_DIR, files[0]!),
      'utf-8',
    );
    assert.ok(content.includes('counter test: hint 1'));
    assert.ok(content.includes('counter test: hint 2'));
  });

  it('should use explicit snapshotName when provided (ignoring hint)', () => {
    setCurrentTestName('ignore hint');
    resetSnapshotCounter();
    matchSnapshot('val', 'explicit name', 'ignored hint');

    const files = fs.readdirSync(SNAPSHOTS_DIR);
    const content = fs.readFileSync(
      path.join(SNAPSHOTS_DIR, files[0]!),
      'utf-8',
    );
    assert.ok(content.includes('explicit name'));
    assert.ok(!content.includes('ignored hint'));
  });

  it('should work via expect().toMatchSnapshot with hint', () => {
    setCurrentTestName('expect hint');
    resetSnapshotCounter();
    expect({ val: 42 }).toMatchSnapshot(undefined, 'with hint');

    const files = fs.readdirSync(SNAPSHOTS_DIR);
    const content = fs.readFileSync(
      path.join(SNAPSHOTS_DIR, files[0]!),
      'utf-8',
    );
    assert.ok(
      content.includes('expect hint: with hint 1'),
      `expected "expect hint: with hint 1" in content:\n${content}`,
    );
  });
});

// ---------------------------------------------------------------------------
// #149: Snapshot property matchers
// ---------------------------------------------------------------------------
describe('#149: Snapshot property matchers', () => {
  it('should strip matched properties before snapshot comparison', () => {
    setCurrentTestName('prop matcher');
    resetSnapshotCounter();

    const obj = {
      id: 123,
      name: 'test',
      createdAt: new Date('2024-01-01'),
    };

    // First call creates snapshot with matched properties stripped
    matchSnapshot(obj, undefined, undefined, {
      id: expect.any(Number as unknown as new (...args: unknown[]) => unknown),
      createdAt: expect.any(
        Date as unknown as new (...args: unknown[]) => unknown,
      ),
    });

    // Second call with different dynamic values should still pass
    const obj2 = {
      id: 456,
      name: 'test',
      createdAt: new Date('2025-06-15'),
    };
    matchSnapshot(obj2, undefined, undefined, {
      id: expect.any(Number as unknown as new (...args: unknown[]) => unknown),
      createdAt: expect.any(
        Date as unknown as new (...args: unknown[]) => unknown,
      ),
    });
  });

  it('should throw when property matcher does not match actual value', () => {
    setCurrentTestName('prop matcher fail');
    resetSnapshotCounter();

    const obj = {
      id: 'not-a-number',
      name: 'test',
    };

    assert.throws(() => {
      matchSnapshot(obj, undefined, undefined, {
        id: expect.any(
          Number as unknown as new (...args: unknown[]) => unknown,
        ),
      });
    }, /Property matcher/);
  });

  it('should work with expect().toMatchSnapshot and property matchers', () => {
    setCurrentTestName('expect prop matcher');
    resetSnapshotCounter();

    const obj = { id: 1, label: 'hello' };
    expect(obj).toMatchSnapshot(undefined, undefined, {
      id: expect.any(Number as unknown as new (...args: unknown[]) => unknown),
    });

    // Different id, same label — should match
    const obj2 = { id: 99, label: 'hello' };
    expect(obj2).toMatchSnapshot(undefined, undefined, {
      id: expect.any(Number as unknown as new (...args: unknown[]) => unknown),
    });
  });

  it('should handle nested property matchers', () => {
    setCurrentTestName('nested prop matcher');
    resetSnapshotCounter();

    const obj = {
      user: {
        id: 42,
        name: 'Alice',
      },
    };

    matchSnapshot(obj, undefined, undefined, {
      user: {
        id: expect.any(
          Number as unknown as new (...args: unknown[]) => unknown,
        ),
      },
    });

    const obj2 = {
      user: {
        id: 999,
        name: 'Alice',
      },
    };

    matchSnapshot(obj2, undefined, undefined, {
      user: {
        id: expect.any(
          Number as unknown as new (...args: unknown[]) => unknown,
        ),
      },
    });
  });
});
