import type {
  FileCoverage,
  Location,
  Range,
  FunctionMapping,
  BranchMapping,
} from './coverage-map.js';
import type { V8FunctionCoverage } from './v8-provider.js';
import { loadSourceMap } from './source-map.js';
import type { SourceMapConsumer } from './source-map.js';

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
        const branchType = detectBranchType(
          branchLocations,
          branchCounts,
          firstRange.count,
        );
        const bKey = String(branchIndex);
        branchMap[bKey] = {
          type: branchType,
          locations: branchLocations,
          line: branchLocations[0]!.start.line,
        };
        b[bKey] = branchCounts;
        branchIndex++;
      }
    }
  }

  const coverage: FileCoverage = {
    path: filePath,
    statementMap,
    fnMap,
    branchMap,
    s,
    f,
    b,
  };

  // Attempt source map remapping
  const consumer = loadSourceMap(filePath);
  if (consumer) {
    return remapCoverage(coverage, consumer);
  }

  return coverage;
}

/**
 * Remap a FileCoverage's positions from transpiled output to original source
 * using a SourceMapConsumer.
 */
function remapLocation(loc: Location, consumer: SourceMapConsumer): Location {
  const orig = consumer.originalPositionFor({
    line: loc.line,
    column: loc.column,
  });
  if (orig.line !== null && orig.column !== null) {
    return { line: orig.line, column: orig.column };
  }
  return loc;
}

function remapRange(range: Range, consumer: SourceMapConsumer): Range {
  return {
    start: remapLocation(range.start, consumer),
    end: remapLocation(range.end, consumer),
  };
}

function remapCoverage(
  fc: FileCoverage,
  consumer: SourceMapConsumer,
): FileCoverage {
  // Determine the original source path from the first mapping
  const firstStmtKey = Object.keys(fc.statementMap)[0];
  let originalPath = fc.path;
  if (firstStmtKey !== undefined) {
    const firstStmt = fc.statementMap[firstStmtKey]!;
    const orig = consumer.originalPositionFor({
      line: firstStmt.start.line,
      column: firstStmt.start.column,
    });
    if (orig.source !== null) {
      originalPath = orig.source;
    }
  }

  const remappedStatementMap: Record<string, Range> = {};
  for (const key of Object.keys(fc.statementMap)) {
    remappedStatementMap[key] = remapRange(fc.statementMap[key]!, consumer);
  }

  const remappedFnMap: Record<string, FunctionMapping> = {};
  for (const key of Object.keys(fc.fnMap)) {
    const fn = fc.fnMap[key]!;
    const remappedDecl = remapRange(fn.decl, consumer);
    const remappedLoc = remapRange(fn.loc, consumer);
    remappedFnMap[key] = {
      name: fn.name,
      decl: remappedDecl,
      loc: remappedLoc,
      line: remappedDecl.start.line,
    };
  }

  const remappedBranchMap: Record<string, BranchMapping> = {};
  for (const key of Object.keys(fc.branchMap)) {
    const branch = fc.branchMap[key]!;
    const remappedLocations = branch.locations.map((loc) =>
      remapRange(loc, consumer),
    );
    remappedBranchMap[key] = {
      type: branch.type,
      locations: remappedLocations,
      line:
        remappedLocations.length > 0
          ? remappedLocations[0]!.start.line
          : branch.line,
    };
  }

  return {
    path: originalPath,
    statementMap: remappedStatementMap,
    fnMap: remappedFnMap,
    branchMap: remappedBranchMap,
    s: fc.s,
    f: fc.f,
    b: fc.b,
  };
}

/**
 * Detect branch type based on range structure.
 *
 * - 'binary-expr': single inner range with lower count (short-circuit like || or &&)
 * - 'cond-expr': exactly 2 inner ranges on the same line, both short (ternary)
 * - 'if': two or more inner ranges spanning multiple lines (if/else)
 */
function detectBranchType(
  locations: Range[],
  counts: number[],
  outerCount: number,
): string {
  // Single inner range with different count => binary expression (short-circuit)
  if (locations.length === 1 && counts[0] !== outerCount) {
    return 'binary-expr';
  }

  // Exactly 2 inner ranges: check if they look like a ternary (same line, short spans)
  if (locations.length === 2) {
    const loc0 = locations[0]!;
    const loc1 = locations[1]!;
    const sameLine =
      loc0.start.line === loc0.end.line &&
      loc1.start.line === loc1.end.line &&
      loc0.start.line === loc1.start.line;

    if (sameLine) {
      return 'cond-expr';
    }
  }

  return 'if';
}
