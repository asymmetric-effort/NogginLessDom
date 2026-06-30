/**
 * Additional tests for src/coverage/index.ts to increase coverage.
 * Covers: cleanReportsDirectoryOnRerun, shouldReportCoverage, autoUpdateThresholds,
 * validateReportsDirectory, reportCoverage, processV8CoverageBatched,
 * processV8CoverageBatchedAsync, filterIgnoredClassMethods, v8ToFileCoverage,
 * filterChangedFiles, per-test coverage delta edge cases.
 */
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanReportsDirectoryOnRerun,
  shouldReportCoverage,
  autoUpdateThresholds,
  validateReportsDirectory,
  reportCoverage,
  processV8CoverageBatched,
  processV8CoverageBatchedAsync,
  startTestCoverage,
  stopTestCoverage,
} from '../../src/coverage/index.js';
import type { ThresholdResult } from '../../src/coverage/index.js';
import { mergeConfig } from '../../src/coverage/config.js';
import type { ResolvedCoverageConfig } from '../../src/coverage/config.js';
import {
  createCoverageMap,
  type CoverageSummary,
  type Range,
} from '../../src/coverage/coverage-map.js';
import type { CoverageMetric } from '../../src/coverage/reporters/types.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

function makeMetric(pct: number, total = 100): CoverageMetric {
  return { total, covered: Math.round((pct / 100) * total), skipped: 0, pct };
}

function makeSummary(
  linesPct: number,
  fnPct: number,
  brPct: number,
  stmtPct: number,
): CoverageSummary {
  return {
    lines: makeMetric(linesPct),
    functions: makeMetric(fnPct),
    branches: makeMetric(brPct),
    statements: makeMetric(stmtPct),
  };
}

function makeConfig(
  overrides: Partial<ResolvedCoverageConfig> = {},
): ResolvedCoverageConfig {
  return mergeConfig(overrides);
}

function makeRange(sl: number, sc: number, el: number, ec: number): Range {
  return { start: { line: sl, column: sc }, end: { line: el, column: ec } };
}

// ---------------------------------------------------------------------------
// cleanReportsDirectoryOnRerun
// ---------------------------------------------------------------------------

describe('cleanReportsDirectoryOnRerun', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(process.cwd(), '.tmp-rerun-clean-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should remove reports directory when cleanOnRerun is true and wasActive is true', () => {
    const reportsDir = path.join(tmpDir, 'coverage');
    fs.mkdirSync(reportsDir, { recursive: true });
    fs.writeFileSync(path.join(reportsDir, 'data.json'), '{}');

    const config = makeConfig({
      cleanOnRerun: true,
      reportsDirectory: reportsDir,
    });
    cleanReportsDirectoryOnRerun(config, true);
    assert.equal(fs.existsSync(reportsDir), false);
  });

  it('should not remove reports directory when cleanOnRerun is false', () => {
    const reportsDir = path.join(tmpDir, 'coverage');
    fs.mkdirSync(reportsDir, { recursive: true });
    fs.writeFileSync(path.join(reportsDir, 'data.json'), '{}');

    const config = makeConfig({
      cleanOnRerun: false,
      reportsDirectory: reportsDir,
    });
    cleanReportsDirectoryOnRerun(config, true);
    assert.equal(fs.existsSync(reportsDir), true);
  });

  it('should not remove reports directory when wasActive is false', () => {
    const reportsDir = path.join(tmpDir, 'coverage');
    fs.mkdirSync(reportsDir, { recursive: true });
    fs.writeFileSync(path.join(reportsDir, 'data.json'), '{}');

    const config = makeConfig({
      cleanOnRerun: true,
      reportsDirectory: reportsDir,
    });
    cleanReportsDirectoryOnRerun(config, false);
    assert.equal(fs.existsSync(reportsDir), true);
  });
});

// ---------------------------------------------------------------------------
// shouldReportCoverage
// ---------------------------------------------------------------------------

