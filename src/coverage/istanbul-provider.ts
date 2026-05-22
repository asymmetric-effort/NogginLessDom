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
// Source instrumentation
// ---------------------------------------------------------------------------

interface InstrumentResult {
  code: string;
  coverageData: FileCoverage;
}

/**
 * Parse and instrument a source string, inserting execution counters.
 *
 * This is a simplified instrumenter that detects:
 * - statements (non-empty lines)
 * - function declarations and arrow functions
 * - if/else branches
 */
export function instrumentSource(
  source: string,
  filePath: string,
): InstrumentResult {
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

  // First pass: identify functions and branches so we can insert counters
  const functionLines = new Set<number>();
  const branchLines = new Map<number, { hasElse: boolean; elseLine: number }>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const trimmed = line.trim();

    // Skip lines that are inside string or template literals
    if (isInsideStringLiteral(trimmed)) {
      continue;
    }

    // Detect function declarations: function name(...)
    if (/^(export\s+)?(async\s+)?function\s+\w+/.test(trimmed)) {
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

    // Detect class methods: method() {, async method() {, static method() {
    // Also get/set accessors: get prop() {, set prop(v) {
    if (
      /^(async\s+|static\s+|static\s+async\s+|get\s+|set\s+)?\w+\s*\([^)]*\)\s*\{/.test(
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
      // Look ahead for else
      let hasElse = false;
      let elseLine = -1;
      for (let j = i + 1; j < lines.length; j++) {
        const nextTrimmed = lines[j]!.trim();
        if (
          /^}\s*else\s*\{/.test(nextTrimmed) ||
          /^else\s*\{/.test(nextTrimmed)
        ) {
          hasElse = true;
          elseLine = j;
          break;
        }
        // Stop searching if we encounter another statement-level construct
        if (
          /^if\s*\(/.test(nextTrimmed) ||
          /^(const|let|var|function|class|return|export|import)\s/.test(
            nextTrimmed,
          )
        ) {
          break;
        }
      }
      branchLines.set(i, { hasElse, elseLine });
    }
  }

  // Second pass: generate instrumented output
  // Escape the file path for use in JavaScript string
  const escapedPath = filePath.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const trimmed = line.trim();
    const lineNum = i + 1; // 1-based line numbers

    // Skip empty lines and pure comment lines
    if (
      trimmed === '' ||
      trimmed.startsWith('//') ||
      trimmed.startsWith('/*') ||
      trimmed.startsWith('*')
    ) {
      outputLines.push(line);
      continue;
    }

    // Skip lines that are just closing braces
    if (trimmed === '}' || trimmed === '};' || trimmed === '},') {
      outputLines.push(line);
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
      outputLines.push(
        `globalThis.__coverage__['${escapedPath}'].f['${fnKey}']++;` +
          ` globalThis.__coverage__['${escapedPath}'].s['${stmtKey}']++;`,
      );
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
      outputLines.push(
        `globalThis.__coverage__['${escapedPath}'].s['${stmtKey}']++;` +
          ` globalThis.__coverage__['${escapedPath}'].b['${bKey}'][0]++;`,
      );
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
        outputLines.push(
          `globalThis.__coverage__['${escapedPath}'].b['${elseKey}'][1]++;`,
        );
        break;
      }
    }
    if (isElseLine) continue;

    // Regular statement
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
    outputLines.push(line);
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

  return {
    code: outputLines.join('\n'),
    coverageData,
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
  // function name(...)
  const fnMatch = /function\s+(\w+)/.exec(line);
  if (fnMatch?.[1]) return fnMatch[1];

  // const name = (...) => or const name = async (...) =>
  const arrowMatch = /(const|let|var)\s+(\w+)\s*=/.exec(line);
  if (arrowMatch?.[2]) return arrowMatch[2];

  // Class method: [async|static|get|set] name(...)
  const methodMatch =
    /^(?:async\s+|static\s+|static\s+async\s+|get\s+|set\s+)?(\w+)\s*\(/.exec(
      line,
    );
  if (methodMatch?.[1]) return methodMatch[1];

  return '(anonymous)';
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
 */
function convertToV8Format(
  coverageObj: Record<string, FileCoverage>,
): V8ScriptCoverage[] {
  const scripts: V8ScriptCoverage[] = [];
  let scriptIdx = 0;

  for (const [filePath, fc] of Object.entries(coverageObj)) {
    const functions: V8FunctionCoverage[] = [];

    // Convert function mappings to V8 function coverage
    for (const fnKey of Object.keys(fc.fnMap)) {
      const fnMapping = fc.fnMap[fnKey];
      const count = fc.f[fnKey] ?? 0;
      if (fnMapping) {
        functions.push({
          functionName: fnMapping.name,
          ranges: [
            {
              startOffset: locationToOffset(fnMapping.loc.start),
              endOffset: locationToOffset(fnMapping.loc.end),
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
          startOffset: locationToOffset(range.start),
          endOffset: locationToOffset(range.end),
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
            startOffset: locationToOffset(loc.start),
            endOffset: locationToOffset(loc.end),
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

/**
 * Simple heuristic to convert a line/column Location to a byte offset.
 * Uses a rough approximation: line * 80 + column.
 */
function locationToOffset(loc: { line: number; column: number }): number {
  return (loc.line - 1) * 80 + loc.column;
}
