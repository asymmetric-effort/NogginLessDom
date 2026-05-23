import { describe, it, afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { expect } from '../../src/assertions/index.js';
import {
  serialize,
  matchSnapshot,
  setCurrentTestName,
  resetSnapshotCounter,
} from '../../src/assertions/snapshots.js';
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

// #140: .not.toMatchSnapshot should throw
describe('#140: .not.toMatchSnapshot should throw', () => {
  it('throws an error saying snapshot negation is not supported', () => {
    assert.throws(
      () => {
        expect({ a: 1 }).not.toMatchSnapshot();
      },
      (err: Error) => {
        return err.message.includes('not supported');
      },
    );
  });
});

// #145: toThrowErrorMatchingSnapshot uses hardcoded name
describe('#145: toThrowErrorMatchingSnapshot uses test name + counter', () => {
  beforeEach(() => {
    setCurrentTestName('my error test');
    resetSnapshotCounter();
  });

  it('uses nextSnapshotName instead of hardcoded "error"', () => {
    const thrower = (): void => {
      throw new Error('boom');
    };

    // First call creates snapshot with test name + counter key
    expect(thrower).toThrowErrorMatchingSnapshot();

    // Read the snapshot file to verify the key
    const snapDir = SNAPSHOTS_DIR;
    const snapFiles = fs.readdirSync(snapDir);
    assert.ok(snapFiles.length > 0, 'snapshot file should exist');
    const snapContent = fs.readFileSync(
      path.join(snapDir, snapFiles[0]!),
      'utf-8',
    );
    // Should contain the test name, not a hardcoded 'error' key
    assert.ok(
      snapContent.includes('my error test'),
      `snapshot key should include test name, got: ${snapContent}`,
    );
    assert.ok(
      !snapContent.includes("exports['error']"),
      `snapshot key should NOT be hardcoded 'error', got: ${snapContent}`,
    );
  });
});

// #146: Snapshot file sorting
describe('#146: Snapshot file sorting', () => {
  beforeEach(() => {
    resetSnapshotCounter();
  });

  it('writes snapshot entries sorted alphabetically by key', () => {
    // Create snapshots with keys that are not alphabetical
    setCurrentTestName('zebra test');
    resetSnapshotCounter();
    matchSnapshot('value1');

    setCurrentTestName('alpha test');
    resetSnapshotCounter();
    matchSnapshot('value2');

    setCurrentTestName('middle test');
    resetSnapshotCounter();
    matchSnapshot('value3');

    // Read the snapshot file
    const snapFiles = fs.readdirSync(SNAPSHOTS_DIR);
    assert.ok(snapFiles.length > 0, 'snapshot file should exist');
    const snapContent = fs.readFileSync(
      path.join(SNAPSHOTS_DIR, snapFiles[0]!),
      'utf-8',
    );

    // Extract keys in order
    const keyRegex = /exports\['(.+?)'\]/g;
    const keys: string[] = [];
    let m = keyRegex.exec(snapContent);
    while (m !== null) {
      keys.push(m[1]!);
      m = keyRegex.exec(snapContent);
    }

    // Should be sorted
    const sorted = [...keys].sort();
    assert.deepStrictEqual(keys, sorted, 'snapshot keys should be sorted');
  });
});

// #147: BigInt and TypedArray serialization
describe('#147: BigInt and TypedArray serialization', () => {
  it('serializes BigInt values as 123n', () => {
    assert.strictEqual(serialize(BigInt(0)), '0n');
    assert.strictEqual(serialize(BigInt(123)), '123n');
    assert.strictEqual(serialize(BigInt(-42)), '-42n');
  });

  it('serializes Uint8Array', () => {
    assert.strictEqual(
      serialize(new Uint8Array([1, 2, 3])),
      'Uint8Array [1, 2, 3]',
    );
  });

  it('serializes Int8Array', () => {
    assert.strictEqual(
      serialize(new Int8Array([4, 5, 6])),
      'Int8Array [4, 5, 6]',
    );
  });

  it('serializes Uint16Array', () => {
    assert.strictEqual(
      serialize(new Uint16Array([10, 20])),
      'Uint16Array [10, 20]',
    );
  });

  it('serializes Float64Array', () => {
    assert.strictEqual(
      serialize(new Float64Array([1.5, 2.5])),
      'Float64Array [1.5, 2.5]',
    );
  });

  it('serializes empty TypedArray', () => {
    assert.strictEqual(serialize(new Uint8Array([])), 'Uint8Array []');
  });
});

// #148: Promise and WeakMap/WeakSet serialization
describe('#148: Promise and WeakMap/WeakSet serialization', () => {
  it('serializes Promise as "Promise {}"', () => {
    assert.strictEqual(serialize(Promise.resolve(42)), 'Promise {}');
  });

  it('serializes WeakMap as "WeakMap {}"', () => {
    assert.strictEqual(serialize(new WeakMap()), 'WeakMap {}');
  });

  it('serializes WeakSet as "WeakSet {}"', () => {
    assert.strictEqual(serialize(new WeakSet()), 'WeakSet {}');
  });
});
