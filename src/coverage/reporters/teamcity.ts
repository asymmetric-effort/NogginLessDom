import type { CoverageMap, CoverageSummary } from './types.js';

export interface TeamcityReporterOptions {
  reportsDirectory: string;
}

function tcMessage(key: string, value: number): string {
  return `##teamcity[buildStatisticValue key='${key}' value='${String(value)}']`;
}

export class TeamcityReporter {
  constructor(_options: TeamcityReporterOptions) {
    // Options reserved for future use
  }

  format(_coverageMap: CoverageMap, globalSummary: CoverageSummary): string {
    const lines: string[] = [
      tcMessage('CodeCoverageAbsLCovered', globalSummary.lines.covered),
      tcMessage('CodeCoverageAbsLTotal', globalSummary.lines.total),
      tcMessage('CodeCoverageAbsBCovered', globalSummary.branches.covered),
      tcMessage('CodeCoverageAbsBTotal', globalSummary.branches.total),
      tcMessage('CodeCoverageAbsMCovered', globalSummary.functions.covered),
      tcMessage('CodeCoverageAbsMTotal', globalSummary.functions.total),
      tcMessage('CodeCoverageAbsSCovered', globalSummary.statements.covered),
      tcMessage('CodeCoverageAbsSTotal', globalSummary.statements.total),
    ];
    return lines.join('\n') + '\n';
  }

  onEnd(coverageMap: CoverageMap, globalSummary: CoverageSummary): void {
    const output = this.format(coverageMap, globalSummary);
    process.stdout.write(output);
  }
}
