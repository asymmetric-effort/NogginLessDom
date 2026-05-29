/**
 * Tests for incremental coverage tracking / baseline (Feature #174).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  saveBaseline,
  loadBaseline,
  diffBaseline,
  saveBaselineHistory,
  loadBaselineHistory,
} from '../../src/coverage/baseline.js';
import type { CoverageBaseline } from '../../src/coverage/baseline.js';
import {
  createCoverageMap,
  type FileCoverage,
} from '../../src/coverage/coverage-map.js';

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'nld-baseline-'));
}

function makeFileCoverage(
  filePath: string,
  opts: {
    stmtCovered?: number;
    stmtTotal?: number;
    fnCovered?: number;
    fnTotal?: number;
  } = {},
): FileCoverage {
  const stmtTotal = opts.stmtTotal ?? 10;
  const stmtCovered = opts.stmtCovered ?? 8;
  const fnTotal = opts.fnTotal ?? 4;
  const fnCovered = opts.fnCovered ?? 3;

  const statementMap: Record<
    string,
    {
      start: { line: number; column: number };
      end: { line: number; column: number };
    }
  > = {};
  const s: Record<string, number> = {};
  for (let i = 0; i < stmtTotal; i++) {
    statementMap[String(i)] = {
      start: { line: i + 1, column: 0 },
      end: { line: i + 1, column: 80 },
    };
    s[String(i)] = i < stmtCovered ? 1 : 0;
  }

  const fnMap: Record<
    string,
    {
      name: string;
      decl: {
        start: { line: number; column: number };
        end: { line: number; column: number };
      };
      loc: {
        start: { line: number; column: number };
        end: { line: number; column: number };
      };
      line: number;
    }
  > = {};
  const f: Record<string, number> = {};
  for (let i = 0; i < fnTotal; i++) {
    fnMap[String(i)] = {
      name: `func${i}`,
      decl: {
        start: { line: i + 1, column: 0 },
        end: { line: i + 1, column: 20 },
      },
      loc: {
        start: { line: i + 1, column: 0 },
        end: { line: i + 5, column: 1 },
      },
      line: i + 1,
    };
    f[String(i)] = i < fnCovered ? 1 : 0;
  }

  return {
    path: filePath,
    statementMap,
    fnMap,
    branchMap: {},
    s,
    f,
    b: {},
  };
}

describe('Incremental coverage tracking / baseline (Feature #174)', () => {
  it('save/load baseline roundtrip', () => {
    const tmpDir = makeTmpDir();
    const baselinePath = path.join(tmpDir, 'baseline.json');

    const map = createCoverageMap();
    map.addFileCoverage(makeFileCoverage('/src/a.ts'));
    map.addFileCoverage(
      makeFileCoverage('/src/b.ts', { stmtCovered: 10, stmtTotal: 10 }),
    );

    saveBaseline(map, baselinePath);
    const loaded = loadBaseline(baselinePath);

    assert.ok(loaded);
    assert.strictEqual(loaded.version, 1);
    assert.ok(loaded.timestamp);
    assert.ok(loaded.summary['/src/a.ts']);
    assert.ok(loaded.summary['/src/b.ts']);
    assert.strictEqual(loaded.summary['/src/b.ts']!.lines, 100);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('diff computation — improved, regressed, added, removed', () => {
    const tmpDir = makeTmpDir();
    const baselinePath = path.join(tmpDir, 'baseline.json');

    // Baseline: a.ts at 80%, b.ts at 100%
    const baselineMap = createCoverageMap();
    baselineMap.addFileCoverage(
      makeFileCoverage('/src/a.ts', { stmtCovered: 8, stmtTotal: 10 }),
    );
    baselineMap.addFileCoverage(
      makeFileCoverage('/src/b.ts', { stmtCovered: 10, stmtTotal: 10 }),
    );
    saveBaseline(baselineMap, baselinePath);
    const baseline = loadBaseline(baselinePath)!;

    // Current: a.ts improved to 100%, b.ts regressed to 50%, c.ts is new, b.ts still there
    const currentMap = createCoverageMap();
    currentMap.addFileCoverage(
      makeFileCoverage('/src/a.ts', { stmtCovered: 10, stmtTotal: 10 }),
    );
    currentMap.addFileCoverage(
      makeFileCoverage('/src/b.ts', { stmtCovered: 5, stmtTotal: 10 }),
    );
    currentMap.addFileCoverage(makeFileCoverage('/src/c.ts'));

    const diff = diffBaseline(currentMap, baseline);

    // a.ts improved (statements went from 80% to 100%)
    assert.ok(diff.improved.length > 0);
    assert.ok(diff.improved.some((e) => e.file === '/src/a.ts'));

    // b.ts regressed (from 100% to 50%)
    assert.ok(diff.regressed.length > 0);
    assert.ok(diff.regressed.some((e) => e.file === '/src/b.ts'));

    // c.ts is added
    assert.ok(diff.added.includes('/src/c.ts'));

    // No files removed in current
    assert.strictEqual(diff.removed.length, 0);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('diff handles removed files', () => {
    const baseline: CoverageBaseline = {
      version: 1,
      timestamp: new Date().toISOString(),
      summary: {
        '/src/old.ts': {
          lines: 90,
          functions: 80,
          branches: 70,
          statements: 90,
        },
      },
    };

    const currentMap = createCoverageMap();
    // old.ts not in current — it was removed

    const diff = diffBaseline(currentMap, baseline);
    assert.ok(diff.removed.includes('/src/old.ts'));
    assert.strictEqual(diff.added.length, 0);
    assert.strictEqual(diff.improved.length, 0);
    assert.strictEqual(diff.regressed.length, 0);
  });

  it('history rotation at max entries', () => {
    const tmpDir = makeTmpDir();
    const historyPath = path.join(tmpDir, 'history.json');

    // Save 5 entries with max 3
    for (let i = 0; i < 5; i++) {
      const baseline: CoverageBaseline = {
        version: 1,
        timestamp: `2024-01-0${i + 1}T00:00:00.000Z`,
        summary: {},
      };
      saveBaselineHistory(baseline, historyPath, 3);
    }

    const history = loadBaselineHistory(historyPath);
    assert.strictEqual(history.length, 3);
    // Should keep the last 3
    assert.strictEqual(history[0]!.timestamp, '2024-01-03T00:00:00.000Z');
    assert.strictEqual(history[2]!.timestamp, '2024-01-05T00:00:00.000Z');

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('first run with no baseline returns null', () => {
    const result = loadBaseline('/nonexistent/path/baseline.json');
    assert.strictEqual(result, null);
  });

  it('baseline version field is 1', () => {
    const tmpDir = makeTmpDir();
    const baselinePath = path.join(tmpDir, 'baseline.json');

    const map = createCoverageMap();
    map.addFileCoverage(makeFileCoverage('/src/x.ts'));

    saveBaseline(map, baselinePath);
    const loaded = loadBaseline(baselinePath);
    assert.ok(loaded);
    assert.strictEqual(loaded.version, 1);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('loadBaseline returns null for invalid version', () => {
    const tmpDir = makeTmpDir();
    const baselinePath = path.join(tmpDir, 'baseline.json');

    fs.writeFileSync(
      baselinePath,
      JSON.stringify({ version: 99, timestamp: '', summary: {} }),
      'utf-8',
    );

    const result = loadBaseline(baselinePath);
    assert.strictEqual(result, null);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('loadBaselineHistory returns empty for missing file', () => {
    const result = loadBaselineHistory('/nonexistent/history.json');
    assert.deepStrictEqual(result, []);
  });

  it('unchanged files are tracked in diff', () => {
    const baseline: CoverageBaseline = {
      version: 1,
      timestamp: new Date().toISOString(),
      summary: {
        '/src/stable.ts': {
          lines: 80,
          functions: 75,
          branches: 100,
          statements: 80,
        },
      },
    };

    const currentMap = createCoverageMap();
    currentMap.addFileCoverage(
      makeFileCoverage('/src/stable.ts', { stmtCovered: 8, stmtTotal: 10 }),
    );

    const diff = diffBaseline(currentMap, baseline);
    assert.ok(diff.unchanged.includes('/src/stable.ts'));
  });
});
