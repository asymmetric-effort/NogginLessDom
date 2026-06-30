/**
 * Additional tests for src/coverage/v8-to-istanbul.ts to increase coverage.
 * Covers: v8ToIstanbul with filterOptions, detectBranchType edge cases,
 * remapCoverage/remapLocation/remapRange paths, ExcludeAfterRemapOptions.
 */
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  offsetToLocation,
  v8ToIstanbul,
} from '../../src/coverage/v8-to-istanbul.js';
import type { ExcludeAfterRemapOptions } from '../../src/coverage/v8-to-istanbul.js';
import type { V8FunctionCoverage } from '../../src/coverage/v8-provider.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

describe('v8ToIstanbul with filterOptions', () => {
  it('should return null when filePath is excluded by filterOptions', () => {
    const source = 'const x = 1;\n';
    const v8Coverage: V8FunctionCoverage[] = [
      {
        functionName: 'x',
        ranges: [{ startOffset: 0, endOffset: 13, count: 1 }],
        isBlockCoverage: false,
      },
    ];
    const filterOptions: ExcludeAfterRemapOptions = {
      exclude: ['**/test-excluded.ts'],
      include: ['**/*.ts'],
    };
    const result = v8ToIstanbul(
      'test-excluded.ts',
      source,
      v8Coverage,
      filterOptions,
    );
    assert.equal(result, null);
  });

  it('should return coverage when filePath passes filterOptions', () => {
    const source = 'const x = 1;\n';
    const v8Coverage: V8FunctionCoverage[] = [
      {
        functionName: 'x',
        ranges: [{ startOffset: 0, endOffset: 13, count: 1 }],
        isBlockCoverage: false,
      },
    ];
    const filterOptions: ExcludeAfterRemapOptions = {
      include: ['**/*.ts'],
      exclude: [],
    };
    const result = v8ToIstanbul(
      '/src/included.ts',
      source,
      v8Coverage,
      filterOptions,
    );
    assert.ok(result !== null);
    assert.equal(result!.path, '/src/included.ts');
  });

  it('should work with empty filterOptions on non-excluded path', () => {
    const source = 'const x = 1;\n';
    const v8Coverage: V8FunctionCoverage[] = [
      {
        functionName: '',
        ranges: [{ startOffset: 0, endOffset: 13, count: 1 }],
        isBlockCoverage: false,
      },
    ];
    const result = v8ToIstanbul('/src/file.ts', source, v8Coverage, {});
    assert.ok(result !== null);
  });
});

describe('detectBranchType via v8ToIstanbul', () => {
  it('should detect binary-expr for single inner range with different count', () => {
    const source = 'const x = a || b;\n';
    const v8Coverage: V8FunctionCoverage[] = [
      {
        functionName: '',
        ranges: [
          { startOffset: 0, endOffset: 18, count: 10 },
          { startOffset: 15, endOffset: 16, count: 3 }, // single inner range, different count
        ],
        isBlockCoverage: true,
      },
    ];
    const result = v8ToIstanbul('/binary.ts', source, v8Coverage);
    assert.ok(result !== null);
    const bKey = Object.keys(result!.branchMap)[0]!;
    assert.equal(result!.branchMap[bKey]!.type, 'binary-expr');
  });

  it('should detect cond-expr for two inner ranges on same line', () => {
    const source = 'const r = cond ? valueA : valueB;\n';
    const v8Coverage: V8FunctionCoverage[] = [
      {
        functionName: '',
        ranges: [
          { startOffset: 0, endOffset: 33, count: 10 },
          { startOffset: 17, endOffset: 23, count: 7 }, // valueA, same line
          { startOffset: 26, endOffset: 32, count: 3 }, // valueB, same line
        ],
        isBlockCoverage: true,
      },
    ];
    const result = v8ToIstanbul('/ternary.ts', source, v8Coverage);
    assert.ok(result !== null);
    const bKey = Object.keys(result!.branchMap)[0]!;
    assert.equal(result!.branchMap[bKey]!.type, 'cond-expr');
  });

  it('should detect if for two inner ranges spanning multiple lines', () => {
    const source = 'if (cond) {\n  doA();\n} else {\n  doB();\n}\n';
    const v8Coverage: V8FunctionCoverage[] = [
      {
        functionName: '',
        ranges: [
          { startOffset: 0, endOffset: 41, count: 10 },
          { startOffset: 0, endOffset: 21, count: 7 }, // if branch (multi-line)
          { startOffset: 22, endOffset: 40, count: 3 }, // else branch (multi-line)
        ],
        isBlockCoverage: true,
      },
    ];
    const result = v8ToIstanbul('/if-else.ts', source, v8Coverage);
    assert.ok(result !== null);
    const bKey = Object.keys(result!.branchMap)[0]!;
    assert.equal(result!.branchMap[bKey]!.type, 'if');
  });

  it('should return if for single inner range with same count as outer', () => {
    const source = 'function f() {\n  return 1;\n}\n';
    const v8Coverage: V8FunctionCoverage[] = [
      {
        functionName: 'f',
        ranges: [
          { startOffset: 0, endOffset: 28, count: 5 },
          { startOffset: 15, endOffset: 27, count: 5 }, // same count as outer
        ],
        isBlockCoverage: true,
      },
    ];
    const result = v8ToIstanbul('/same-count.ts', source, v8Coverage);
    assert.ok(result !== null);
    // Single inner range with same count => falls through to 'if' (default)
    const bKey = Object.keys(result!.branchMap)[0]!;
    assert.equal(result!.branchMap[bKey]!.type, 'if');
  });

  it('should detect if for 3+ inner ranges', () => {
    const source =
      'if (a) {\n  x();\n} else if (b) {\n  y();\n} else {\n  z();\n}\n';
    const v8Coverage: V8FunctionCoverage[] = [
      {
        functionName: '',
        ranges: [
          { startOffset: 0, endOffset: 57, count: 10 },
          { startOffset: 0, endOffset: 16, count: 5 },
          { startOffset: 17, endOffset: 39, count: 3 },
          { startOffset: 40, endOffset: 56, count: 2 },
        ],
        isBlockCoverage: true,
      },
    ];
    const result = v8ToIstanbul('/multi-branch.ts', source, v8Coverage);
    assert.ok(result !== null);
    const bKey = Object.keys(result!.branchMap)[0]!;
    assert.equal(result!.branchMap[bKey]!.type, 'if');
    assert.equal(result!.branchMap[bKey]!.locations.length, 3);
  });
});

