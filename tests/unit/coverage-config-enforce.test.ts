import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as nodePath from 'node:path';
import { shouldIncludeFile } from '../../src/coverage/filter.js';
import { autoUpdateThresholds } from '../../src/coverage/index.js';
import { mergeConfig } from '../../src/coverage/config.js';
import type {
  CoverageConfig,
  CoverageThresholds,
} from '../../src/coverage/config.js';
import type { CoverageSummary } from '../../src/coverage/coverage-map.js';
import type { CoverageMetric } from '../../src/coverage/reporters/types.js';

function makeConfig(overrides: Partial<CoverageConfig> = {}): CoverageConfig {
  return {
    enabled: true,
    provider: 'v8',
    include: ['**/*.ts', '**/*.js'],
    exclude: [],
    reportsDirectory: './coverage',
    reporter: ['text'],
    clean: true,
    skipFull: false,
    all: false,
    watermarks: {
      lines: [50, 80],
      functions: [50, 80],
      branches: [50, 80],
      statements: [50, 80],
    },
    ...overrides,
  };
}

function makeMetric(pct: number): CoverageMetric {
  return { total: 100, covered: pct, skipped: 0, pct };
}

function makeSummary(
  overrides: Partial<
    Record<'lines' | 'functions' | 'branches' | 'statements', number>
  > = {},
): CoverageSummary {
  return {
    lines: makeMetric(overrides.lines ?? 80),
    statements: makeMetric(overrides.statements ?? 80),
    functions: makeMetric(overrides.functions ?? 80),
    branches: makeMetric(overrides.branches ?? 80),
  };
}

// ---------------------------------------------------------------------------
// Issue #96: shouldIncludeFile — allowExternal
// ---------------------------------------------------------------------------

describe('Issue #96: allowExternal enforcement', () => {
  it('should reject files outside process.cwd() when allowExternal is false', () => {
    const config = makeConfig({ allowExternal: false });
    // An absolute path outside cwd
    const externalPath = '/some/external/project/file.ts';
    assert.equal(shouldIncludeFile(externalPath, config), false);
  });

  it('should accept files outside process.cwd() when allowExternal is true', () => {
    const config = makeConfig({ allowExternal: true, include: ['**/*.ts'] });
    // A path that looks external (absolute) — with allowExternal true, should pass through
    const externalPath = '/some/external/project/file.ts';
    assert.equal(shouldIncludeFile(externalPath, config), true);
  });

  it('should accept files inside process.cwd() when allowExternal is false', () => {
    const config = makeConfig({ allowExternal: false });
    // Relative path is considered inside the project
    assert.equal(shouldIncludeFile('src/index.ts', config), true);
  });
});

// ---------------------------------------------------------------------------
// Issue #96: shouldIncludeFile — extension filtering
// ---------------------------------------------------------------------------

describe('Issue #96: extension filtering', () => {
  it('should reject files with extensions not in config.extension', () => {
    const config = makeConfig({
      extension: ['.ts', '.js'],
      include: ['**/*'],
    });
    assert.equal(shouldIncludeFile('src/data.json', config), false);
  });

  it('should accept files with extensions in config.extension', () => {
    const config = makeConfig({
      extension: ['.ts', '.js'],
      include: ['**/*.ts'],
    });
    assert.equal(shouldIncludeFile('src/index.ts', config), true);
  });

  it('should accept files with .jsx when .jsx is in extensions', () => {
    const config = makeConfig({
      extension: ['.ts', '.js', '.jsx'],
      include: ['**/*.jsx'],
    });
    assert.equal(shouldIncludeFile('src/App.jsx', config), true);
  });

  it('should skip extension check when extension array is not provided', () => {
    const config = makeConfig({ include: ['**/*'] });
    // No extension property set — should not filter by extension
    delete config.extension;
    assert.equal(shouldIncludeFile('src/data.json', config), true);
  });

  it('should skip extension check when extension array is empty', () => {
    const config = makeConfig({ extension: [], include: ['**/*'] });
    assert.equal(shouldIncludeFile('src/data.json', config), true);
  });
});

