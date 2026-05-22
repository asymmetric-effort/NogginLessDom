export interface Location {
  line: number;
  column: number;
}

export interface Range {
  start: Location;
  end: Location;
}

export interface FunctionMapping {
  name: string;
  decl: Range;
  loc: Range;
  line: number;
}

export interface BranchMapping {
  type: string;
  locations: Range[];
  line: number;
}

export interface FileCoverage {
  path: string;
  statementMap: Record<string, Range>;
  fnMap: Record<string, FunctionMapping>;
  branchMap: Record<string, BranchMapping>;
  s: Record<string, number>;
  f: Record<string, number>;
  b: Record<string, number[]>;
}

export interface MetricSummary {
  total: number;
  covered: number;
  skipped: number;
  pct: number;
}

export interface CoverageSummary {
  lines: MetricSummary;
  statements: MetricSummary;
  functions: MetricSummary;
  branches: MetricSummary;
}

function computePct(covered: number, total: number): number {
  if (total === 0) {
    return 100;
  }
  return (covered / total) * 100;
}

export function computeSummary(fc: FileCoverage): CoverageSummary {
  const sKeys = Object.keys(fc.s);
  const sTotal = sKeys.length;
  const sCovered = sKeys.filter((k) => (fc.s[k] ?? 0) > 0).length;

  const fKeys = Object.keys(fc.f);
  const fTotal = fKeys.length;
  const fCovered = fKeys.filter((k) => (fc.f[k] ?? 0) > 0).length;

  let bTotal = 0;
  let bCovered = 0;
  for (const key of Object.keys(fc.b)) {
    const counts = fc.b[key];
    if (counts) {
      for (const count of counts) {
        bTotal++;
        if (count > 0) {
          bCovered++;
        }
      }
    }
  }

  // Compute line coverage from statement map
  const lineHits = new Map<number, number>();
  for (const key of sKeys) {
    const range = fc.statementMap[key];
    if (range) {
      const line = range.start.line;
      const existingHits = lineHits.get(line) ?? 0;
      const stmtHits = fc.s[key] ?? 0;
      lineHits.set(line, existingHits + stmtHits);
    }
  }
  const lTotal = lineHits.size;
  let lCovered = 0;
  for (const hits of lineHits.values()) {
    if (hits > 0) {
      lCovered++;
    }
  }

  return {
    lines: {
      total: lTotal,
      covered: lCovered,
      skipped: 0,
      pct: computePct(lCovered, lTotal),
    },
    statements: {
      total: sTotal,
      covered: sCovered,
      skipped: 0,
      pct: computePct(sCovered, sTotal),
    },
    functions: {
      total: fTotal,
      covered: fCovered,
      skipped: 0,
      pct: computePct(fCovered, fTotal),
    },
    branches: {
      total: bTotal,
      covered: bCovered,
      skipped: 0,
      pct: computePct(bCovered, bTotal),
    },
  };
}

function mergeFileCoverage(a: FileCoverage, b: FileCoverage): FileCoverage {
  const merged: FileCoverage = {
    path: a.path,
    statementMap: { ...a.statementMap, ...b.statementMap },
    fnMap: { ...a.fnMap, ...b.fnMap },
    branchMap: { ...a.branchMap, ...b.branchMap },
    s: { ...a.s },
    f: { ...a.f },
    b: {},
  };

  // Merge statement counts
  for (const key of Object.keys(b.s)) {
    merged.s[key] = (merged.s[key] ?? 0) + (b.s[key] ?? 0);
  }

  // Merge function counts
  for (const key of Object.keys(b.f)) {
    merged.f[key] = (merged.f[key] ?? 0) + (b.f[key] ?? 0);
  }

  // Merge branch counts
  const allBranchKeys = new Set([...Object.keys(a.b), ...Object.keys(b.b)]);
  for (const key of allBranchKeys) {
    const aArr = a.b[key] ?? [];
    const bArr = b.b[key] ?? [];
    const maxLen = Math.max(aArr.length, bArr.length);
    const mergedArr: number[] = [];
    for (let i = 0; i < maxLen; i++) {
      mergedArr.push((aArr[i] ?? 0) + (bArr[i] ?? 0));
    }
    merged.b[key] = mergedArr;
  }

  return merged;
}

