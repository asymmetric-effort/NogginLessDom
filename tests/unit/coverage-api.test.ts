import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkCoverageThresholds,
  startCoverage,
  collectUncoveredFiles,
} from '../../src/coverage/index.js';
import { getDefaultConfig, mergeConfig } from '../../src/coverage/config.js';
import type {
  CoverageSummary,
  CoverageMetric,
} from '../../src/coverage/reporters/types.js';
import type { CoverageThresholds } from '../../src/coverage/config.js';
import { createCoverageMap } from '../../src/coverage/coverage-map.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

function makeMetric(pct: number): CoverageMetric {
  return { total: 100, covered: pct, skipped: 0, pct };
}

function makeSummary(pct: number): CoverageSummary {
  return {
    lines: makeMetric(pct),
    statements: makeMetric(pct),
    functions: makeMetric(pct),
    branches: makeMetric(pct),
  };
}

describe('Coverage API', () => {
  describe('config defaults', () => {
    it('should apply default config values', () => {
      const config = getDefaultConfig();
      assert.equal(config.enabled, false);
      assert.equal(config.provider, 'v8');
      assert.ok(Array.isArray(config.include));
      assert.ok(Array.isArray(config.exclude));
      assert.equal(config.reportsDirectory, './coverage');
      assert.equal(config.clean, true);
      assert.equal(config.skipFull, false);
      assert.equal(config.all, false);
    });

    it('should return fresh config each time', () => {
      const a = getDefaultConfig();
      const b = getDefaultConfig();
      assert.notEqual(a, b);
      assert.deepEqual(a, b);
    });
  });

  describe('checkCoverageThresholds', () => {
    it('should pass when all metrics exceed thresholds', () => {
      const summary = makeSummary(90);
      const thresholds: CoverageThresholds = {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      };
      const result = checkCoverageThresholds(summary, thresholds);
      assert.equal(result.passed, true);
      assert.equal(result.failures.length, 0);
    });

    it('should fail when a metric is below threshold', () => {
      const summary = makeSummary(50);
      const thresholds: CoverageThresholds = {
        lines: 80,
      };
      const result = checkCoverageThresholds(summary, thresholds);
      assert.equal(result.passed, false);
      assert.ok(result.failures.length > 0);
      assert.ok(result.failures.some((f) => f.metric === 'lines'));
    });

    it('should pass when metric exactly meets threshold', () => {
      const summary = makeSummary(80);
      const thresholds: CoverageThresholds = {
        lines: 80,
        functions: 80,
      };
      const result = checkCoverageThresholds(summary, thresholds);
      assert.equal(result.passed, true);
    });

    it('should report multiple failures', () => {
      const summary = makeSummary(50);
      const thresholds: CoverageThresholds = {
        lines: 80,
        functions: 80,
        branches: 80,
      };
      const result = checkCoverageThresholds(summary, thresholds);
      assert.equal(result.passed, false);
      assert.equal(result.failures.length, 3);
    });

    it('should only check specified thresholds', () => {
      const summary: CoverageSummary = {
        lines: makeMetric(90),
        statements: makeMetric(10),
        functions: makeMetric(10),
        branches: makeMetric(10),
      };
      const thresholds: CoverageThresholds = {
        lines: 80,
      };
      const result = checkCoverageThresholds(summary, thresholds);
      assert.equal(result.passed, true);
      assert.equal(result.failures.length, 0);
    });

    it('should include actual and expected in failure details', () => {
      const summary = makeSummary(50);
      const thresholds: CoverageThresholds = {
        lines: 80,
      };
      const result = checkCoverageThresholds(summary, thresholds);
      const failure = result.failures[0]!;
      assert.equal(failure.metric, 'lines');
      assert.equal(failure.actual, 50);
      assert.equal(failure.expected, 80);
    });
  });

  describe('startCoverage / stopCoverage lifecycle', () => {
    // These tests verify the module exports exist and have correct signatures.
    // Actual V8 inspector integration may not work in Bun, so we test at the API level.
    it('should export startCoverage as a function', async () => {
      const mod = await import('../../src/coverage/index.js');
      assert.equal(typeof mod.startCoverage, 'function');
    });

    it('should export stopCoverage as a function', async () => {
      const mod = await import('../../src/coverage/index.js');
      assert.equal(typeof mod.stopCoverage, 'function');
    });

    it('should export takeCoverage as a function', async () => {
      const mod = await import('../../src/coverage/index.js');
      assert.equal(typeof mod.takeCoverage, 'function');
    });

    it('should export reportCoverage as a function', async () => {
      const mod = await import('../../src/coverage/index.js');
      assert.equal(typeof mod.reportCoverage, 'function');
    });
  });

  // GHSA-hvjq-3qmw-6667: Code execution via customProviderModule
  describe('customProviderModule path validation', () => {
    it('should reject customProviderModule outside project directory', async () => {
      await assert.rejects(
        () =>
          startCoverage({
            enabled: true,
            customProviderModule: '/etc/evil-module.js',
          }),
        /customProviderModule must be within the project directory/,
      );
    });

    it('should reject customProviderModule with path traversal', async () => {
      await assert.rejects(
        () =>
          startCoverage({
            enabled: true,
            customProviderModule: '../../../etc/evil-module.js',
          }),
        /customProviderModule must be within the project directory/,
      );
    });
  });

  // GHSA-97hj-3rh3-3wjm: Symlink following in walkDir
  describe('walkDir symlink protection', () => {
    it('should skip symlinks when collecting uncovered files', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'walkdir-test-'));
      const realDir = path.join(tmpDir, 'real');
      const symlinkDir = path.join(tmpDir, 'link');
      const realFile = path.join(realDir, 'file.ts');

      fs.mkdirSync(realDir, { recursive: true });
      fs.writeFileSync(realFile, 'export const x = 1;', 'utf-8');
      fs.symlinkSync(realDir, symlinkDir);

      const config = mergeConfig({
        all: true,
        include: ['**/*.ts'],
        exclude: [],
      });
      const map = createCoverageMap();

      try {
        collectUncoveredFiles(map, config, tmpDir);
        // The file from the real dir should be found
        const files = map.files();
        const hasRealFile = files.some((f) => f.includes('real/file.ts'));
        assert.ok(hasRealFile, 'should find files in real directories');
        // The symlinked copy should NOT appear as a separate file
        const hasSymlinkFile = files.some((f) => f.includes('link/file.ts'));
        assert.strictEqual(hasSymlinkFile, false, 'should not follow symlinks');
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });
});
