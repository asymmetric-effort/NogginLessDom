/**
 * Parse and handle coverage ignore directives in source code.
 */

import type { FileCoverage } from './reporters/types.js';

export interface IgnoreRange {
  startLine: number;
  endLine: number;
  type: 'line' | 'block' | 'file';
}

/**
 * Patterns for coverage ignore comments.
 * Supports v8, istanbul, and c8 directives.
 */
const IGNORE_NEXT_PATTERN =
  /\/\*\s*(?:v8|istanbul|c8)\s+ignore\s+(?:next|if|else)\s*\*\//g;

const IGNORE_START_PATTERN = /\/\*\s*(?:v8|c8)\s+ignore\s+start\s*\*\//g;

const IGNORE_STOP_PATTERN = /\/\*\s*(?:v8|c8)\s+ignore\s+stop\s*\*\//g;

const IGNORE_FILE_PATTERN = /\/\*\s*istanbul\s+ignore\s+file\s*\*\//g;

/**
 * Find all coverage ignore ranges in source code.
 */
export function findIgnoreRanges(source: string): IgnoreRange[] {
  const lines = source.split('\n');
  const ranges: IgnoreRange[] = [];
  const totalLines = lines.length;

  // Check for file-level ignore
  for (let i = 0; i < totalLines; i++) {
    const line = lines[i]!;
    IGNORE_FILE_PATTERN.lastIndex = 0;
    if (IGNORE_FILE_PATTERN.test(line)) {
      ranges.push({
        startLine: 1,
        endLine: totalLines,
        type: 'file',
      });
      return ranges; // File ignore means entire file is ignored
    }
  }

  let blockStartLine: number | undefined;

  for (let i = 0; i < totalLines; i++) {
    const line = lines[i]!;
    const lineNum = i + 1; // 1-based

    // Check for block start
    IGNORE_START_PATTERN.lastIndex = 0;
    if (IGNORE_START_PATTERN.test(line)) {
      blockStartLine = lineNum;
      continue;
    }

    // Check for block stop
    IGNORE_STOP_PATTERN.lastIndex = 0;
    if (IGNORE_STOP_PATTERN.test(line)) {
      if (blockStartLine !== undefined) {
        ranges.push({
          startLine: blockStartLine,
          endLine: lineNum,
          type: 'block',
        });
        blockStartLine = undefined;
      }
      continue;
    }

    // Check for next/if/else ignore (only if not inside a block)
    if (blockStartLine === undefined) {
      IGNORE_NEXT_PATTERN.lastIndex = 0;
      if (IGNORE_NEXT_PATTERN.test(line)) {
        const nextLine = lineNum + 1;
        if (nextLine <= totalLines) {
          ranges.push({
            startLine: nextLine,
            endLine: nextLine,
            type: 'line',
          });
        }
      }
    }
  }

  // Handle unclosed block — extend to end of file
  if (blockStartLine !== undefined) {
    ranges.push({
      startLine: blockStartLine,
      endLine: totalLines,
      type: 'block',
    });
  }

  return ranges;
}

function isLineInRange(line: number, ranges: IgnoreRange[]): boolean {
  return ranges.some((r) => line >= r.startLine && line <= r.endLine);
}

/**
 * Apply ignore ranges to a FileCoverage, zeroing out ignored ranges.
 * Returns a new FileCoverage; does not mutate the original.
 */
export function applyIgnoreRanges(
  fileCoverage: FileCoverage,
  ignoreRanges: IgnoreRange[],
): FileCoverage {
  if (ignoreRanges.length === 0) {
    return {
      ...fileCoverage,
      s: { ...fileCoverage.s },
      f: { ...fileCoverage.f },
      b: Object.fromEntries(
        Object.entries(fileCoverage.b).map(([k, v]) => [k, [...v]]),
      ),
    };
  }

  // Clone statement counts, zeroing ignored lines
  const s: Record<string, number> = {};
  for (const [key, count] of Object.entries(fileCoverage.s)) {
    const stmtLoc = fileCoverage.statementMap[key];
    if (stmtLoc && isLineInRange(stmtLoc.start.line, ignoreRanges)) {
      s[key] = 0;
    } else {
      s[key] = count;
    }
  }

  // Clone function counts, zeroing ignored lines
  const f: Record<string, number> = {};
  for (const [key, count] of Object.entries(fileCoverage.f)) {
    const fnLoc = fileCoverage.fnMap[key];
    if (fnLoc && isLineInRange(fnLoc.line, ignoreRanges)) {
      f[key] = 0;
    } else {
      f[key] = count;
    }
  }

  // Clone branch counts, zeroing ignored locations
  const b: Record<string, number[]> = {};
  for (const [key, counts] of Object.entries(fileCoverage.b)) {
    const branchLoc = fileCoverage.branchMap[key];
    if (branchLoc && isLineInRange(branchLoc.line, ignoreRanges)) {
      b[key] = counts.map(() => 0);
    } else {
      b[key] = [...counts];
    }
  }

  return {
    ...fileCoverage,
    s,
    f,
    b,
  };
}
