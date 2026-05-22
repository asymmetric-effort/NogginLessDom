import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { TextReporter } from '../../src/coverage/reporters/text.js';
import type {
  CoverageMap,
  CoverageSummary,
  FileCoverage,
  CoverageWatermarks,
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

function makeSummary(
  stmts: [number, number],
  branches: [number, number],
  funcs: [number, number],
  lines: [number, number],
): CoverageSummary {
  return {
    statements: makeMetric(stmts[0], stmts[1]),
    branches: makeMetric(branches[0], branches[1]),
    functions: makeMetric(funcs[0], funcs[1]),
    lines: makeMetric(lines[0], lines[1]),
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

describe('coverage-text-reporter: format', () => {
  it('produces a formatted table with header and separator rows', () => {
    const globalSummary = makeSummary([7, 6], [3, 2], [6, 5], [7, 6]);
    const fileSummary = makeSummary([7, 6], [3, 2], [6, 5], [7, 6]);
    const fileCov = makeFileCoverage('/src/foo.ts');
    const map = makeMockCoverageMap(
      {
        '/src/foo.ts': { coverage: fileCov, summary: fileSummary },
      },
      globalSummary,
    );

    const reporter = new TextReporter({ reportsDirectory: '/tmp' });
    const output = reporter.format(map, globalSummary);

    // Should contain separator lines
    assert.ok(output.includes('---'));
    // Should contain header columns
    assert.ok(output.includes('% Stmts'));
    assert.ok(output.includes('% Branch'));
    assert.ok(output.includes('% Funcs'));
    assert.ok(output.includes('% Lines'));
    // Should contain "All files" summary row
    assert.ok(output.includes('All files'));
    // Should contain file name
    assert.ok(output.includes('foo.ts'));
  });

  it('includes directory grouping for files in subdirectories', () => {
    const summary100 = makeSummary([3, 3], [2, 2], [1, 1], [3, 3]);
    const summary70 = makeSummary([7, 5], [3, 1], [3, 2], [7, 5]);
    const globalSummary = makeSummary([10, 8], [5, 3], [4, 3], [10, 8]);

    const map = makeMockCoverageMap(
      {
        '/src/utils/helper.ts': {
          coverage: makeFileCoverage('/src/utils/helper.ts'),
          summary: summary100,
        },
        '/src/utils/format.ts': {
          coverage: makeFileCoverage('/src/utils/format.ts'),
          summary: summary70,
        },
      },
      globalSummary,
    );

    const reporter = new TextReporter({ reportsDirectory: '/tmp' });
    const output = reporter.format(map, globalSummary);

    // Should show directory prefix
    assert.ok(output.includes('src/utils/'));
    // Should show file names indented under directory
    assert.ok(output.includes('helper.ts'));
    assert.ok(output.includes('format.ts'));
  });

  it('skips files with 100% coverage when skipFull is true', () => {
    const summary100 = makeSummary([3, 3], [2, 2], [1, 1], [3, 3]);
    const summary70 = makeSummary([7, 5], [3, 1], [3, 2], [7, 5]);
    const globalSummary = makeSummary([10, 8], [5, 3], [4, 3], [10, 8]);

    const map = makeMockCoverageMap(
      {
        '/src/full.ts': {
          coverage: makeFileCoverage('/src/full.ts'),
          summary: summary100,
        },
        '/src/partial.ts': {
          coverage: makeFileCoverage('/src/partial.ts'),
          summary: summary70,
        },
      },
      globalSummary,
    );

    const reporter = new TextReporter({
      reportsDirectory: '/tmp',
      skipFull: true,
    });
    const output = reporter.format(map, globalSummary);

    assert.ok(!output.includes('full.ts'));
    assert.ok(output.includes('partial.ts'));
  });

  it('shows all files when skipFull is false', () => {
    const summary100 = makeSummary([3, 3], [2, 2], [1, 1], [3, 3]);
    const summary70 = makeSummary([7, 5], [3, 1], [3, 2], [7, 5]);
    const globalSummary = makeSummary([10, 8], [5, 3], [4, 3], [10, 8]);

    const map = makeMockCoverageMap(
      {
        '/src/full.ts': {
          coverage: makeFileCoverage('/src/full.ts'),
          summary: summary100,
        },
        '/src/partial.ts': {
          coverage: makeFileCoverage('/src/partial.ts'),
          summary: summary70,
        },
      },
      globalSummary,
    );

    const reporter = new TextReporter({
      reportsDirectory: '/tmp',
      skipFull: false,
    });
    const output = reporter.format(map, globalSummary);

    assert.ok(output.includes('full.ts'));
    assert.ok(output.includes('partial.ts'));
  });

  it('applies ANSI color codes based on watermarks', () => {
    const summaryLow = makeSummary([10, 3], [10, 3], [10, 3], [10, 3]); // 30%
    const globalSummary = makeSummary([10, 3], [10, 3], [10, 3], [10, 3]);

    const map = makeMockCoverageMap(
      {
        '/src/low.ts': {
          coverage: makeFileCoverage('/src/low.ts'),
          summary: summaryLow,
        },
      },
      globalSummary,
    );

    const watermarks: CoverageWatermarks = {
      statements: [50, 80],
      branches: [50, 80],
      functions: [50, 80],
      lines: [50, 80],
    };

    const reporter = new TextReporter({ reportsDirectory: '/tmp', watermarks });
    const output = reporter.format(map, globalSummary);

    // Red color code for low coverage (below low watermark)
    assert.ok(
      output.includes('\x1b[31m'),
      'Should contain red ANSI code for low coverage',
    );
  });

  it('uses green for high coverage', () => {
    const summaryHigh = makeSummary([10, 9], [10, 9], [10, 9], [10, 9]); // 90%
    const globalSummary = makeSummary([10, 9], [10, 9], [10, 9], [10, 9]);

    const map = makeMockCoverageMap(
      {
        '/src/high.ts': {
          coverage: makeFileCoverage('/src/high.ts'),
          summary: summaryHigh,
        },
      },
      globalSummary,
    );

    const watermarks: CoverageWatermarks = {
      statements: [50, 80],
      branches: [50, 80],
      functions: [50, 80],
      lines: [50, 80],
    };

    const reporter = new TextReporter({ reportsDirectory: '/tmp', watermarks });
    const output = reporter.format(map, globalSummary);

    // Green color code for high coverage
    assert.ok(
      output.includes('\x1b[32m'),
      'Should contain green ANSI code for high coverage',
    );
  });

  it('uses yellow for medium coverage', () => {
    const summaryMed = makeSummary([10, 6], [10, 6], [10, 6], [10, 6]); // 60%
    const globalSummary = makeSummary([10, 6], [10, 6], [10, 6], [10, 6]);

    const map = makeMockCoverageMap(
      {
        '/src/med.ts': {
          coverage: makeFileCoverage('/src/med.ts'),
          summary: summaryMed,
        },
      },
      globalSummary,
    );

    const watermarks: CoverageWatermarks = {
      statements: [50, 80],
      branches: [50, 80],
      functions: [50, 80],
      lines: [50, 80],
    };

    const reporter = new TextReporter({ reportsDirectory: '/tmp', watermarks });
    const output = reporter.format(map, globalSummary);

    // Yellow color code for medium coverage
    assert.ok(
      output.includes('\x1b[33m'),
      'Should contain yellow ANSI code for medium coverage',
    );
  });

  it('handles empty coverage map', () => {
    const globalSummary = makeSummary([0, 0], [0, 0], [0, 0], [0, 0]);
    const map = makeMockCoverageMap({}, globalSummary);

    const reporter = new TextReporter({ reportsDirectory: '/tmp' });
    const output = reporter.format(map, globalSummary);

    assert.ok(output.includes('All files'));
  });

  it('pads columns for alignment', () => {
    const globalSummary = makeSummary([7, 6], [3, 2], [6, 5], [7, 6]);
    const fileSummary = makeSummary([7, 6], [3, 2], [6, 5], [7, 6]);
    const fileCov = makeFileCoverage('/src/foo.ts');
    const map = makeMockCoverageMap(
      {
        '/src/foo.ts': { coverage: fileCov, summary: fileSummary },
      },
      globalSummary,
    );

    const reporter = new TextReporter({ reportsDirectory: '/tmp' });
    const output = reporter.format(map, globalSummary);
    const lines = output.split('\n').filter((l) => l.length > 0);

    // All non-empty lines with pipes should have the same length (aligned)
    const dataLines = lines.filter((l) => l.includes('|'));
    if (dataLines.length > 1) {
      const firstLen = dataLines[0]!.length;
      for (const line of dataLines) {
        assert.strictEqual(
          line.replace(/\x1b\[\d+m/g, '').length,
          firstLen,
          `Line lengths should be equal for alignment: "${line}"`,
        );
      }
    }
  });
});
