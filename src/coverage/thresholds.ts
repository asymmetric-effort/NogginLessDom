import type { CoverageThresholds, GlobThresholds } from './config.js';
import type { CoverageSummary } from './coverage-map.js';
import { CoverageMap, computeSummary } from './coverage-map.js';
import { matchesPattern } from './filter.js';

export interface ThresholdResult {
  passed: boolean;
  failures: string[];
}

type MetricKey = 'lines' | 'functions' | 'branches' | 'statements';

const METRIC_KEYS: MetricKey[] = [
  'lines',
  'functions',
  'branches',
  'statements',
];

/**
 * Resolve effective metric thresholds, applying the `100` shorthand.
 * When `thresholds[100]` is true, all four metrics default to 100
 * unless explicitly overridden.
 */
function resolveMetricThresholds(
  thresholds: CoverageThresholds,
): Record<MetricKey, number | undefined> {
  const use100 = thresholds[100] === true;
  return {
    lines: thresholds.lines ?? (use100 ? 100 : undefined),
    functions: thresholds.functions ?? (use100 ? 100 : undefined),
    branches: thresholds.branches ?? (use100 ? 100 : undefined),
    statements: thresholds.statements ?? (use100 ? 100 : undefined),
  };
}

export function checkThresholds(
  summary: CoverageSummary,
  thresholds: CoverageThresholds,
): ThresholdResult {
  const failures: string[] = [];
  const resolved = resolveMetricThresholds(thresholds);

  for (const key of METRIC_KEYS) {
    const threshold = resolved[key];
    if (threshold !== undefined) {
      const actual = summary[key].pct;
      if (actual < threshold) {
        failures.push(
          `Coverage for ${key} (${actual.toFixed(2)}%) does not meet threshold (${threshold}%)`,
        );
      }
    }
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}

/**
 * Check per-file thresholds, including glob-pattern-specific overrides.
 */
export function checkPerFileThresholds(
  coverageMap: CoverageMap,
  thresholds: CoverageThresholds,
): ThresholdResult {
  const failures: string[] = [];
  const globEntries: [string, GlobThresholds][] = thresholds.glob
    ? Object.entries(thresholds.glob)
    : [];

  for (const file of coverageMap.files()) {
    const fc = coverageMap.fileCoverageFor(file);
    const summary = computeSummary(fc);

    // Determine which thresholds apply to this file.
    // Glob-specific thresholds override the base thresholds.
    let effectiveThresholds: CoverageThresholds = thresholds;
    for (const [pattern, globThresh] of globEntries) {
      if (matchesPattern(file, pattern)) {
        effectiveThresholds = {
          ...thresholds,
          ...globThresh,
        };
        break;
      }
    }

    const resolved = resolveMetricThresholds(effectiveThresholds);

    for (const key of METRIC_KEYS) {
      const threshold = resolved[key];
      if (threshold !== undefined) {
        const actual = summary[key].pct;
        if (actual < threshold) {
          failures.push(
            `${file}: Coverage for ${key} (${actual.toFixed(2)}%) does not meet threshold (${threshold}%)`,
          );
        }
      }
    }
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}
