import type { CoverageMap, CoverageSummary, FileCoverage } from './types.js';

import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

export interface LcovReporterOptions {
  reportsDirectory: string;
}

function generateFileRecord(coverage: FileCoverage): string {
  const lines: string[] = [];

  lines.push('TN:');
  lines.push(`SF:${coverage.path}`);

  // Function data
  const fnKeys = Object.keys(coverage.fnMap);
  for (const key of fnKeys) {
    const fn = coverage.fnMap[key];
    if (fn) {
      lines.push(`FN:${String(fn.line)},${fn.name}`);
    }
  }
  for (const key of fnKeys) {
    const fn = coverage.fnMap[key];
    const count = coverage.f[key];
    if (fn && count !== undefined) {
      lines.push(`FNDA:${String(count)},${fn.name}`);
    }
  }

  // Function summary
  const fnFound = fnKeys.length;
  let fnHit = 0;
  for (const key of fnKeys) {
    const count = coverage.f[key];
    if (count !== undefined && count > 0) {
      fnHit++;
    }
  }
  lines.push(`FNF:${String(fnFound)}`);
  lines.push(`FNH:${String(fnHit)}`);

  // Line/statement data (DA)
  const stmtKeys = Object.keys(coverage.statementMap);
  for (const key of stmtKeys) {
    const stmt = coverage.statementMap[key];
    const count = coverage.s[key];
    if (stmt && count !== undefined) {
      lines.push(`DA:${String(stmt.start.line)},${String(count)}`);
    }
  }

  // Line summary
  const linesFound = stmtKeys.length;
  let linesHit = 0;
  for (const key of stmtKeys) {
    const count = coverage.s[key];
    if (count !== undefined && count > 0) {
      linesHit++;
    }
  }
  lines.push(`LF:${String(linesFound)}`);
  lines.push(`LH:${String(linesHit)}`);

  // Branch data (BRDA)
  const branchKeys = Object.keys(coverage.branchMap);
  let branchesFound = 0;
  let branchesHit = 0;

  for (const key of branchKeys) {
    const branch = coverage.branchMap[key];
    const counts = coverage.b[key];
    if (branch && counts) {
      for (let i = 0; i < counts.length; i++) {
        const count = counts[i];
        if (count !== undefined) {
          lines.push(
            `BRDA:${String(branch.line)},${key},${String(i)},${String(count)}`,
          );
          branchesFound++;
          if (count > 0) {
            branchesHit++;
          }
        }
      }
    }
  }

  lines.push(`BRF:${String(branchesFound)}`);
  lines.push(`BRH:${String(branchesHit)}`);

  lines.push('end_of_record');

  return lines.join('\n');
}

export class LcovReporter {
  private readonly options: LcovReporterOptions;

  constructor(options: LcovReporterOptions) {
    this.options = options;
  }

  formatLcov(coverageMap: CoverageMap): string {
    const records: string[] = [];
    for (const filePath of coverageMap.files()) {
      const coverage = coverageMap.fileCoverageFor(filePath);
      records.push(generateFileRecord(coverage));
    }
    return records.join('\n');
  }

  onEnd(coverageMap: CoverageMap, _globalSummary: CoverageSummary): void {
    const outputPath = join(this.options.reportsDirectory, 'lcov.info');
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, this.formatLcov(coverageMap), 'utf-8');
  }
}
