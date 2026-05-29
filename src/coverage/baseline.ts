/**
 * Incremental coverage tracking — baseline save/load/diff (Feature #174).
 * @module coverage/baseline
 */

import * as fs from 'node:fs';
import * as nodePath from 'node:path';
import { CoverageMap, computeSummary } from './coverage-map.js';

export interface CoverageBaseline {
  version: 1;
  timestamp: string;
  summary: Record<
    string,
    { lines: number; functions: number; branches: number; statements: number }
  >;
}

export interface BaselineDiff {
  improved: Array<{ file: string; metric: string; from: number; to: number }>;
  regressed: Array<{ file: string; metric: string; from: number; to: number }>;
  added: string[];
  removed: string[];
  unchanged: string[];
}

const DEFAULT_BASELINE_PATH = './coverage/.baseline.json';
const DEFAULT_HISTORY_PATH = './coverage/.baseline-history.json';
const DEFAULT_MAX_ENTRIES = 50;

/**
 * Save a CoverageMap as a baseline file.
 */
export function saveBaseline(
  coverageMap: CoverageMap,
  filePath?: string,
): void {
  const targetPath = filePath ?? DEFAULT_BASELINE_PATH;
  const baseline = buildBaseline(coverageMap);
  const dir = nodePath.dirname(targetPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    targetPath,
    JSON.stringify(baseline, null, 2) + '\n',
    'utf-8',
  );
}

/**
 * Load a baseline from a file.
 * Returns null if the file does not exist.
 */
export function loadBaseline(filePath?: string): CoverageBaseline | null {
  const targetPath = filePath ?? DEFAULT_BASELINE_PATH;
  try {
    const content = fs.readFileSync(targetPath, 'utf-8');
    const parsed = JSON.parse(content) as CoverageBaseline;
    if (parsed.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Compute the diff between a current CoverageMap and a saved baseline.
 */
export function diffBaseline(
  current: CoverageMap,
  baseline: CoverageBaseline,
): BaselineDiff {
  const improved: BaselineDiff['improved'] = [];
  const regressed: BaselineDiff['regressed'] = [];
  const added: string[] = [];
  const removed: string[] = [];
  const unchanged: string[] = [];

  const currentFiles = new Set(current.files());
  const baselineFiles = new Set(Object.keys(baseline.summary));

  const metrics = ['lines', 'functions', 'branches', 'statements'] as const;

  // Files only in current (added)
  for (const file of currentFiles) {
    if (!baselineFiles.has(file)) {
      added.push(file);
    }
  }

  // Files only in baseline (removed)
  for (const file of baselineFiles) {
    if (!currentFiles.has(file)) {
      removed.push(file);
    }
  }

  // Files in both
  for (const file of currentFiles) {
    if (!baselineFiles.has(file)) continue;
    const baselineSummary = baseline.summary[file]!;
    const currentSummary = computeSummary(current.fileCoverageFor(file));
    let changed = false;

    for (const metric of metrics) {
      const from = baselineSummary[metric];
      const to = currentSummary[metric].pct;
      if (to > from) {
        improved.push({ file, metric, from, to });
        changed = true;
      } else if (to < from) {
        regressed.push({ file, metric, from, to });
        changed = true;
      }
    }

    if (!changed) {
      unchanged.push(file);
    }
  }

  return { improved, regressed, added, removed, unchanged };
}

/**
 * Append a baseline to the history file with rotation.
 */
export function saveBaselineHistory(
  baseline: CoverageBaseline,
  historyPath?: string,
  maxEntries?: number,
): void {
  const targetPath = historyPath ?? DEFAULT_HISTORY_PATH;
  const max = maxEntries ?? DEFAULT_MAX_ENTRIES;
  let history = loadBaselineHistory(targetPath);
  history.push(baseline);
  // Rotate: keep only the last `max` entries
  if (history.length > max) {
    history = history.slice(history.length - max);
  }
  const dir = nodePath.dirname(targetPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    targetPath,
    JSON.stringify(history, null, 2) + '\n',
    'utf-8',
  );
}

/**
 * Load the baseline history from a file.
 */
export function loadBaselineHistory(historyPath?: string): CoverageBaseline[] {
  const targetPath = historyPath ?? DEFAULT_HISTORY_PATH;
  try {
    const content = fs.readFileSync(targetPath, 'utf-8');
    return JSON.parse(content) as CoverageBaseline[];
  } catch {
    return [];
  }
}

/**
 * Build a CoverageBaseline from a CoverageMap.
 */
function buildBaseline(coverageMap: CoverageMap): CoverageBaseline {
  const summary: CoverageBaseline['summary'] = {};
  for (const file of coverageMap.files()) {
    const fileSummary = computeSummary(coverageMap.fileCoverageFor(file));
    summary[file] = {
      lines: fileSummary.lines.pct,
      functions: fileSummary.functions.pct,
      branches: fileSummary.branches.pct,
      statements: fileSummary.statements.pct,
    };
  }
  return {
    version: 1,
    timestamp: new Date().toISOString(),
    summary,
  };
}