function addSummaries(a: CoverageSummary, b: CoverageSummary): CoverageSummary {
  const addMetric = (am: MetricSummary, bm: MetricSummary): MetricSummary => {
    const total = am.total + bm.total;
    const covered = am.covered + bm.covered;
    return {
      total,
      covered,
      skipped: am.skipped + bm.skipped,
      pct: computePct(covered, total),
    };
  };
  return {
    lines: addMetric(a.lines, b.lines),
    statements: addMetric(a.statements, b.statements),
    functions: addMetric(a.functions, b.functions),
    branches: addMetric(a.branches, b.branches),
  };
}

function emptySummary(): CoverageSummary {
  const empty: MetricSummary = { total: 0, covered: 0, skipped: 0, pct: 100 };
  return {
    lines: { ...empty },
    statements: { ...empty },
    functions: { ...empty },
    branches: { ...empty },
  };
}

export class FileCoverageInstance implements FileCoverage {
  path: string;
  statementMap: Record<string, Range>;
  fnMap: Record<string, FunctionMapping>;
  branchMap: Record<string, BranchMapping>;
  s: Record<string, number>;
  f: Record<string, number>;
  b: Record<string, number[]>;

  constructor(fc: FileCoverage) {
    this.path = fc.path;
    this.statementMap = { ...fc.statementMap };
    this.fnMap = { ...fc.fnMap };
    this.branchMap = { ...fc.branchMap };
    this.s = { ...fc.s };
    this.f = { ...fc.f };
    this.b = {};
    for (const key of Object.keys(fc.b)) {
      const arr = fc.b[key];
      this.b[key] = arr ? [...arr] : [];
    }
  }

  merge(other: FileCoverage): void {
    // Union maps
    Object.assign(this.statementMap, other.statementMap);
    Object.assign(this.fnMap, other.fnMap);
    Object.assign(this.branchMap, other.branchMap);

    // Sum statement counts
    for (const key of Object.keys(other.s)) {
      this.s[key] = (this.s[key] ?? 0) + (other.s[key] ?? 0);
    }

    // Sum function counts
    for (const key of Object.keys(other.f)) {
      this.f[key] = (this.f[key] ?? 0) + (other.f[key] ?? 0);
    }

    // Sum branch counts
    for (const key of Object.keys(other.b)) {
      const otherArr = other.b[key] ?? [];
      const thisArr = this.b[key] ?? [];
      const maxLen = Math.max(thisArr.length, otherArr.length);
      const merged: number[] = [];
      for (let i = 0; i < maxLen; i++) {
        merged.push((thisArr[i] ?? 0) + (otherArr[i] ?? 0));
      }
      this.b[key] = merged;
    }
  }

  resetHits(): void {
    for (const key of Object.keys(this.s)) {
      this.s[key] = 0;
    }
    for (const key of Object.keys(this.f)) {
      this.f[key] = 0;
    }
    for (const key of Object.keys(this.b)) {
      const arr = this.b[key];
      if (arr) {
        this.b[key] = arr.map(() => 0);
      }
    }
  }

  toJSON(): FileCoverage {
    const bCopy: Record<string, number[]> = {};
    for (const key of Object.keys(this.b)) {
      const arr = this.b[key];
      bCopy[key] = arr ? [...arr] : [];
    }
    return {
      path: this.path,
      statementMap: { ...this.statementMap },
      fnMap: { ...this.fnMap },
      branchMap: { ...this.branchMap },
      s: { ...this.s },
      f: { ...this.f },
      b: bCopy,
    };
  }

