/**
 * Module mock hoisting transform.
 *
 * Reorders top-level mock.module(), mock.modulePartial(), vi.mock(), and
 * vi.hoisted() calls so they appear before all import declarations.  This is
 * necessary for ESM because import bindings are evaluated before any
 * module-level statements execute.
 *
 * The implementation provides two strategies:
 * 1. AST-based hoisting via steamroller (preferred, produces source maps)
 * 2. Regex-based hoisting (fallback, zero-dependency)
 *
 * @module hoist
 */

import { createRequire } from 'node:module';
import * as path from 'node:path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Result of a mock-hoisting transform.
 */
export interface HoistResult {
  code: string;
  hoisted: boolean;
  map?: {
    version: 3;
    sources: string[];
    mappings: string;
    sourcesContent?: (string | null)[];
  };
}

// ---------------------------------------------------------------------------
// Hoistable-call detection helpers (shared)
// ---------------------------------------------------------------------------

/** Names that qualify a member-expression callee for hoisting. */
const HOISTABLE_CALLS: ReadonlySet<string> = new Set([
  'mock.module',
  'mock.modulePartial',
  'vi.mock',
  'vi.hoisted',
]);

// ---------------------------------------------------------------------------
// Steamroller loader — attempt to load once, cache result
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */

interface SteamrollerModules {
  parseAst: (source: string) => any;
  MagicString: any;
}

let steamrollerCache: SteamrollerModules | null | undefined;

function tryLoadSteamroller(): SteamrollerModules | null {
  if (steamrollerCache !== undefined) return steamrollerCache;

  try {
    // Resolve the steamroller dist files via createRequire with an absolute path
    const ownRequire = createRequire(
      path.resolve(process.cwd(), '__placeholder__.js'),
    );
    const parseAstPath = ownRequire.resolve(
      '@asymmetric-effort/steamroller/parseAst',
    );
    const sourcemapPath = ownRequire.resolve(
      '@asymmetric-effort/steamroller/sourcemap',
    );
    const parseAstMod = ownRequire(parseAstPath);
    const sourcemapMod = ownRequire(sourcemapPath);
    steamrollerCache = {
      parseAst: parseAstMod.parseAst,
      MagicString: sourcemapMod.MagicString,
    };
    return steamrollerCache;
  } catch {
    // Try direct file path as fallback
    try {
      const basePath = path.resolve(
        process.cwd(),
        'node_modules/@asymmetric-effort/steamroller/dist',
      );
      const ownRequire = createRequire(
        path.resolve(process.cwd(), '__placeholder__.js'),
      );
      const parseAstMod = ownRequire(path.join(basePath, 'parse-ast.js'));
      const sourcemapMod = ownRequire(path.join(basePath, 'sourcemap.js'));
      steamrollerCache = {
        parseAst: parseAstMod.parseAst,
        MagicString: sourcemapMod.MagicString,
      };
      return steamrollerCache;
    } catch {
      steamrollerCache = null;
      return null;
    }
  }
}

/**
 * Reset the steamroller module cache (useful for testing fallback behavior).
 * @internal
 */
export function _resetSteamrollerCache(): void {
  steamrollerCache = undefined;
}

// ---------------------------------------------------------------------------
// AST-based hoisting
// ---------------------------------------------------------------------------

/**
 * Check whether an AST node is a hoistable mock call.
 */
function isHoistableNode(node: any): boolean {
  if (node.type === 'ExpressionStatement') {
    return isHoistableCallExpr(node.expression);
  }
  if (node.type === 'VariableDeclaration') {
    for (const decl of node.declarations) {
      if (decl.init && isHoistableCallExpr(decl.init)) {
        return true;
      }
    }
  }
  return false;
}

function isHoistableCallExpr(expr: any): boolean {
  if (expr?.type !== 'CallExpression') return false;
  const callee = expr.callee;
  if (callee?.type !== 'MemberExpression') return false;
  const objName = callee.object?.name;
  const propName = callee.property?.name;
  if (!objName || !propName) return false;
  return HOISTABLE_CALLS.has(`${objName}.${propName}`);
}

/**
 * Compute the end position of a statement in the source, consuming the
 * trailing semicolon and single newline if present.
 */
function statementEnd(source: string, nodeEnd: number): number {
  let end = nodeEnd;
  // Skip optional whitespace before semicolon
  while (end < source.length && (source[end] === ' ' || source[end] === '\t')) {
    end++;
  }
  // Consume semicolon
  if (end < source.length && source[end] === ';') {
    end++;
  }
  // Consume single newline
  if (end < source.length && source[end] === '\n') {
    end++;
  }
  return end;
}

