import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  decodeVLQ,
  SourceMapConsumer,
  loadSourceMap,
} from '../../src/coverage/source-map.js';

describe('decodeVLQ', () => {
  it('should decode a single zero value', () => {
    const result = decodeVLQ('A');
    assert.deepStrictEqual(result, [0]);
  });

  it('should decode a single positive value', () => {
    // 'C' = 1 (value 2, bit0=0 => positive, value >> 1 = 1)
    const result = decodeVLQ('C');
    assert.deepStrictEqual(result, [1]);
  });

  it('should decode a single negative value', () => {
    // 'D' = -1 (value 3, bit0=1 => negative, value >> 1 = 1)
    const result = decodeVLQ('D');
    assert.deepStrictEqual(result, [-1]);
  });

  it('should decode multiple values in a single VLQ group', () => {
    // 'AACA' => [0, 0, 1, 0]
    const result = decodeVLQ('AACA');
    assert.deepStrictEqual(result, [0, 0, 1, 0]);
  });

  it('should decode continuation bits for larger values', () => {
    // 'gB' encodes 16: char 'g'=32 (continuation set, value bits=0b00000),
    // then 'B'=1 => combined = (1 << 5) | 0 = 32, sign bit 0 => 16
    const result = decodeVLQ('gB');
    assert.deepStrictEqual(result, [16]);
  });
});

describe('SourceMapConsumer', () => {
  it('should map generated position to original position for simple mapping', () => {
    // A simple source map: one source file, mapping gen line 1 col 0 to orig line 1 col 0
    // Mappings: 'AAAA' => source 0, orig line 0, orig col 0, (no name)
    // Then ';AACA' => gen line 2 col 0 maps to source 0, orig line 1, orig col 0
    const sourceMap = {
      version: 3,
      sources: ['original.ts'],
      mappings: 'AAAA;AACA',
      names: [],
    };

    const consumer = new SourceMapConsumer(sourceMap);
    const pos = consumer.originalPositionFor({ line: 2, column: 0 });
    assert.strictEqual(pos.source, 'original.ts');
    assert.strictEqual(pos.line, 2);
    assert.strictEqual(pos.column, 0);
  });

  it('should return null fields when no mapping found', () => {
    const sourceMap = {
      version: 3,
      sources: ['original.ts'],
      mappings: 'AAAA',
      names: [],
    };

    const consumer = new SourceMapConsumer(sourceMap);
    // Line 100 has no mapping
    const pos = consumer.originalPositionFor({ line: 100, column: 0 });
    assert.strictEqual(pos.source, null);
    assert.strictEqual(pos.line, null);
    assert.strictEqual(pos.column, null);
    assert.strictEqual(pos.name, null);
  });

  it('should handle multiple segments on the same line', () => {
    // 'AAAA,GACC' => two segments on line 1
    // Segment 1: gen col 0, source 0, orig line 0, orig col 0
    // Segment 2: gen col 3, source 0, orig line 1, orig col 1
    const sourceMap = {
      version: 3,
      sources: ['original.ts'],
      mappings: 'AAAA,GACC',
      names: [],
    };

    const consumer = new SourceMapConsumer(sourceMap);

    const pos1 = consumer.originalPositionFor({ line: 1, column: 0 });
    assert.strictEqual(pos1.source, 'original.ts');
    assert.strictEqual(pos1.line, 1);
    assert.strictEqual(pos1.column, 0);

    const pos2 = consumer.originalPositionFor({ line: 1, column: 3 });
    assert.strictEqual(pos2.source, 'original.ts');
    assert.strictEqual(pos2.line, 2);
    assert.strictEqual(pos2.column, 1);
  });

  it('should handle name mappings', () => {
    // 'AAAA' has 4 fields, 'AAAAA' has 5 fields (with name index)
    const sourceMap = {
      version: 3,
      sources: ['original.ts'],
      mappings: 'AAAAA',
      names: ['myFunction'],
    };

    const consumer = new SourceMapConsumer(sourceMap);
    const pos = consumer.originalPositionFor({ line: 1, column: 0 });
    assert.strictEqual(pos.name, 'myFunction');
  });

  it('should find closest column when exact column not mapped', () => {
    // Map gen col 0 to something. Query col 2 on same line should find col 0 mapping.
    const sourceMap = {
      version: 3,
      sources: ['original.ts'],
      mappings: 'AAAA',
      names: [],
    };

    const consumer = new SourceMapConsumer(sourceMap);
    const pos = consumer.originalPositionFor({ line: 1, column: 2 });
    assert.strictEqual(pos.source, 'original.ts');
    assert.strictEqual(pos.line, 1);
    assert.strictEqual(pos.column, 0);
  });
});

