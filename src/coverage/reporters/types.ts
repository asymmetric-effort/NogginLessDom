/**
 * Minimal coverage types for reporters.
 * These mirror the interfaces from coverage-map.ts and will be reconciled later.
 */

export interface SourceLocation {
  line: number;
  column: number;
}

export interface SourceRange {
  start: SourceLocation;
  end: SourceLocation;
}

export interface StatementMap {
  [key: string]: SourceRange;
}

export interface FunctionMapping {
  name: string;
  decl: SourceRange;
  loc: SourceRange;
  line: number;
}

export interface FnMap {
  [key: string]: FunctionMapping;
}

export interface BranchMapping {
  type: string;
  locations: SourceRange[];
  line: number;
}

export interface BranchMap {
  [key: string]: BranchMapping;
}

export interface HitCounts {
  [key: string]: number;
}

export interface BranchHitCounts {
  [key: string]: number[];
}

export interface FileCoverage {
  path: string;
  statementMap: StatementMap;
  fnMap: FnMap;
  branchMap: BranchMap;
  s: HitCounts;
  f: HitCounts;
  b: BranchHitCounts;
}

export interface CoverageMetric {
  total: number;
  covered: number;
  skipped: number;
  pct: number;
}

export interface CoverageSummary {
  lines: CoverageMetric;
  statements: CoverageMetric;
  functions: CoverageMetric;
  branches: CoverageMetric;
}

export interface CoverageMap {
  files(): string[];
  fileCoverageFor(path: string): FileCoverage;
  toSummary(): CoverageSummary;
  fileSummaryFor(path: string): CoverageSummary;
}

export interface CoverageWatermarks {
  statements: [number, number];
  branches: [number, number];
  functions: [number, number];
  lines: [number, number];
}
