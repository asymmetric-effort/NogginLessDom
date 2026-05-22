import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createCoverageMap,
  type FileCoverage,
  type Range,
} from '../../src/coverage/coverage-map.js';

function makeRange(sl: number, sc: number, el: number, ec: number): Range {
  return {
    start: { line: sl, column: sc },
    end: { line: el, column: ec },
  };
}

function makeSimpleFileCoverage(path: string): FileCoverage {
  return {
    path,
    statementMap: {
      '0': makeRange(1, 0, 1, 20),
      '1': makeRange(2, 0, 2, 20),
    },
    fnMap: {
      '0': {
        name: 'fn',
        decl: makeRange(1, 0, 1, 10),
        loc: makeRange(1, 0, 2, 1),
        line: 1,
      },
    },
    branchMap: {
      '0': {
        type: 'if',
        locations: [makeRange(2, 0, 2, 10), makeRange(2, 10, 2, 20)],
        line: 2,
      },
    },
    s: { '0': 1, '1': 0 },
    f: { '0': 1 },
    b: { '0': [1, 0] },
  };
}

describe('CoverageMap.filter()', () => {
  it('should remove files that fail the callback', () => {
    const map = createCoverageMap();
    map.addFileCoverage(makeSimpleFileCoverage('/src/a.ts'));
    map.addFileCoverage(makeSimpleFileCoverage('/src/b.ts'));
    map.addFileCoverage(makeSimpleFileCoverage('/test/c.ts'));

    map.filter((filePath) => filePath.startsWith('/src/'));

    const files = map.files();
    assert.equal(files.length, 2);
    assert.ok(files.includes('/src/a.ts'));
    assert.ok(files.includes('/src/b.ts'));
    assert.ok(!files.includes('/test/c.ts'));
  });

  it('should keep files that pass the callback', () => {
    const map = createCoverageMap();
    map.addFileCoverage(makeSimpleFileCoverage('/src/a.ts'));
    map.addFileCoverage(makeSimpleFileCoverage('/src/b.ts'));

    map.filter(() => true);

    const files = map.files();
    assert.equal(files.length, 2);
    assert.ok(files.includes('/src/a.ts'));
    assert.ok(files.includes('/src/b.ts'));
  });

  it('should remove all files when callback always returns false', () => {
    const map = createCoverageMap();
    map.addFileCoverage(makeSimpleFileCoverage('/src/a.ts'));
    map.addFileCoverage(makeSimpleFileCoverage('/src/b.ts'));

    map.filter(() => false);

    assert.equal(map.files().length, 0);
  });
});

describe('CoverageMap.data()', () => {
  it('should return all file coverage data as a plain object', () => {
    const map = createCoverageMap();
    const fcA = makeSimpleFileCoverage('/src/a.ts');
    const fcB = makeSimpleFileCoverage('/src/b.ts');
    map.addFileCoverage(fcA);
    map.addFileCoverage(fcB);

    const result = map.data();

    assert.equal(typeof result, 'object');
    assert.ok(!Array.isArray(result));
    assert.deepEqual(Object.keys(result).sort(), ['/src/a.ts', '/src/b.ts']);
    assert.deepEqual(result['/src/a.ts'], fcA);
    assert.deepEqual(result['/src/b.ts'], fcB);
  });

  it('should return an empty object for an empty map', () => {
    const map = createCoverageMap();
    const result = map.data();
    assert.deepEqual(result, {});
  });
});

describe('CoverageMap.getCoverageSummary()', () => {
  it('should return the same result as toSummary()', () => {
    const map = createCoverageMap();
    map.addFileCoverage(makeSimpleFileCoverage('/src/a.ts'));
    map.addFileCoverage(makeSimpleFileCoverage('/src/b.ts'));

    const summary = map.toSummary();
    const aliasSummary = map.getCoverageSummary();

    assert.deepEqual(aliasSummary, summary);
  });

  it('should return empty summary for empty map', () => {
    const map = createCoverageMap();

    const summary = map.toSummary();
    const aliasSummary = map.getCoverageSummary();

    assert.deepEqual(aliasSummary, summary);
  });
});
