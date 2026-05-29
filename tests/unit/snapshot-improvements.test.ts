import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

import { serialize } from '../../src/assertions/snapshots.js';
import { SnapshotClient } from '../../src/assertions/snapshot-client.js';
import { NodeSnapshotEnvironment } from '../../src/assertions/snapshot-environment.js';
import {
  printSnapshotSummary,
  type SnapshotManagerSummary,
} from '../../src/assertions/snapshot-manager.js';

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'snap-improve-'));
}

// ---------------------------------------------------------------------------
// #125: Snapshot file header and version metadata
// ---------------------------------------------------------------------------
describe('#125: Snapshot file header', () => {
  let env: NodeSnapshotEnvironment;
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    env = new NodeSnapshotEnvironment();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('writeSnapshotFile includes header as first line', async () => {
    const client = new SnapshotClient(env);
    const snapFile = path.join(tmpDir, '__snapshots__', 'test.snap');
    await client.loadSnapshots(snapFile);
    client.prepareTest('header test');
    client.assert('value', 'key1');
    await client.saveSnapshots();

    const content = fs.readFileSync(snapFile, 'utf-8');
    const firstLine = content.split('\n')[0];
    assert.strictEqual(
      firstLine,
      '// Snapshot v1, https://nogginlessdom.asymmetric-effort.com',
    );
  });

  it('readSnapshotFile skips header line when parsing', async () => {
    const snapFile = path.join(tmpDir, 'header.snap');
    fs.mkdirSync(path.dirname(snapFile), { recursive: true });
    fs.writeFileSync(
      snapFile,
      '// Snapshot v1, https://nogginlessdom.asymmetric-effort.com\n\nexports[\'mykey\'] = `"hello"`;' +
        '\n',
      'utf-8',
    );

    const client = new SnapshotClient(env);
    await client.loadSnapshots(snapFile);
    client.prepareTest('read test');
    client.assert('hello', 'mykey');
    const result = client.finishTest();
    assert.strictEqual(result.matched, 1);
    assert.strictEqual(result.added, 0);
  });

  it('standalone writeSnapshotFile includes header', async () => {
    // Test the standalone function in snapshots.ts via round-trip
    const snapFile = path.join(tmpDir, 'standalone.snap');

    const client = new SnapshotClient(env);
    await client.loadSnapshots(snapFile);
    client.prepareTest('standalone');
    client.assert('data', 'standaloneKey');
    await client.saveSnapshots();

    const content = fs.readFileSync(snapFile, 'utf-8');
    assert.ok(
      content.startsWith(
        '// Snapshot v1, https://nogginlessdom.asymmetric-effort.com',
      ),
    );
  });
});

