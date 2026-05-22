import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CoverageMap,
  createCoverageMap,
  computeSummary,
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
      '2': makeRange(3, 0, 3, 20),
    },
    fnMap: {
      '0': {
        name: 'foo',
        decl: makeRange(1, 0, 1, 10),
        loc: makeRange(1, 0, 3, 1),
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
    s: { '0': 1, '1': 5, '2': 0 },
    f: { '0': 3 },
    b: { '0': [5, 0] },
  };
}

describe('CoverageMap', () => {
  describe('createCoverageMap', () => {
    it('should create an empty CoverageMap', () => {
      const map = createCoverageMap();
      assert.ok(map instanceof CoverageMap);
      assert.deepEqual(map.files(), []);
    });
  });

  describe('addFileCoverage', () => {
    it('should add file coverage and list the file', () => {
      const map = createCoverageMap();
      const fc = makeSimpleFileCoverage('/src/a.ts');
      map.addFileCoverage(fc);
      assert.deepEqual(map.files(), ['/src/a.ts']);
    });

    it('should support multiple files', () => {
      const map = createCoverageMap();
      map.addFileCoverage(makeSimpleFileCoverage('/src/a.ts'));
      map.addFileCoverage(makeSimpleFileCoverage('/src/b.ts'));
      const files = map.files();
      assert.equal(files.length, 2);
      assert.ok(files.includes('/src/a.ts'));
      assert.ok(files.includes('/src/b.ts'));
    });
  });

  describe('fileCoverageFor', () => {
    it('should return the file coverage for a known file', () => {
      const map = createCoverageMap();
      const fc = makeSimpleFileCoverage('/src/a.ts');
      map.addFileCoverage(fc);
      const retrieved = map.fileCoverageFor('/src/a.ts');
      assert.equal(retrieved.path, '/src/a.ts');
      assert.deepEqual(retrieved.s, fc.s);
    });

    it('should throw for unknown file', () => {
      const map = createCoverageMap();
      assert.throws(() => map.fileCoverageFor('/nope.ts'));
    });
  });

  describe('merge', () => {
    it('should merge another CoverageMap into this one', () => {
      const map1 = createCoverageMap();
      map1.addFileCoverage(makeSimpleFileCoverage('/src/a.ts'));

      const map2 = createCoverageMap();
      map2.addFileCoverage(makeSimpleFileCoverage('/src/b.ts'));

      map1.merge(map2);
      assert.equal(map1.files().length, 2);
      assert.ok(map1.files().includes('/src/a.ts'));
      assert.ok(map1.files().includes('/src/b.ts'));
    });

    it('should merge counts for overlapping files', () => {
      const map1 = createCoverageMap();
      const fc1 = makeSimpleFileCoverage('/src/a.ts');
      fc1.s = { '0': 1, '1': 2, '2': 0 };
      fc1.f = { '0': 1 };
      fc1.b = { '0': [2, 0] };
      map1.addFileCoverage(fc1);

      const map2 = createCoverageMap();
      const fc2 = makeSimpleFileCoverage('/src/a.ts');
      fc2.s = { '0': 3, '1': 0, '2': 1 };
      fc2.f = { '0': 2 };
      fc2.b = { '0': [0, 3] };
      map2.addFileCoverage(fc2);

      map1.merge(map2);
      const merged = map1.fileCoverageFor('/src/a.ts');
      assert.equal(merged.s['0'], 4);
      assert.equal(merged.s['1'], 2);
      assert.equal(merged.s['2'], 1);
      assert.equal(merged.f['0'], 3);
      assert.deepEqual(merged.b['0'], [2, 3]);
    });
  });

  describe('computeSummary', () => {
    it('should compute correct totals and covered counts', () => {
      const fc = makeSimpleFileCoverage('/src/a.ts');
      const summary = computeSummary(fc);

      // 3 statements, 2 covered (s['0']=1, s['1']=5, s['2']=0)
      assert.equal(summary.statements.total, 3);
      assert.equal(summary.statements.covered, 2);

      // 1 function, 1 covered
      assert.equal(summary.functions.total, 1);
      assert.equal(summary.functions.covered, 1);

      // 2 branch paths, 1 covered (b['0'] = [5, 0])
      assert.equal(summary.branches.total, 2);
      assert.equal(summary.branches.covered, 1);
    });

    it('should compute percentage correctly', () => {
      const fc = makeSimpleFileCoverage('/src/a.ts');
      const summary = computeSummary(fc);
      const expectedStmtPct = (2 / 3) * 100;
      assert.ok(Math.abs(summary.statements.pct - expectedStmtPct) < 0.01);
      assert.equal(summary.functions.pct, 100);
      assert.equal(summary.branches.pct, 50);
    });

    it('should handle empty file coverage', () => {
      const fc: FileCoverage = {
        path: '/empty.ts',
        statementMap: {},
        fnMap: {},
        branchMap: {},
        s: {},
        f: {},
        b: {},
      };
      const summary = computeSummary(fc);
      assert.equal(summary.statements.total, 0);
      assert.equal(summary.statements.covered, 0);
      assert.equal(summary.statements.pct, 100); // 0/0 = 100%
      assert.equal(summary.functions.pct, 100);
      assert.equal(summary.branches.pct, 100);
    });

    it('should compute lines from statement map', () => {
      const fc = makeSimpleFileCoverage('/src/a.ts');
      const summary = computeSummary(fc);
      // lines 1, 2, 3 from statement map; line 1 covered (s[0]=1), line 2 covered (s[1]=5), line 3 not covered (s[2]=0)
      assert.equal(summary.lines.total, 3);
      assert.equal(summary.lines.covered, 2);
    });
  });

  describe('toSummary', () => {
    it('should compute aggregate summary across all files', () => {
      const map = createCoverageMap();

      const fc1 = makeSimpleFileCoverage('/src/a.ts');
      fc1.s = { '0': 1, '1': 1, '2': 0 };
      fc1.f = { '0': 1 };
      fc1.b = { '0': [1, 0] };

      const fc2 = makeSimpleFileCoverage('/src/b.ts');
      fc2.s = { '0': 0, '1': 0, '2': 0 };
      fc2.f = { '0': 0 };
      fc2.b = { '0': [0, 0] };

      map.addFileCoverage(fc1);
      map.addFileCoverage(fc2);

      const summary = map.toSummary();
      // 6 statements total, 2 covered
      assert.equal(summary.statements.total, 6);
      assert.equal(summary.statements.covered, 2);
      // 2 functions total, 1 covered
      assert.equal(summary.functions.total, 2);
      assert.equal(summary.functions.covered, 1);
      // 4 branch paths total, 1 covered
      assert.equal(summary.branches.total, 4);
      assert.equal(summary.branches.covered, 1);
    });

    it('should return 100% for empty map', () => {
      const map = createCoverageMap();
      const summary = map.toSummary();
      assert.equal(summary.statements.pct, 100);
      assert.equal(summary.functions.pct, 100);
      assert.equal(summary.branches.pct, 100);
      assert.equal(summary.lines.pct, 100);
    });
  });

  describe('fileSummaryFor', () => {
    it('should return summary for a single file', () => {
      const map = createCoverageMap();
      map.addFileCoverage(makeSimpleFileCoverage('/src/a.ts'));
      const summary = map.fileSummaryFor('/src/a.ts');
      assert.equal(summary.statements.total, 3);
      assert.equal(summary.functions.total, 1);
    });

    it('should throw for unknown file', () => {
      const map = createCoverageMap();
      assert.throws(() => map.fileSummaryFor('/nope.ts'));
    });
  });
});
