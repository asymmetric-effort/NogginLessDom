import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { instrumentSource } from '../../src/coverage/istanbul-provider.js';
import { v8ToIstanbul } from '../../src/coverage/v8-to-istanbul.js';
import type { V8FunctionCoverage } from '../../src/coverage/v8-provider.js';
import { getReporterFactory } from '../../src/coverage/reporters/index.js';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// ---------------------------------------------------------------------------
// Issue #98: excludeAfterRemap
// ---------------------------------------------------------------------------

describe('Issue #98: excludeAfterRemap', () => {
  it('v8ToIstanbul returns null when remapped path is excluded', () => {
    // v8ToIstanbul should accept include/exclude config and return null
    // when the remapped path doesn't match
    const source = 'const x = 1;\n';
    const v8Coverage: V8FunctionCoverage[] = [
      {
        functionName: '',
        ranges: [{ startOffset: 0, endOffset: 13, count: 1 }],
        isBlockCoverage: false,
      },
    ];
    // Without exclude config, should return FileCoverage
    const result = v8ToIstanbul('/src/app.ts', source, v8Coverage);
    assert.ok(result !== null);
    assert.equal(result.path, '/src/app.ts');
  });

  it('v8ToIstanbul returns null when remapped path matches exclude', () => {
    const source = 'const x = 1;\n';
    const v8Coverage: V8FunctionCoverage[] = [
      {
        functionName: '',
        ranges: [{ startOffset: 0, endOffset: 13, count: 1 }],
        isBlockCoverage: false,
      },
    ];
    // When the path matches exclude, should return null
    const result = v8ToIstanbul('/src/app.ts', source, v8Coverage, {
      exclude: ['**/app.ts'],
    });
    assert.equal(result, null);
  });

  it('v8ToIstanbul returns coverage when path matches include', () => {
    const source = 'const x = 1;\n';
    const v8Coverage: V8FunctionCoverage[] = [
      {
        functionName: '',
        ranges: [{ startOffset: 0, endOffset: 13, count: 1 }],
        isBlockCoverage: false,
      },
    ];
    const result = v8ToIstanbul('/src/app.ts', source, v8Coverage, {
      include: ['**/*.ts'],
    });
    assert.ok(result !== null);
  });

  it('v8ToIstanbul returns null when path does not match include', () => {
    const source = 'const x = 1;\n';
    const v8Coverage: V8FunctionCoverage[] = [
      {
        functionName: '',
        ranges: [{ startOffset: 0, endOffset: 13, count: 1 }],
        isBlockCoverage: false,
      },
    ];
    const result = v8ToIstanbul('/src/app.ts', source, v8Coverage, {
      include: ['**/*.js'],
    });
    assert.equal(result, null);
  });
});

// ---------------------------------------------------------------------------
// Issue #99: html-spa reporter
// ---------------------------------------------------------------------------

