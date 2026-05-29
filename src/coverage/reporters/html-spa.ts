/**
 * HTML SPA Coverage Reporter (Issue #99)
 *
 * Generates a single HTML file with embedded JSON coverage data and
 * client-side JavaScript for navigation between file views.
 */

import type { CoverageMap, CoverageSummary, FileCoverage } from './types.js';

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export interface HtmlSpaReporterOptions {
  reportsDirectory: string;
}

interface SerializedFileCoverage {
  path: string;
  summary: CoverageSummary;
  coverage: FileCoverage;
}

function generateSpaHtml(
  coverageMap: CoverageMap,
  globalSummary: CoverageSummary,
): string {
  const files = coverageMap.files();
  const fileData: SerializedFileCoverage[] = [];

  for (const filePath of files) {
    fileData.push({
      path: filePath,
      summary: coverageMap.fileSummaryFor(filePath),
      coverage: coverageMap.fileCoverageFor(filePath),
    });
  }

  const coverageJson = JSON.stringify({
    globalSummary,
    files: fileData,
  })
    .replace(/<\//g, '<\\/')
    .replace(/<!--/g, '<\\!--');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Coverage Report (SPA)</title>
<style>
body { font-family: sans-serif; margin: 20px; }
table { border-collapse: collapse; width: 100%; }
th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; }
th { background: #f0f0f0; }
.high { background: #e6ffe6; }
.medium { background: #ffffcc; }
.low { background: #ffe6e6; }
.line-covered { background: #e6ffe6; }
.line-uncovered { background: #ffe6e6; }
.line-number { color: #999; text-align: right; padding-right: 10px; user-select: none; }
pre { margin: 0; }
a { cursor: pointer; color: #0066cc; text-decoration: underline; }
#file-view { display: none; }
#nav { margin-bottom: 10px; }
</style>
</head>
<body>
<div id="nav"></div>
<div id="summary-view"></div>
<div id="file-view"></div>
<script>
var coverageData = ${coverageJson};

function escapeHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function pctClass(pct) {
  if (pct >= 80) return 'high';
  if (pct >= 50) return 'medium';
  return 'low';
}

function metricCell(m) {
  return '<td class="' + pctClass(m.pct) + '">' + m.pct.toFixed(2) + '% (' + m.covered + '/' + m.total + ')</td>';
}

function showSummary() {
  var s = coverageData.globalSummary;
  var html = '<h1>Coverage Report</h1>';
  html += '<h2>Summary</h2>';
  html += '<table><thead><tr><th>Metric</th><th>Coverage</th></tr></thead><tbody>';
  html += '<tr><td>Statements</td>' + metricCell(s.statements) + '</tr>';
  html += '<tr><td>Branches</td>' + metricCell(s.branches) + '</tr>';
  html += '<tr><td>Functions</td>' + metricCell(s.functions) + '</tr>';
  html += '<tr><td>Lines</td>' + metricCell(s.lines) + '</tr>';
  html += '</tbody></table>';
  html += '<h2>Files</h2><table><thead><tr><th>File</th><th>Statements</th><th>Branches</th><th>Functions</th><th>Lines</th></tr></thead><tbody>';
  for (var i = 0; i < coverageData.files.length; i++) {
    var f = coverageData.files[i];
    html += '<tr><td><a onclick="showFile(' + i + ')">' + escapeHtml(f.path) + '</a></td>';
    html += metricCell(f.summary.statements);
    html += metricCell(f.summary.branches);
    html += metricCell(f.summary.functions);
    html += metricCell(f.summary.lines);
    html += '</tr>';
  }
  html += '</tbody></table>';
  document.getElementById('summary-view').innerHTML = html;
  document.getElementById('summary-view').style.display = '';
  document.getElementById('file-view').style.display = 'none';
  document.getElementById('nav').innerHTML = '';
}

function showFile(idx) {
  var f = coverageData.files[idx];
  var nav = '<a onclick="showSummary()">Back to summary</a>';
  document.getElementById('nav').innerHTML = nav;
  document.getElementById('summary-view').style.display = 'none';
  document.getElementById('file-view').style.display = '';
  var html = '<h1>' + escapeHtml(f.path) + '</h1>';
  html += '<table><tr><th>Statements</th>' + metricCell(f.summary.statements) + '</tr>';
  html += '<tr><th>Branches</th>' + metricCell(f.summary.branches) + '</tr>';
  html += '<tr><th>Functions</th>' + metricCell(f.summary.functions) + '</tr>';
  html += '<tr><th>Lines</th>' + metricCell(f.summary.lines) + '</tr></table>';
  html += '<p>(Source view requires source files to be accessible.)</p>';
  document.getElementById('file-view').innerHTML = html;
}

showSummary();
</script>
</body>
</html>`;
}

export class HtmlSpaReporter {
  private readonly options: HtmlSpaReporterOptions;

  constructor(options: HtmlSpaReporterOptions) {
    this.options = options;
  }

  onEnd(coverageMap: CoverageMap, globalSummary: CoverageSummary): void {
    const outputDir = join(this.options.reportsDirectory, 'html-spa');
    mkdirSync(outputDir, { recursive: true });

    const html = generateSpaHtml(coverageMap, globalSummary);
    writeFileSync(join(outputDir, 'index.html'), html, 'utf-8');
  }
}