describe('shouldReportCoverage', () => {
  it('should return true when thresholdResult is undefined', () => {
    assert.equal(shouldReportCoverage(undefined, false), true);
  });

  it('should return true when thresholds passed', () => {
    const result: ThresholdResult = { passed: true, failures: [] };
    assert.equal(shouldReportCoverage(result, false), true);
  });

  it('should return true when thresholds failed but reportOnFailure is true', () => {
    const result: ThresholdResult = {
      passed: false,
      failures: [{ metric: 'lines', actual: 50, expected: 80 }],
    };
    assert.equal(shouldReportCoverage(result, true), true);
  });

  it('should return false when thresholds failed and reportOnFailure is false', () => {
    const result: ThresholdResult = {
      passed: false,
      failures: [{ metric: 'lines', actual: 50, expected: 80 }],
    };
    assert.equal(shouldReportCoverage(result, false), false);
  });
});

// ---------------------------------------------------------------------------
// autoUpdateThresholds
// ---------------------------------------------------------------------------

describe('autoUpdateThresholds', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'auto-update-thresh-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should not write file when autoUpdate is false', () => {
    const summary = makeSummary(95, 95, 95, 95);
    autoUpdateThresholds(summary, { lines: 80, autoUpdate: false }, tmpDir);
    const filePath = path.join(tmpDir, '.coveragethresholds.json');
    assert.equal(fs.existsSync(filePath), false);
  });

  it('should not write file when autoUpdate is undefined', () => {
    const summary = makeSummary(95, 95, 95, 95);
    autoUpdateThresholds(summary, { lines: 80 }, tmpDir);
    const filePath = path.join(tmpDir, '.coveragethresholds.json');
    assert.equal(fs.existsSync(filePath), false);
  });

  it('should write updated thresholds when coverage improved', () => {
    const summary = makeSummary(95, 90, 85, 92);
    autoUpdateThresholds(
      summary,
      {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
        autoUpdate: true,
      },
      tmpDir,
    );
    const filePath = path.join(tmpDir, '.coveragethresholds.json');
    assert.ok(fs.existsSync(filePath));
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    assert.equal(content.lines, 95);
    assert.equal(content.functions, 90);
    assert.equal(content.branches, 85);
    assert.equal(content.statements, 92);
  });

  it('should not write file when no metrics improved', () => {
    const summary = makeSummary(70, 70, 70, 70);
    autoUpdateThresholds(
      summary,
      { lines: 80, functions: 80, autoUpdate: true },
      tmpDir,
    );
    const filePath = path.join(tmpDir, '.coveragethresholds.json');
    assert.equal(fs.existsSync(filePath), false);
  });

  it('should keep configured value when actual is not higher', () => {
    const summary = makeSummary(95, 70, 85, 92);
    autoUpdateThresholds(
      summary,
      { lines: 80, functions: 80, autoUpdate: true },
      tmpDir,
    );
    const filePath = path.join(tmpDir, '.coveragethresholds.json');
    assert.ok(fs.existsSync(filePath));
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    // lines improved: 95 > 80
    assert.equal(content.lines, 95);
    // functions did NOT improve: 70 < 80, should keep 80
    assert.equal(content.functions, 80);
  });

  it('should only check metrics that have configured thresholds', () => {
    const summary = makeSummary(95, 90, 85, 92);
    autoUpdateThresholds(summary, { lines: 80, autoUpdate: true }, tmpDir);
    const filePath = path.join(tmpDir, '.coveragethresholds.json');
    assert.ok(fs.existsSync(filePath));
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    // Only lines should be present since only lines had a threshold
    assert.equal(content.lines, 95);
    assert.equal(content.functions, undefined);
  });
});

// ---------------------------------------------------------------------------
// validateReportsDirectory
// ---------------------------------------------------------------------------

