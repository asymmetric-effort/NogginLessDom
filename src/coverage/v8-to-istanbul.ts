import type {
  FileCoverage,
  Location,
  Range,
  FunctionMapping,
  BranchMapping,
} from './coverage-map.js';
import type { V8FunctionCoverage } from './v8-provider.js';

export function offsetToLocation(source: string, offset: number): Location {
  let line = 1;
  let column = 0;
  const clampedOffset = Math.min(offset, source.length);
  for (let i = 0; i < clampedOffset; i++) {
    if (source[i] === '\n') {
      line++;
      column = 0;
    } else {
      column++;
    }
  }
  return { line, column };
}

export function v8ToIstanbul(
  filePath: string,
  sourceContent: string,
  v8Coverage: V8FunctionCoverage[],
): FileCoverage {
  const statementMap: Record<string, Range> = {};
  const fnMap: Record<string, FunctionMapping> = {};
  const branchMap: Record<string, BranchMapping> = {};
  const s: Record<string, number> = {};
  const f: Record<string, number> = {};
  const b: Record<string, number[]> = {};

  let stmtIndex = 0;
  let fnIndex = 0;
  let branchIndex = 0;

  for (const fn of v8Coverage) {
    if (fn.ranges.length === 0) {
      continue;
    }

    const firstRange = fn.ranges[0]!;
    const fnRange: Range = {
      start: offsetToLocation(sourceContent, firstRange.startOffset),
      end: offsetToLocation(sourceContent, firstRange.endOffset),
    };

    // Add function mapping
    const fnKey = String(fnIndex);
    fnMap[fnKey] = {
      name: fn.functionName || '(anonymous)',
      decl: fnRange,
      loc: fnRange,
      line: fnRange.start.line,
    };
    f[fnKey] = firstRange.count;
    fnIndex++;

    // Add statement for the entire function range
    const stmtKey = String(stmtIndex);
    statementMap[stmtKey] = fnRange;
    s[stmtKey] = firstRange.count;
    stmtIndex++;

    // Process block coverage ranges as branches
    if (fn.isBlockCoverage && fn.ranges.length > 1) {
      const branchLocations: Range[] = [];
      const branchCounts: number[] = [];

      for (let i = 1; i < fn.ranges.length; i++) {
        const range = fn.ranges[i]!;
        const rangeStart = offsetToLocation(sourceContent, range.startOffset);
        const rangeEnd = offsetToLocation(sourceContent, range.endOffset);
        const blockRange: Range = { start: rangeStart, end: rangeEnd };

        branchLocations.push(blockRange);
        branchCounts.push(range.count);

        // Each block range is also a statement
        const blockStmtKey = String(stmtIndex);
        statementMap[blockStmtKey] = blockRange;
        s[blockStmtKey] = range.count;
        stmtIndex++;
      }

      if (branchLocations.length > 0) {
        const bKey = String(branchIndex);
        branchMap[bKey] = {
          type: 'if',
          locations: branchLocations,
          line: branchLocations[0]!.start.line,
        };
        b[bKey] = branchCounts;
        branchIndex++;
      }
    }
  }

  return {
    path: filePath,
    statementMap,
    fnMap,
    branchMap,
    s,
    f,
    b,
  };
}