/**
 * AST-based hoisting using steamroller parseAst and MagicString.
 */
export function hoistWithAST(
  source: string,
  filename?: string,
): HoistResult | null {
  const mods = tryLoadSteamroller();
  if (!mods) return null;

  const { parseAst, MagicString } = mods;

  let ast: any;
  try {
    ast = parseAst(source);
  } catch {
    return null; // Parse failure (e.g. TypeScript-specific syntax)
  }

  const s = new MagicString(source);

  let firstImportStart = -1;
  const hoistableSpans: Array<{ start: number; end: number }> = [];

  for (const node of ast.body) {
    if (node.type === 'ImportDeclaration') {
      if (firstImportStart === -1) {
        firstImportStart = node.start;
      }
    } else if (isHoistableNode(node)) {
      const end = statementEnd(source, node.end);
      hoistableSpans.push({ start: node.start, end });
    }
  }

  if (firstImportStart === -1) {
    return { code: source, hoisted: false };
  }

  const toHoist = hoistableSpans.filter(
    (span) => span.start >= firstImportStart,
  );

  if (toHoist.length === 0) {
    return { code: source, hoisted: false };
  }

  for (const span of toHoist) {
    s.move(span.start, span.end, firstImportStart);
  }

  // Ensure the last hoisted span ends with a newline so it doesn't
  // concatenate with the first import declaration
  const lastSpan = toHoist[toHoist.length - 1]!;
  if (source[lastSpan.end - 1] !== '\n') {
    s.appendLeft(lastSpan.end, '\n');
  }

  let code = s.toString();
  code = code.replace(/\n{3,}/g, '\n\n');

  const map = s.generateMap({
    source: filename ?? '<unknown>',
    includeContent: true,
  });

  return {
    code,
    hoisted: true,
    map: {
      version: 3,
      sources: map.sources as string[],
      mappings: map.mappings as string,
      sourcesContent: map.sourcesContent as (string | null)[],
    },
  };
}

/* eslint-enable @typescript-eslint/no-explicit-any */

// ---------------------------------------------------------------------------
// Regex-based hoisting (fallback)
// ---------------------------------------------------------------------------

/**
 * Pattern that matches a line containing a top-level mock call we want to
 * hoist.  The call may be preceded by an assignment (e.g. `const x = vi.hoisted(...)`).
 */
