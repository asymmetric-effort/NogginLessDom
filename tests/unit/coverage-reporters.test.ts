import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  createTextReporter,
  createJsonReporter,
  createLcovReporter,
  createCoberturaReporter,
  createCloverReporter,
  getReporterFactory,
} from '../../src/coverage/reporters/index.js';

import type { ReporterOptions } from '../../src/coverage/reporters/index.js';

import type {
  CoverageMap,
  CoverageSummary,
  FileCoverage,
} from '../../src/coverage/reporters/types.js';

function makeOptions(overrides?: Partial<ReporterOptions>): ReporterOptions {
  return {
    reportsDirectory: '/tmp/test-coverage',
    ...overrides,
  };
}

function makeSummary(pct: number): CoverageSummary {
  return {
    lines: { total: 10, covered: Math.round(pct / 10), skipped: 0, pct },
    statements: { total: 10, covered: Math.round(pct / 10), skipped: 0, pct },
    functions: { total: 10, covered: Math.round(pct / 10), skipped: 0, pct },
    branches: { total: 10, covered: Math.round(pct / 10), skipped: 0, pct },
  };
}

function makeMockCoverageMap(): CoverageMap {
  const fileCoverage: FileCoverage = {
    path: '/test/file.ts',
    statementMap: {
      '0': { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
    },
    fnMap: {
      '0': {
        name: 'foo',
        decl: { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
        loc: { start: { line: 1, column: 0 }, end: { line: 3, column: 1 } },
        line: 1,
      },
    },
    branchMap: {},
    s: { '0': 5 },
    f: { '0': 5 },
    b: {},
  };
  const summary = makeSummary(100);
  return {
    files: () => ['/test/file.ts'],
    fileCoverageFor: (_path: string) => fileCoverage,
    toSummary: () => summary,
    fileSummaryFor: (_path: string) => summary,
  };
}

describe('coverage-reporters: factory functions', () => {
  it('createTextReporter returns a CoverageReporter', () => {
    const reporter = createTextReporter(makeOptions());
    assert.ok(reporter);
    assert.strictEqual(typeof reporter.onEnd, 'function');
  });

  it('createJsonReporter returns a CoverageReporter', () => {
    const reporter = createJsonReporter(makeOptions());
    assert.ok(reporter);
    assert.strictEqual(typeof reporter.onEnd, 'function');
  });

  it('createLcovReporter returns a CoverageReporter', () => {
    const reporter = createLcovReporter(makeOptions());
    assert.ok(reporter);
    assert.strictEqual(typeof reporter.onEnd, 'function');
  });

  it('createCoberturaReporter returns a CoverageReporter', () => {
    const reporter = createCoberturaReporter(makeOptions());
    assert.ok(reporter);
    assert.strictEqual(typeof reporter.onEnd, 'function');
  });

  it('createCloverReporter returns a CoverageReporter', () => {
    const reporter = createCloverReporter(makeOptions());
    assert.ok(reporter);
    assert.strictEqual(typeof reporter.onEnd, 'function');
  });

  it('getReporterFactory returns the correct factory for known reporters', () => {
    const textFactory = getReporterFactory('text');
    assert.strictEqual(typeof textFactory, 'function');

    const jsonFactory = getReporterFactory('json');
    assert.strictEqual(typeof jsonFactory, 'function');

    const lcovFactory = getReporterFactory('lcov');
    assert.strictEqual(typeof lcovFactory, 'function');

    const coberturaFactory = getReporterFactory('cobertura');
    assert.strictEqual(typeof coberturaFactory, 'function');

    const cloverFactory = getReporterFactory('clover');
    assert.strictEqual(typeof cloverFactory, 'function');
  });

  it('getReporterFactory throws for unknown reporter', () => {
    assert.throws(() => getReporterFactory('unknown'), /Unknown reporter/);
  });

  it('reporters implement optional onStart', () => {
    const reporter = createTextReporter(makeOptions());
    // onStart is optional, but if present should be callable
    if (reporter.onStart) {
      assert.strictEqual(typeof reporter.onStart, 'function');
    }
  });

  it('reporters implement optional onFileProcessed', () => {
    const reporter = createTextReporter(makeOptions());
    if (reporter.onFileProcessed) {
      assert.strictEqual(typeof reporter.onFileProcessed, 'function');
    }
  });

  it('reporter interface compliance - onEnd accepts coverageMap and summary', () => {
    const reporter = createTextReporter(makeOptions());
    const map = makeMockCoverageMap();
    const summary = makeSummary(85);
    // Should not throw
    reporter.onEnd(map, summary);
  });
});