describe('v8ToIstanbul additional edge cases', () => {
  it('should handle multiple functions in a single script', () => {
    const source = 'function a() { return 1; }\nfunction b() { return 2; }\n';
    const v8Coverage: V8FunctionCoverage[] = [
      {
        functionName: 'a',
        ranges: [{ startOffset: 0, endOffset: 26, count: 3 }],
        isBlockCoverage: false,
      },
      {
        functionName: 'b',
        ranges: [{ startOffset: 27, endOffset: 53, count: 5 }],
        isBlockCoverage: false,
      },
    ];
    const result = v8ToIstanbul('/multi-fn.ts', source, v8Coverage);
    assert.ok(result !== null);
    assert.equal(Object.keys(result!.fnMap).length, 2);
    assert.equal(result!.fnMap['0']!.name, 'a');
    assert.equal(result!.fnMap['1']!.name, 'b');
    assert.equal(result!.f['0'], 3);
    assert.equal(result!.f['1'], 5);
  });

  it('should handle block coverage with branch locations producing statement entries', () => {
    const source =
      'function f() {\n  if (x) {\n    a();\n  } else {\n    b();\n  }\n}\n';
    const v8Coverage: V8FunctionCoverage[] = [
      {
        functionName: 'f',
        ranges: [
          { startOffset: 0, endOffset: 58, count: 10 },
          { startOffset: 15, endOffset: 34, count: 7 },
          { startOffset: 35, endOffset: 56, count: 3 },
        ],
        isBlockCoverage: true,
      },
    ];
    const result = v8ToIstanbul('/block.ts', source, v8Coverage);
    assert.ok(result !== null);
    // Should have statements for function + each block range
    assert.ok(Object.keys(result!.statementMap).length >= 3);
  });
});

// ---------------------------------------------------------------------------
// Source map remapping tests
// ---------------------------------------------------------------------------

