/**
 * Istanbul-style instrumentation coverage provider.
 *
 * Instruments source code by inserting execution counters instead of
 * relying on V8's built-in coverage. Uses a global `__coverage__` object.
 */

import type {
  FileCoverage,
  Range,
  FunctionMapping,
  BranchMapping,
} from './coverage-map.js';
import {
  CoverageMap,
  serializeCoverageMap,
  deserializeCoverageMap,
} from './coverage-map.js';
import type { RawSourceMap } from './source-map.js';

// ---------------------------------------------------------------------------
// Types for the V8-compatible output
// ---------------------------------------------------------------------------

interface V8CoverageRange {
  startOffset: number;
  endOffset: number;
  count: number;
}

interface V8FunctionCoverage {
  functionName: string;
  ranges: V8CoverageRange[];
  isBlockCoverage: boolean;
}

interface V8ScriptCoverage {
  scriptId: string;
  url: string;
  functions: V8FunctionCoverage[];
}

// ---------------------------------------------------------------------------
// Instrumenter options (Issue #108)
// ---------------------------------------------------------------------------

/**
 * Options for the instrumentSource function.
 */
export interface InstrumentOptions {
  /** Treat the source as an ES module (default: false). */
  esModules?: boolean;
  /** Produce compact output (default: false). */
  compact?: boolean;
  /** Preserve comments in the output (default: true). */
  preserveComments?: boolean;
}

// ---------------------------------------------------------------------------
// Source instrumentation
// ---------------------------------------------------------------------------

interface InstrumentResult {
  code: string;
  coverageData: FileCoverage;
  /** Source map mapping instrumented code back to original (Issue #107). */
  sourceMap: RawSourceMap;
}

/**
 * Parse and instrument a source string, inserting execution counters.
 *
 * This is a simplified instrumenter that detects:
 * - statements (non-empty lines)
 * - function declarations and arrow functions
 * - if/else branches
 * - switch/case branches (Issue #106)
 * - ternary expressions (Issue #106)
 * - logical operators &&, ||, ?? (Issue #106)
 */