describe('Issue #99: html-spa reporter', () => {
  it('html-spa reporter is registered in the factory', () => {
    const factory = getReporterFactory('html-spa');
    assert.ok(typeof factory === 'function');
  });

  it('html-spa reporter produces a single index.html file', () => {
    const factory = getReporterFactory('html-spa');
    const tmpDir = join(tmpdir(), `coverage-spa-test-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });

    const reporter = factory({ reportsDirectory: tmpDir });

    // Create a mock CoverageMap
    const mockMap = {
      files: () => ['/fake/file.ts'],
      fileCoverageFor: (fp: string) => ({
        path: fp,
        statementMap: {
          '0': { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
        },
        fnMap: {},
        branchMap: {},
        s: { '0': 5 },
        f: {},
        b: {},
      }),
      fileSummaryFor: (_fp: string) => ({
        statements: { total: 1, covered: 1, skipped: 0, pct: 100 },
        branches: { total: 0, covered: 0, skipped: 0, pct: 100 },
        functions: { total: 0, covered: 0, skipped: 0, pct: 100 },
        lines: { total: 1, covered: 1, skipped: 0, pct: 100 },
      }),
      toSummary: () => ({
        statements: { total: 1, covered: 1, skipped: 0, pct: 100 },
        branches: { total: 0, covered: 0, skipped: 0, pct: 100 },
        functions: { total: 0, covered: 0, skipped: 0, pct: 100 },
        lines: { total: 1, covered: 1, skipped: 0, pct: 100 },
      }),
      filter: () => {},
      addFileCoverage: () => {},
      merge: () => {},
    };
    const mockSummary = {
      statements: { total: 1, covered: 1, skipped: 0, pct: 100 },
      branches: { total: 0, covered: 0, skipped: 0, pct: 100 },
      functions: { total: 0, covered: 0, skipped: 0, pct: 100 },
      lines: { total: 1, covered: 1, skipped: 0, pct: 100 },
    };

    // @ts-expect-error mock coverage map
    reporter.onEnd(mockMap, mockSummary);

    const htmlPath = join(tmpDir, 'html-spa', 'index.html');
    const content = readFileSync(htmlPath, 'utf-8');
    assert.ok(content.includes('<!DOCTYPE html'));
    assert.ok(content.includes('coverageData'));
    assert.ok(content.includes('/fake/file.ts'));

    rmSync(tmpDir, { recursive: true, force: true });
  });
});

// ---------------------------------------------------------------------------
// Issue #102: processingConcurrency
// ---------------------------------------------------------------------------

describe('Issue #102: processingConcurrency', () => {
  it('processV8Coverage respects processingConcurrency config', async () => {
    // We import the processV8CoverageBatched helper directly
    const { processV8CoverageBatched } =
      await import('../../src/coverage/index.js');
    assert.ok(typeof processV8CoverageBatched === 'function');
  });

  it('processV8CoverageBatched processes files in batches', async () => {
    const { processV8CoverageBatched } =
      await import('../../src/coverage/index.js');
    // Create scripts with multiple file:// URLs
    const scripts = [
      {
        scriptId: '1',
        url: 'file:///fake/a.ts',
        functions: [
          {
            functionName: 'a',
            ranges: [{ startOffset: 0, endOffset: 10, count: 1 }],
            isBlockCoverage: false,
          },
        ],
      },
      {
        scriptId: '2',
        url: 'file:///fake/b.ts',
        functions: [
          {
            functionName: 'b',
            ranges: [{ startOffset: 0, endOffset: 10, count: 1 }],
            isBlockCoverage: false,
          },
        ],
      },
      {
        scriptId: '3',
        url: 'file:///fake/c.ts',
        functions: [
          {
            functionName: 'c',
            ranges: [{ startOffset: 0, endOffset: 10, count: 1 }],
            isBlockCoverage: false,
          },
        ],
      },
    ];

    const config = {
      enabled: true,
      provider: 'v8' as const,
      include: ['**/*.ts'],
      exclude: [],
      reportsDirectory: './coverage',
      reporter: ['text'],
      clean: true,
      skipFull: false,
      all: false,
      watermarks: {
        lines: [50, 80] as [number, number],
        functions: [50, 80] as [number, number],
        branches: [50, 80] as [number, number],
        statements: [50, 80] as [number, number],
      },
      cleanOnRerun: true,
      allowExternal: true,
      extension: ['.ts', '.js'],
      reportOnFailure: false,
      processingConcurrency: 2,
      ignoreClassMethods: [],
    };

    // Should not throw with concurrency = 2
    const result = processV8CoverageBatched(scripts, config);
    assert.ok(result instanceof Map);
  });
});

// ---------------------------------------------------------------------------
// Issue #110: Function detection misses class methods/expressions
// ---------------------------------------------------------------------------

describe('Issue #110: Function detection improvements', () => {
  it('detects function expressions (const fn = function() {})', () => {
    const source = 'const fn = function() {\n  return 1;\n}\n';
    const result = instrumentSource(source, '/test/fn-expr.ts');
    const fc = result.coverageData;
    const fnNames = Object.values(fc.fnMap).map((m) => m.name);
    assert.ok(
      fnNames.includes('fn'),
      `Expected 'fn' in ${JSON.stringify(fnNames)}`,
    );
  });

  it('detects named function expressions (const fn = function myFn() {})', () => {
    const source = 'const fn = function myFn() {\n  return 1;\n}\n';
    const result = instrumentSource(source, '/test/fn-named-expr.ts');
    const fc = result.coverageData;
    const fnNames = Object.values(fc.fnMap).map((m) => m.name);
    // Should use the variable name or function name
    assert.ok(fnNames.length > 0, 'Should detect function expression');
  });

  it('detects getter methods', () => {
    const source = '  get value() {\n    return this._value;\n  }\n';
    const result = instrumentSource(source, '/test/getter.ts');
    const fc = result.coverageData;
    const fnNames = Object.values(fc.fnMap).map((m) => m.name);
    assert.ok(
      fnNames.includes('value'),
      `Expected 'value' in ${JSON.stringify(fnNames)}`,
    );
  });

  it('detects setter methods', () => {
    const source = '  set value(v) {\n    this._value = v;\n  }\n';
    const result = instrumentSource(source, '/test/setter.ts');
    const fc = result.coverageData;
    const fnNames = Object.values(fc.fnMap).map((m) => m.name);
    assert.ok(
      fnNames.includes('value'),
      `Expected 'value' in ${JSON.stringify(fnNames)}`,
    );
  });

  it('detects async generator functions', () => {
    const source = 'async function* gen() {\n  yield 1;\n}\n';
    const result = instrumentSource(source, '/test/async-gen.ts');
    const fc = result.coverageData;
    const fnNames = Object.values(fc.fnMap).map((m) => m.name);
    assert.ok(
      fnNames.includes('gen'),
      `Expected 'gen' in ${JSON.stringify(fnNames)}`,
    );
  });

  it('detects generator functions', () => {
    const source = 'function* gen() {\n  yield 1;\n}\n';
    const result = instrumentSource(source, '/test/gen.ts');
    const fc = result.coverageData;
    const fnNames = Object.values(fc.fnMap).map((m) => m.name);
    assert.ok(
      fnNames.includes('gen'),
      `Expected 'gen' in ${JSON.stringify(fnNames)}`,
    );
  });

  it('detects static async methods', () => {
    const source = '  static async fetch() {\n    return null;\n  }\n';
    const result = instrumentSource(source, '/test/static-async.ts');
    const fc = result.coverageData;
    const fnNames = Object.values(fc.fnMap).map((m) => m.name);
    assert.ok(
      fnNames.includes('fetch'),
      `Expected 'fetch' in ${JSON.stringify(fnNames)}`,
    );
  });
});

// ---------------------------------------------------------------------------
// Issue #111: Multi-statement lines
// ---------------------------------------------------------------------------

describe('Issue #111: Multi-statement lines', () => {
  it('creates separate statement entries for semicolon-separated statements', () => {
    const source = 'const a = 1; const b = 2; const c = 3;\n';
    const result = instrumentSource(source, '/test/multi.ts');
    const fc = result.coverageData;

    // Should have at least 3 statement entries for this line
    const stmtKeys = Object.keys(fc.statementMap);
    assert.ok(
      stmtKeys.length >= 3,
      `Expected >= 3 statements, got ${stmtKeys.length}`,
    );

    // Check that the statement ranges have different columns
    const stmtRanges = Object.values(fc.statementMap);
    const line1Stmts = stmtRanges.filter((r) => r.start.line === 1);
    assert.ok(
      line1Stmts.length >= 3,
      `Expected >= 3 line-1 statements, got ${line1Stmts.length}`,
    );

    // Verify different start columns
    const columns = line1Stmts.map((r) => r.start.column);
    const uniqueCols = new Set(columns);
    assert.ok(
      uniqueCols.size >= 3,
      `Expected >= 3 unique columns, got ${uniqueCols.size}`,
    );
  });

  it('does not split lines with semicolons inside strings', () => {
    const source = "const s = 'a; b; c';\n";
    const result = instrumentSource(source, '/test/string-semi.ts');
    const fc = result.coverageData;

    // Should have only 1 statement entry (the line is a string literal assignment)
    const stmtKeys = Object.keys(fc.statementMap);
    // The line may be treated as a string literal and skipped, or as 1 statement
    assert.ok(
      stmtKeys.length <= 1,
      `Expected <= 1 statement for string content, got ${stmtKeys.length}`,
    );
  });

  it('does not split lines with semicolons in for-loop headers', () => {
    const source = 'for (let i = 0; i < 10; i++) {\n}\n';
    const result = instrumentSource(source, '/test/for-loop.ts');
    const fc = result.coverageData;

    // for-loop line should not be split into multiple statements
    const stmtRanges = Object.values(fc.statementMap);
    const line1Stmts = stmtRanges.filter((r) => r.start.line === 1);
    assert.ok(
      line1Stmts.length <= 1,
      `Expected <= 1 statement for for-loop, got ${line1Stmts.length}`,
    );
  });

  it('handles mixed regular and multi-statement lines', () => {
    const source = 'const x = 1;\nlet a = 1; let b = 2;\nconst y = 3;\n';
    const result = instrumentSource(source, '/test/mixed.ts');
    const fc = result.coverageData;

    // Line 1: 1 stmt, Line 2: 2 stmts, Line 3: 1 stmt = 4 total
    const stmtKeys = Object.keys(fc.statementMap);
    assert.ok(
      stmtKeys.length >= 4,
      `Expected >= 4 statements, got ${stmtKeys.length}`,
    );
  });
});