// ---------------------------------------------------------------------------
// Issue #96: cleanOnRerun
// ---------------------------------------------------------------------------

describe('Issue #96: cleanOnRerun enforcement', () => {
  it('should clean reports directory when cleanOnRerun is true and wasActive is true', () => {
    const tmpDir = nodePath.join(
      process.cwd(),
      '.tmp-test-cleanOnRerun-' + Date.now(),
    );
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.writeFileSync(nodePath.join(tmpDir, 'test.txt'), 'data');

    const config = mergeConfig({
      cleanOnRerun: true,
      reportsDirectory: tmpDir,
    });

    // cleanReportsDirectoryOnRerun should remove the dir
    cleanReportsDirectoryOnRerun(config, true);
    assert.equal(fs.existsSync(tmpDir), false);
  });

  it('should NOT clean reports directory when cleanOnRerun is false', () => {
    const tmpDir = nodePath.join(
      process.cwd(),
      '.tmp-test-cleanOnRerun-no-' + Date.now(),
    );
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.writeFileSync(nodePath.join(tmpDir, 'test.txt'), 'data');

    const config = mergeConfig({
      cleanOnRerun: false,
      reportsDirectory: tmpDir,
    });

    cleanReportsDirectoryOnRerun(config, true);
    assert.equal(fs.existsSync(tmpDir), true);

    // Cleanup
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should NOT clean reports directory when wasActive is false', () => {
    const tmpDir = nodePath.join(
      process.cwd(),
      '.tmp-test-cleanOnRerun-inactive-' + Date.now(),
    );
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.writeFileSync(nodePath.join(tmpDir, 'test.txt'), 'data');

    const config = mergeConfig({
      cleanOnRerun: true,
      reportsDirectory: tmpDir,
    });

    cleanReportsDirectoryOnRerun(config, false);
    assert.equal(fs.existsSync(tmpDir), true);

    // Cleanup
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});

// We need to import this after it's created
import { cleanReportsDirectoryOnRerun } from '../../src/coverage/index.js';

// ---------------------------------------------------------------------------
// Issue #96: reportOnFailure
// ---------------------------------------------------------------------------

describe('Issue #96: reportOnFailure', () => {
  it('should return shouldReport=true when thresholds passed', () => {
    const thresholdResult = { passed: true, failures: [] };
    assert.equal(shouldReportCoverage(thresholdResult, true), true);
    assert.equal(shouldReportCoverage(thresholdResult, false), true);
  });

  it('should return shouldReport=true when thresholds failed AND reportOnFailure is true', () => {
    const thresholdResult = {
      passed: false,
      failures: [{ metric: 'lines', actual: 50, expected: 80 }],
    };
    assert.equal(shouldReportCoverage(thresholdResult, true), true);
  });

  it('should return shouldReport=false when thresholds failed AND reportOnFailure is false', () => {
    const thresholdResult = {
      passed: false,
      failures: [{ metric: 'lines', actual: 50, expected: 80 }],
    };
    assert.equal(shouldReportCoverage(thresholdResult, false), false);
  });

  it('should return shouldReport=true when no threshold result', () => {
    assert.equal(shouldReportCoverage(undefined, false), true);
    assert.equal(shouldReportCoverage(undefined, true), true);
  });
});

import { shouldReportCoverage } from '../../src/coverage/index.js';

// ---------------------------------------------------------------------------
// Issue #97: autoUpdateThresholds
// ---------------------------------------------------------------------------

describe('Issue #97: threshold autoUpdate write-back', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = nodePath.join(process.cwd(), '.tmp-test-autoupdate-' + Date.now());
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should write .coveragethresholds.json when coverage improved', () => {
    const summary = makeSummary({
      lines: 90,
      functions: 85,
      branches: 88,
      statements: 92,
    });
    const thresholds: CoverageThresholds = {
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
      autoUpdate: true,
    };

    autoUpdateThresholds(summary, thresholds, tmpDir);

    const filePath = nodePath.join(tmpDir, '.coveragethresholds.json');
    assert.equal(fs.existsSync(filePath), true);

    const written = JSON.parse(
      fs.readFileSync(filePath, 'utf-8'),
    ) as CoverageThresholds;
    assert.equal(written.lines, 90);
    assert.equal(written.functions, 85);
    assert.equal(written.branches, 88);
    assert.equal(written.statements, 92);
  });

  it('should not write file when autoUpdate is false', () => {
    const summary = makeSummary({ lines: 90 });
    const thresholds: CoverageThresholds = {
      lines: 80,
      autoUpdate: false,
    };

    autoUpdateThresholds(summary, thresholds, tmpDir);

    const filePath = nodePath.join(tmpDir, '.coveragethresholds.json');
    assert.equal(fs.existsSync(filePath), false);
  });

  it('should not write file when autoUpdate is undefined', () => {
    const summary = makeSummary({ lines: 90 });
    const thresholds: CoverageThresholds = {
      lines: 80,
    };

    autoUpdateThresholds(summary, thresholds, tmpDir);

    const filePath = nodePath.join(tmpDir, '.coveragethresholds.json');
    assert.equal(fs.existsSync(filePath), false);
  });

  it('should not write file when coverage did not improve', () => {
    const summary = makeSummary({
      lines: 70,
      functions: 70,
      branches: 70,
      statements: 70,
    });
    const thresholds: CoverageThresholds = {
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
      autoUpdate: true,
    };

    autoUpdateThresholds(summary, thresholds, tmpDir);

    const filePath = nodePath.join(tmpDir, '.coveragethresholds.json');
    assert.equal(fs.existsSync(filePath), false);
  });

  it('should only update metrics that improved', () => {
    const summary = makeSummary({
      lines: 90,
      functions: 75, // below threshold
      branches: 85,
      statements: 80, // equal to threshold, not improved
    });
    const thresholds: CoverageThresholds = {
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
      autoUpdate: true,
    };

    autoUpdateThresholds(summary, thresholds, tmpDir);

    const filePath = nodePath.join(tmpDir, '.coveragethresholds.json');
    assert.equal(fs.existsSync(filePath), true);

    const written = JSON.parse(
      fs.readFileSync(filePath, 'utf-8'),
    ) as CoverageThresholds;
    // lines improved: 80 -> 90
    assert.equal(written.lines, 90);
    // functions did not improve (75 < 80) — keep original
    assert.equal(written.functions, 80);
    // branches improved: 80 -> 85
    assert.equal(written.branches, 85);
    // statements equal — not improved, keep original
    assert.equal(written.statements, 80);
  });

  it('should handle partial thresholds (only some metrics configured)', () => {
    const summary = makeSummary({ lines: 95, functions: 90 });
    const thresholds: CoverageThresholds = {
      lines: 80,
      autoUpdate: true,
    };

    autoUpdateThresholds(summary, thresholds, tmpDir);

    const filePath = nodePath.join(tmpDir, '.coveragethresholds.json');
    assert.equal(fs.existsSync(filePath), true);

    const written = JSON.parse(
      fs.readFileSync(filePath, 'utf-8'),
    ) as CoverageThresholds;
    assert.equal(written.lines, 95);
    // functions was not configured, should not appear
    assert.equal(written.functions, undefined);
  });

  it('should create reportsDirectory if it does not exist', () => {
    const nestedDir = nodePath.join(tmpDir, 'nested', 'deep');
    const summary = makeSummary({ lines: 90 });
    const thresholds: CoverageThresholds = {
      lines: 80,
      autoUpdate: true,
    };

    autoUpdateThresholds(summary, thresholds, nestedDir);

    const filePath = nodePath.join(nestedDir, '.coveragethresholds.json');
    assert.equal(fs.existsSync(filePath), true);
  });
});