  computeSimpleTotals(): { total: number; covered: number; pct: number } {
    const lineHits = new Map<number, number>();
    for (const key of Object.keys(this.s)) {
      const range = this.statementMap[key];
      if (range) {
        const line = range.start.line;
        const existing = lineHits.get(line) ?? 0;
        lineHits.set(line, existing + (this.s[key] ?? 0));
      }
    }
    const total = lineHits.size;
    let covered = 0;
    for (const hits of lineHits.values()) {
      if (hits > 0) {
        covered++;
      }
    }
    return { total, covered, pct: computePct(covered, total) };
  }

  computeBranchTotals(): { total: number; covered: number; pct: number } {
    let total = 0;
    let covered = 0;
    for (const key of Object.keys(this.b)) {
      const counts = this.b[key];
      if (counts) {
        for (const count of counts) {
          total++;
          if (count > 0) {
            covered++;
          }
        }
      }
    }
    return { total, covered, pct: computePct(covered, total) };
  }
}

export class CoverageSummaryInstance implements CoverageSummary {
  lines: MetricSummary;
  statements: MetricSummary;
  functions: MetricSummary;
  branches: MetricSummary;

  constructor(summary: CoverageSummary) {
    this.lines = { ...summary.lines };
    this.statements = { ...summary.statements };
    this.functions = { ...summary.functions };
    this.branches = { ...summary.branches };
  }

  merge(other: CoverageSummary): CoverageSummary {
    const mergeMetric = (a: MetricSummary, b: MetricSummary): MetricSummary => {
      const total = a.total + b.total;
      const covered = a.covered + b.covered;
      return {
        total,
        covered,
        skipped: a.skipped + b.skipped,
        pct: computePct(covered, total),
      };
    };
    this.lines = mergeMetric(this.lines, other.lines);
    this.statements = mergeMetric(this.statements, other.statements);
    this.functions = mergeMetric(this.functions, other.functions);
    this.branches = mergeMetric(this.branches, other.branches);
    return this.toJSON();
  }

  isEmpty(): boolean {
    return (
      this.lines.total === 0 &&
      this.statements.total === 0 &&
      this.functions.total === 0 &&
      this.branches.total === 0
    );
  }

  toJSON(): CoverageSummary {
    return {
      lines: { ...this.lines },
      statements: { ...this.statements },
      functions: { ...this.functions },
      branches: { ...this.branches },
    };
  }
}

export function createCoverageSummary(): CoverageSummary {
  const empty: MetricSummary = { total: 0, covered: 0, skipped: 0, pct: 100 };
  return {
    lines: { ...empty },
    statements: { ...empty },
    functions: { ...empty },
    branches: { ...empty },
  };
}

export class CoverageMap {
  private data: Map<string, FileCoverage> = new Map();

  addFileCoverage(fc: FileCoverage): void {
    const existing = this.data.get(fc.path);
    if (existing) {
      this.data.set(fc.path, mergeFileCoverage(existing, fc));
    } else {
      this.data.set(fc.path, fc);
    }
  }

  files(): string[] {
    return [...this.data.keys()];
  }

  fileCoverageFor(path: string): FileCoverage {
    const fc = this.data.get(path);
    if (!fc) {
      throw new Error(`No coverage data for file: ${path}`);
    }
    return fc;
  }

  merge(other: CoverageMap): void {
    for (const file of other.files()) {
      this.addFileCoverage(other.fileCoverageFor(file));
    }
  }

  toSummary(): CoverageSummary {
    if (this.data.size === 0) {
      return emptySummary();
    }
    let result = emptySummary();
    result.lines.pct = 0;
    result.statements.pct = 0;
    result.functions.pct = 0;
    result.branches.pct = 0;
    for (const fc of this.data.values()) {
      result = addSummaries(result, computeSummary(fc));
    }
    return result;
  }

  fileSummaryFor(path: string): CoverageSummary {
    return computeSummary(this.fileCoverageFor(path));
  }
}

export function createCoverageMap(): CoverageMap {
  return new CoverageMap();
}