// ---------------------------------------------------------------------------
// #132: Obsolete snapshot detection and cleanup
// ---------------------------------------------------------------------------
describe('#132: Obsolete snapshot detection', () => {
  let env: NodeSnapshotEnvironment;
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    env = new NodeSnapshotEnvironment();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('getObsoleteKeys returns keys not asserted in current test', async () => {
    const snapFile = path.join(tmpDir, '__snapshots__', 'obsolete.snap');
    fs.mkdirSync(path.dirname(snapFile), { recursive: true });
    fs.writeFileSync(
      snapFile,
      '// Snapshot v1, https://nogginlessdom.asymmetric-effort.com\n\n' +
        'exports[\'test 1\'] = `"a"`;\n\n' +
        'exports[\'test 2\'] = `"b"`;\n\n' +
        'exports[\'test 3\'] = `"c"`;\n',
      'utf-8',
    );

    const client = new SnapshotClient(env);
    await client.loadSnapshots(snapFile);
    client.prepareTest('test');
    // Only assert key "test 1" - keys "test 2" and "test 3" are obsolete
    client.assert('a', 'test 1');
    client.finishTest();

    const obsolete = client.getObsoleteKeys();
    assert.deepStrictEqual(obsolete.sort(), ['test 2', 'test 3']);
  });

  it('getObsoleteKeys returns empty array when all keys are asserted', async () => {
    const snapFile = path.join(tmpDir, '__snapshots__', 'all-used.snap');
    fs.mkdirSync(path.dirname(snapFile), { recursive: true });
    fs.writeFileSync(
      snapFile,
      '// Snapshot v1, https://nogginlessdom.asymmetric-effort.com\n\n' +
        'exports[\'k1\'] = `"a"`;\n\n' +
        'exports[\'k2\'] = `"b"`;\n',
      'utf-8',
    );

    const client = new SnapshotClient(env);
    await client.loadSnapshots(snapFile);
    client.prepareTest('test');
    client.assert('a', 'k1');
    client.assert('b', 'k2');
    client.finishTest();

    const obsolete = client.getObsoleteKeys();
    assert.deepStrictEqual(obsolete, []);
  });

  it('removeObsoleteSnapshots removes un-asserted keys', async () => {
    const snapFile = path.join(tmpDir, '__snapshots__', 'remove.snap');
    fs.mkdirSync(path.dirname(snapFile), { recursive: true });
    fs.writeFileSync(
      snapFile,
      '// Snapshot v1, https://nogginlessdom.asymmetric-effort.com\n\n' +
        'exports[\'keep\'] = `"yes"`;\n\n' +
        'exports[\'remove-me\'] = `"no"`;\n',
      'utf-8',
    );

    const client = new SnapshotClient(env);
    await client.loadSnapshots(snapFile);
    client.prepareTest('test');
    client.assert('yes', 'keep');
    client.finishTest();

    const removed = client.removeObsoleteSnapshots();
    assert.strictEqual(removed, 1);
    assert.deepStrictEqual(client.getSnapshotKeys(), ['keep']);
  });
});

// ---------------------------------------------------------------------------
// #134: Symbol serialization
// ---------------------------------------------------------------------------
describe('#134: Symbol serialization', () => {
  it('serializes Symbol with description', () => {
    const result = serialize(Symbol('mySymbol'));
    assert.strictEqual(result, 'Symbol(mySymbol)');
  });

  it('serializes Symbol without description', () => {
    const result = serialize(Symbol());
    assert.strictEqual(result, 'Symbol()');
  });

  it('serializes Symbol with empty string description', () => {
    const result = serialize(Symbol(''));
    assert.strictEqual(result, 'Symbol()');
  });

  it('serializes object containing symbols', () => {
    const result = serialize({ key: Symbol('test') });
    assert.ok(result.includes('Symbol(test)'));
  });
});

// ---------------------------------------------------------------------------
// #135: HTML element serialization
// ---------------------------------------------------------------------------
describe('#135: HTML element serialization', () => {
  it('serializes DOM-like object with tagName and nodeType', () => {
    const el = {
      tagName: 'DIV',
      nodeType: 1,
      attributes: [],
      children: [],
    };
    const result = serialize(el);
    assert.strictEqual(result, '<DIV />');
  });

  it('serializes DOM-like object with attributes', () => {
    const el = {
      tagName: 'INPUT',
      nodeType: 1,
      attributes: [
        { name: 'type', value: 'text' },
        { name: 'id', value: 'name' },
      ],
      children: [],
    };
    const result = serialize(el);
    assert.strictEqual(result, '<INPUT type="text" id="name" />');
  });

  it('serializes DOM-like object with children', () => {
    const el = {
      tagName: 'DIV',
      nodeType: 1,
      attributes: [],
      children: [
        {
          tagName: 'SPAN',
          nodeType: 1,
          attributes: [],
          children: [],
        },
      ],
    };
    const result = serialize(el);
    assert.ok(result.includes('<DIV>'));
    assert.ok(result.includes('<SPAN />'));
    assert.ok(result.includes('</DIV>'));
  });

  it('serializes text node children', () => {
    const el = {
      tagName: 'P',
      nodeType: 1,
      attributes: [],
      children: [{ nodeType: 3, textContent: 'Hello' }],
    };
    const result = serialize(el);
    assert.ok(result.includes('Hello'));
  });

  it('does not treat regular objects with tagName as DOM elements without nodeType', () => {
    const obj = { tagName: 'DIV' };
    const result = serialize(obj);
    // Should serialize as a plain object
    assert.ok(result.includes('"tagName"'));
  });
});