const MOCK_CALL_START =
  /^[ \t]*(?:(?:const|let|var)\s+\w+\s*=\s*)?(?:mock\.module\s*\(|mock\.modulePartial\s*\(|vi\.mock\s*\(|vi\.hoisted\s*\()/;

/**
 * Match an import declaration line. Uses two simple patterns OR'd together
 * to avoid catastrophic backtracking from `[^'"]*`.
 */
function isImportDeclaration(line: string): boolean {
  const t = line.trim();
  if (!t.startsWith('import ') && !t.startsWith('import\t')) return false;
  // Side-effect import: import 'foo' or import "foo"
  if (/^import[ \t]+['"]/.test(t)) return true;
  // Named/default/namespace import: must contain 'from'
  const fromIdx = t.indexOf(' from ');
  if (fromIdx === -1 && t.indexOf('\tfrom\t') === -1) return false;
  // Verify it contains a quoted string after 'from'
  const lastSingle = t.lastIndexOf("'");
  const lastDouble = t.lastIndexOf('"');
  return lastSingle > 0 || lastDouble > 0;
}

/**
 * Determine if a source line is the start of an import declaration.
 */
function isImportLine(line: string): boolean {
  return isImportDeclaration(line);
}

/**
 * Given a source string starting at `startIndex`, find the end of a
 * parenthesised call expression by counting balanced parentheses.
 *
 * Returns the index **after** the closing `)` and optional trailing semicolon/newline.
 */
function findCallEnd(source: string, startIndex: number): number {
  let depth = 0;
  let inString: string | null = null;
  let escaped = false;
  let inTemplate = false;
  let templateDepth = 0;

  for (let i = startIndex; i < source.length; i++) {
    const ch = source[i]!;

    if (escaped) {
      escaped = false;
      continue;
    }

    if (ch === '\\') {
      escaped = true;
      continue;
    }

    // Handle string literals
    if (inString) {
      if (ch === inString) {
        if (inString === '`') {
          inTemplate = false;
        }
        inString = null;
      }
      // Handle template literal expressions ${...}
      if (
        inTemplate &&
        ch === '$' &&
        i + 1 < source.length &&
        source[i + 1] === '{'
      ) {
        templateDepth++;
      }
      continue;
    }

    if (ch === "'" || ch === '"' || ch === '`') {
      inString = ch;
      if (ch === '`') inTemplate = true;
      continue;
    }

    // Handle template expression closing
    if (templateDepth > 0 && ch === '}') {
      templateDepth--;
      continue;
    }

    if (ch === '(') {
      depth++;
    } else if (ch === ')') {
      depth--;
      if (depth === 0) {
        // Consume optional trailing semicolon
        let end = i + 1;
        while (
          end < source.length &&
          (source[end] === ' ' || source[end] === '\t')
        ) {
          end++;
        }
        if (end < source.length && source[end] === ';') {
          end++;
        }
        return end;
      }
    }
  }

  // If we never balanced, return end of source
  return source.length;
}

/**
 * Compute the brace depth at a given offset in source, ignoring braces
 * inside string literals.
 */
function braceDepthAt(source: string, offset: number): number {
  let depth = 0;
  let inString: string | null = null;
  let escaped = false;

  for (let i = 0; i < offset; i++) {
    const ch = source[i]!;

    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      continue;
    }

    if (inString) {
      if (ch === inString) {
        inString = null;
      }
      continue;
    }

    if (ch === "'" || ch === '"' || ch === '`') {
      inString = ch;
      continue;
    }

    if (ch === '{') depth++;
    else if (ch === '}') depth--;
  }

  return depth;
}

interface MockSpan {
  start: number;
  end: number;
  text: string;
}

/**
 * Regex-based mock hoisting implementation (zero-dependency fallback).
 */
export function hoistWithRegex(
  source: string,
  _filename?: string,
): HoistResult {
  const lines = source.split('\n');

  // ---- 1. Find the range of import declarations (first & last) ----
  let firstImportLine = -1;

  for (let i = 0; i < lines.length; i++) {
    if (isImportLine(lines[i]!)) {
      if (firstImportLine === -1) firstImportLine = i;
    }
  }

  // No imports -> nothing to hoist above
  if (firstImportLine === -1) {
    return { code: source, hoisted: false };
  }

  // ---- 2. Find all top-level mock call spans that appear after the first import ----
  const lineOffsets: number[] = [];
  {
    let off = 0;
    for (const line of lines) {
      lineOffsets.push(off);
      off += line.length + 1;
    }
  }

  const firstImportOffset = lineOffsets[firstImportLine]!;

  const mockSpans: MockSpan[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (!MOCK_CALL_START.test(line)) continue;

    const lineStart = lineOffsets[i]!;

    if (lineStart < firstImportOffset) continue;
    if (braceDepthAt(source, lineStart) !== 0) continue;

    const lineRelIdx = line.indexOf('(');
    if (lineRelIdx === -1) continue;

    const parenStart = lineStart + lineRelIdx;
    const callEnd = findCallEnd(source, parenStart);

    mockSpans.push({
      start: lineStart,
      end: callEnd,
      text: source.slice(lineStart, callEnd),
    });
  }

  if (mockSpans.length === 0) {
    return { code: source, hoisted: false };
  }

  // ---- 3. Remove the mock spans from source (back-to-front) ----
  let modified = source;
  for (let i = mockSpans.length - 1; i >= 0; i--) {
    const span = mockSpans[i]!;
    let end = span.end;
    if (end < modified.length && modified[end] === '\n') {
      end++;
    }
    modified = modified.slice(0, span.start) + modified.slice(end);
  }

  // ---- 4. Collapse runs of 3+ consecutive newlines ----
  modified = modified.replace(/\n{3,}/g, '\n\n');

  // ---- 5. Insert hoisted calls before the first import ----
  const modLines = modified.split('\n');
  let newFirstImportOffset = 0;
  for (let i = 0; i < modLines.length; i++) {
    if (isImportLine(modLines[i]!)) {
      break;
    }
    newFirstImportOffset += modLines[i]!.length + 1;
  }

  const hoisted = mockSpans.map((s) => s.text).join('\n') + '\n';
  modified =
    modified.slice(0, newFirstImportOffset) +
    hoisted +
    modified.slice(newFirstImportOffset);

  return { code: modified, hoisted: true };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Transform test source code to hoist mock.module() and vi.mock() calls
 * above import declarations.
 *
 * Tries AST-based hoisting first (via steamroller) for accurate source maps,
 * then falls back to regex-based hoisting if steamroller is unavailable or
 * parsing fails.
 *
 * @param source - The original test file source code
 * @param filename - The file path (used for source-map generation)
 * @returns The transformed source, or the original if no hoisting needed
 */
export function hoistMocks(source: string, filename?: string): HoistResult {
  try {
    const result = hoistWithAST(source, filename);
    if (result !== null) return result;
  } catch {
    // AST hoisting failed, fall through to regex
  }
  return hoistWithRegex(source, filename);
}
