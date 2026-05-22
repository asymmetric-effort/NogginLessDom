/**
 * Main Coverage API — public-facing module for code coverage.
 */

import type {
  CoverageConfig,
  CoverageThresholds,
  ResolvedCoverageConfig,
} from './config.js';
import { mergeConfig } from './config.js';
import type {
  CoverageSummary,
  FileCoverage,
  Range,
  FunctionMapping,
  BranchMapping,
} from './coverage-map.js';
import {
  CoverageMap,
  createCoverageMap as newCoverageMap,
} from './coverage-map.js';
import { shouldIncludeFile } from './filter.js';
import { findIgnoreRanges, applyIgnoreRanges } from './ignore.js';

// Re-export types consumers need
export type {
  CoverageConfig,
  CoverageThresholds,
  ResolvedCoverageConfig,
} from './config.js';
export { getDefaultConfig, mergeConfig } from './config.js';
export type { CoverageSummary, FileCoverage } from './coverage-map.js';
export { CoverageMap } from './coverage-map.js';
export { shouldIncludeFile } from './filter.js';
export {
  findIgnoreRanges,
  applyIgnoreRanges,
  type IgnoreRange,
} from './ignore.js';

/**
 * Result of a threshold check failure.
 */
export interface ThresholdFailure {
  metric: string;
  actual: number;
  expected: number;
}

/**
 * Result of checking coverage thresholds.
 */
export interface ThresholdResult {
  passed: boolean;
  failures: ThresholdFailure[];
}

/**
 * Full coverage result returned by takeCoverage / stopCoverage.
 */
export interface CoverageResult {
  coverageMap: CoverageMap;
  summary: CoverageSummary;
  thresholdResult?: ThresholdResult;
}

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

/** Active resolved config, set by startCoverage. */
let activeConfig: ResolvedCoverageConfig | undefined;

/** Whether coverage collection is currently active. */
let isCollecting = false;

// ---------------------------------------------------------------------------
// V8 Coverage Provider (thin wrapper around node:inspector/promises)
// ---------------------------------------------------------------------------

interface V8CoverageProvider {
  start(): Promise<void>;
  take(): Promise<V8ScriptCoverage[]>;
  stop(): Promise<V8ScriptCoverage[]>;
}

interface V8ScriptCoverage {
  scriptId: string;
  url: string;
  functions: V8FunctionCoverage[];
}

interface V8FunctionCoverage {
  functionName: string;
  ranges: V8CoverageRange[];
  isBlockCoverage: boolean;
}

interface V8CoverageRange {
  startOffset: number;
  endOffset: number;
  count: number;
}

async function createV8Provider(): Promise<V8CoverageProvider> {
  // Dynamic import since node:inspector/promises may not be available in all runtimes
  let session:
    | {
        post(
          method: string,
          params?: Record<string, unknown>,
        ): Promise<Record<string, unknown>>;
      }
    | undefined;

  return {
    async start(): Promise<void> {
      try {
        const inspector = await import('node:inspector/promises');
        const sess = new inspector.Session();
        sess.connect();
        session = sess as unknown as typeof session;
        await session!.post('Profiler.enable');
        await session!.post('Profiler.startPreciseCoverage', {
          callCount: true,
          detailed: true,
        });
      } catch {
        // V8 inspector not available (e.g. Bun) — silently degrade
        session = undefined;
      }
    },

    async take(): Promise<V8ScriptCoverage[]> {
      if (!session) return [];
      try {
        const result = await session.post('Profiler.takePreciseCoverage');
        return (result as { result?: V8ScriptCoverage[] }).result ?? [];
      } catch {
        return [];
      }
    },

    async stop(): Promise<V8ScriptCoverage[]> {
      if (!session) return [];
      try {
        const result = await session.post('Profiler.takePreciseCoverage');
        await session.post('Profiler.stopPreciseCoverage');
        await session.post('Profiler.disable');
        return (result as { result?: V8ScriptCoverage[] }).result ?? [];
      } catch {
        return [];
      }
    },
  };
}

let provider: V8CoverageProvider | undefined;

// ---------------------------------------------------------------------------
// Coverage Map helper
// ---------------------------------------------------------------------------