// ---------------------------------------------------------------------------
// #136: Snapshot summary reporting
// ---------------------------------------------------------------------------
describe('#136: Snapshot summary reporting', () => {
  it('prints full summary with all fields', () => {
    const logs: string[] = [];
    const origLog = console.log; // eslint-disable-line no-console
    // eslint-disable-next-line no-console
    console.log = (...args: unknown[]) => {
      logs.push(args.map(String).join(' '));
    };

    const summary: SnapshotManagerSummary = {
      added: 2,
      updated: 1,
      removed: 3,
      passed: 10,
      failed: 0,
      unchecked: 4,
    };
    printSnapshotSummary(summary);
    console.log = origLog; // eslint-disable-line no-console

    assert.strictEqual(logs.length, 1);
    assert.ok(logs[0]!.includes('10 passed'));
    assert.ok(logs[0]!.includes('2 added'));
    assert.ok(logs[0]!.includes('1 updated'));
    assert.ok(logs[0]!.includes('3 removed'));
    assert.ok(logs[0]!.includes('4 obsolete'));
  });

  it('prints summary with zero values', () => {
    const logs: string[] = [];
    const origLog = console.log; // eslint-disable-line no-console
    // eslint-disable-next-line no-console
    console.log = (...args: unknown[]) => {
      logs.push(args.map(String).join(' '));
    };

    const summary: SnapshotManagerSummary = {
      added: 0,
      updated: 0,
      removed: 0,
      passed: 5,
      failed: 0,
      unchecked: 0,
    };
    printSnapshotSummary(summary);
    console.log = origLog; // eslint-disable-line no-console

    assert.strictEqual(logs.length, 1);
    assert.ok(logs[0]!.includes('5 passed'));
    assert.ok(logs[0]!.includes('0 added'));
  });
});

// ---------------------------------------------------------------------------
// #137: Snapshot path resolution with snapshotDir
// ---------------------------------------------------------------------------
describe('#137: Snapshot path resolution with snapshotDir', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('resolveSnapshotPath uses default __snapshots__ directory', () => {
    const env = new NodeSnapshotEnvironment();
    const result = env.resolveSnapshotPath('/some/path/mytest.test.ts');
    assert.strictEqual(result, '/some/path/__snapshots__/mytest.test.snap');
  });

  it('resolveSnapshotPath uses custom snapshotDir', () => {
    const env = new NodeSnapshotEnvironment('1', '__snaps__');
    const result = env.resolveSnapshotPath('/some/path/mytest.test.ts');
    assert.strictEqual(result, '/some/path/__snaps__/mytest.test.snap');
  });

  it('resolveSnapshotPath rejects absolute snapshotDir', () => {
    const customDir = path.join(tmpDir, 'custom-snaps');
    assert.throws(() => {
      new NodeSnapshotEnvironment('1', customDir);
    }, /snapshotDir must be a relative path/);
  });
});

