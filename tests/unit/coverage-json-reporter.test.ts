import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  JsonReporter,
  JsonSummaryReporter,
} from '../../src/coverage/reporters/json.js';
import type {
  CoverageMap,
  CoverageSummary,
  FileCoverage,
} from '../../src/coverage/reporters/types.js';

function makeMetric(
  total: number,
  covered: number,
): { total: number; covered: number; skipped: number; pct: number } {
  return {
    total,
    covered,
    skipped: 0,
    pct: total === 0 ? 100 : (covered / total) * 100,
  };
}

function makeSummary(pct: number): CoverageSummary {
  return {
    lines: makeMetric(10, Math.round(pct / 10)),
    statements: makeMetric(10, Math.round(pct / 10)),
    functions: makeMetric(10, Math.round(pct / 10)),
    branches: makeMetric(10, Math.round(pct / 10)),
  };
}

function makeFileCoverage(path: string): FileCoverage {
  return {
    path,
    statementMap: {
      '0': { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
      '1': { start: { line: 2, column: 0 }, end: { line: 2, column: 15 } },
      '2': { start: { line: 3, column: 0 }, end: { line: 3, column: 12 } },
    },
    fnMap: {
      '0': {
        name: 'foo',
        decl: { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
        loc: { start: { line: 1, column: 0 }, end: { line: 3, column: 1 } },
        line: 1,
      },
    },
    branchMap: {
      '0': {
        type: 'if',
        locations: [
          { start: { line: 2, column: 0 }, end: { line: 2, column: 15 } },
          { start: { line: 2, column: 0 }, end: { line: 2, column: 15 } },
        ],
        line: 2,
      },
    },
    s: { '0': 5, '1': 3, '2': 0 },
    f: { '0': 5 },
    b: { '0': [3, 0] },
  };
}

function makeMockCoverageMap(
  files: Record<string, { coverage: FileCoverage; summary: CoverageSummary }>,
  globalSummary: CoverageSummary,
): CoverageMap {
  const filePaths = Object.keys(files);
  return {
    files: () => filePaths,
    fileCoverageFor: (path: string) => files[path]!.coverage,
    toSummary: () => globalSummary,
    fileSummaryFor: (path: string) => files[path]!.summary,
  };
}

describe('coverage-json-reporter: JSON output', () => {
  it('formatJson returns valid JSON with file coverage keyed by path', () => {
    const fileCov = makeFileCoverage('/test/file.ts');
    const globalSummary = makeSummary(85);
    const map = makeMockCoverageMap(
      {
        '/test/file.ts': { coverage: fileCov, summary: makeSummary(85) },
      },
      globalSummary,
    );

    const reporter = new JsonReporter({ reportsDirectory: '/tmp' });
    const output = reporter.formatJson(map);
    const parsed = JSON.parse(output) as Record<string, FileCoverage>;

    assert.ok(parsed['/test/file.ts']);
    assert.strictEqual(parsed['/test/file.ts']!.path, '/test/file.ts');
    assert.ok(parsed['/test/file.ts']!.statementMap);
    assert.ok(parsed['/test/file.ts']!.fnMap);
    assert.ok(parsed['/test/file.ts']!.branchMap);
    assert.ok(parsed['/test/file.ts']!.s);
    assert.ok(parsed['/test/file.ts']!.f);
    assert.ok(parsed['/test/file.ts']!.b);
  });

  it('formatJson includes multiple files', () => {
    const file1 = makeFileCoverage('/test/a.ts');
    const file2 = makeFileCoverage('/test/b.ts');
    const globalSummary = makeSummary(80);
    const map = makeMockCoverageMap(
      {
        '/test/a.ts': { coverage: file1, summary: makeSummary(90) },
        '/test/b.ts': { coverage: file2, summary: makeSummary(70) },
      },
      globalSummary,
    );

    const reporter = new JsonReporter({ reportsDirectory: '/tmp' });
    const output = reporter.formatJson(map);
    const parsed = JSON.parse(output) as Record<string, FileCoverage>;

    assert.ok(parsed['/test/a.ts']);
    assert.ok(parsed['/test/b.ts']);
    assert.strictEqual(Object.keys(parsed).length, 2);
  });

  it('preserves statement map data', () => {
    const fileCov = makeFileCoverage('/test/file.ts');
    const globalSummary = makeSummary(85);
    const map = makeMockCoverageMap(
      {
        '/test/file.ts': { coverage: fileCov, summary: makeSummary(85) },
      },
      globalSummary,
    );

    const reporter = new JsonReporter({ reportsDirectory: '/tmp' });
    const output = reporter.formatJson(map);
    const parsed = JSON.parse(output) as Record<string, FileCoverage>;

    const stmtMap = parsed['/test/file.ts']!.statementMap;
    assert.deepStrictEqual(stmtMap['0'], {
      start: { line: 1, column: 0 },
      end: { line: 1, column: 10 },
    });
  });

  it('preserves hit counts', () => {
    const fileCov = makeFileCoverage('/test/file.ts');
    const globalSummary = makeSummary(85);
    const map = makeMockCoverageMap(
      {
        '/test/file.ts': { coverage: fileCov, summary: makeSummary(85) },
      },
      globalSummary,
    );

    const reporter = new JsonReporter({ reportsDirectory: '/tmp' });
    const output = reporter.formatJson(map);
    const parsed = JSON.parse(output) as Record<string, FileCoverage>;

    assert.strictEqual(parsed['/test/file.ts']!.s['0'], 5);
    assert.strictEqual(parsed['/test/file.ts']!.s['1'], 3);
    assert.strictEqual(parsed['/test/file.ts']!.s['2'], 0);
    assert.strictEqual(parsed['/test/file.ts']!.f['0'], 5);
    assert.deepStrictEqual(parsed['/test/file.ts']!.b['0'], [3, 0]);
  });
});

describe('coverage-json-reporter: JSON summary output', () => {
  it('formatSummary returns valid JSON with total and per-file summaries', () => {
    const fileCov = makeFileCoverage('/test/file.ts');
    const fileSummary = makeSummary(85);
    const globalSummary = makeSummary(85);
    const map = makeMockCoverageMap(
      {
        '/test/file.ts': { coverage: fileCov, summary: fileSummary },
      },
      globalSummary,
    );

    const reporter = new JsonSummaryReporter({ reportsDirectory: '/tmp' });
    const output = reporter.formatSummary(map, globalSummary);
    const parsed = JSON.parse(output) as Record<string, CoverageSummary>;

    assert.ok(parsed['total']);
    assert.ok(parsed['/test/file.ts']);
  });

  it('total in summary matches global summary', () => {
    const fileCov = makeFileCoverage('/test/file.ts');
    const fileSummary = makeSummary(85);
    const globalSummary = makeSummary(85);
    const map = makeMockCoverageMap(
      {
        '/test/file.ts': { coverage: fileCov, summary: fileSummary },
      },
      globalSummary,
    );

    const reporter = new JsonSummaryReporter({ reportsDirectory: '/tmp' });
    const output = reporter.formatSummary(map, globalSummary);
    const parsed = JSON.parse(output) as Record<string, CoverageSummary>;

    assert.deepStrictEqual(parsed['total'], globalSummary);
  });

  it('per-file summary matches file summary', () => {
    const fileCov = makeFileCoverage('/test/file.ts');
    const fileSummary = makeSummary(75);
    const globalSummary = makeSummary(75);
    const map = makeMockCoverageMap(
      {
        '/test/file.ts': { coverage: fileCov, summary: fileSummary },
      },
      globalSummary,
    );

    const reporter = new JsonSummaryReporter({ reportsDirectory: '/tmp' });
    const output = reporter.formatSummary(map, globalSummary);
    const parsed = JSON.parse(output) as Record<string, CoverageSummary>;

    assert.deepStrictEqual(parsed['/test/file.ts'], fileSummary);
  });

  it('includes multiple files in summary', () => {
    const file1 = makeFileCoverage('/test/a.ts');
    const file2 = makeFileCoverage('/test/b.ts');
    const summary1 = makeSummary(90);
    const summary2 = makeSummary(70);
    const globalSummary = makeSummary(80);
    const map = makeMockCoverageMap(
      {
        '/test/a.ts': { coverage: file1, summary: summary1 },
        '/test/b.ts': { coverage: file2, summary: summary2 },
      },
      globalSummary,
    );

    const reporter = new JsonSummaryReporter({ reportsDirectory: '/tmp' });
    const output = reporter.formatSummary(map, globalSummary);
    const parsed = JSON.parse(output) as Record<string, CoverageSummary>;

    assert.ok(parsed['total']);
    assert.ok(parsed['/test/a.ts']);
    assert.ok(parsed['/test/b.ts']);
    assert.strictEqual(Object.keys(parsed).length, 3);
  });
});
