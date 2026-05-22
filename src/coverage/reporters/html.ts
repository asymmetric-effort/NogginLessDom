import type {
  CoverageMap,
  CoverageSummary,
  CoverageMetric,
  FileCoverage,
} from './types.js';

import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join, basename } from 'node:path';

export interface HtmlReporterOptions {
  reportsDirectory: string;
}

function pctClass(pct: number): string {
  if (pct >= 80) return 'high';
  if (pct >= 50) return 'medium';
  return 'low';
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function metricCell(metric: CoverageMetric): string {
  const cls = pctClass(metric.pct);
  return `<td class="${cls}">${metric.pct.toFixed(2)}% (${String(metric.covered)}/${String(metric.total)})</td>`;
}

const CSS = `
body { font-family: sans-serif; margin: 20px; }
table { border-collapse: collapse; width: 100%; }
th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; }
th { background: #f0f0f0; }
.high { background: #e6ffe6; }
.medium { background: #ffffcc; }
.low { background: #ffe6e6; }
.line-covered { background: #e6ffe6; }
.line-uncovered { background: #ffe6e6; }
.line-branch-partial { background: #ffffcc; }
.line-number { color: #999; text-align: right; padding-right: 10px; user-select: none; }
pre { margin: 0; }
`.trim();

function generateIndexHtml(
  coverageMap: CoverageMap,
  globalSummary: CoverageSummary,
): string {
  const files = coverageMap.files();
  let fileRows = '';
  for (const filePath of files) {
    const summary = coverageMap.fileSummaryFor(filePath);
    const fileName = basename(filePath);
    const safeFileName = escapeHtml(fileName);
    fileRows += `<tr>
      <td><a href="${safeFileName}.html">${escapeHtml(filePath)}</a></td>
      ${metricCell(summary.statements)}
      ${metricCell(summary.branches)}
      ${metricCell(summary.functions)}
      ${metricCell(summary.lines)}
    </tr>\n`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Coverage Report</title>
<style>${CSS}</style>
</head>
<body>
<h1>Coverage Report</h1>
<h2>Summary</h2>
<table>
<thead>
<tr>
  <th>Metric</th><th>Coverage</th>
</tr>
</thead>
<tbody>
<tr><td>Statements</td>${metricCell(globalSummary.statements)}</tr>
<tr><td>Branches</td>${metricCell(globalSummary.branches)}</tr>
<tr><td>Functions</td>${metricCell(globalSummary.functions)}</tr>
<tr><td>Lines</td>${metricCell(globalSummary.lines)}</tr>
</tbody>
</table>

<h2>Files</h2>
<table>
<thead>
<tr>
  <th>File</th><th>Statements</th><th>Branches</th><th>Functions</th><th>Lines</th>
</tr>
</thead>
<tbody>
${fileRows}
</tbody>
</table>
</body>
</html>`;
}

function getLineClass(lineNumber: number, coverage: FileCoverage): string {
  // Check if any branch is on this line and partially covered
  for (const key of Object.keys(coverage.branchMap)) {
    const branch = coverage.branchMap[key];
    const counts = coverage.b[key];
    if (branch && counts && branch.line === lineNumber) {
      const hasCovered = counts.some((c) => c > 0);
      const hasUncovered = counts.some((c) => c === 0);
      if (hasCovered && hasUncovered) {
        return 'line-branch-partial';
      }
    }
  }

  // Check statement coverage for this line
  for (const key of Object.keys(coverage.statementMap)) {
    const stmt = coverage.statementMap[key];
    const count = coverage.s[key];
    if (stmt && stmt.start.line === lineNumber && count !== undefined) {
      return count > 0 ? 'line-covered' : 'line-uncovered';
    }
  }

  return '';
}

function generateFileHtml(
  filePath: string,
  coverage: FileCoverage,
  summary: CoverageSummary,
): string {
  let sourceLines: string[];
  try {
    const source = readFileSync(filePath, 'utf-8');
    sourceLines = source.split('\n');
  } catch {
    sourceLines = ['(source not available)'];
  }

  let codeRows = '';
  for (let i = 0; i < sourceLines.length; i++) {
    const lineNum = i + 1;
    const cls = getLineClass(lineNum, coverage);
    const clsAttr = cls ? ` class="${cls}"` : '';
    codeRows += `<tr${clsAttr}>
      <td class="line-number">${String(lineNum)}</td>
      <td><pre>${escapeHtml(sourceLines[i] ?? '')}</pre></td>
    </tr>\n`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Coverage: ${escapeHtml(filePath)}</title>
<style>${CSS}</style>
</head>
<body>
<h1>${escapeHtml(filePath)}</h1>
<p><a href="index.html">Back to summary</a></p>
<table>
<tr><th>Statements</th>${metricCell(summary.statements)}</tr>
<tr><th>Branches</th>${metricCell(summary.branches)}</tr>
<tr><th>Functions</th>${metricCell(summary.functions)}</tr>
<tr><th>Lines</th>${metricCell(summary.lines)}</tr>
</table>
<h2>Source</h2>
<table>
${codeRows}
</table>
</body>
</html>`;
}

export class HtmlReporter {
  private readonly options: HtmlReporterOptions;

  constructor(options: HtmlReporterOptions) {
    this.options = options;
  }

  onEnd(coverageMap: CoverageMap, globalSummary: CoverageSummary): void {
    const outputDir = join(this.options.reportsDirectory, 'html');
    mkdirSync(outputDir, { recursive: true });

    // Write index.html
    const indexHtml = generateIndexHtml(coverageMap, globalSummary);
    writeFileSync(join(outputDir, 'index.html'), indexHtml, 'utf-8');

    // Write per-file HTML
    for (const filePath of coverageMap.files()) {
      const coverage = coverageMap.fileCoverageFor(filePath);
      const summary = coverageMap.fileSummaryFor(filePath);
      const fileName = basename(filePath);
      const fileHtml = generateFileHtml(filePath, coverage, summary);
      writeFileSync(join(outputDir, `${fileName}.html`), fileHtml, 'utf-8');
    }
  }
}