describe('loadSourceMap', () => {
  let tmpDir: string;

  function setup(): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'sourcemap-test-'));
  }

  function cleanup(dir: string): void {
    fs.rmSync(dir, { recursive: true, force: true });
  }

  it('should return null when no source map comment present', () => {
    tmpDir = setup();
    const filePath = path.join(tmpDir, 'no-sourcemap.js');
    fs.writeFileSync(filePath, 'console.log("hello");\n');

    const result = loadSourceMap(filePath);
    assert.strictEqual(result, null);
    cleanup(tmpDir);
  });

  it('should load inline base64 source map', () => {
    tmpDir = setup();
    const sourceMapObj = {
      version: 3,
      sources: ['original.ts'],
      mappings: 'AAAA',
      names: [],
    };
    const b64 = Buffer.from(JSON.stringify(sourceMapObj)).toString('base64');
    const code = `console.log("hello");\n//# sourceMappingURL=data:application/json;base64,${b64}\n`;

    const filePath = path.join(tmpDir, 'inline.js');
    fs.writeFileSync(filePath, code);

    const result = loadSourceMap(filePath);
    assert.notStrictEqual(result, null);
    assert.ok(result instanceof SourceMapConsumer);
    cleanup(tmpDir);
  });

  it('should load file-based source map', () => {
    tmpDir = setup();
    const sourceMapObj = {
      version: 3,
      sources: ['original.ts'],
      mappings: 'AAAA',
      names: [],
    };

    const mapPath = path.join(tmpDir, 'output.js.map');
    fs.writeFileSync(mapPath, JSON.stringify(sourceMapObj));

    const code = `console.log("hello");\n//# sourceMappingURL=output.js.map\n`;
    const filePath = path.join(tmpDir, 'output.js');
    fs.writeFileSync(filePath, code);

    const result = loadSourceMap(filePath);
    assert.notStrictEqual(result, null);
    assert.ok(result instanceof SourceMapConsumer);
    cleanup(tmpDir);
  });

  it('should return null when referenced map file does not exist', () => {
    tmpDir = setup();
    const code = `console.log("hello");\n//# sourceMappingURL=nonexistent.js.map\n`;
    const filePath = path.join(tmpDir, 'missing-map.js');
    fs.writeFileSync(filePath, code);

    const result = loadSourceMap(filePath);
    assert.strictEqual(result, null);
    cleanup(tmpDir);
  });

  it('should handle source map comment with surrounding whitespace', () => {
    tmpDir = setup();
    const sourceMapObj = {
      version: 3,
      sources: ['original.ts'],
      mappings: 'AAAA',
      names: [],
    };

    const mapPath = path.join(tmpDir, 'spaced.js.map');
    fs.writeFileSync(mapPath, JSON.stringify(sourceMapObj));

    const code = `console.log("hello");\n  //# sourceMappingURL=spaced.js.map  \n`;
    const filePath = path.join(tmpDir, 'spaced.js');
    fs.writeFileSync(filePath, code);

    const result = loadSourceMap(filePath);
    assert.notStrictEqual(result, null);
    assert.ok(result instanceof SourceMapConsumer);
    cleanup(tmpDir);
  });
});
