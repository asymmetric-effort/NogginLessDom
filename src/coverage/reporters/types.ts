/**
 * Re-export coverage types from the single source of truth (coverage-map.ts).
 * Also exports reporter-specific types like CoverageWatermarks.
 */

export type {
  Location,
  Range,
  FunctionMapping,
  BranchMapping,
  FileCoverage,
  MetricSummary,
  CoverageSummary,
} from '../coverage-map.js';

export { CoverageMap } from '../coverage-map.js';

/**
 * Backward-compatible aliases for the standardised names.
 */
export type { Location as SourceLocation } from '../coverage-map.js';
export type { Range as SourceRange } from '../coverage-map.js';
export type { MetricSummary as CoverageMetric } from '../coverage-map.js';

/**
 * Convenience record aliases (structural equivalents of Record<string, …>).
 */
import type { Range, FunctionMapping, BranchMapping } from '../coverage-map.js';

export type StatementMap = Record<string, Range>;
export type FnMap = Record<string, FunctionMapping>;
export type BranchMap = Record<string, BranchMapping>;
export type HitCounts = Record<string, number>;
export type BranchHitCounts = Record<string, number[]>;

export interface CoverageWatermarks {
  statements: [number, number];
  branches: [number, number];
  functions: [number, number];
  lines: [number, number];
}