// ---------------------------------------------------------------------------
// #138: Improved template literal escaping
// ---------------------------------------------------------------------------
describe('#138: Template literal escaping', () => {
  let env: NodeSnapshotEnvironment;
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    env = new NodeSnapshotEnvironment();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('round-trips values containing backticks', async () => {
    const snapFile = path.join(tmpDir, '__snapshots__', 'escape.snap');
    const client = new SnapshotClient(env);
    await client.loadSnapshots(snapFile);
    client.prepareTest('escape');
    client.assert('hello `world`', 'backtick-key');
    await client.saveSnapshots();

    // Read it back
    const reader = new SnapshotClient(env);
    await reader.loadSnapshots(snapFile);
    reader.prepareTest('escape');
    reader.assert('hello `world`', 'backtick-key');
    const result = reader.finishTest();
    assert.strictEqual(result.matched, 1);
  });

  it('round-trips values containing ${} template expressions', async () => {
    const snapFile = path.join(tmpDir, '__snapshots__', 'dollar.snap');
    const client = new SnapshotClient(env);
    await client.loadSnapshots(snapFile);
    client.prepareTest('dollar');
    client.assert('value is ${foo}', 'dollar-key');
    await client.saveSnapshots();

    // Read it back
    const reader = new SnapshotClient(env);
    await reader.loadSnapshots(snapFile);
    reader.prepareTest('dollar');
    reader.assert('value is ${foo}', 'dollar-key');
    const result = reader.finishTest();
    assert.strictEqual(result.matched, 1);
  });

  it('round-trips values containing backslashes', async () => {
    const snapFile = path.join(tmpDir, '__snapshots__', 'backslash.snap');
    const client = new SnapshotClient(env);
    await client.loadSnapshots(snapFile);
    client.prepareTest('backslash');
    client.assert('path\\to\\file', 'backslash-key');
    await client.saveSnapshots();

    // Read it back
    const reader = new SnapshotClient(env);
    await reader.loadSnapshots(snapFile);
    reader.prepareTest('backslash');
    reader.assert('path\\to\\file', 'backslash-key');
    const result = reader.finishTest();
    assert.strictEqual(result.matched, 1);
  });

  it('round-trips values containing all special characters together', async () => {
    const snapFile = path.join(tmpDir, '__snapshots__', 'combined.snap');
    const client = new SnapshotClient(env);
    await client.loadSnapshots(snapFile);
    client.prepareTest('combined');
    client.assert('`${value}` and \\backslash\\', 'combined-key');
    await client.saveSnapshots();

    const reader = new SnapshotClient(env);
    await reader.loadSnapshots(snapFile);
    reader.prepareTest('combined');
    reader.assert('`${value}` and \\backslash\\', 'combined-key');
    const result = reader.finishTest();
    assert.strictEqual(result.matched, 1);
  });

  it('escapeForTemplate properly escapes ${ sequences', async () => {
    const snapFile = path.join(tmpDir, '__snapshots__', 'template-expr.snap');
    const client = new SnapshotClient(env);
    await client.loadSnapshots(snapFile);
    client.prepareTest('template');
    client.assert('${dangerous}', 'tpl-key');
    await client.saveSnapshots();

    // Verify the raw file content has escaped the $
    const raw = fs.readFileSync(snapFile, 'utf-8');
    // The $ should be escaped as \$ in the template literal
    assert.ok(raw.includes('\\$'));
    // The raw content should not have an unescaped ${ (i.e., every $ should be preceded by \)
    // Check that there's no bare `${` without a preceding backslash
    const hasBareTemplate = /(?<!\\)\$\{/.test(raw);
    assert.strictEqual(
      hasBareTemplate,
      false,
      'Raw file should not contain unescaped ${',
    );
  });
});

// ---------------------------------------------------------------------------
// Standalone snapshots.ts header (#125)
// ---------------------------------------------------------------------------
describe('#125: writeSnapshotFile in snapshots.ts includes header', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('writeSnapshotFile adds header to output', async () => {
    // We test via SnapshotClient + NodeSnapshotEnvironment
    const env = new NodeSnapshotEnvironment();
    const snapFile = path.join(tmpDir, '__snapshots__', 'hdr.snap');
    const client = new SnapshotClient(env);
    await client.loadSnapshots(snapFile);
    client.prepareTest('hdr');
    client.assert(42, 'num');
    await client.saveSnapshots();

    const content = fs.readFileSync(snapFile, 'utf-8');
    assert.ok(
      content.startsWith(
        '// Snapshot v1, https://nogginlessdom.asymmetric-effort.com',
      ),
    );
  });
});