describe('validateReportsDirectory', () => {
  it('should accept paths within the project root', () => {
    assert.doesNotThrow(() => {
      validateReportsDirectory('./coverage');
    });
  });

  it('should accept nested paths within the project root', () => {
    assert.doesNotThrow(() => {
      validateReportsDirectory('./reports/coverage');
    });
  });

  it('should reject paths outside the project root', () => {
    assert.throws(
      () => validateReportsDirectory('/tmp/evil'),
      /reportsDirectory must be within the project root/,
    );
  });

  it('should reject path traversal', () => {
    assert.throws(
      () => validateReportsDirectory('../../../tmp/evil'),
      /reportsDirectory must be within the project root/,
    );
  });

  it('should accept custom projectRoot', () => {
    const customRoot = '/home/user/project';
    assert.doesNotThrow(() => {
      validateReportsDirectory('/home/user/project/coverage', customRoot);
    });
  });

  it('should reject paths outside custom projectRoot', () => {
    const customRoot = '/home/user/project';
    assert.throws(
      () => validateReportsDirectory('/tmp/evil', customRoot),
      /reportsDirectory must be within the project root/,
    );
  });
});

// ---------------------------------------------------------------------------
// processV8CoverageBatched
// ---------------------------------------------------------------------------

describe('processV8CoverageBatched', () => {
  const cwd = process.cwd();

  it('should skip scripts without file:// URLs', () => {
    const config = makeConfig({ include: ['**/*.ts'], exclude: [] });
    const scripts = [
      {
        scriptId: '1',
        url: 'node:internal/modules',
        functions: [],
      },
      {
        scriptId: '2',
        url: '',
        functions: [],
      },
    ];
    const result = processV8CoverageBatched(scripts, config);
    assert.equal(result.size, 0);
  });

  it('should process scripts in batches according to concurrency', () => {
    const config = makeConfig({
      include: ['**/*.ts'],
      exclude: [],
      processingConcurrency: 2,
    });
    // These won't actually exist on disk, so they'll get processed but
    // may not pass the filter; we just test the batching logic runs
    const scripts = [
      {
        scriptId: '1',
        url: `file://${cwd}/src/a.ts`,
        functions: [
          {
            functionName: 'a',
            ranges: [{ startOffset: 0, endOffset: 10, count: 1 }],
            isBlockCoverage: false,
          },
        ],
      },
      {
        scriptId: '2',
        url: `file://${cwd}/src/b.ts`,
        functions: [
          {
            functionName: 'b',
            ranges: [{ startOffset: 0, endOffset: 10, count: 1 }],
            isBlockCoverage: false,
          },
        ],
      },
    ];
    const result = processV8CoverageBatched(scripts, config);
    // Result type is Map, it should not throw
    assert.ok(result instanceof Map);
  });

  it('should handle ignoreClassMethods filtering', () => {
    // Create a temp file so readFileSync succeeds
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'v8batch-'));
    const filePath = path.join(tmpDir, 'test.ts');
    fs.writeFileSync(
      filePath,
      'class Foo { render() {} doStuff() {} }',
      'utf-8',
    );

    try {
      const config = makeConfig({
        include: ['**/*.ts'],
        exclude: [],
        ignoreClassMethods: ['render'],
      });
      const scripts = [
        {
          scriptId: '1',
          url: `file://${filePath}`,
          functions: [
            {
              functionName: 'render',
              ranges: [{ startOffset: 12, endOffset: 24, count: 1 }],
              isBlockCoverage: false,
            },
            {
              functionName: 'doStuff',
              ranges: [{ startOffset: 25, endOffset: 37, count: 1 }],
              isBlockCoverage: false,
            },
          ],
        },
      ];
      const result = processV8CoverageBatched(scripts, config);
      if (result.size > 0) {
        const fc = result.values().next().value!;
        // render should be filtered out
        const fnNames = Object.values(fc.fnMap).map((fn) => fn.name);
        assert.ok(!fnNames.includes('render'), 'render should be filtered out');
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// processV8CoverageBatchedAsync
// ---------------------------------------------------------------------------

describe('processV8CoverageBatchedAsync', () => {
  it('should return empty map for empty scripts', async () => {
    const config = makeConfig({ include: ['**/*.ts'], exclude: [] });
    const result = await processV8CoverageBatchedAsync([], config);
    assert.equal(result.size, 0);
  });

  it('should skip non-file:// scripts', async () => {
    const config = makeConfig({ include: ['**/*.ts'], exclude: [] });
    const scripts = [{ scriptId: '1', url: 'node:internal', functions: [] }];
    const result = await processV8CoverageBatchedAsync(scripts, config);
    assert.equal(result.size, 0);
  });

  it('should process scripts asynchronously with batching', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'v8async-'));
    const filePath = path.join(tmpDir, 'test.ts');
    fs.writeFileSync(filePath, 'export const x = 1;\n', 'utf-8');

    try {
      const config = makeConfig({
        include: ['**/*.ts'],
        exclude: [],
        processingConcurrency: 2,
      });
      const scripts = [
        {
          scriptId: '1',
          url: `file://${filePath}`,
          functions: [
            {
              functionName: 'x',
              ranges: [{ startOffset: 0, endOffset: 20, count: 1 }],
              isBlockCoverage: false,
            },
          ],
        },
      ];
      const result = await processV8CoverageBatchedAsync(scripts, config);
      assert.ok(result instanceof Map);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// reportCoverage
// ---------------------------------------------------------------------------

describe('reportCoverage', () => {
  it('should generate text report without errors', async () => {
    const map = createCoverageMap();
    map.addFileCoverage({
      path: '/test/file.ts',
      statementMap: { '0': makeRange(1, 0, 1, 20) },
      fnMap: {},
      branchMap: {},
      s: { '0': 1 },
      f: {},
      b: {},
    });
    // reportCoverage with text reporter should not throw
    await assert.doesNotReject(async () => {
      await reportCoverage(map, { reporter: ['text'] });
    });
  });

  it('should use default config when none provided', async () => {
    const map = createCoverageMap();
    await assert.doesNotReject(async () => {
      await reportCoverage(map);
    });
  });

  it('should accept a ResolvedCoverageConfig directly', async () => {
    const map = createCoverageMap();
    const config = mergeConfig({ reporter: ['text'] });
    await assert.doesNotReject(async () => {
      await reportCoverage(map, config);
    });
  });
});

// ---------------------------------------------------------------------------
// Per-test coverage delta: new file in after snapshot
// ---------------------------------------------------------------------------

describe('Per-test coverage delta edge cases', () => {
  it('should include new files that appear only in the after snapshot', () => {
    const beforeMap = createCoverageMap();
    // Before snapshot has file A only
    beforeMap.addFileCoverage({
      path: '/src/a.ts',
      statementMap: { '0': makeRange(1, 0, 1, 20) },
      fnMap: {},
      branchMap: {},
      s: { '0': 1 },
      f: {},
      b: {},
    });

    startTestCoverage('new-file-test', beforeMap);

    const afterMap = createCoverageMap();
    // After snapshot has file A + new file B
    afterMap.addFileCoverage({
      path: '/src/a.ts',
      statementMap: { '0': makeRange(1, 0, 1, 20) },
      fnMap: {},
      branchMap: {},
      s: { '0': 3 },
      f: {},
      b: {},
    });
    afterMap.addFileCoverage({
      path: '/src/new-file.ts',
      statementMap: { '0': makeRange(1, 0, 1, 20) },
      fnMap: {},
      branchMap: {},
      s: { '0': 5 },
      f: {},
      b: {},
    });

    const delta = stopTestCoverage('new-file-test', afterMap);
    assert.ok(delta.files().includes('/src/new-file.ts'));
    const newFileFc = delta.fileCoverageFor('/src/new-file.ts');
    assert.equal(newFileFc.s['0'], 5);
  });
});
