import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkThresholds,
  checkPerFileThresholds,
} from '../../src/coverage/thresholds.js';
import {
  createCoverageMap,
  type CoverageSummary,
  type FileCoverage,
  type Range,
} from '../../src/coverage/coverage-map.js';
import type { CoverageThresholds } from '../../src/coverage/config.js';

function makeSummary(
  stmtPct: number,
  fnPct: number,
  brPct: number,
  linePct: number,
): CoverageSummary {
  return {
    statements: { total: 100, covered: stmtPct, skipped: 0, pct: stmtPct },
    functions: { total: 100, covered: fnPct, skipped: 0, pct: fnPct },
    branches: { total: 100, covered: brPct, skipped: 0, pct: brPct },
    lines: { total: 100, covered: linePct, skipped: 0, pct: linePct },
  };
}

function makeRange(sl: number, sc: number, el: number, ec: number): Range {
  return {
    start: { line: sl, column: sc },
    end: { line: el, column: ec },
  };
}

function makeFileCoverage(
  path: string,
  sCounts: Record<string, number>,
): FileCoverage {
  const statementMap: Record<string, Range> = {};
  const s: Record<string, number> = {};
  let line = 1;
  for (const [key, count] of Object.entries(sCounts)) {
    statementMap[key] = makeRange(line, 0, line, 20);
    s[key] = count;
    line++;
  }
  return {
    path,
    statementMap,
    fnMap: {},
    branchMap: {},
    s,
    f: {},
    b: {},
  };
}

describe('thresholds.100 shorthand', () => {
  it('should set all thresholds to 100 when 100 is true', () => {
    const summary = makeSummary(99, 99, 99, 99);
    const thresholds: CoverageThresholds = { 100: true };
    const result = checkThresholds(summary, thresholds);
    assert.equal(result.passed, false);
    assert.equal(result.failures.length, 4);
    // All four metrics should fail
    const failedMetrics = result.failures.map((f) => {
      const match = f.match(/Coverage for (\w+)/);
      return match ? match[1] : '';
    });
    assert.ok(failedMetrics.includes('lines'));
    assert.ok(failedMetrics.includes('functions'));
    assert.ok(failedMetrics.includes('branches'));
    assert.ok(failedMetrics.includes('statements'));
  });

  it('should pass when all metrics are 100 and 100 shorthand is used', () => {
    const summary = makeSummary(100, 100, 100, 100);
    const thresholds: CoverageThresholds = { 100: true };
    const result = checkThresholds(summary, thresholds);
    assert.equal(result.passed, true);
    assert.equal(result.failures.length, 0);
  });

  it('should allow explicit overrides with 100 shorthand', () => {
    // Even with 100: true, if you set lines to 50 explicitly, it should use 50
    const summary = makeSummary(99, 99, 99, 60);
    const thresholds: CoverageThresholds = { 100: true, lines: 50 };
    const result = checkThresholds(summary, thresholds);
    // lines should pass (60 >= 50), but other three should fail (99 < 100)
    assert.equal(result.passed, false);
    assert.equal(result.failures.length, 3);
    const failedMetrics = result.failures.map((f) => {
      const match = f.match(/Coverage for (\w+)/);
      return match ? match[1] : '';
    });
    assert.ok(!failedMetrics.includes('lines'));
  });

  it('should not set thresholds to 100 when 100 is false', () => {
    const summary = makeSummary(50, 50, 50, 50);
    const thresholds: CoverageThresholds = { 100: false };
    const result = checkThresholds(summary, thresholds);
    assert.equal(result.passed, true);
    assert.equal(result.failures.length, 0);
  });
});

describe('thresholds.autoUpdate', () => {
  it('should store the autoUpdate flag', () => {
    const thresholds: CoverageThresholds = { autoUpdate: true, lines: 80 };
    assert.equal(thresholds.autoUpdate, true);
  });

  it('should not affect threshold checking behavior', () => {
    const summary = makeSummary(90, 90, 90, 90);
    const thresholds: CoverageThresholds = { autoUpdate: true, lines: 80 };
    const result = checkThresholds(summary, thresholds);
    assert.equal(result.passed, true);
  });
});

describe('glob-pattern thresholds', () => {
  it('should apply glob-specific thresholds to matching files', () => {
    const map = createCoverageMap();
    // src/utils/helper.ts — 50% statement coverage (1 of 2 covered)
    map.addFileCoverage(
      makeFileCoverage('src/utils/helper.ts', { '0': 1, '1': 0 }),
    );
    // src/core/main.ts — 50% statement coverage (1 of 2 covered)
    map.addFileCoverage(
      makeFileCoverage('src/core/main.ts', { '0': 1, '1': 0 }),
    );

    const thresholds: CoverageThresholds = {
      statements: 80, // Base threshold: 80% (both files fail this)
      glob: {
        'src/utils/**': { statements: 40 }, // Override for utils: 40% (helper passes)
      },
    };

    const result = checkPerFileThresholds(map, thresholds);
    assert.equal(result.passed, false);
    // Only src/core/main.ts should fail (50% < 80%)
    assert.equal(result.failures.length, 1);
    assert.ok(result.failures[0]!.includes('src/core/main.ts'));
  });

  it('should pass when all files meet their respective glob thresholds', () => {
    const map = createCoverageMap();
    map.addFileCoverage(
      makeFileCoverage('src/utils/helper.ts', { '0': 1, '1': 1 }),
    );
    map.addFileCoverage(
      makeFileCoverage('src/core/main.ts', { '0': 1, '1': 1 }),
    );

    const thresholds: CoverageThresholds = {
      statements: 100,
      glob: {
        'src/utils/**': { statements: 50 },
      },
    };

    const result = checkPerFileThresholds(map, thresholds);
    assert.equal(result.passed, true);
  });

  it('should use base thresholds for files not matching any glob', () => {
    const map = createCoverageMap();
    map.addFileCoverage(
      makeFileCoverage('src/other/file.ts', { '0': 1, '1': 0 }),
    );

    const thresholds: CoverageThresholds = {
      statements: 80,
      glob: {
        'src/utils/**': { statements: 40 },
      },
    };

    const result = checkPerFileThresholds(map, thresholds);
    assert.equal(result.passed, false);
    assert.ok(result.failures[0]!.includes('src/other/file.ts'));
  });

  it('should work with no glob patterns defined', () => {
    const map = createCoverageMap();
    map.addFileCoverage(makeFileCoverage('src/a.ts', { '0': 1, '1': 1 }));

    const thresholds: CoverageThresholds = {
      statements: 100,
    };

    const result = checkPerFileThresholds(map, thresholds);
    assert.equal(result.passed, true);
  });
});
