import type { CoverageThresholds } from './config.js';
import type { CoverageSummary } from './coverage-map.js';
import { CoverageMap, computeSummary } from './coverage-map.js';

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

export function checkThresholds(
  summary: CoverageSummary,
  thresholds: CoverageThresholds,
): ThresholdResult {
  const failures: string[] = [];

  for (const key of METRIC_KEYS) {
    const threshold = thresholds[key];
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

export function checkPerFileThresholds(
  coverageMap: CoverageMap,
  thresholds: CoverageThresholds,
): ThresholdResult {
  const failures: string[] = [];

  for (const file of coverageMap.files()) {
    const fc = coverageMap.fileCoverageFor(file);
    const summary = computeSummary(fc);

    for (const key of METRIC_KEYS) {
      const threshold = thresholds[key];
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
