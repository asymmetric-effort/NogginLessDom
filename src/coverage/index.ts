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
  serializeCoverageMap,
  deserializeCoverageMap,
} from './coverage-map.js';
import { shouldIncludeFile } from './filter.js';
import { findIgnoreRanges, applyIgnoreRanges } from './ignore.js';
import { getChangedFiles } from './changed.js';
import { offsetToLocation } from './v8-to-istanbul.js';
import { getReporterFactory, type ReporterOptions } from './reporters/index.js';
import { IstanbulCoverageProvider } from './istanbul-provider.js';
import * as fs from 'node:fs';
import * as nodePath from 'node:path';

// Re-export source map utilities
export { loadSourceMap, SourceMapConsumer } from './source-map.js';
export type { RawSourceMap } from './source-map.js';

// Re-export types consumers need
export type {
  CoverageConfig,
  CoverageThresholds,
  GlobThresholds,
  ResolvedCoverageConfig,
} from './config.js';
export { getDefaultConfig, mergeConfig } from './config.js';
export type {
  CoverageSummary,
  FileCoverage,
  CoverageDiff,
} from './coverage-map.js';
export {
  CoverageMap,
  serializeCoverageMap,
  deserializeCoverageMap,
  mergeCoverageMaps,
  saveCoverageBaseline,
  loadCoverageBaseline,
  diffCoverage,
} from './coverage-map.js';
export { getChangedFiles } from './changed.js';
export { loadNycConfig } from './nyc-config.js';
export { shouldIncludeFile, matchesPattern } from './filter.js';
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

/** Changed files list for --changed flag filtering (Issue #54). */
let changedFilesList: string[] | undefined;

/** Per-test coverage snapshots (start snapshots keyed by test name). */
const testCoverageSnapshots = new Map<string, CoverageMap>();

/** Per-test coverage results (delta maps keyed by test name). */
const testCoverageResults = new Map<string, CoverageMap>();

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

/**
 * Filter coverage map to only include changed files (Issue #54).
 */
