import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { LcovReporter } from '../../src/coverage/reporters/lcov.js';
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
      '2': { start: { line: 5, column: 0 }, end: { line: 5, column: 12 } },
    },
    fnMap: {
      '0': {
        name: 'foo',
        decl: { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
        loc: { start: { line: 1, column: 0 }, end: { line: 3, column: 1 } },
        line: 1,
      },
      '1': {
        name: 'bar',
        decl: { start: { line: 5, column: 0 }, end: { line: 5, column: 10 } },
        loc: { start: { line: 5, column: 0 }, end: { line: 7, column: 1 } },
        line: 5,
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
    f: { '0': 5, '1': 0 },
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

describe('coverage-lcov-reporter: LCOV format', () => {
  it('produces valid LCOV output with all required fields', () => {
    const fileCov = makeFileCoverage('/test/file.ts');
    const globalSummary = makeSummary(85);
    const map = makeMockCoverageMap(
      {
        '/test/file.ts': { coverage: fileCov, summary: makeSummary(85) },
      },
      globalSummary,
    );

    const reporter = new LcovReporter({ reportsDirectory: '/tmp' });
    const output = reporter.formatLcov(map);

    assert.ok(output.includes('TN:'), 'Should contain test name field');
    assert.ok(
      output.includes('SF:/test/file.ts'),
      'Should contain source file path',
    );
    assert.ok(
      output.includes('end_of_record'),
      'Should end with end_of_record',
    );
  });

  it('includes function data (FN and FNDA)', () => {
    const fileCov = makeFileCoverage('/test/file.ts');
    const globalSummary = makeSummary(85);
    const map = makeMockCoverageMap(
      {
        '/test/file.ts': { coverage: fileCov, summary: makeSummary(85) },
      },
      globalSummary,
    );

    const reporter = new LcovReporter({ reportsDirectory: '/tmp' });
    const output = reporter.formatLcov(map);

    // FN: line,function_name
    assert.ok(output.includes('FN:1,foo'), 'Should have FN for foo');
    assert.ok(output.includes('FN:5,bar'), 'Should have FN for bar');
    // FNDA: execution_count,function_name
    assert.ok(output.includes('FNDA:5,foo'), 'Should have FNDA for foo');
    assert.ok(output.includes('FNDA:0,bar'), 'Should have FNDA for bar');
  });

  it('includes function summary (FNF and FNH)', () => {
    const fileCov = makeFileCoverage('/test/file.ts');
    const globalSummary = makeSummary(85);
    const map = makeMockCoverageMap(
      {
        '/test/file.ts': { coverage: fileCov, summary: makeSummary(85) },
      },
      globalSummary,
    );

    const reporter = new LcovReporter({ reportsDirectory: '/tmp' });
    const output = reporter.formatLcov(map);

    // FNF: functions found
    assert.ok(output.includes('FNF:2'), 'Should have 2 functions found');
    // FNH: functions hit
    assert.ok(output.includes('FNH:1'), 'Should have 1 function hit');
  });

  it('includes line data (DA)', () => {
    const fileCov = makeFileCoverage('/test/file.ts');
    const globalSummary = makeSummary(85);
    const map = makeMockCoverageMap(
      {
        '/test/file.ts': { coverage: fileCov, summary: makeSummary(85) },
      },
      globalSummary,
    );

    const reporter = new LcovReporter({ reportsDirectory: '/tmp' });
    const output = reporter.formatLcov(map);

    // DA: line_number,execution_count
    assert.ok(output.includes('DA:1,5'), 'Should have DA for line 1');
    assert.ok(output.includes('DA:2,3'), 'Should have DA for line 2');
    assert.ok(output.includes('DA:5,0'), 'Should have DA for line 5');
  });

  it('includes line summary (LF and LH)', () => {
    const fileCov = makeFileCoverage('/test/file.ts');
    const globalSummary = makeSummary(85);
    const map = makeMockCoverageMap(
      {
        '/test/file.ts': { coverage: fileCov, summary: makeSummary(85) },
      },
      globalSummary,
    );

    const reporter = new LcovReporter({ reportsDirectory: '/tmp' });
    const output = reporter.formatLcov(map);

    // LF: lines found
    assert.ok(output.includes('LF:3'), 'Should have 3 lines found');
    // LH: lines hit
    assert.ok(output.includes('LH:2'), 'Should have 2 lines hit');
  });

  it('includes branch data (BRDA)', () => {
    const fileCov = makeFileCoverage('/test/file.ts');
    const globalSummary = makeSummary(85);
    const map = makeMockCoverageMap(
      {
        '/test/file.ts': { coverage: fileCov, summary: makeSummary(85) },
      },
      globalSummary,
    );

    const reporter = new LcovReporter({ reportsDirectory: '/tmp' });
    const output = reporter.formatLcov(map);

    // BRDA: line,block,branch,count
    assert.ok(
      output.includes('BRDA:2,0,0,3'),
      'Should have BRDA for first branch',
    );
    assert.ok(
      output.includes('BRDA:2,0,1,0'),
      'Should have BRDA for second branch',
    );
  });

  it('includes branch summary (BRF and BRH)', () => {
    const fileCov = makeFileCoverage('/test/file.ts');
    const globalSummary = makeSummary(85);
    const map = makeMockCoverageMap(
      {
        '/test/file.ts': { coverage: fileCov, summary: makeSummary(85) },
      },
      globalSummary,
    );

    const reporter = new LcovReporter({ reportsDirectory: '/tmp' });
    const output = reporter.formatLcov(map);

    // BRF: branches found
    assert.ok(output.includes('BRF:2'), 'Should have 2 branches found');
    // BRH: branches hit
    assert.ok(output.includes('BRH:1'), 'Should have 1 branch hit');
  });

  it('produces records for multiple files', () => {
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

    const reporter = new LcovReporter({ reportsDirectory: '/tmp' });
    const output = reporter.formatLcov(map);

    assert.ok(output.includes('SF:/test/a.ts'), 'Should contain first file');
    assert.ok(output.includes('SF:/test/b.ts'), 'Should contain second file');

    const records = output
      .split('end_of_record')
      .filter((r) => r.trim().length > 0);
    assert.strictEqual(records.length, 2, 'Should have 2 records');
  });

  it('handles file with no branches', () => {
    const fileCov: FileCoverage = {
      path: '/test/simple.ts',
      statementMap: {
        '0': { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
      },
      fnMap: {
        '0': {
          name: 'simple',
          decl: { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
          loc: { start: { line: 1, column: 0 }, end: { line: 3, column: 1 } },
          line: 1,
        },
      },
      branchMap: {},
      s: { '0': 1 },
      f: { '0': 1 },
      b: {},
    };
    const globalSummary = makeSummary(100);
    const map = makeMockCoverageMap(
      {
        '/test/simple.ts': { coverage: fileCov, summary: makeSummary(100) },
      },
      globalSummary,
    );

    const reporter = new LcovReporter({ reportsDirectory: '/tmp' });
    const output = reporter.formatLcov(map);

    assert.ok(output.includes('BRF:0'), 'Should have 0 branches found');
    assert.ok(output.includes('BRH:0'), 'Should have 0 branches hit');
  });

  it('handles file with no functions', () => {
    const fileCov: FileCoverage = {
      path: '/test/nofunc.ts',
      statementMap: {
        '0': { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
      },
      fnMap: {},
      branchMap: {},
      s: { '0': 1 },
      f: {},
      b: {},
    };
    const globalSummary = makeSummary(100);
    const map = makeMockCoverageMap(
      {
        '/test/nofunc.ts': { coverage: fileCov, summary: makeSummary(100) },
      },
      globalSummary,
    );

    const reporter = new LcovReporter({ reportsDirectory: '/tmp' });
    const output = reporter.formatLcov(map);

    assert.ok(output.includes('FNF:0'), 'Should have 0 functions found');
    assert.ok(output.includes('FNH:0'), 'Should have 0 functions hit');
  });
});
