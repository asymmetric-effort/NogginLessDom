import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  serialize,
  addSerializer,
  removeSerializer,
  getSerializers,
} from '../../src/assertions/snapshots.js';
import { expect } from '../../src/assertions/index.js';
import type { SnapshotSerializer } from '../../src/assertions/snapshots.js';

describe('Custom snapshot serializer plugin system', () => {
  it('should register and use a custom serializer', () => {
    const customSerializer: SnapshotSerializer = {
      test(value: unknown): boolean {
        return (
          typeof value === 'object' &&
          value !== null &&
          'type' in value &&
          (value as Record<string, unknown>).type === 'custom'
        );
      },
      serialize(
        value: unknown,
        _config,
        _indentation,
        _depth,
        _refs,
        _printer,
      ): string {
        const v = value as Record<string, unknown>;
        return `Custom<${String(v.name)}>`;
      },
    };

    addSerializer(customSerializer);
    try {
      const result = serialize({ type: 'custom', name: 'widget' });
      assert.strictEqual(result, 'Custom<widget>');
    } finally {
      removeSerializer(customSerializer);
    }
  });

  it('should check multiple serializers in registration order', () => {
    const first: SnapshotSerializer = {
      test(value: unknown): boolean {
        return (
          typeof value === 'object' &&
          value !== null &&
          'kind' in value &&
          (value as Record<string, unknown>).kind === 'alpha'
        );
      },
      serialize(): string {
        return 'FIRST';
      },
    };

    const second: SnapshotSerializer = {
      test(value: unknown): boolean {
        return (
          typeof value === 'object' &&
          value !== null &&
          'kind' in value &&
          (value as Record<string, unknown>).kind === 'beta'
        );
      },
      serialize(): string {
        return 'SECOND';
      },
    };

    addSerializer(first);
    addSerializer(second);
    try {
      assert.strictEqual(serialize({ kind: 'alpha' }), 'FIRST');
      assert.strictEqual(serialize({ kind: 'beta' }), 'SECOND');
    } finally {
      removeSerializer(first);
      removeSerializer(second);
    }
  });

  it('should fall back to built-in serialization when no custom serializer matches', () => {
    const result = serialize(42);
    assert.strictEqual(result, '42');
  });

  it('should remove a serializer', () => {
    const s: SnapshotSerializer = {
      test(value: unknown): boolean {
        return value === 'special';
      },
      serialize(): string {
        return 'SPECIAL';
      },
    };

    addSerializer(s);
    assert.strictEqual(serialize('special'), 'SPECIAL');
    removeSerializer(s);
    assert.strictEqual(serialize('special'), '"special"');
  });

  it('should return all registered serializers via getSerializers', () => {
    const s: SnapshotSerializer = {
      test(): boolean {
        return false;
      },
      serialize(): string {
        return '';
      },
    };

    const before = getSerializers().length;
    addSerializer(s);
    assert.strictEqual(getSerializers().length, before + 1);
    assert.ok(getSerializers().includes(s));
    removeSerializer(s);
    assert.strictEqual(getSerializers().length, before);
  });

  it('should support expect.addSnapshotSerializer', () => {
    const s: SnapshotSerializer = {
      test(value: unknown): boolean {
        return (
          typeof value === 'object' &&
          value !== null &&
          'viaExpect' in value &&
          (value as Record<string, unknown>).viaExpect === true
        );
      },
      serialize(): string {
        return 'FROM_EXPECT';
      },
    };

    expect.addSnapshotSerializer(s);
    try {
      const result = serialize({ viaExpect: true });
      assert.strictEqual(result, 'FROM_EXPECT');
    } finally {
      removeSerializer(s);
    }
  });
});

