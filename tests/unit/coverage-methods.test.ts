import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  FileCoverageInstance,
  CoverageSummaryInstance,
  createCoverageSummary,
  type FileCoverage,
  type Range,
} from '../../src/coverage/coverage-map.js';

function makeRange(sl: number, sc: number, el: number, ec: number): Range {
  return {
    start: { line: sl, column: sc },
    end: { line: el, column: ec },
  };
}

function makeSimpleFileCoverage(): FileCoverage {
  return {
    path: '/test/file.ts',
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

describe('FileCoverageInstance', () => {
  describe('merge', () => {
    it('should combine statement, function, and branch counts', () => {
      const fc1 = new FileCoverageInstance(makeSimpleFileCoverage());
      const other: FileCoverage = {
        path: '/test/file.ts',
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
        s: { '0': 2, '1': 3, '2': 1 },
        f: { '0': 4 },
        b: { '0': [2, 1] },
      };

      fc1.merge(other);

      assert.equal(fc1.s['0'], 3);
      assert.equal(fc1.s['1'], 8);
      assert.equal(fc1.s['2'], 1);
      assert.equal(fc1.f['0'], 7);
      assert.deepEqual(fc1.b['0'], [7, 1]);
    });

    it('should union maps for new keys', () => {
      const fc1 = new FileCoverageInstance(makeSimpleFileCoverage());
      const other: FileCoverage = {
        path: '/test/file.ts',
        statementMap: {
          '3': makeRange(4, 0, 4, 20),
        },
        fnMap: {
          '1': {
            name: 'bar',
            decl: makeRange(4, 0, 4, 10),
            loc: makeRange(4, 0, 4, 20),
            line: 4,
          },
        },
        branchMap: {
          '1': {
            type: 'if',
            locations: [makeRange(5, 0, 5, 10)],
            line: 5,
          },
        },
        s: { '3': 2 },
        f: { '1': 1 },
        b: { '1': [3] },
      };

      fc1.merge(other);

      assert.ok(fc1.statementMap['3']);
      assert.ok(fc1.fnMap['1']);
      assert.ok(fc1.branchMap['1']);
      assert.equal(fc1.s['3'], 2);
      assert.equal(fc1.f['1'], 1);
      assert.deepEqual(fc1.b['1'], [3]);
    });
  });

  describe('resetHits', () => {
    it('should zero all statement, function, and branch counts', () => {
      const fc = new FileCoverageInstance(makeSimpleFileCoverage());
      fc.resetHits();

      for (const key of Object.keys(fc.s)) {
        assert.equal(fc.s[key], 0);
      }
      for (const key of Object.keys(fc.f)) {
        assert.equal(fc.f[key], 0);
      }
      for (const key of Object.keys(fc.b)) {
        const arr = fc.b[key];
        assert.ok(arr);
        for (const val of arr) {
          assert.equal(val, 0);
        }
      }
    });
  });

  describe('toJSON', () => {
    it('should return a plain object copy', () => {
      const fc = new FileCoverageInstance(makeSimpleFileCoverage());
      const json = fc.toJSON();

      assert.equal(json.path, '/test/file.ts');
      assert.deepEqual(json.s, { '0': 1, '1': 5, '2': 0 });
      assert.deepEqual(json.f, { '0': 3 });
      assert.deepEqual(json.b, { '0': [5, 0] });
      // Should be a plain object, not an instance
      assert.equal(Object.getPrototypeOf(json), Object.prototype);
    });
  });

  describe('computeSimpleTotals', () => {
    it('should compute correct line-based totals', () => {
      const fc = new FileCoverageInstance(makeSimpleFileCoverage());
      const totals = fc.computeSimpleTotals();

      // 3 statements on lines 1, 2, 3 -> 3 total lines
      // line 1: s[0]=1 (covered), line 2: s[1]=5 (covered), line 3: s[2]=0 (not covered)
      assert.equal(totals.total, 3);
      assert.equal(totals.covered, 2);
      assert.ok(totals.pct > 0 && totals.pct < 100);
    });

    it('should return 100 pct when no lines exist', () => {
      const fc = new FileCoverageInstance({
        path: '/empty.ts',
        statementMap: {},
        fnMap: {},
        branchMap: {},
        s: {},
        f: {},
        b: {},
      });
      const totals = fc.computeSimpleTotals();
      assert.equal(totals.total, 0);
      assert.equal(totals.covered, 0);
      assert.equal(totals.pct, 100);
    });
  });

  describe('computeBranchTotals', () => {
    it('should compute correct branch totals', () => {
      const fc = new FileCoverageInstance(makeSimpleFileCoverage());
      const totals = fc.computeBranchTotals();

      // b: { '0': [5, 0] } -> 2 total branches, 1 covered
      assert.equal(totals.total, 2);
      assert.equal(totals.covered, 1);
      assert.equal(totals.pct, 50);
    });

    it('should return 100 pct when no branches exist', () => {
      const fc = new FileCoverageInstance({
        path: '/no-branches.ts',
        statementMap: {},
        fnMap: {},
        branchMap: {},
        s: {},
        f: {},
        b: {},
      });
      const totals = fc.computeBranchTotals();
      assert.equal(totals.total, 0);
      assert.equal(totals.covered, 0);
      assert.equal(totals.pct, 100);
    });
  });
});

describe('CoverageSummaryInstance', () => {
  describe('merge', () => {
    it('should sum totals and covered correctly', () => {
      const s1 = new CoverageSummaryInstance(createCoverageSummary());
      s1.lines = { total: 10, covered: 8, skipped: 0, pct: 80 };
      s1.statements = { total: 12, covered: 10, skipped: 0, pct: 83.33 };
      s1.functions = { total: 5, covered: 4, skipped: 0, pct: 80 };
      s1.branches = { total: 6, covered: 3, skipped: 0, pct: 50 };

      const other = createCoverageSummary();
      other.lines = { total: 5, covered: 5, skipped: 0, pct: 100 };
      other.statements = { total: 8, covered: 6, skipped: 0, pct: 75 };
      other.functions = { total: 3, covered: 2, skipped: 0, pct: 66.67 };
      other.branches = { total: 4, covered: 4, skipped: 0, pct: 100 };

      const result = s1.merge(other);

      assert.equal(result.lines.total, 15);
      assert.equal(result.lines.covered, 13);
      assert.equal(result.statements.total, 20);
      assert.equal(result.statements.covered, 16);
      assert.equal(result.functions.total, 8);
      assert.equal(result.functions.covered, 6);
      assert.equal(result.branches.total, 10);
      assert.equal(result.branches.covered, 7);
    });
  });

  describe('isEmpty', () => {
    it('should return true for empty summary', () => {
      const s = new CoverageSummaryInstance(createCoverageSummary());
      assert.equal(s.isEmpty(), true);
    });

    it('should return false when any metric has totals', () => {
      const s = new CoverageSummaryInstance(createCoverageSummary());
      s.lines = { total: 1, covered: 0, skipped: 0, pct: 0 };
      assert.equal(s.isEmpty(), false);
    });
  });

  describe('toJSON', () => {
    it('should return a plain CoverageSummary object', () => {
      const s = new CoverageSummaryInstance(createCoverageSummary());
      s.lines = { total: 10, covered: 8, skipped: 0, pct: 80 };
      const json = s.toJSON();

      assert.equal(json.lines.total, 10);
      assert.equal(json.lines.covered, 8);
      assert.equal(Object.getPrototypeOf(json), Object.prototype);
    });
  });
});

describe('createCoverageSummary', () => {
  it('should return an empty summary with all zeroes', () => {
    const s = createCoverageSummary();

    assert.equal(s.lines.total, 0);
    assert.equal(s.lines.covered, 0);
    assert.equal(s.statements.total, 0);
    assert.equal(s.statements.covered, 0);
    assert.equal(s.functions.total, 0);
    assert.equal(s.functions.covered, 0);
    assert.equal(s.branches.total, 0);
    assert.equal(s.branches.covered, 0);
  });
});
