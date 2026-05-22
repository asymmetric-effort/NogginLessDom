import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  createCoverageMap,
  saveCoverageBaseline,
  loadCoverageBaseline,
  diffCoverage,
  type FileCoverage,
  type CoverageDiff,
} from '../../src/coverage/coverage-map.js';

function makeFileCoverage(
  filePath: string,
  stmtCounts: number[],
): FileCoverage {
  const statementMap: Record<
    string,
    {
      start: { line: number; column: number };
      end: { line: number; column: number };
    }
  > = {};
  const s: Record<string, number> = {};
  for (let i = 0; i < stmtCounts.length; i++) {
    const key = String(i);
    statementMap[key] = {
      start: { line: i + 1, column: 0 },
      end: { line: i + 1, column: 20 },
    };
    s[key] = stmtCounts[i]!;
  }
  return {
    path: filePath,
    statementMap,
    fnMap: {},
    branchMap: {},
    s,
    f: {},
    b: {},
  };
}

describe('saveCoverageBaseline / loadCoverageBaseline (Issue #61)', () => {
  it('roundtrips a CoverageMap through save and load', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cov-baseline-'));
    const baselinePath = path.join(tmpDir, 'baseline.json');

    const map = createCoverageMap();
    map.addFileCoverage(makeFileCoverage('/src/a.ts', [1, 0, 3]));
    map.addFileCoverage(makeFileCoverage('/src/b.ts', [0, 0, 0]));

    saveCoverageBaseline(map, baselinePath);

    const loaded = loadCoverageBaseline(baselinePath);
    assert.ok(loaded !== null);
    assert.deepEqual(loaded.files().sort(), ['/src/a.ts', '/src/b.ts']);

    const aFc = loaded.fileCoverageFor('/src/a.ts');
    assert.equal(aFc.s['0'], 1);
    assert.equal(aFc.s['1'], 0);
    assert.equal(aFc.s['2'], 3);

    // Cleanup
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('loadCoverageBaseline returns null for non-existent file', () => {
    const result = loadCoverageBaseline('/tmp/nonexistent-baseline-xyz.json');
    assert.equal(result, null);
  });
});

describe('diffCoverage (Issue #61)', () => {
  it('detects improved files', () => {
    const before = createCoverageMap();
    before.addFileCoverage(makeFileCoverage('/src/a.ts', [0, 0, 0]));

    const after = createCoverageMap();
    after.addFileCoverage(makeFileCoverage('/src/a.ts', [1, 1, 1]));

    const diff: CoverageDiff = diffCoverage(before, after);
    assert.ok(diff.improved.includes('/src/a.ts'));
    assert.equal(diff.regressed.length, 0);
    assert.equal(diff.added.length, 0);
    assert.equal(diff.removed.length, 0);
  });

  it('detects regressed files', () => {
    const before = createCoverageMap();
    before.addFileCoverage(makeFileCoverage('/src/a.ts', [1, 1, 1]));

    const after = createCoverageMap();
    after.addFileCoverage(makeFileCoverage('/src/a.ts', [0, 0, 0]));

    const diff: CoverageDiff = diffCoverage(before, after);
    assert.ok(diff.regressed.includes('/src/a.ts'));
    assert.equal(diff.improved.length, 0);
  });

  it('detects added files', () => {
    const before = createCoverageMap();
    const after = createCoverageMap();
    after.addFileCoverage(makeFileCoverage('/src/new.ts', [1, 1]));

    const diff: CoverageDiff = diffCoverage(before, after);
    assert.ok(diff.added.includes('/src/new.ts'));
    assert.equal(diff.removed.length, 0);
  });

  it('detects removed files', () => {
    const before = createCoverageMap();
    before.addFileCoverage(makeFileCoverage('/src/old.ts', [1, 1]));

    const after = createCoverageMap();

    const diff: CoverageDiff = diffCoverage(before, after);
    assert.ok(diff.removed.includes('/src/old.ts'));
    assert.equal(diff.added.length, 0);
  });

  it('provides before/after/delta summaries', () => {
    const before = createCoverageMap();
    before.addFileCoverage(makeFileCoverage('/src/a.ts', [1, 0]));

    const after = createCoverageMap();
    after.addFileCoverage(makeFileCoverage('/src/a.ts', [1, 1]));

    const diff: CoverageDiff = diffCoverage(before, after);
    assert.ok(diff.summary.before.lines.pct < diff.summary.after.lines.pct);
    assert.ok(diff.summary.delta.lines.pct > 0);
  });

  it('handles unchanged files (no improve/regress)', () => {
    const before = createCoverageMap();
    before.addFileCoverage(makeFileCoverage('/src/a.ts', [1, 0, 1]));

    const after = createCoverageMap();
    after.addFileCoverage(makeFileCoverage('/src/a.ts', [1, 0, 1]));

    const diff: CoverageDiff = diffCoverage(before, after);
    assert.equal(diff.improved.length, 0);
    assert.equal(diff.regressed.length, 0);
    assert.equal(diff.added.length, 0);
    assert.equal(diff.removed.length, 0);
  });
});