describe('Pretty-format with configurable options', () => {
  it('should serialize objects with sorted keys and proper indentation', () => {
    const result = serialize({ z: 3, a: 1, m: 2 });
    const expected = 'Object {\n  "a": 1,\n  "m": 2,\n  "z": 3,\n}';
    assert.strictEqual(result, expected);
  });

  it('should serialize nested objects with increasing indentation', () => {
    const result = serialize({ a: { b: 1 } });
    const expected = 'Object {\n  "a": Object {\n    "b": 1,\n  },\n}';
    assert.strictEqual(result, expected);
  });

  it('should serialize arrays with one item per line', () => {
    const result = serialize([1, 2, 3]);
    const expected = 'Array [\n  1,\n  2,\n  3,\n]';
    assert.strictEqual(result, expected);
  });

  it('should serialize nested arrays', () => {
    const result = serialize([[1], [2]]);
    const expected =
      'Array [\n  Array [\n    1,\n  ],\n  Array [\n    2,\n  ],\n]';
    assert.strictEqual(result, expected);
  });

  it('should respect maxDepth limiting', () => {
    const deep = { a: { b: { c: { d: 1 } } } };
    const result = serialize(deep, { maxDepth: 2 });
    // At depth 2, the value of b should be [Object]
    assert.ok(result.includes('[Object]'));
  });

  it('should handle circular references', () => {
    const obj: Record<string, unknown> = { name: 'circular' };
    obj.self = obj;
    const result = serialize(obj);
    assert.ok(result.includes('[Circular]'));
  });

  it('should support min option for minimized output', () => {
    const result = serialize({ a: 1, b: [2, 3] }, { min: true });
    assert.strictEqual(result, '{"a": 1, "b": [2, 3]}');
  });

  it('should support custom indent size', () => {
    const result = serialize({ a: 1 }, { indent: 4 });
    assert.ok(result.includes('    "a"'));
  });

  it('should serialize Maps with pretty formatting', () => {
    const m = new Map<string, number>([
      ['b', 2],
      ['a', 1],
    ]);
    const result = serialize(m);
    assert.ok(result.includes('Map {'));
    assert.ok(result.includes('"b" => 2,'));
    assert.ok(result.includes('"a" => 1,'));
  });

  it('should serialize Sets with pretty formatting', () => {
    const s = new Set([1, 2, 3]);
    const result = serialize(s);
    assert.ok(result.includes('Set {'));
    assert.ok(result.includes('1,'));
    assert.ok(result.includes('2,'));
    assert.ok(result.includes('3,'));
  });

  it('should not print basic prototype by default', () => {
    const result = serialize({ a: 1 });
    assert.ok(result.includes('Object {'));
  });

  it('should support printBasicPrototype false to omit Object wrapper', () => {
    const result = serialize({ a: 1 }, { printBasicPrototype: false });
    assert.ok(!result.includes('Object'));
    assert.ok(result.includes('"a": 1'));
  });

  it('should handle empty objects', () => {
    assert.strictEqual(serialize({}), 'Object {}');
  });

  it('should handle empty arrays', () => {
    assert.strictEqual(serialize([]), 'Array []');
  });

  it('should serialize string values inside objects with quotes', () => {
    const result = serialize({ greeting: 'hello' });
    assert.ok(result.includes('"greeting": "hello"'));
  });

  it('should serialize boolean values inside objects', () => {
    const result = serialize({ flag: true });
    assert.ok(result.includes('"flag": true'));
  });

  it('should serialize null values inside objects', () => {
    const result = serialize({ nothing: null });
    assert.ok(result.includes('"nothing": null'));
  });

  it('should handle circular references in arrays', () => {
    const arr: unknown[] = [1, 2];
    arr.push(arr);
    const result = serialize(arr);
    assert.ok(result.includes('[Circular]'));
  });

  it('should handle circular references in nested objects', () => {
    const parent: Record<string, unknown> = { name: 'parent' };
    const child: Record<string, unknown> = { name: 'child', parent: parent };
    parent.child = child;
    const result = serialize(parent);
    assert.ok(result.includes('[Circular]'));
  });
});
