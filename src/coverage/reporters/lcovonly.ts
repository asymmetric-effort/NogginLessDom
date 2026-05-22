import type { CoverageMap, CoverageSummary } from './types.js';

import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { LcovReporter } from './lcov.js';

export interface LcovOnlyReporterOptions {
  reportsDirectory: string;
}

export class LcovOnlyReporter {
  private readonly options: LcovOnlyReporterOptions;
  private readonly lcovReporter: LcovReporter;

  constructor(options: LcovOnlyReporterOptions) {
    this.options = options;
    this.lcovReporter = new LcovReporter(options);
  }

  onEnd(coverageMap: CoverageMap, _globalSummary: CoverageSummary): void {
    const lcovContent = this.lcovReporter.formatLcov(coverageMap);
    const outputPath = join(this.options.reportsDirectory, 'lcov.info');
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, lcovContent, 'utf-8');
  }
}
