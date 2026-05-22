import type { CoverageMap, CoverageSummary, CoverageMetric } from './types.js';

export interface TextSummaryReporterOptions {
  reportsDirectory: string;
}

function formatMetric(name: string, metric: CoverageMetric): string {
  const pct = metric.pct.toFixed(2);
  return `${name}: ${pct}% (${String(metric.covered)}/${String(metric.total)})`;
}

export class TextSummaryReporter {
  constructor(_options: TextSummaryReporterOptions) {
    // Options reserved for future use (e.g. output file)
  }

  format(_coverageMap: CoverageMap, globalSummary: CoverageSummary): string {
    const parts = [
      formatMetric('Statements', globalSummary.statements),
      formatMetric('Branches', globalSummary.branches),
      formatMetric('Functions', globalSummary.functions),
      formatMetric('Lines', globalSummary.lines),
    ];
    return parts.join(' | ') + '\n';
  }

  onEnd(coverageMap: CoverageMap, globalSummary: CoverageSummary): void {
    const output = this.format(coverageMap, globalSummary);
    process.stdout.write(output);
  }
}