function buildCoverageMap(files: Map<string, FileCoverage>): CoverageMap {
  const map = newCoverageMap();
  for (const fc of files.values()) {
    map.addFileCoverage(fc);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Start collecting code coverage.
 */
export async function startCoverage(
  config?: Partial<CoverageConfig>,
): Promise<void> {
  if (isCollecting) {
    throw new Error(
      'Coverage collection is already active. Call stopCoverage() first.',
    );
  }
  activeConfig = mergeConfig(config ?? {});
  provider = await createV8Provider();
  await provider.start();
  isCollecting = true;
}

/**
 * Take a coverage snapshot without stopping collection.
 */
export async function takeCoverage(): Promise<CoverageResult> {
  if (!isCollecting || !provider || !activeConfig) {
    throw new Error(
      'Coverage collection is not active. Call startCoverage() first.',
    );
  }

  const v8Data = await provider.take();
  const filesMap = processV8Coverage(v8Data, activeConfig);
  const coverageMap = buildCoverageMap(filesMap);
  const summary = coverageMap.toSummary();

  const result: CoverageResult = { coverageMap, summary };

  if (activeConfig.thresholds) {
    result.thresholdResult = checkCoverageThresholds(
      summary,
      activeConfig.thresholds,
    );
  }

  return result;
}

/**
 * Stop coverage collection and generate reports.
 */
export async function stopCoverage(): Promise<CoverageResult> {
  if (!isCollecting || !provider || !activeConfig) {
    throw new Error(
      'Coverage collection is not active. Call startCoverage() first.',
    );
  }

  const v8Data = await provider.stop();
  const filesMap = processV8Coverage(v8Data, activeConfig);
  const coverageMap = buildCoverageMap(filesMap);
  const summary = coverageMap.toSummary();

  const result: CoverageResult = { coverageMap, summary };

  if (activeConfig.thresholds) {
    result.thresholdResult = checkCoverageThresholds(
      summary,
      activeConfig.thresholds,
    );
  }

  isCollecting = false;
  provider = undefined;
  const savedConfig = activeConfig;
  activeConfig = undefined;

  // Generate reports
  await reportCoverage(coverageMap, savedConfig);

  return result;
}

/**
 * Generate coverage reports from a CoverageMap.
 */
export async function reportCoverage(
  coverageMap: CoverageMap,
  config?: Partial<CoverageConfig>,
): Promise<void> {
  const resolved = config
    ? 'reporter' in config && 'reportsDirectory' in config
      ? (config as ResolvedCoverageConfig)
      : mergeConfig(config)
    : mergeConfig({});

  const summary = coverageMap.toSummary();

  for (const reporterName of resolved.reporter ?? ['text']) {
    if (reporterName === 'text') {
      printTextReport(coverageMap, summary);
    }
    // Other reporters (json, html, lcov) would be handled here
  }
}

/**
 * Check coverage thresholds.
 */
export function checkCoverageThresholds(
  summary: CoverageSummary,
  thresholds: CoverageThresholds,
): ThresholdResult {
  const failures: ThresholdFailure[] = [];
  const metrics = ['lines', 'functions', 'branches', 'statements'] as const;

  for (const metric of metrics) {
    const threshold = thresholds[metric];
    if (threshold !== undefined) {
      const actual = summary[metric].pct;
      if (actual < threshold) {
        failures.push({ metric, actual, expected: threshold });
      }
    }
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function processV8Coverage(
  scripts: V8ScriptCoverage[],
  config: ResolvedCoverageConfig,
): Map<string, FileCoverage> {
  const files = new Map<string, FileCoverage>();

  for (const script of scripts) {
    // Filter out non-file URLs and internal scripts
    if (!script.url || !script.url.startsWith('file://')) continue;

    const filePath = script.url.replace('file://', '');
    const relativePath = filePath.replace(process.cwd() + '/', '');

    if (!shouldIncludeFile(relativePath, config)) continue;

    // Convert V8 coverage to FileCoverage format
    const fc = v8ToFileCoverage(filePath, script);

    // Apply ignore ranges if we can read the source
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require('node:fs') as {
        readFileSync(p: string, e: string): string;
      };
      const source = fs.readFileSync(filePath, 'utf-8');
      const ignoreRanges = findIgnoreRanges(source);
      if (ignoreRanges.length > 0) {
        files.set(filePath, applyIgnoreRanges(fc, ignoreRanges));
        continue;
      }
    } catch {
      // If we can't read the file, use as-is
    }

    files.set(filePath, fc);
  }

  return files;
}

function v8ToFileCoverage(
  filePath: string,
  script: V8ScriptCoverage,
): FileCoverage {
  const statementMap: Record<string, Range> = {};
  const fnMap: Record<string, FunctionMapping> = {};
  const branchMap: Record<string, BranchMapping> = {};
  const s: Record<string, number> = {};
  const f: Record<string, number> = {};
  const b: Record<string, number[]> = {};

  let stmtIdx = 0;
  let fnIdx = 0;

  for (const fn of script.functions) {
    // Each function's first range is the function itself
    if (fn.ranges.length > 0) {
      const firstRange = fn.ranges[0]!;
      const fnKey = String(fnIdx);

      fnMap[fnKey] = {
        name: fn.functionName || '(anonymous)',
        decl: {
          start: { line: 1, column: firstRange.startOffset },
          end: { line: 1, column: firstRange.endOffset },
        },
        loc: {
          start: { line: 1, column: firstRange.startOffset },
          end: { line: 1, column: firstRange.endOffset },
        },
        line: 1,
      };
      f[fnKey] = firstRange.count;
      fnIdx++;

      // Additional ranges are branches/statements
      for (let i = 1; i < fn.ranges.length; i++) {
        const range = fn.ranges[i]!;
        const sKey = String(stmtIdx);

        statementMap[sKey] = {
          start: { line: 1, column: range.startOffset },
          end: { line: 1, column: range.endOffset },
        };
        s[sKey] = range.count;
        stmtIdx++;
      }
    }
  }

  return {
    path: filePath,
    statementMap,
    fnMap,
    branchMap,
    s,
    f,
    b,
  };
}

function printTextReport(
  coverageMap: CoverageMap,
  summary: CoverageSummary,
): void {
  const files = coverageMap.files();
  if (files.length === 0) return;

  /* eslint-disable no-console */
  const separator = '-'.repeat(80);
  console.log(separator);
  console.log('Coverage Summary:');
  console.log(separator);
  console.log(
    `  Statements : ${summary.statements.pct}% (${summary.statements.covered}/${summary.statements.total})`,
  );
  console.log(
    `  Branches   : ${summary.branches.pct}% (${summary.branches.covered}/${summary.branches.total})`,
  );
  console.log(
    `  Functions  : ${summary.functions.pct}% (${summary.functions.covered}/${summary.functions.total})`,
  );
  console.log(
    `  Lines      : ${summary.lines.pct}% (${summary.lines.covered}/${summary.lines.total})`,
  );
  console.log(separator);
  /* eslint-enable no-console */
}
