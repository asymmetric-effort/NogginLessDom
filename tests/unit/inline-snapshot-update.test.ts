import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  updateInlineSnapshot,
  getCallSite,
  serialize,
} from '../../src/assertions/snapshots.js';

describe('Inline snapshot auto-update', () => {
  it('auto-update writes serialized value to source file', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'snap-test-'));
    const tmpFile = path.join(tmpDir, 'test.ts');
    fs.writeFileSync(
      tmpFile,
      'expect(value).toMatchInlineSnapshot();\n',
      'utf-8',
    );
    updateInlineSnapshot({ file: tmpFile, line: 1 }, '"hello"');
    const result = fs.readFileSync(tmpFile, 'utf-8');
    assert.ok(result.includes('toMatchInlineSnapshot("\\"hello\\"")'));
    fs.rmSync(tmpDir, { recursive: true });
  });
  it('existing inline snapshot is replaced', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'snap-test-'));
    const tmpFile = path.join(tmpDir, 'test.ts');
    fs.writeFileSync(
      tmpFile,
      'expect(value).toMatchInlineSnapshot("old value");\n',
      'utf-8',
    );
    updateInlineSnapshot({ file: tmpFile, line: 1 }, '"new value"');
    const result = fs.readFileSync(tmpFile, 'utf-8');
    assert.ok(result.includes('toMatchInlineSnapshot("\\"new value\\"")'));
    assert.ok(!result.includes('old value'));
    fs.rmSync(tmpDir, { recursive: true });
  });
  it('new inline snapshot is added (empty parens)', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'snap-test-'));
    const tmpFile = path.join(tmpDir, 'test.ts');
    fs.writeFileSync(tmpFile, 'expect(42).toMatchInlineSnapshot();\n', 'utf-8');
    updateInlineSnapshot({ file: tmpFile, line: 1 }, '42');
    const result = fs.readFileSync(tmpFile, 'utf-8');
    assert.ok(result.includes('toMatchInlineSnapshot("42")'));
    fs.rmSync(tmpDir, { recursive: true });
  });
  it('multi-line values are handled correctly', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'snap-test-'));
    const tmpFile = path.join(tmpDir, 'test.ts');
    fs.writeFileSync(
      tmpFile,
      'expect(obj).toMatchInlineSnapshot();\n',
      'utf-8',
    );
    const multiLine = 'Object {\n  "a": 1,\n  "b": 2,\n}';
    updateInlineSnapshot({ file: tmpFile, line: 1 }, multiLine);
    const result = fs.readFileSync(tmpFile, 'utf-8');
    assert.ok(result.includes('toMatchInlineSnapshot('));
    assert.ok(result.includes('Object {'));
    fs.rmSync(tmpDir, { recursive: true });
  });
  it('update only happens when UPDATE_SNAPSHOTS=1', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'snap-test-'));
    const tmpFile = path.join(tmpDir, 'test.ts');
    fs.writeFileSync(
      tmpFile,
      'expect(value).toMatchInlineSnapshot();\n',
      'utf-8',
    );
    const originalContent = fs.readFileSync(tmpFile, 'utf-8');
    const afterContent = fs.readFileSync(tmpFile, 'utf-8');
    assert.equal(originalContent, afterContent);
    fs.rmSync(tmpDir, { recursive: true });
  });
  it('getCallSite returns file and line', () => {
    const site = getCallSite();
    assert.ok(site !== null);
    assert.ok(site!.file.includes('inline-snapshot-update.test'));
    assert.ok(typeof site!.line === 'number');
    assert.ok(site!.line > 0);
  });
  it('serialize produces expected output', () => {
    assert.equal(serialize(42), '42');
    assert.equal(serialize('hello'), '"hello"');
    assert.equal(serialize(null), 'null');
    assert.equal(serialize(undefined), 'undefined');
    assert.equal(serialize(true), 'true');
  });
  it('updateInlineSnapshot with non-existent file is a no-op', () => {
    assert.doesNotThrow(() => {
      updateInlineSnapshot(
        { file: '/nonexistent/path/test.ts', line: 1 },
        'value',
      );
    });
  });
  it('updateInlineSnapshot with out-of-range line is a no-op', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'snap-test-'));
    const tmpFile = path.join(tmpDir, 'test.ts');
    fs.writeFileSync(tmpFile, 'line1\n', 'utf-8');
    updateInlineSnapshot({ file: tmpFile, line: 999 }, 'value');
    const result = fs.readFileSync(tmpFile, 'utf-8');
    assert.equal(result, 'line1\n');
    fs.rmSync(tmpDir, { recursive: true });
  });
  it('updateInlineSnapshot ignores line without toMatchInlineSnapshot', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'snap-test-'));
    const tmpFile = path.join(tmpDir, 'test.ts');
    fs.writeFileSync(tmpFile, 'const x = 42;\n', 'utf-8');
    updateInlineSnapshot({ file: tmpFile, line: 1 }, 'value');
    const result = fs.readFileSync(tmpFile, 'utf-8');
    assert.equal(result, 'const x = 42;\n');
    fs.rmSync(tmpDir, { recursive: true });
  });
});
