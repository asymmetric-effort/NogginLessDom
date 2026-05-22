import type {
  CoverageMap,
  CoverageSummary,
  FileCoverage,
} from './types.js';

import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

export interface CoberturaReporterOptions {
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

function computeRate(total: number, covered: number): string {
  if (total === 0) return '1';
  return (covered / total).toFixed(4);
}

function generatePackage(filePath: string, coverage: FileCoverage, summary: CoverageSummary): string {
  const lines: string[] = [];
  const lastSlash = filePath.lastIndexOf('/');
  const dirName = lastSlash >= 0 ? filePath.slice(0, lastSlash) : '.';
  const fileName = lastSlash >= 0 ? filePath.slice(lastSlash + 1) : filePath;

  const lineRate = computeRate(summary.lines.total, summary.lines.covered);
  const branchRate = computeRate(summary.branches.total, summary.branches.covered);

  lines.push(`      <package name="${escapeXml(dirName)}" line-rate="${lineRate}" branch-rate="${branchRate}" complexity="0">`);
  lines.push('        <classes>');
  lines.push(`          <class name="${escapeXml(fileName)}" filename="${escapeXml(filePath)}" line-rate="${lineRate}" branch-rate="${branchRate}" complexity="0">`);
  lines.push('            <methods>');

  const fnKeys = Object.keys(coverage.fnMap);
  for (const key of fnKeys) {
    const fn = coverage.fnMap[key];
    const hits = coverage.f[key];
    if (fn && hits !== undefined) {
      lines.push(`              <method name="${escapeXml(fn.name)}" signature="" line-rate="${hits > 0 ? '1.0000' : '0.0000'}" branch-rate="1.0000">`);
      lines.push('                <lines>');
      lines.push(`                  <line number="${String(fn.line)}" hits="${String(hits)}"/>`);
      lines.push('                </lines>');
      lines.push('              </method>');
    }
  }

  lines.push('            </methods>');
  lines.push('            <lines>');

  const stmtKeys = Object.keys(coverage.statementMap);
  for (const key of stmtKeys) {
    const stmt = coverage.statementMap[key];
    const hits = coverage.s[key];
    if (stmt && hits !== undefined) {
      const lineNum = stmt.start.line;
      // Check if this line has branch data
      let branchAttr = '';
      for (const bKey of Object.keys(coverage.branchMap)) {
        const branch = coverage.branchMap[bKey];
        if (branch && branch.line === lineNum) {
          const counts = coverage.b[bKey];
          if (counts) {
            const total = counts.length;
            let covered = 0;
            for (const c of counts) {
              if (c > 0) covered++;
            }
            branchAttr = ` branch="true" condition-coverage="${String(Math.round((covered / total) * 100))}% (${String(covered)}/${String(total)})"`;
          }
        }
      }
      lines.push(`              <line number="${String(lineNum)}" hits="${String(hits)}"${branchAttr}/>`);
    }
  }

  lines.push('            </lines>');
  lines.push('          </class>');
  lines.push('        </classes>');
  lines.push('      </package>');

  return lines.join('\n');
}

export class CoberturaReporter {
  private readonly options: CoberturaReporterOptions;

  constructor(options: CoberturaReporterOptions) {
    this.options = options;
  }

  formatCobertura(coverageMap: CoverageMap, globalSummary: CoverageSummary): string {
    const lines: string[] = [];

    const lineRate = computeRate(globalSummary.lines.total, globalSummary.lines.covered);
    const branchRate = computeRate(globalSummary.branches.total, globalSummary.branches.covered);
    const timestamp = Date.now();

    lines.push('<?xml version="1.0" ?>');
    lines.push('<!DOCTYPE coverage SYSTEM "http://cobertura.sourceforge.net/xml/coverage-04.dtd">');
    lines.push(`<coverage line-rate="${lineRate}" branch-rate="${branchRate}" lines-valid="${String(globalSummary.lines.total)}" lines-covered="${String(globalSummary.lines.covered)}" branches-valid="${String(globalSummary.branches.total)}" branches-covered="${String(globalSummary.branches.covered)}" complexity="0" version="1" timestamp="${String(timestamp)}">`);
    lines.push('  <sources>');
    lines.push('    <source>.</source>');
    lines.push('  </sources>');
    lines.push('  <packages>');

    for (const filePath of coverageMap.files()) {
      const coverage = coverageMap.fileCoverageFor(filePath);
      const summary = coverageMap.fileSummaryFor(filePath);
      lines.push(generatePackage(filePath, coverage, summary));
    }

    lines.push('  </packages>');
    lines.push('</coverage>');

    return lines.join('\n');
  }

  onEnd(coverageMap: CoverageMap, globalSummary: CoverageSummary): void {
    const outputPath = join(this.options.reportsDirectory, 'cobertura-coverage.xml');
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, this.formatCobertura(coverageMap, globalSummary), 'utf-8');
  }
}
