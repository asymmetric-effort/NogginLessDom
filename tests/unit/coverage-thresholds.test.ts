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

describe('checkThresholds', () => {
  it('should pass when all thresholds are met', () => {
    const summary = makeSummary(80, 80, 80, 80);
    const thresholds: CoverageThresholds = {
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
    };
    const result = checkThresholds(summary, thresholds);
    assert.equal(result.passed, true);
    assert.equal(result.failures.length, 0);
  });

  it('should fail when a threshold is not met', () => {
    const summary = makeSummary(70, 80, 60, 90);
    const thresholds: CoverageThresholds = {
      statements: 80,
      branches: 80,
    };
    const result = checkThresholds(summary, thresholds);
    assert.equal(result.passed, false);
    assert.equal(result.failures.length, 2);
  });

  it('should pass when no thresholds are defined', () => {
    const summary = makeSummary(0, 0, 0, 0);
    const result = checkThresholds(summary, {});
    assert.equal(result.passed, true);
    assert.equal(result.failures.length, 0);
  });

  it('should include threshold name in failure message', () => {
    const summary = makeSummary(50, 50, 50, 50);
    const thresholds: CoverageThresholds = { lines: 80 };
    const result = checkThresholds(summary, thresholds);
    assert.equal(result.passed, false);
    assert.ok(result.failures[0]!.toLowerCase().includes('lines'));
  });

  it('should pass when coverage exactly meets threshold', () => {
    const summary = makeSummary(80, 80, 80, 80);
    const thresholds: CoverageThresholds = { statements: 80 };
    const result = checkThresholds(summary, thresholds);
    assert.equal(result.passed, true);
  });

  it('should handle threshold of 0', () => {
    const summary = makeSummary(0, 0, 0, 0);
    const thresholds: CoverageThresholds = { lines: 0 };
    const result = checkThresholds(summary, thresholds);
    assert.equal(result.passed, true);
  });

  it('should handle threshold of 100', () => {
    const summary = makeSummary(99.9, 100, 100, 99.9);
    const thresholds: CoverageThresholds = { lines: 100 };
    const result = checkThresholds(summary, thresholds);
    assert.equal(result.passed, false);
  });

  it('should check only specified thresholds', () => {
    const summary = makeSummary(10, 10, 10, 10);
    const thresholds: CoverageThresholds = { functions: 5 };
    const result = checkThresholds(summary, thresholds);
    assert.equal(result.passed, true);
  });
});

describe('checkPerFileThresholds', () => {
  it('should pass when all files meet thresholds', () => {
    const map = createCoverageMap();
    // all statements covered
    map.addFileCoverage(makeFileCoverage('/a.ts', { '0': 1, '1': 1 }));
    map.addFileCoverage(makeFileCoverage('/b.ts', { '0': 1, '1': 1 }));
    const thresholds: CoverageThresholds = { statements: 100 };
    const result = checkPerFileThresholds(map, thresholds);
    assert.equal(result.passed, true);
  });

  it('should fail when any file is below threshold', () => {
    const map = createCoverageMap();
    map.addFileCoverage(makeFileCoverage('/a.ts', { '0': 1, '1': 1 }));
    map.addFileCoverage(makeFileCoverage('/b.ts', { '0': 1, '1': 0 }));
    const thresholds: CoverageThresholds = { statements: 100 };
    const result = checkPerFileThresholds(map, thresholds);
    assert.equal(result.passed, false);
    assert.ok(result.failures.length > 0);
    assert.ok(result.failures[0]!.includes('/b.ts'));
  });

  it('should pass with empty map', () => {
    const map = createCoverageMap();
    const thresholds: CoverageThresholds = { statements: 80 };
    const result = checkPerFileThresholds(map, thresholds);
    assert.equal(result.passed, true);
  });

  it('should report multiple failing files', () => {
    const map = createCoverageMap();
    map.addFileCoverage(makeFileCoverage('/a.ts', { '0': 0 }));
    map.addFileCoverage(makeFileCoverage('/b.ts', { '0': 0 }));
    const thresholds: CoverageThresholds = { statements: 50 };
    const result = checkPerFileThresholds(map, thresholds);
    assert.equal(result.passed, false);
    assert.ok(result.failures.length >= 2);
  });
});