function filterChangedFiles(coverageMap: CoverageMap): void {
  if (!changedFilesList) return;
  const changedSet = new Set(changedFilesList.map((f) => nodePath.resolve(f)));
  coverageMap.filter((filePath) => changedSet.has(nodePath.resolve(filePath)));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Issue #96: Clean reports directory on rerun when cleanOnRerun is true
 * and coverage was previously active.
 */
export function cleanReportsDirectoryOnRerun(
  config: ResolvedCoverageConfig,
  wasActive: boolean,
): void {
  if (!config.cleanOnRerun || !wasActive) return;
  const dir = config.reportsDirectory;
  fs.rmSync(dir, { recursive: true, force: true });
}

/**
 * Issue #96: Determine whether coverage reports should be generated.
 * When thresholds failed and reportOnFailure is false, skip reporting.
 */
export function shouldReportCoverage(
  thresholdResult: ThresholdResult | undefined,
  reportOnFailure: boolean,
): boolean {
  if (!thresholdResult) return true;
  if (thresholdResult.passed) return true;
  return reportOnFailure;
}

/**
 * Issue #97: Auto-update thresholds when coverage improved.
 * Writes a `.coveragethresholds.json` file in the reports directory.
 */
export function autoUpdateThresholds(
  summary: CoverageSummary,
  thresholds: CoverageThresholds,
  reportsDirectory: string,
): void {
  if (!thresholds.autoUpdate) return;

  const metrics = ['lines', 'functions', 'branches', 'statements'] as const;
  let anyImproved = false;
  const updated: Partial<Record<(typeof metrics)[number], number>> = {};

  for (const metric of metrics) {
    const configured = thresholds[metric];
    if (configured === undefined) continue;
    const actual = summary[metric].pct;
    if (actual > configured) {
      updated[metric] = actual;
      anyImproved = true;
    } else {
      updated[metric] = configured;
    }
  }

  if (!anyImproved) return;

  fs.mkdirSync(reportsDirectory, { recursive: true });
  const filePath = nodePath.join(reportsDirectory, '.coveragethresholds.json');
  fs.writeFileSync(filePath, JSON.stringify(updated, null, 2) + '\n', 'utf-8');
}

/**
 * Start collecting code coverage.
 */
export async function startCoverage(
  config?: Partial<CoverageConfig>,
): Promise<void> {
  // Issue #96: cleanOnRerun — if coverage was previously active, clean first
  const wasActive = isCollecting;
  if (isCollecting) {
    throw new Error(
      'Coverage collection is already active. Call stopCoverage() first.',
    );
  }
  activeConfig = mergeConfig(config ?? {});

  // Issue #96: cleanOnRerun check
  cleanReportsDirectoryOnRerun(activeConfig, wasActive);

  cleanReportsDirectory(activeConfig);

  // Issue #67: custom provider module support
  if (activeConfig.customProviderModule) {
    const customModule = (await import(activeConfig.customProviderModule)) as {
      createProvider: () => V8CoverageProvider;
    };
    provider = customModule.createProvider();
    await provider.start();
  } else if (activeConfig.provider === 'istanbul') {
    const istanbulProvider = new IstanbulCoverageProvider();
    await istanbulProvider.start();
    provider = {
      async start(): Promise<void> {
        await istanbulProvider.start();
      },
      async take(): Promise<V8ScriptCoverage[]> {
        return istanbulProvider.take();
      },
      async stop(): Promise<V8ScriptCoverage[]> {
        return istanbulProvider.stop();
      },
    };
  } else {
    provider = await createV8Provider();
    await provider.start();
  }

  // Issue #54: --changed flag — store changed file list for filtering
  if (activeConfig.changed) {
    const baseBranch =
      typeof activeConfig.changed === 'string'
        ? activeConfig.changed
        : undefined;
    changedFilesList = getChangedFiles(baseBranch);
  } else {
    changedFilesList = undefined;
  }

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
  collectUncoveredFiles(coverageMap, activeConfig);
  filterChangedFiles(coverageMap);
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
  collectUncoveredFiles(coverageMap, activeConfig);
  filterChangedFiles(coverageMap);
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

  // Issue #97: auto-update thresholds if coverage improved
  if (savedConfig.thresholds?.autoUpdate && result.thresholdResult) {
    autoUpdateThresholds(
      summary,
      savedConfig.thresholds,
      savedConfig.reportsDirectory,
    );
  }

  // Issue #96: reportOnFailure — skip reporting if thresholds failed and reportOnFailure is false
  if (
    shouldReportCoverage(result.thresholdResult, savedConfig.reportOnFailure)
  ) {
    await reportCoverage(coverageMap, savedConfig);
  }

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
    const factory = getReporterFactory(reporterName);
    const options: ReporterOptions = {
      reportsDirectory: resolved.reportsDirectory ?? './coverage',
      skipFull: resolved.skipFull,
      watermarks: resolved.watermarks
        ? {
            lines: resolved.watermarks.lines ?? [50, 80],
            functions: resolved.watermarks.functions ?? [50, 80],
            branches: resolved.watermarks.branches ?? [50, 80],
            statements: resolved.watermarks.statements ?? [50, 80],
          }
        : undefined,
    };
    const reporter = factory(options);
    if (reporter.onStart) await reporter.onStart();
    await reporter.onEnd(coverageMap, summary);
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
// Per-test coverage tracking (Issue #52)
// ---------------------------------------------------------------------------

/**
 * Snapshot current coverage as the baseline for a test.
 */
export function startTestCoverage(
  testName: string,
  currentCoverage: CoverageMap,
): void {
  // Deep-clone the current coverage map by serializing/deserializing
  const snapshot = deserializeCoverageMap(
    serializeCoverageMap(currentCoverage),
  );
  testCoverageSnapshots.set(testName, snapshot);
}

/**
 * Compute the delta coverage since startTestCoverage for a given test.
 * Returns a CoverageMap representing only the coverage accumulated during the test.
 */
export function stopTestCoverage(
  testName: string,
  currentCoverage: CoverageMap,
): CoverageMap {
  const snapshot = testCoverageSnapshots.get(testName);
  if (!snapshot) {
    throw new Error(`No coverage snapshot found for test: ${testName}`);
  }
  testCoverageSnapshots.delete(testName);

  const delta = computeCoverageDelta(snapshot, currentCoverage);
  testCoverageResults.set(testName, delta);
  return delta;
}

/**
 * Get the per-test coverage result for a specific test.
 */
export function getTestCoverage(testName: string): CoverageMap | undefined {
  return testCoverageResults.get(testName);
}

/**
 * Get all per-test coverage results.
 */
export function getAllTestCoverage(): Map<string, CoverageMap> {
  return new Map(testCoverageResults);
}

/**
 * Compute the difference between a before-snapshot and an after-snapshot.
 * For each file, subtract before counts from after counts to get the delta.
 */
function computeCoverageDelta(
  before: CoverageMap,
  after: CoverageMap,
): CoverageMap {
  const delta = newCoverageMap();

  for (const filePath of after.files()) {
    const afterFc = after.fileCoverageFor(filePath);

    let beforeFc: FileCoverage | undefined;
    try {
      beforeFc = before.fileCoverageFor(filePath);
    } catch {
      // File not in before snapshot — entire coverage is delta
      delta.addFileCoverage(afterFc);
      continue;
    }

    const deltaFc: FileCoverage = {
      path: filePath,
      statementMap: { ...afterFc.statementMap },
      fnMap: { ...afterFc.fnMap },
      branchMap: { ...afterFc.branchMap },
      s: {},
      f: {},
      b: {},
    };

    // Delta for statements
    for (const key of Object.keys(afterFc.s)) {
      deltaFc.s[key] = (afterFc.s[key] ?? 0) - (beforeFc.s[key] ?? 0);
    }

    // Delta for functions
    for (const key of Object.keys(afterFc.f)) {
      deltaFc.f[key] = (afterFc.f[key] ?? 0) - (beforeFc.f[key] ?? 0);
    }

    // Delta for branches
    for (const key of Object.keys(afterFc.b)) {
      const afterArr = afterFc.b[key] ?? [];
      const beforeArr = beforeFc.b[key] ?? [];
      const deltaArr: number[] = [];
      for (let i = 0; i < afterArr.length; i++) {
        deltaArr.push((afterArr[i] ?? 0) - (beforeArr[i] ?? 0));
      }
      deltaFc.b[key] = deltaArr;
    }

    delta.addFileCoverage(deltaFc);
  }

  return delta;
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

    // Try to read source content for proper line mapping and ignore ranges
    let sourceContent: string | undefined;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require('node:fs') as {
        readFileSync(p: string, e: string): string;
      };
      sourceContent = fs.readFileSync(filePath, 'utf-8');
    } catch {
      // If we can't read the file, proceed without source content
    }

    // Convert V8 coverage to FileCoverage format with proper line mapping
    let fc = v8ToFileCoverage(filePath, script, sourceContent);

    // Apply ignore ranges if we have source content
    if (sourceContent !== undefined) {
      const ignoreRanges = findIgnoreRanges(sourceContent);
      if (ignoreRanges.length > 0) {
        fc = applyIgnoreRanges(fc, ignoreRanges);
      }
    }

    // Filter out ignored class methods from function coverage
    if (config.ignoreClassMethods.length > 0) {
      fc = filterIgnoredClassMethods(fc, config.ignoreClassMethods);
    }

    files.set(filePath, fc);
  }

  return files;
}

