import type { CoverageMap, CoverageSummary, FileCoverage } from './types.js';

import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

export interface CloverReporterOptions {
  reportsDirectory: string;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function generateMetrics(summary: CoverageSummary): string {
  return `<metrics statements="${String(summary.statements.total)}" coveredstatements="${String(summary.statements.covered)}" conditionals="${String(summary.branches.total)}" coveredconditionals="${String(summary.branches.covered)}" methods="${String(summary.functions.total)}" coveredmethods="${String(summary.functions.covered)}" elements="${String(summary.statements.total + summary.branches.total + summary.functions.total)}" coveredelements="${String(summary.statements.covered + summary.branches.covered + summary.functions.covered)}" complexity="0" loc="${String(summary.lines.total)}" ncloc="${String(summary.lines.total)}" packages="1" files="${String(1)}" classes="${String(1)}"/>`;
}

function generateFileElement(
  filePath: string,
  coverage: FileCoverage,
  summary: CoverageSummary,
): string {
  const lines: string[] = [];
  const fileName = filePath.slice(filePath.lastIndexOf('/') + 1);

  lines.push(
    `        <file name="${escapeXml(fileName)}" path="${escapeXml(filePath)}">`,
  );

  // Line elements
  const stmtKeys = Object.keys(coverage.statementMap);
  for (const key of stmtKeys) {
    const stmt = coverage.statementMap[key];
    const hits = coverage.s[key];
    if (stmt && hits !== undefined) {
      lines.push(
        `          <line num="${String(stmt.start.line)}" count="${String(hits)}" type="stmt"/>`,
      );
    }
  }

  // Branch lines
  for (const bKey of Object.keys(coverage.branchMap)) {
    const branch = coverage.branchMap[bKey];
    const counts = coverage.b[bKey];
    if (branch && counts) {
      const trueCount = counts[0] ?? 0;
      const falseCount = counts[1] ?? 0;
      lines.push(
        `          <line num="${String(branch.line)}" count="${String(trueCount + falseCount)}" type="cond" truecount="${String(trueCount)}" falsecount="${String(falseCount)}"/>`,
      );
    }
  }

  lines.push(
    `          <metrics statements="${String(summary.statements.total)}" coveredstatements="${String(summary.statements.covered)}" conditionals="${String(summary.branches.total)}" coveredconditionals="${String(summary.branches.covered)}" methods="${String(summary.functions.total)}" coveredmethods="${String(summary.functions.covered)}"/>`,
  );
  lines.push('        </file>');

  return lines.join('\n');
}

export class CloverReporter {
  private readonly options: CloverReporterOptions;

  constructor(options: CloverReporterOptions) {
    this.options = options;
  }

  formatClover(
    coverageMap: CoverageMap,
    globalSummary: CoverageSummary,
  ): string {
    const lines: string[] = [];
    const timestamp = Date.now();

    lines.push('<?xml version="1.0" ?>');
    lines.push(`<coverage generated="${String(timestamp)}" clover="3.2.0">`);
    lines.push(`  <project timestamp="${String(timestamp)}" name="All files">`);
    lines.push(`    ${generateMetrics(globalSummary)}`);
    lines.push('    <package name="root">');

    for (const filePath of coverageMap.files()) {
      const coverage = coverageMap.fileCoverageFor(filePath);
      const summary = coverageMap.fileSummaryFor(filePath);
      lines.push(generateFileElement(filePath, coverage, summary));
    }

    lines.push('    </package>');
    lines.push('  </project>');
    lines.push('</coverage>');

    return lines.join('\n');
  }

  onEnd(coverageMap: CoverageMap, globalSummary: CoverageSummary): void {
    const outputPath = join(this.options.reportsDirectory, 'clover.xml');
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(
      outputPath,
      this.formatClover(coverageMap, globalSummary),
      'utf-8',
    );
  }
}
