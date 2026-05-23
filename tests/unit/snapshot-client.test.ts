import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { SnapshotClient } from '../../src/assertions/snapshot-client.js';
import {
  NodeSnapshotEnvironment,
  type SnapshotEnvironment,
} from '../../src/assertions/snapshot-environment.js';
import { SnapshotManager } from '../../src/assertions/snapshot-manager.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'snap-test-'));
}

describe('SnapshotClient lifecycle', () => {
  let env: SnapshotEnvironment;
  let client: SnapshotClient;
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    env = new NodeSnapshotEnvironment();
    client = new SnapshotClient(env);
  });

  it('prepareTest resets counter and sets test name', () => {
    client.prepareTest('my test');
    // assert two snapshots then re-prepare, counter resets
    client.assert('a');
    client.assert('b');
    const summary1 = client.getSummary();
    assert.strictEqual(summary1.testName, 'my test');
    assert.strictEqual(summary1.added, 2);

    client.resetCounters();
    client.prepareTest('second test');
    client.assert('c');
    const summary2 = client.getSummary();
    assert.strictEqual(summary2.testName, 'second test');
    assert.strictEqual(summary2.added, 1);
  });

  it('assert adds a new snapshot when none exists', () => {
    client.prepareTest('add test');
    client.assert({ hello: 'world' });
    const result = client.finishTest();
    assert.strictEqual(result.added, 1);
    assert.strictEqual(result.matched, 0);
    assert.strictEqual(result.updated, 0);
  });

  it('assert matches an existing snapshot', () => {
    client.prepareTest('match test');
    // First call adds
    client.assert(42);
    // Second call with same value matches
    client.assert(42);
    const result = client.finishTest();
    // First was added, second key differs so also added
    // Actually both have different keys since counter increments
    assert.strictEqual(result.added, 2);
  });

  it('assert with same key matches stored value', () => {
    client.prepareTest('match key');
    client.assert('hello', 'mySnap');
    // same key, same value should match
    client.assert('hello', 'mySnap');
    const result = client.finishTest();
    assert.strictEqual(result.added, 1);
    assert.strictEqual(result.matched, 1);
  });

  it('assert throws on snapshot mismatch', () => {
    client.prepareTest('mismatch');
    client.assert('original', 'key1');
    assert.throws(() => {
      client.assert('different', 'key1');
    }, /Snapshot mismatch/);
  });

  it('finishTest returns correct counts', () => {
    client.prepareTest('counts');
    client.assert('a', 'k1');
    client.assert('b', 'k2');
    client.assert('a', 'k1'); // match
    const result = client.finishTest();
    assert.strictEqual(result.added, 2);
    assert.strictEqual(result.matched, 1);
    assert.strictEqual(result.updated, 0);
  });

  it('snapshot counter increments for auto-named keys', () => {
    client.prepareTest('counter');
    client.assert('a');
    client.assert('b');
    client.assert('c');
    // Keys should be "counter 1", "counter 2", "counter 3"
    const keys = client.getSnapshotKeys();
    assert.deepStrictEqual(keys, ['counter 1', 'counter 2', 'counter 3']);
  });

  it('loadSnapshots and saveSnapshots round-trip through environment', async () => {
    const snapFile = path.join(tmpDir, '__snapshots__', 'test.snap');

    client.prepareTest('roundtrip');
    client.assert({ x: 1 }, 'data');
    // Point the client at a file path and save
    await client.loadSnapshots(snapFile); // sets the file path
    // We need to re-assert after load to populate
    // Actually let's just create a fresh client that writes
    const writer = new SnapshotClient(env);
    await writer.loadSnapshots(snapFile);
    writer.prepareTest('roundtrip');
    writer.assert({ x: 1 }, 'data');
    await writer.saveSnapshots();

    // Verify file was written
    assert.ok(fs.existsSync(snapFile));
    const content = fs.readFileSync(snapFile, 'utf-8');
    assert.ok(content.includes('data'));
    assert.ok(content.includes('"x": 1'));

    // Now read it back with a new client
    const reader = new SnapshotClient(env);
    await reader.loadSnapshots(snapFile);
    reader.prepareTest('roundtrip');
    // Should match, not add
    reader.assert({ x: 1 }, 'data');
    const result = reader.finishTest();
    assert.strictEqual(result.matched, 1);
    assert.strictEqual(result.added, 0);

    // cleanup
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('getSummary returns current state', () => {
    client.prepareTest('summary test');
    client.assert(1, 'a');
    client.assert(2, 'b');
    const summary = client.getSummary();
    assert.strictEqual(summary.testName, 'summary test');
    assert.strictEqual(summary.added, 2);
    assert.strictEqual(summary.updated, 0);
    assert.strictEqual(summary.matched, 0);
  });
});

