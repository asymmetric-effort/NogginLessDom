/**
 * Parse and handle coverage ignore directives in source code.
 */

import type { FileCoverage } from './coverage-map.js';

export interface IgnoreRange {
  startLine: number;
  endLine: number;
  type: 'line' | 'block' | 'file' | 'class' | 'ignore_if' | 'ignore_else';
  reason?: string;
}

/**
 * Patterns for coverage ignore comments.
 * Supports v8, istanbul, and c8 directives.
 */
const IGNORE_NEXT_PATTERN =
  /\/\*\s*(?:v8|istanbul|c8)\s+ignore\s+next\s*(?:--\s*(.*?)\s*)?\*\//g;

const IGNORE_IF_PATTERN =
  /\/\*\s*(?:v8|istanbul|c8)\s+ignore\s+if\s*(?:--\s*(.*?)\s*)?\*\//g;

const IGNORE_ELSE_PATTERN =
  /\/\*\s*(?:v8|istanbul|c8)\s+ignore\s+else\s*(?:--\s*(.*?)\s*)?\*\//g;

const IGNORE_NEXT_N_PATTERN =
  /\/\*\s*v8\s+ignore\s+next\s+(\d+)\s*(?:--\s*(.*?)\s*)?\*\//g;

const IGNORE_START_PATTERN = /\/\*\s*(?:v8|c8)\s+ignore\s+start\s*\*\//g;

const IGNORE_STOP_PATTERN = /\/\*\s*(?:v8|c8)\s+ignore\s+stop\s*\*\//g;

const IGNORE_FILE_PATTERN = /\/\*\s*istanbul\s+ignore\s+file\s*\*\//g;

const IGNORE_CLASS_PATTERN =
  /\/\*\s*istanbul\s+ignore\s+class\s*(?:--\s*(.*?)\s*)?\*\//g;

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

    // Check for istanbul ignore class (only if not inside a block)
    if (blockStartLine === undefined) {
      IGNORE_CLASS_PATTERN.lastIndex = 0;
      const classMatch = IGNORE_CLASS_PATTERN.exec(line);
      if (classMatch) {
        // Find the end of the class by counting braces
        let braceCount = 0;
        let classStarted = false;
        let classEndLine = totalLines;
        for (let j = i + 1; j < totalLines; j++) {
          const classLine = lines[j]!;
          for (const ch of classLine) {
            if (ch === '{') {
              braceCount++;
              classStarted = true;
            } else if (ch === '}') {
              braceCount--;
              if (classStarted && braceCount === 0) {
                classEndLine = j + 1; // 1-based
                break;
              }
            }
          }
          if (classStarted && braceCount === 0) break;
        }
        const reason = classMatch[1]?.trim();
        ranges.push({
          startLine: lineNum + 1,
          endLine: classEndLine,
          type: 'class',
          ...(reason ? { reason } : {}),
        });
        continue;
      }
    }

    // Check for v8 ignore next N (only if not inside a block)
    if (blockStartLine === undefined) {
      IGNORE_NEXT_N_PATTERN.lastIndex = 0;
      const nextNMatch = IGNORE_NEXT_N_PATTERN.exec(line);
      if (nextNMatch) {
        const count = parseInt(nextNMatch[1]!, 10);
        const reason = nextNMatch[2]?.trim();
        const nextLine = lineNum + 1;
        const endLine = Math.min(lineNum + count, totalLines);
        if (nextLine <= totalLines) {
          ranges.push({
            startLine: nextLine,
            endLine,
            type: 'line',
            ...(reason ? { reason } : {}),
          });
        }
        continue;
      }
    }

    // Check for istanbul ignore if (only if not inside a block)
    if (blockStartLine === undefined) {
      IGNORE_IF_PATTERN.lastIndex = 0;
      const ifMatch = IGNORE_IF_PATTERN.exec(line);
      if (ifMatch) {
        const reason = ifMatch[1]?.trim();
        const nextLine = lineNum + 1;
        if (nextLine <= totalLines) {
          ranges.push({
            startLine: nextLine,
            endLine: nextLine,
            type: 'ignore_if',
            ...(reason ? { reason } : {}),
          });
        }
        continue;
      }
    }

    // Check for istanbul ignore else (only if not inside a block)
    if (blockStartLine === undefined) {
      IGNORE_ELSE_PATTERN.lastIndex = 0;
      const elseMatch = IGNORE_ELSE_PATTERN.exec(line);
      if (elseMatch) {
        const reason = elseMatch[1]?.trim();
        const nextLine = lineNum + 1;
        if (nextLine <= totalLines) {
          ranges.push({
            startLine: nextLine,
            endLine: nextLine,
            type: 'ignore_else',
            ...(reason ? { reason } : {}),
          });
        }
        continue;
      }
    }

    // Check for next ignore (only if not inside a block)
    if (blockStartLine === undefined) {
      IGNORE_NEXT_PATTERN.lastIndex = 0;
      const nextMatch = IGNORE_NEXT_PATTERN.exec(line);
      if (nextMatch) {
        const reason = nextMatch[1]?.trim();
        const nextLine = lineNum + 1;
        if (nextLine <= totalLines) {
          ranges.push({
            startLine: nextLine,
            endLine: nextLine,
            type: 'line',
            ...(reason ? { reason } : {}),
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
  return ranges.some(
    (r) =>
      r.type !== 'ignore_if' &&
      r.type !== 'ignore_else' &&
      line >= r.startLine &&
      line <= r.endLine,
  );
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
    if (branchLoc) {
      // Check for ignore_if: only zero the if branch (index 0)
      const ignoreIfRange = ignoreRanges.find(
        (r) =>
          r.type === 'ignore_if' &&
          branchLoc.line >= r.startLine &&
          branchLoc.line <= r.endLine,
      );
      if (ignoreIfRange) {
        b[key] = counts.map((c, idx) => (idx === 0 ? 0 : c));
        continue;
      }

      // Check for ignore_else: only zero the else branch (index 1)
      const ignoreElseRange = ignoreRanges.find(
        (r) =>
          r.type === 'ignore_else' &&
          branchLoc.line >= r.startLine &&
          branchLoc.line <= r.endLine,
      );
      if (ignoreElseRange) {
        b[key] = counts.map((c, idx) => (idx === 1 ? 0 : c));
        continue;
      }

      // Full ignore (line, block, file, class)
      if (isLineInRange(branchLoc.line, ignoreRanges)) {
        b[key] = counts.map(() => 0);
      } else {
        b[key] = [...counts];
      }
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