describe('v8ToIstanbul with source map remapping', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'v8-remap-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should remap coverage positions using inline source map', () => {
    // Create a simple source map: maps line 1 col 0 of generated -> line 1 col 0 of original
    const rawSourceMap = {
      version: 3,
      sources: ['original.ts'],
      mappings: 'AAAA;AACA', // Two lines, mapping generated -> original 1:1
      names: [],
    };
    const base64Map = Buffer.from(JSON.stringify(rawSourceMap)).toString(
      'base64',
    );
    const sourceContent =
      'const x = 1;\nconst y = 2;\n//# sourceMappingURL=data:application/json;base64,' +
      base64Map;

    const filePath = path.join(tmpDir, 'generated.js');
    fs.writeFileSync(filePath, sourceContent, 'utf-8');

    const v8Coverage: V8FunctionCoverage[] = [
      {
        functionName: 'topLevel',
        ranges: [{ startOffset: 0, endOffset: 26, count: 1 }],
        isBlockCoverage: false,
      },
    ];

    const result = v8ToIstanbul(filePath, sourceContent, v8Coverage);
    assert.ok(result !== null);
    // Path should be remapped to the original source
    assert.equal(result!.path, 'original.ts');
  });

  it('should remap function, statement, and branch maps', () => {
    const rawSourceMap = {
      version: 3,
      sources: ['src/original.ts'],
      mappings: 'AAAA;AACA;AACA', // 3 lines 1:1 mapping
      names: [],
    };
    const base64Map = Buffer.from(JSON.stringify(rawSourceMap)).toString(
      'base64',
    );
    const sourceContent = [
      'function foo() {',
      '  if (true) { return 1; }',
      '}',
      '//# sourceMappingURL=data:application/json;base64,' + base64Map,
    ].join('\n');

    const filePath = path.join(tmpDir, 'compiled.js');
    fs.writeFileSync(filePath, sourceContent, 'utf-8');

    const v8Coverage: V8FunctionCoverage[] = [
      {
        functionName: 'foo',
        ranges: [
          { startOffset: 0, endOffset: 46, count: 5 },
          { startOffset: 17, endOffset: 42, count: 3 },
        ],
        isBlockCoverage: true,
      },
    ];

    const result = v8ToIstanbul(filePath, sourceContent, v8Coverage);
    assert.ok(result !== null);
    assert.equal(result!.path, 'src/original.ts');
    // Should have remapped fnMap
    assert.ok(Object.keys(result!.fnMap).length > 0);
    // Should have remapped statementMap
    assert.ok(Object.keys(result!.statementMap).length > 0);
    // Should have remapped branchMap
    assert.ok(Object.keys(result!.branchMap).length > 0);
  });

  it('should remap with filterOptions and accept remapped path', () => {
    const rawSourceMap = {
      version: 3,
      sources: ['src/accepted.ts'],
      mappings: 'AAAA',
      names: [],
    };
    const base64Map = Buffer.from(JSON.stringify(rawSourceMap)).toString(
      'base64',
    );
    const sourceContent =
      'const x = 1;\n//# sourceMappingURL=data:application/json;base64,' +
      base64Map;

    const filePath = path.join(tmpDir, 'compiled.js');
    fs.writeFileSync(filePath, sourceContent, 'utf-8');

    const v8Coverage: V8FunctionCoverage[] = [
      {
        functionName: '',
        ranges: [{ startOffset: 0, endOffset: 13, count: 1 }],
        isBlockCoverage: false,
      },
    ];

    const filterOptions: ExcludeAfterRemapOptions = {
      include: ['**/*.ts', '**/*.js'],
      exclude: [],
    };

    const result = v8ToIstanbul(
      filePath,
      sourceContent,
      v8Coverage,
      filterOptions,
    );
    assert.ok(result !== null);
    assert.equal(result!.path, 'src/accepted.ts');
  });

  it('should return null when remapped path is excluded by filterOptions', () => {
    const rawSourceMap = {
      version: 3,
      sources: ['node_modules/excluded.ts'],
      mappings: 'AAAA',
      names: [],
    };
    const base64Map = Buffer.from(JSON.stringify(rawSourceMap)).toString(
      'base64',
    );
    const sourceContent =
      'const x = 1;\n//# sourceMappingURL=data:application/json;base64,' +
      base64Map;

    const filePath = path.join(tmpDir, 'compiled.js');
    fs.writeFileSync(filePath, sourceContent, 'utf-8');

    const v8Coverage: V8FunctionCoverage[] = [
      {
        functionName: '',
        ranges: [{ startOffset: 0, endOffset: 13, count: 1 }],
        isBlockCoverage: false,
      },
    ];

    const filterOptions: ExcludeAfterRemapOptions = {
      include: ['src/**/*.ts', '**/*.js'],
      exclude: ['**/node_modules/**'],
    };

    const result = v8ToIstanbul(
      filePath,
      sourceContent,
      v8Coverage,
      filterOptions,
    );
    assert.equal(result, null);
  });

  it('should handle source map with empty branch locations', () => {
    const rawSourceMap = {
      version: 3,
      sources: ['original.ts'],
      mappings: 'AAAA',
      names: [],
    };
    const base64Map = Buffer.from(JSON.stringify(rawSourceMap)).toString(
      'base64',
    );
    const sourceContent =
      'const x = 1;\n//# sourceMappingURL=data:application/json;base64,' +
      base64Map;

    const filePath = path.join(tmpDir, 'generated.js');
    fs.writeFileSync(filePath, sourceContent, 'utf-8');

    const v8Coverage: V8FunctionCoverage[] = [
      {
        functionName: '',
        ranges: [{ startOffset: 0, endOffset: 13, count: 1 }],
        isBlockCoverage: false,
      },
    ];

    const result = v8ToIstanbul(filePath, sourceContent, v8Coverage);
    assert.ok(result !== null);
    // No branch entries should be fine
    assert.equal(Object.keys(result!.branchMap).length, 0);
  });
});

describe('offsetToLocation edge cases', () => {
  it('should handle empty string', () => {
    const loc = offsetToLocation('', 0);
    assert.deepStrictEqual(loc, { line: 1, column: 0 });
  });

  it('should handle offset 0 with multi-line source', () => {
    const loc = offsetToLocation('abc\ndef\nghi', 0);
    assert.deepStrictEqual(loc, { line: 1, column: 0 });
  });

  it('should handle single character source', () => {
    const loc = offsetToLocation('x', 0);
    assert.deepStrictEqual(loc, { line: 1, column: 0 });
  });

  it('should handle offset at very end of source', () => {
    const source = 'abc\ndef';
    const loc = offsetToLocation(source, source.length);
    assert.equal(loc.line, 2);
    assert.equal(loc.column, 3);
  });

  it('should handle source with only newlines', () => {
    const loc = offsetToLocation('\n\n\n', 2);
    assert.equal(loc.line, 3);
    assert.equal(loc.column, 0);
  });
});