export function instrumentSource(
  source: string,
  filePath: string,
  options?: InstrumentOptions,
): InstrumentResult {
  const opts: Required<InstrumentOptions> = {
    esModules: options?.esModules ?? false,
    compact: options?.compact ?? false,
    preserveComments: options?.preserveComments ?? true,
  };

  if (source.length === 0) {
    return {
      code: '',
      coverageData: {
        path: filePath,
        statementMap: {},
        fnMap: {},
        branchMap: {},
        s: {},
        f: {},
        b: {},
      },
      sourceMap: {
        version: 3,
        sources: [filePath],
        mappings: '',
        names: [],
      },
    };
  }

  const lines = source.split('\n');
  const statementMap: Record<string, Range> = {};
  const fnMap: Record<string, FunctionMapping> = {};
  const branchMap: Record<string, BranchMapping> = {};
  const s: Record<string, number> = {};
  const f: Record<string, number> = {};
  const b: Record<string, number[]> = {};

  let stmtIdx = 0;
  let fnIdx = 0;
  let branchIdx = 0;

  const outputLines: string[] = [];
  /** Maps each output line index to the original source line index (0-based). */
  const outputToSourceLine: number[] = [];

  /** Tracks case/default lines inside switch statements for counter insertion. */
  const localCaseCounterMap = new Map<
    number,
    { bKey: string; caseIdx: number }
  >();

  // First pass: identify functions, branches, switch, ternary, logical
  const functionLines = new Set<number>();
  const branchLines = new Map<number, { hasElse: boolean; elseLine: number }>();
  const switchLines = new Map<
    number,
    { cases: { line: number; label: string }[] }
  >();
  const ternaryLines = new Set<number>();
  const logicalLines = new Map<number, { operator: string; column: number }>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const trimmed = line.trim();

    // Skip lines that are inside string or template literals
    if (isInsideStringLiteral(trimmed)) {
      continue;
    }

    // Detect function declarations: function name(...), function* name(...),
    // async function name(...), async function* name(...)
    if (/^(export\s+)?(async\s+)?function\s*\*?\s+\w+/.test(trimmed)) {
      functionLines.add(i);
    }

    // Detect arrow functions: const/let/var name = (...) => {
    // Also handles single-param arrows without parens: const fn = x => {
    if (
      /^(export\s+)?(const|let|var)\s+\w+\s*=\s*(async\s+)?\(.*\)\s*=>\s*\{/.test(
        trimmed,
      ) ||
      /^(export\s+)?(const|let|var)\s+\w+\s*=\s*(async\s+)?\w+\s*=>\s*\{/.test(
        trimmed,
      )
    ) {
      functionLines.add(i);
    }

    // Issue #110: Detect function expressions: const/let/var name = function() {
    // or const name = function namedFn() {
    if (
      !functionLines.has(i) &&
      /^(export\s+)?(const|let|var)\s+\w+\s*=\s*(async\s+)?function\s*\*?\s*\w*\s*\(/.test(
        trimmed,
      )
    ) {
      functionLines.add(i);
    }

    // Detect class methods: method() {, async method() {, static method() {
    // Also get/set accessors: get prop() {, set prop(v) {
    // Issue #110: Added async generators (*method()), static async generators
    if (
      /^(async\s+|static\s+|static\s+async\s+|get\s+|set\s+)?\*?\s*\w+\s*\([^)]*\)\s*\{/.test(
        trimmed,
      ) &&
      !functionLines.has(i) &&
      !trimmed.startsWith('if') &&
      !trimmed.startsWith('while') &&
      !trimmed.startsWith('for') &&
      !trimmed.startsWith('switch') &&
      !trimmed.startsWith('catch') &&
      !trimmed.startsWith('class ') &&
      !trimmed.startsWith('const ') &&
      !trimmed.startsWith('let ') &&
      !trimmed.startsWith('var ') &&
      !trimmed.startsWith('export ') &&
      !trimmed.startsWith('import ') &&
      !trimmed.startsWith('return ') &&
      !trimmed.startsWith('function ')
    ) {
      functionLines.add(i);
    }

    // Detect if statements
    if (/^if\s*\(/.test(trimmed)) {
      // Look ahead for else, tracking brace depth
      let hasElse = false;
      let elseLine = -1;
      let braceDepth = 0;
      // Count braces on the if line itself
      for (const ch of trimmed) {
        if (ch === '{') braceDepth++;
        if (ch === '}') braceDepth--;
      }
      for (let j = i + 1; j < lines.length; j++) {
        const nextTrimmed = lines[j]!.trim();
        // Track brace depth
        for (const ch of nextTrimmed) {
          if (ch === '{') braceDepth++;
          if (ch === '}') braceDepth--;
        }
        if (
          /^}\s*else\s*\{/.test(nextTrimmed) ||
          /^else\s*\{/.test(nextTrimmed)
        ) {
          hasElse = true;
          elseLine = j;
          break;
        }
        // Stop searching if braces are balanced (end of if block without else)
        if (braceDepth <= 0) {
          break;
        }
      }
      branchLines.set(i, { hasElse, elseLine });
    }

    // Issue #106: Detect switch/case
    if (/^switch\s*\(/.test(trimmed)) {
      const cases: { line: number; label: string }[] = [];
      for (let j = i + 1; j < lines.length; j++) {
        const caseTrimmed = lines[j]!.trim();
        const caseMatch = /^case\s+(.+?):/.exec(caseTrimmed);
        if (caseMatch) {
          cases.push({ line: j, label: `case ${caseMatch[1]}` });
        } else if (/^default\s*:/.test(caseTrimmed)) {
          cases.push({ line: j, label: 'default' });
        }
        // Stop at closing brace of switch (same indentation level)
        if (caseTrimmed === '}' && j > i + 1) {
          break;
        }
      }
      if (cases.length > 0) {
        switchLines.set(i, { cases });
      }
    }

    // Issue #106: Detect ternary operator (? :)
    // Match lines containing ternary but not part of type annotations
    if (
      /\?\s*[^?:]+\s*:\s*/.test(trimmed) &&
      !trimmed.startsWith('//') &&
      !trimmed.startsWith('*') &&
      !/^\s*(case|default)/.test(trimmed) &&
      // Exclude optional chaining (?.)
      !/\?\.\s*/.test(trimmed.replace(/\?[^.]/g, '?X'))
    ) {
      // Make sure it contains both ? and : in a ternary pattern
      const qIdx = trimmed.indexOf('?');
      const cIdx = trimmed.indexOf(':', qIdx + 1);
      if (qIdx >= 0 && cIdx > qIdx) {
        ternaryLines.add(i);
      }
    }

    // Issue #106: Detect logical operators (&&, ||, ??)
    if (
      /&&|(?<!\|)\|\|(?!\|)|\?\?/.test(trimmed) &&
      !trimmed.startsWith('//')
    ) {
      const andMatch = /&&/.exec(trimmed);
      const orMatch = /(?<!\|)\|\|(?!\|)/.exec(trimmed);
      const nullishMatch = /\?\?/.exec(trimmed);
      const match = andMatch ?? orMatch ?? nullishMatch;
      if (match) {
        const operator = match[0];
        logicalLines.set(i, { operator, column: match.index });
      }
    }
  }

  // Second pass: generate instrumented output
  // Escape the file path for use in JavaScript string
  const escapedPath = filePath.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const trimmed = line.trim();
    const lineNum = i + 1; // 1-based line numbers

    // Issue #108: Strip comments when preserveComments is false
    if (!opts.preserveComments) {
      if (
        trimmed.startsWith('//') ||
        trimmed.startsWith('/*') ||
        trimmed.startsWith('*')
      ) {
        continue;
      }
    }

    // Skip empty lines and pure comment lines (for statement counting)
    if (
      trimmed === '' ||
      trimmed.startsWith('//') ||
      trimmed.startsWith('/*') ||
      trimmed.startsWith('*')
    ) {
      outputLines.push(opts.compact ? '' : line);
      outputToSourceLine.push(i);
      continue;
    }

    // Skip lines that are just closing braces
    if (trimmed === '}' || trimmed === '};' || trimmed === '},') {
      outputLines.push(line);
      outputToSourceLine.push(i);
      continue;
    }

    // Add function counter if this line is a function
    if (functionLines.has(i)) {
      const fnKey = String(fnIdx);
      const col = line.length - line.trimStart().length;
      const fnRange: Range = {
        start: { line: lineNum, column: col },
        end: { line: lineNum, column: line.length },
      };
      fnMap[fnKey] = {
        name: extractFunctionName(trimmed),
        decl: fnRange,
        loc: fnRange,
        line: lineNum,
      };
      f[fnKey] = 0;
      fnIdx++;

      // Insert function counter after the opening brace
      const stmtKey = String(stmtIdx);
      statementMap[stmtKey] = {
        start: { line: lineNum, column: col },
        end: { line: lineNum, column: line.length },
      };
      s[stmtKey] = 0;
      stmtIdx++;

      outputLines.push(line);
      outputToSourceLine.push(i);
      const counterLine = opts.compact
        ? `globalThis.__coverage__['${escapedPath}'].f['${fnKey}']++;globalThis.__coverage__['${escapedPath}'].s['${stmtKey}']++;`
        : `globalThis.__coverage__['${escapedPath}'].f['${fnKey}']++;` +
          ` globalThis.__coverage__['${escapedPath}'].s['${stmtKey}']++;`;
      outputLines.push(counterLine);
      outputToSourceLine.push(i);
      continue;
    }

    // Add branch counters for if lines
    if (branchLines.has(i)) {
      const branchInfo = branchLines.get(i)!;
      const bKey = String(branchIdx);
      const col = line.length - line.trimStart().length;
      const ifRange: Range = {
        start: { line: lineNum, column: col },
        end: { line: lineNum, column: line.length },
      };

      const locations: Range[] = [ifRange];
      if (branchInfo.hasElse) {
        const elseLineNum = branchInfo.elseLine + 1;
        locations.push({
          start: { line: elseLineNum, column: 0 },
          end: {
            line: elseLineNum,
            column: (lines[branchInfo.elseLine] ?? '').length,
          },
        });
        branchMap[bKey] = { type: 'if', locations, line: lineNum };
        b[bKey] = [0, 0];
      } else {
        // If without else still has 2 branch paths (taken / not taken)
        locations.push({
          start: { line: lineNum, column: col },
          end: { line: lineNum, column: line.length },
        });
        branchMap[bKey] = { type: 'if', locations, line: lineNum };
        b[bKey] = [0, 0];
      }
      branchIdx++;

      // Statement for the if line itself
      const stmtKey = String(stmtIdx);
      statementMap[stmtKey] = ifRange;
      s[stmtKey] = 0;
      stmtIdx++;

      outputLines.push(line);
      outputToSourceLine.push(i);
      outputLines.push(
        `globalThis.__coverage__['${escapedPath}'].s['${stmtKey}']++;` +
          ` globalThis.__coverage__['${escapedPath}'].b['${bKey}'][0]++;`,
      );
      outputToSourceLine.push(i);
      continue;
    }

    // Check if this is an else line that corresponds to a branch
    let isElseLine = false;
    for (const [, info] of branchLines) {
      if (info.hasElse && info.elseLine === i) {
        // Find the branch key
        let elseKey = '';
        for (const [bLineNum, bInfo] of branchLines) {
          if (bInfo === info) {
            // Find the branch index for this line
            let idx = 0;
            for (const [bl] of branchLines) {
              if (bl === bLineNum) break;
              idx++;
            }
            elseKey = String(idx);
            break;
          }
        }
        isElseLine = true;
        outputLines.push(line);
        outputToSourceLine.push(i);
        outputLines.push(
          `globalThis.__coverage__['${escapedPath}'].b['${elseKey}'][1]++;`,
        );
        outputToSourceLine.push(i);
        break;
      }
    }
    if (isElseLine) continue;

    // Issue #106: Switch statement — insert branch tracking
    if (switchLines.has(i)) {
      const switchInfo = switchLines.get(i)!;
      const bKey = String(branchIdx);
      const col = line.length - line.trimStart().length;

      const locations: Range[] = [];
      const counts: number[] = [];
      for (const caseInfo of switchInfo.cases) {
        const caseLine = caseInfo.line + 1; // 1-based
        locations.push({
          start: { line: caseLine, column: 0 },
          end: { line: caseLine, column: (lines[caseInfo.line] ?? '').length },
        });
        counts.push(0);
      }

      branchMap[bKey] = { type: 'switch', locations, line: lineNum };
      b[bKey] = counts;
      branchIdx++;

      // Statement for the switch line — counter goes BEFORE switch
      const stmtKey = String(stmtIdx);
      statementMap[stmtKey] = {
        start: { line: lineNum, column: col },
        end: { line: lineNum, column: line.length },
      };
      s[stmtKey] = 0;
      stmtIdx++;

      outputLines.push(
        `globalThis.__coverage__['${escapedPath}'].s['${stmtKey}']++;`,
      );
      outputToSourceLine.push(i);
      outputLines.push(line);
      outputToSourceLine.push(i);

      // Insert counters after each case/default line
      const switchBKey = bKey;
      for (let ci = 0; ci < switchInfo.cases.length; ci++) {
        const caseInfo = switchInfo.cases[ci]!;
        // We'll handle case lines when we encounter them
        // Store the mapping for the second pass
        localCaseCounterMap.set(caseInfo.line, {
          bKey: switchBKey,
          caseIdx: ci,
        });
      }
      continue;
    }

    // Check if this is a case/default line inside a switch
    if (localCaseCounterMap.has(i)) {
      const caseCounter = localCaseCounterMap.get(i)!;
      outputLines.push(line);
      outputToSourceLine.push(i);
      outputLines.push(
        `globalThis.__coverage__['${escapedPath}'].b['${caseCounter.bKey}'][${caseCounter.caseIdx}]++;`,
      );
      outputToSourceLine.push(i);
      continue;
    }

    // Issue #106: Ternary detection — add branch counter
    if (ternaryLines.has(i) && !logicalLines.has(i)) {
      const bKey = String(branchIdx);
      const col = line.length - line.trimStart().length;

      branchMap[bKey] = {
        type: 'cond-expr',
        locations: [
          {
            start: { line: lineNum, column: col },
            end: { line: lineNum, column: line.length },
          },
          {
            start: { line: lineNum, column: col },
            end: { line: lineNum, column: line.length },
          },
        ],
        line: lineNum,
      };
      b[bKey] = [0, 0];
      branchIdx++;

      const stmtKey = String(stmtIdx);
      statementMap[stmtKey] = {
        start: { line: lineNum, column: col },
        end: { line: lineNum, column: line.length },
      };
      s[stmtKey] = 0;
      stmtIdx++;

      outputLines.push(
        `globalThis.__coverage__['${escapedPath}'].s['${stmtKey}']++;`,
      );
      outputToSourceLine.push(i);
      outputLines.push(line);
      outputToSourceLine.push(i);
      continue;
    }

    // Issue #106: Logical operator detection — add branch counter
    if (logicalLines.has(i)) {
      const bKey = String(branchIdx);
      const col = line.length - line.trimStart().length;

      branchMap[bKey] = {
        type: 'binary-expr',
        locations: [
          {
            start: { line: lineNum, column: col },
            end: { line: lineNum, column: line.length },
          },
          {
            start: { line: lineNum, column: col },
            end: { line: lineNum, column: line.length },
          },
        ],
        line: lineNum,
      };
      b[bKey] = [0, 0];
      branchIdx++;

      const stmtKey = String(stmtIdx);
      statementMap[stmtKey] = {
        start: { line: lineNum, column: col },
        end: { line: lineNum, column: line.length },
      };
      s[stmtKey] = 0;
      stmtIdx++;

      outputLines.push(
        `globalThis.__coverage__['${escapedPath}'].s['${stmtKey}']++;`,
      );
      outputToSourceLine.push(i);
      outputLines.push(line);
      outputToSourceLine.push(i);
      continue;
    }

    // Issue #111: Multi-statement lines — detect semicolons separating statements
    const subStatements = splitMultiStatements(line);
    if (subStatements.length > 1) {
      const counterParts: string[] = [];
      for (const sub of subStatements) {
        const subStmtKey = String(stmtIdx);
        statementMap[subStmtKey] = {
          start: { line: lineNum, column: sub.start },
          end: { line: lineNum, column: sub.end },
        };
        s[subStmtKey] = 0;
        stmtIdx++;
        counterParts.push(
          `globalThis.__coverage__['${escapedPath}'].s['${subStmtKey}']++;`,
        );
      }
      outputLines.push(counterParts.join(' '));
      outputToSourceLine.push(i);
      outputLines.push(line);
      outputToSourceLine.push(i);
    } else {
      // Regular single statement
      const stmtKey = String(stmtIdx);
      const col = line.length - line.trimStart().length;
      statementMap[stmtKey] = {
        start: { line: lineNum, column: col },
        end: { line: lineNum, column: line.length },
      };
      s[stmtKey] = 0;
      stmtIdx++;

      outputLines.push(
        `globalThis.__coverage__['${escapedPath}'].s['${stmtKey}']++;`,
      );
      outputToSourceLine.push(i);
      outputLines.push(line);
      outputToSourceLine.push(i);
    }
  }

  const coverageData: FileCoverage = {
    path: filePath,
    statementMap,
    fnMap,
    branchMap,
    s,
    f,
    b,
  };

  // Issue #107: Produce a source map
  const sourceMap = generateSourceMap(filePath, outputToSourceLine);

  // Issue #108: Compact output — remove empty lines
  const finalCode = opts.compact
    ? outputLines.filter((l) => l.length > 0).join('\n')
    : outputLines.join('\n');

  return {
    code: finalCode,
    coverageData,
    sourceMap,
  };
}

/**
 * Check if a trimmed line appears to be a string/template literal assignment
 * rather than actual code with keywords. Detects lines like:
 *   const s = 'function hello() { ... }';
 *   const s = "if (x) { ... }";
 *   const s = `method() {`;
 */
function isInsideStringLiteral(trimmed: string): boolean {
  // Match assignment to a string: const/let/var x = '...' or "..." or `...`
  if (
    /^(export\s+)?(const|let|var)\s+\w+\s*=\s*['"`]/.test(trimmed) &&
    !trimmed.includes('=>')
  ) {
    return true;
  }
  // Line that is purely a string literal
  if (/^['"`]/.test(trimmed) && !trimmed.startsWith('`${')) {
    return true;
  }
  return false;
}

/**
 * Extract a function name from a line of code.
 */
function extractFunctionName(line: string): string {
  // function name(...) or function* name(...)
  const fnMatch = /function\s*\*?\s+(\w+)/.exec(line);
  if (fnMatch?.[1]) return fnMatch[1];

  // const name = (...) => or const name = async (...) =>
  // Also: const name = function() { or const name = function namedFn() {
  const arrowMatch = /(const|let|var)\s+(\w+)\s*=/.exec(line);
  if (arrowMatch?.[2]) return arrowMatch[2];

  // Class method: [async|static|get|set] name(...) or *name(...)
  const methodMatch =
    /^(?:async\s+|static\s+|static\s+async\s+|get\s+|set\s+)?\*?\s*(\w+)\s*\(/.exec(
      line,
    );
  if (methodMatch?.[1]) return methodMatch[1];

  return '(anonymous)';
}

// ---------------------------------------------------------------------------
// Issue #111: Multi-statement line splitting
// ---------------------------------------------------------------------------

interface SubStatement {
  start: number;
  end: number;
}

/**
 * Split a line into multiple statements separated by semicolons.
 * Ignores semicolons inside strings, parentheses (for-loops), and template literals.
 * Returns an array of { start, end } column ranges. If the line has only
 * one statement, returns a single-element array.
 */
function splitMultiStatements(line: string): SubStatement[] {
  // Don't split for-loop headers, while, or control-flow lines
  if (
    /^\s*(for|while|do|if|switch|return|throw|class|import|export)\b/.test(line)
  ) {
    return [{ start: line.length - line.trimStart().length, end: line.length }];
  }

  const leadingSpaces = line.length - line.trimStart().length;
  const results: SubStatement[] = [];
  let depth = 0; // parentheses depth
  let braceDepth = 0;
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  let segStart = leadingSpaces;

  for (let j = leadingSpaces; j < line.length; j++) {
    const ch = line[j]!;
    const prev = j > 0 ? line[j - 1] : '';

    if (prev !== '\\') {
      if (ch === "'" && !inDouble && !inTemplate) {
        inSingle = !inSingle;
      } else if (ch === '"' && !inSingle && !inTemplate) {
        inDouble = !inDouble;
      } else if (ch === '`' && !inSingle && !inDouble) {
        inTemplate = !inTemplate;
      }
    }

    if (inSingle || inDouble || inTemplate) continue;

    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === '{') braceDepth++;
    if (ch === '}') braceDepth--;

    if (ch === ';' && depth === 0 && braceDepth === 0) {
      // End of a sub-statement (include the semicolon)
      const segEnd = j + 1;
      const segment = line.slice(segStart, segEnd).trim();
      if (segment.length > 0 && segment !== ';') {
        results.push({ start: segStart, end: segEnd });
      }
      segStart = j + 1;
    }
  }

  // Trailing segment (after last semicolon or the whole line if no semicolons found)
  if (segStart < line.length) {
    const trailing = line.slice(segStart).trim();
    if (trailing.length > 0) {
      results.push({ start: segStart, end: line.length });
    }
  }

  return results.length > 0
    ? results
    : [{ start: leadingSpaces, end: line.length }];
}

// ---------------------------------------------------------------------------
// Source Map Generation (Issue #107)
// ---------------------------------------------------------------------------

/**
 * Generate a source map mapping instrumented output lines back to original
 * source lines.
 */
function generateSourceMap(
  filePath: string,
  outputToSourceLine: number[],
): RawSourceMap {
  // Build VLQ-encoded mappings
  // Each output line maps to the original source line
  const mappingSegments: string[] = [];
  let prevSourceLine = 0;

  for (let i = 0; i < outputToSourceLine.length; i++) {
    const sourceLine = outputToSourceLine[i]!;
    // Each segment: [generatedColumn, sourceIndex, sourceLine, sourceColumn]
    // All relative to previous values
    const genCol = 0; // always column 0
    const srcIdx = 0; // always source index 0
    const srcLine = sourceLine - prevSourceLine;
    const srcCol = 0;
    prevSourceLine = sourceLine;

    mappingSegments.push(encodeVLQ([genCol, srcIdx, srcLine, srcCol]));
  }

  return {
    version: 3,
    sources: [filePath],
    mappings: mappingSegments.join(';'),
    names: [],
  };
}

/**
 * Encode an array of integers into a VLQ string.
 */
function encodeVLQ(values: number[]): string {
  const BASE64_CHARS =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  for (const value of values) {
    let v = value < 0 ? (-value << 1) | 1 : value << 1;
    do {
      let digit = v & 0x1f;
      v >>>= 5;
      if (v > 0) {
        digit |= 0x20; // continuation bit
      }
      result += BASE64_CHARS[digit];
    } while (v > 0);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Issue #101: Accurate locationToOffset using source scanning
// ---------------------------------------------------------------------------

/**
 * Convert a line/column Location to a byte offset using actual source content.
 * Falls back to a heuristic if source is not available.
 */
function locationToOffset(
  loc: { line: number; column: number },
  source?: string,
): number {
  if (source === undefined) {
    // Fallback heuristic when source is not available
    return (loc.line - 1) * 80 + loc.column;
  }

  const lines = source.split('\n');
  let offset = 0;
  for (let i = 0; i < loc.line - 1 && i < lines.length; i++) {
    offset += lines[i]!.length + 1; // +1 for the newline character
  }
  offset += loc.column;
  return offset;
}

// ---------------------------------------------------------------------------
// Istanbul Coverage Provider
// ---------------------------------------------------------------------------

/**
 * Istanbul-style coverage provider that uses source instrumentation
 * and a global `__coverage__` object.
 */
export class IstanbulCoverageProvider {
  /**
   * Initialize the global coverage object.
   */
  async start(): Promise<void> {
    const g = globalThis as Record<string, unknown>;
    g['__coverage__'] = {};
  }

  /**
   * Read current coverage data from `globalThis.__coverage__` and
   * convert it to V8-compatible script coverage format.
   */
  async take(): Promise<V8ScriptCoverage[]> {
    const g = globalThis as Record<string, unknown>;
    const coverageObj = g['__coverage__'] as
      | Record<string, FileCoverage>
      | undefined;
    if (!coverageObj) return [];

    return convertToV8Format(coverageObj);
  }

  /**
   * Take final coverage snapshot and cleanup the global.
   */
  async stop(): Promise<V8ScriptCoverage[]> {
    const result = await this.take();
    const g = globalThis as Record<string, unknown>;
    delete g['__coverage__'];
    return result;
  }
}

/**
 * Convert Istanbul FileCoverage records to V8ScriptCoverage format.
 * Issue #101: Uses actual source scanning for accurate offsets.
 */
function convertToV8Format(
  coverageObj: Record<string, FileCoverage>,
): V8ScriptCoverage[] {
  const scripts: V8ScriptCoverage[] = [];
  let scriptIdx = 0;

  for (const [filePath, fc] of Object.entries(coverageObj)) {
    const functions: V8FunctionCoverage[] = [];

    // Try to read source for accurate offset computation
    let source: string | undefined;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const nodeFs = require('node:fs') as {
        readFileSync(p: string, e: string): string;
      };
      source = nodeFs.readFileSync(filePath, 'utf-8');
    } catch {
      // Source not available — use heuristic fallback
    }

    // Convert function mappings to V8 function coverage
    for (const fnKey of Object.keys(fc.fnMap)) {
      const fnMapping = fc.fnMap[fnKey];
      const count = fc.f[fnKey] ?? 0;
      if (fnMapping) {
        functions.push({
          functionName: fnMapping.name,
          ranges: [
            {
              startOffset: locationToOffset(fnMapping.loc.start, source),
              endOffset: locationToOffset(fnMapping.loc.end, source),
              count,
            },
          ],
          isBlockCoverage: false,
        });
      }
    }

    // Convert statements to a default function entry (top-level)
    const stmtRanges: V8CoverageRange[] = [];
    for (const sKey of Object.keys(fc.statementMap)) {
      const range = fc.statementMap[sKey];
      const count = fc.s[sKey] ?? 0;
      if (range) {
        stmtRanges.push({
          startOffset: locationToOffset(range.start, source),
          endOffset: locationToOffset(range.end, source),
          count,
        });
      }
    }

    if (stmtRanges.length > 0) {
      functions.push({
        functionName: '',
        ranges: stmtRanges,
        isBlockCoverage: true,
      });
    }

    // Convert branches to block coverage entries
    for (const bKey of Object.keys(fc.branchMap)) {
      const branchMapping = fc.branchMap[bKey];
      const counts = fc.b[bKey];
      if (branchMapping && counts) {
        const branchRanges: V8CoverageRange[] = [];
        for (let i = 0; i < branchMapping.locations.length; i++) {
          const loc = branchMapping.locations[i]!;
          branchRanges.push({
            startOffset: locationToOffset(loc.start, source),
            endOffset: locationToOffset(loc.end, source),
            count: counts[i] ?? 0,
          });
        }
        functions.push({
          functionName: `(branch_${bKey})`,
          ranges: branchRanges,
          isBlockCoverage: true,
        });
      }
    }

    scripts.push({
      scriptId: String(scriptIdx),
      url: `file://${filePath}`,
      functions,
    });
    scriptIdx++;
  }

  return scripts;
}

// ---------------------------------------------------------------------------
// Issue #100: Multi-process coverage IPC integration
// ---------------------------------------------------------------------------

/**
 * Coverage IPC message type.
 */
interface CoverageIPCMessage {
  type: 'coverage';
  coverage: string;
}

/**
 * Send coverage data to the parent process via process.send().
 * No-op if process.send is not available (i.e., not in a worker).
 */
export function sendCoverageToParent(coverageMap: CoverageMap): void {
  if (typeof process.send !== 'function') {
    return;
  }
  const serialized = serializeCoverageMap(coverageMap);
  const message: CoverageIPCMessage = {
    type: 'coverage',
    coverage: serialized,
  };
  process.send(message);
}

/**
 * Set up a handler to receive coverage data from a worker process.
 * Returns the handler function for direct invocation (useful for testing).
 *
 * @param onCoverage - Callback invoked with each received FileCoverage.
 * @returns The message handler function.
 */
export function receiveCoverageFromWorker(
  onCoverage: (fc: FileCoverage) => void,
): (message: Record<string, unknown>) => void {
  const handler = (message: Record<string, unknown>): void => {
    if (message['type'] !== 'coverage') {
      return;
    }
    const coverageStr = message['coverage'];
    if (typeof coverageStr !== 'string') {
      return;
    }
    const map = deserializeCoverageMap(coverageStr);
    for (const filePath of map.files()) {
      onCoverage(map.fileCoverageFor(filePath));
    }
  };
  return handler;
}
