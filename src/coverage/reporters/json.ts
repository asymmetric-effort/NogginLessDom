import type { CoverageMap, CoverageSummary, FileCoverage } from './types.js';

import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

export interface JsonReporterOptions {
  reportsDirectory: string;
}

export class JsonReporter {
  private readonly options: JsonReporterOptions;

  constructor(options: JsonReporterOptions) {
    this.options = options;
  }

  formatJson(coverageMap: CoverageMap): string {
    const result: Record<string, FileCoverage> = {};
    for (const filePath of coverageMap.files()) {
      const coverage = coverageMap.fileCoverageFor(filePath);
      result[filePath] = {
        path: coverage.path,
        statementMap: coverage.statementMap,
        fnMap: coverage.fnMap,
        branchMap: coverage.branchMap,
        s: coverage.s,
        f: coverage.f,
        b: coverage.b,
      };
    }
    return JSON.stringify(result, null, 2);
  }

  onEnd(coverageMap: CoverageMap, _globalSummary: CoverageSummary): void {
    const outputPath = join(
      this.options.reportsDirectory,
      'coverage-final.json',
    );
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, this.formatJson(coverageMap), 'utf-8');
  }
}

export class JsonSummaryReporter {
  private readonly options: JsonReporterOptions;

  constructor(options: JsonReporterOptions) {
    this.options = options;
  }

  formatSummary(
    coverageMap: CoverageMap,
    globalSummary: CoverageSummary,
  ): string {
    const result: Record<string, CoverageSummary> = {};
    result['total'] = globalSummary;
    for (const filePath of coverageMap.files()) {
      result[filePath] = coverageMap.fileSummaryFor(filePath);
    }
    return JSON.stringify(result, null, 2);
  }

  onEnd(coverageMap: CoverageMap, globalSummary: CoverageSummary): void {
    const outputPath = join(
      this.options.reportsDirectory,
      'coverage-summary.json',
    );
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(
      outputPath,
      this.formatSummary(coverageMap, globalSummary),
      'utf-8',
    );
  }
}
