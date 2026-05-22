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