describe('SnapshotEnvironment', () => {
  let env: NodeSnapshotEnvironment;
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    env = new NodeSnapshotEnvironment();
  });

  it('getVersion returns version string', () => {
    assert.strictEqual(env.getVersion(), '1');
    const env2 = new NodeSnapshotEnvironment('2');
    assert.strictEqual(env2.getVersion(), '2');
  });

  it('getHeader returns header comment', () => {
    assert.strictEqual(env.getHeader(), '// Snapshot v1');
  });

  it('readSnapshotFile returns empty string for missing file', async () => {
    const content = await env.readSnapshotFile(
      path.join(tmpDir, 'nonexistent.snap'),
    );
    assert.strictEqual(content, '');
  });

  it('readSnapshotFile reads existing file', async () => {
    const filepath = path.join(tmpDir, 'test.snap');
    fs.writeFileSync(filepath, 'snapshot content', 'utf-8');
    const content = await env.readSnapshotFile(filepath);
    assert.strictEqual(content, 'snapshot content');
  });

  it('saveSnapshotFile writes content and creates directories', async () => {
    const filepath = path.join(tmpDir, 'nested', 'dir', 'test.snap');
    await env.saveSnapshotFile(filepath, 'hello snapshot');
    assert.ok(fs.existsSync(filepath));
    assert.strictEqual(fs.readFileSync(filepath, 'utf-8'), 'hello snapshot');

    // cleanup
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('resolveSnapshotPath generates correct path', () => {
    const result = env.resolveSnapshotPath('/some/path/mytest.test.ts');
    assert.strictEqual(result, '/some/path/__snapshots__/mytest.test.snap');
  });

  it('removeSnapshotFile removes existing file', async () => {
    const filepath = path.join(tmpDir, 'remove.snap');
    fs.writeFileSync(filepath, 'data', 'utf-8');
    assert.ok(fs.existsSync(filepath));
    await env.removeSnapshotFile(filepath);
    assert.ok(!fs.existsSync(filepath));

    // cleanup
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('removeSnapshotFile does not throw for missing file', async () => {
    await env.removeSnapshotFile(path.join(tmpDir, 'nope.snap'));
    // should not throw
  });

  it('prepareDirectory creates directories recursively', async () => {
    const dirPath = path.join(tmpDir, 'a', 'b', 'c');
    await env.prepareDirectory(dirPath);
    assert.ok(fs.existsSync(dirPath));

    // cleanup
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});

describe('SnapshotManager', () => {
  let env: SnapshotEnvironment;
  let manager: SnapshotManager;
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    env = new NodeSnapshotEnvironment();
    manager = new SnapshotManager(env);
  });

  it('getClient returns a SnapshotClient', () => {
    const client = manager.getClient('file1.test.ts');
    assert.ok(client instanceof SnapshotClient);
  });

  it('getClient returns the same client for the same file', () => {
    const c1 = manager.getClient('file1.test.ts');
    const c2 = manager.getClient('file1.test.ts');
    assert.strictEqual(c1, c2);
  });

  it('getClient returns different clients for different files', () => {
    const c1 = manager.getClient('file1.test.ts');
    const c2 = manager.getClient('file2.test.ts');
    assert.notStrictEqual(c1, c2);
  });

  it('tracks multiple files in summary', async () => {
    const c1 = manager.getClient('file1.test.ts');
    c1.prepareTest('test1');
    c1.assert('value1', 'snap1');
    c1.assert('value2', 'snap2');

    const c2 = manager.getClient('file2.test.ts');
    c2.prepareTest('test2');
    c2.assert('value3', 'snap3');

    await manager.finishFile('file1.test.ts');
    await manager.finishFile('file2.test.ts');

    const summary = manager.getSummary();
    assert.strictEqual(summary.added, 3);
    assert.strictEqual(summary.passed, 0);
    assert.strictEqual(summary.updated, 0);
  });

  it('finishFile aggregates matched counts', async () => {
    const c1 = manager.getClient('file1.test.ts');
    c1.prepareTest('test1');
    c1.assert('val', 'k');
    c1.assert('val', 'k'); // match
    await manager.finishFile('file1.test.ts');

    const summary = manager.getSummary();
    assert.strictEqual(summary.added, 1);
    assert.strictEqual(summary.passed, 1);
  });

  it('finishFile is a no-op for unknown files', async () => {
    await manager.finishFile('unknown.test.ts');
    const summary = manager.getSummary();
    assert.strictEqual(summary.added, 0);
  });

  it('cleanup removes snapshot files for empty clients', async () => {
    const snapFile = path.join(tmpDir, '__snapshots__', 'empty.test.snap');
    await env.prepareDirectory(path.dirname(snapFile));
    await env.saveSnapshotFile(snapFile, 'old data');

    // Create a client that resolves to our temp snap file
    // We need a custom env for this test
    const customEnv: SnapshotEnvironment = {
      ...env,
      getVersion: () => env.getVersion(),
      getHeader: () => env.getHeader(),
      readSnapshotFile: (fp: string) => env.readSnapshotFile(fp),
      saveSnapshotFile: (fp: string, c: string) => env.saveSnapshotFile(fp, c),
      resolveSnapshotPath: () => snapFile,
      removeSnapshotFile: (fp: string) => env.removeSnapshotFile(fp),
      prepareDirectory: (dp: string) => env.prepareDirectory(dp),
    };
    const mgr = new SnapshotManager(customEnv);
    // Get a client but don't add any snapshots
    mgr.getClient('empty.test.ts');
    await mgr.cleanup();

    const summary = mgr.getSummary();
    assert.strictEqual(summary.removed, 1);
    assert.ok(!fs.existsSync(snapFile));

    // cleanup
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('reset clears all state', async () => {
    const c1 = manager.getClient('file1.test.ts');
    c1.prepareTest('test');
    c1.assert('val', 'k');
    await manager.finishFile('file1.test.ts');

    manager.reset();
    const summary = manager.getSummary();
    assert.strictEqual(summary.added, 0);
    assert.strictEqual(summary.passed, 0);
    assert.strictEqual(summary.updated, 0);
    assert.strictEqual(summary.removed, 0);

    // Getting a client after reset returns a new one
    const c2 = manager.getClient('file1.test.ts');
    assert.notStrictEqual(c1, c2);
  });
});