/**
 * Remove function coverage entries whose name matches any of the ignored class methods.
 */
function filterIgnoredClassMethods(
  fileCoverage: FileCoverage,
  ignoredMethods: string[],
): FileCoverage {
  const ignoredSet = new Set(ignoredMethods);
  const fnMap: Record<string, FunctionMapping> = {};
  const f: Record<string, number> = {};

  for (const [key, mapping] of Object.entries(fileCoverage.fnMap)) {
    if (!ignoredSet.has(mapping.name)) {
      fnMap[key] = mapping;
      f[key] = fileCoverage.f[key] ?? 0;
    }
  }

  return {
    ...fileCoverage,
    fnMap,
    f,
  };
}

function v8ToFileCoverage(
  filePath: string,
  script: V8ScriptCoverage,
  sourceContent?: string,
): FileCoverage {
  const statementMap: Record<string, Range> = {};
  const fnMap: Record<string, FunctionMapping> = {};
  const branchMap: Record<string, BranchMapping> = {};
  const s: Record<string, number> = {};
  const f: Record<string, number> = {};
  const b: Record<string, number[]> = {};

  let stmtIdx = 0;
  let fnIdx = 0;
  let branchIdx = 0;

  // Helper: convert byte offset to Location using source content when available
  const toLocation = (offset: number): { line: number; column: number } => {
    if (sourceContent !== undefined) {
      return offsetToLocation(sourceContent, offset);
    }
    return { line: 1, column: offset };
  };

  for (const fn of script.functions) {
    // Each function's first range is the function itself
    if (fn.ranges.length > 0) {
      const firstRange = fn.ranges[0]!;
      const fnKey = String(fnIdx);

      const fnStart = toLocation(firstRange.startOffset);
      const fnEnd = toLocation(firstRange.endOffset);
      const fnRange: Range = { start: fnStart, end: fnEnd };

      fnMap[fnKey] = {
        name: fn.functionName || '(anonymous)',
        decl: fnRange,
        loc: fnRange,
        line: fnStart.line,
      };
      f[fnKey] = firstRange.count;
      fnIdx++;

      // Add statement for the function range
      const fnStmtKey = String(stmtIdx);
      statementMap[fnStmtKey] = fnRange;
      s[fnStmtKey] = firstRange.count;
      stmtIdx++;

      // Process block coverage ranges as branches
      if (fn.isBlockCoverage && fn.ranges.length > 1) {
        const branchLocations: Range[] = [];
        const branchCounts: number[] = [];

        for (let i = 1; i < fn.ranges.length; i++) {
          const range = fn.ranges[i]!;
          const rangeStart = toLocation(range.startOffset);
          const rangeEnd = toLocation(range.endOffset);
          const blockRange: Range = { start: rangeStart, end: rangeEnd };

          branchLocations.push(blockRange);
          branchCounts.push(range.count);

          // Each block range is also a statement
          const sKey = String(stmtIdx);
          statementMap[sKey] = blockRange;
          s[sKey] = range.count;
          stmtIdx++;
        }

        if (branchLocations.length > 0) {
          const bKey = String(branchIdx);
          branchMap[bKey] = {
            type: 'if',
            locations: branchLocations,
            line: branchLocations[0]!.start.line,
          };
          b[bKey] = branchCounts;
          branchIdx++;
        }
      } else {
        // Non-block ranges: additional ranges are statements
        for (let i = 1; i < fn.ranges.length; i++) {
          const range = fn.ranges[i]!;
          const sKey = String(stmtIdx);

          statementMap[sKey] = {
            start: toLocation(range.startOffset),
            end: toLocation(range.endOffset),
          };
          s[sKey] = range.count;
          stmtIdx++;
        }
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

// ---------------------------------------------------------------------------
// Clean & All helpers
// ---------------------------------------------------------------------------

/**
 * Remove the reports directory if config.clean is true.
 */
export function cleanReportsDirectory(config: ResolvedCoverageConfig): void {
  if (!config.clean) return;
  const dir = config.reportsDirectory;
  fs.rmSync(dir, { recursive: true, force: true });
}

/**
 * Walk a directory recursively and collect all file paths.
 */
function walkDir(dir: string): string[] {
  const results: string[] = [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const fullPath = nodePath.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(fullPath));
    } else if (entry.isFile()) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * If config.all is true, find files matching include patterns that are not
 * already in the coverage map and add zero-count FileCoverage entries for them.
 */
export function collectUncoveredFiles(
  coverageMap: CoverageMap,
  config: ResolvedCoverageConfig,
  rootDir?: string,
): void {
  if (!config.all) return;

  const root = rootDir ?? process.cwd();
  const allFiles = walkDir(root);
  const existingFiles = new Set(coverageMap.files());

  for (const filePath of allFiles) {
    if (existingFiles.has(filePath)) continue;

    const relativePath = filePath.replace(root + '/', '');
    if (!shouldIncludeFile(relativePath, config)) continue;

    // Read the file to determine line count for the whole-file statement range
    let content: string;
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch {
      continue;
    }

    const lines = content.split('\n');
    const lineCount = lines.length;

    const fc: FileCoverage = {
      path: filePath,
      statementMap: {
        '0': {
          start: { line: 1, column: 0 },
          end: { line: lineCount, column: (lines[lineCount - 1] ?? '').length },
        },
      },
      fnMap: {},
      branchMap: {},
      s: { '0': 0 },
      f: {},
      b: {},
    };

    coverageMap.addFileCoverage(fc);
  }
}
