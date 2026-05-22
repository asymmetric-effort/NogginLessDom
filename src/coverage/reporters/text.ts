import type {
  CoverageMap,
  CoverageSummary,
  CoverageWatermarks,
  CoverageMetric,
} from './types.js';

export interface TextReporterOptions {
  reportsDirectory: string;
  skipFull?: boolean;
  watermarks?: CoverageWatermarks;
}

const DEFAULT_WATERMARKS: CoverageWatermarks = {
  statements: [50, 80],
  branches: [50, 80],
  functions: [50, 80],
  lines: [50, 80],
};

const ANSI_RED = '\x1b[31m';
const ANSI_YELLOW = '\x1b[33m';
const ANSI_GREEN = '\x1b[32m';
const ANSI_RESET = '\x1b[0m';

function colorForPct(pct: number, watermark: [number, number]): string {
  if (pct < watermark[0]) {
    return ANSI_RED;
  }
  if (pct < watermark[1]) {
    return ANSI_YELLOW;
  }
  return ANSI_GREEN;
}

function padRight(str: string, len: number): string {
  if (str.length >= len) return str;
  return str + ' '.repeat(len - str.length);
}

function padLeft(str: string, len: number): string {
  if (str.length >= len) return str;
  return ' '.repeat(len - str.length) + str;
}

function formatPct(pct: number): string {
  return pct.toFixed(2);
}

function isFull(summary: CoverageSummary): boolean {
  return (
    summary.statements.pct === 100 &&
    summary.branches.pct === 100 &&
    summary.functions.pct === 100 &&
    summary.lines.pct === 100
  );
}

interface DirectoryGroup {
  dirPath: string;
  files: Array<{ name: string; filePath: string; summary: CoverageSummary }>;
}

function groupFilesByDirectory(filePaths: string[]): DirectoryGroup[] {
  const dirMap = new Map<string, Array<{ name: string; filePath: string }>>();

  for (const filePath of filePaths) {
    const lastSlash = filePath.lastIndexOf('/');
    const dirPath = lastSlash >= 0 ? filePath.slice(0, lastSlash + 1) : '';
    const fileName = lastSlash >= 0 ? filePath.slice(lastSlash + 1) : filePath;

    let entries = dirMap.get(dirPath);
    if (!entries) {
      entries = [];
      dirMap.set(dirPath, entries);
    }
    entries.push({ name: fileName, filePath });
  }

  const groups: DirectoryGroup[] = [];
  for (const [dirPath, files] of dirMap) {
    groups.push({
      dirPath: dirPath.startsWith('/') ? dirPath.slice(1) : dirPath,
      files: files.map(f => ({ ...f, summary: { lines: { total: 0, covered: 0, skipped: 0, pct: 0 }, statements: { total: 0, covered: 0, skipped: 0, pct: 0 }, functions: { total: 0, covered: 0, skipped: 0, pct: 0 }, branches: { total: 0, covered: 0, skipped: 0, pct: 0 } } })),
    });
  }

  return groups.sort((a, b) => a.dirPath.localeCompare(b.dirPath));
}

function colorize(text: string, color: string): string {
  return `${color}${text}${ANSI_RESET}`;
}

function makeMetricCell(metric: CoverageMetric, watermark: [number, number], width: number): string {
  const pctStr = padLeft(formatPct(metric.pct), width);
  const color = colorForPct(metric.pct, watermark);
  return colorize(pctStr, color);
}

export class TextReporter {
  private readonly options: TextReporterOptions;
  private readonly watermarks: CoverageWatermarks;

  constructor(options: TextReporterOptions) {
    this.options = options;
    this.watermarks = options.watermarks ?? DEFAULT_WATERMARKS;
  }

  format(coverageMap: CoverageMap, globalSummary: CoverageSummary): string {
    const filePaths = coverageMap.files();
    const COL_FILE = 20;
    const COL_STMTS = 7;
    const COL_BRANCH = 8;
    const COL_FUNCS = 7;
    const COL_LINES = 7;

    // Compute max file name width
    const groups = groupFilesByDirectory(filePaths);
    let maxFileWidth = 'All files'.length;
    for (const group of groups) {
      if (group.dirPath.length > maxFileWidth) {
        maxFileWidth = group.dirPath.length;
      }
      for (const file of group.files) {
        const displayName = '  ' + file.name;
        if (displayName.length > maxFileWidth) {
          maxFileWidth = displayName.length;
        }
      }
    }
    const fileColWidth = Math.max(COL_FILE, maxFileWidth + 1);

    const sep = '-'.repeat(fileColWidth) + '|' + '-'.repeat(COL_STMTS + 2) + '|' + '-'.repeat(COL_BRANCH + 2) + '|' + '-'.repeat(COL_FUNCS + 2) + '|' + '-'.repeat(COL_LINES + 2) + '|';

    function makeRow(
      fileLabel: string,
      stmts: string,
      branch: string,
      funcs: string,
      lines: string
    ): string {
      return (
        padRight(fileLabel, fileColWidth) + '|' +
        ' ' + stmts + ' |' +
        ' ' + branch + ' |' +
        ' ' + funcs + ' |' +
        ' ' + lines + ' |'
      );
    }

    const headerRow = makeRow(
      padRight('File', fileColWidth),
      padLeft('% Stmts', COL_STMTS),
      padLeft('% Branch', COL_BRANCH),
      padLeft('% Funcs', COL_FUNCS),
      padLeft('% Lines', COL_LINES),
    );

    const allFilesRow = makeRow(
      padRight('All files', fileColWidth),
      makeMetricCell(globalSummary.statements, this.watermarks.statements, COL_STMTS),
      makeMetricCell(globalSummary.branches, this.watermarks.branches, COL_BRANCH),
      makeMetricCell(globalSummary.functions, this.watermarks.functions, COL_FUNCS),
      makeMetricCell(globalSummary.lines, this.watermarks.lines, COL_LINES),
    );

    const rows: string[] = [sep, headerRow, sep, allFilesRow];

    // Populate summaries from coverageMap
    for (const group of groups) {
      for (const file of group.files) {
        file.summary = coverageMap.fileSummaryFor(file.filePath);
      }
    }

    for (const group of groups) {
      // Filter files if skipFull
      const visibleFiles = this.options.skipFull
        ? group.files.filter(f => !isFull(f.summary))
        : group.files;

      if (visibleFiles.length === 0) continue;

      // Directory header row (no metrics, just label)
      if (group.dirPath) {
        rows.push(makeRow(
          padRight(' ' + group.dirPath, fileColWidth),
          padLeft('', COL_STMTS),
          padLeft('', COL_BRANCH),
          padLeft('', COL_FUNCS),
          padLeft('', COL_LINES),
        ));
      }

      for (const file of visibleFiles) {
        const summary = file.summary;
        const prefix = group.dirPath ? '  ' : ' ';
        rows.push(makeRow(
          padRight(prefix + file.name, fileColWidth),
          makeMetricCell(summary.statements, this.watermarks.statements, COL_STMTS),
          makeMetricCell(summary.branches, this.watermarks.branches, COL_BRANCH),
          makeMetricCell(summary.functions, this.watermarks.functions, COL_FUNCS),
          makeMetricCell(summary.lines, this.watermarks.lines, COL_LINES),
        ));
      }
    }

    rows.push(sep);

    return rows.join('\n') + '\n';
  }

  onEnd(coverageMap: CoverageMap, globalSummary: CoverageSummary): void {
    const output = this.format(coverageMap, globalSummary);
    process.stdout.write(output);
  }
}
