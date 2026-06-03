/**
 * Module mock hoisting transform.
 *
 * Reorders top-level mock.module(), mock.modulePartial(), vi.mock(), and
 * vi.hoisted() calls so they appear before all import declarations.  This is
 * necessary for ESM because import bindings are evaluated before any
 * module-level statements execute.
 *
 * The implementation is intentionally regex-based (no AST parser) to preserve
 * the project's zero-dependency constraint.
 *
 * @module hoist
 */

/**
 * Pattern that matches a line containing a top-level mock call we want to
 * hoist.  The call may be preceded by an assignment (e.g. `const x = vi.hoisted(...)`).
 */
const MOCK_CALL_START =
  /^[ \t]*(?:(?:const|let|var)\s+\w+\s*=\s*)?(?:mock\.module\s*\(|mock\.modulePartial\s*\(|vi\.mock\s*\(|vi\.hoisted\s*\()/;

/** Pattern that matches import declarations (including TypeScript `import type`). */
const IMPORT_DECL =
  /^[ \t]*import\s(?:type\s)?(?:[^'"]*from\s+)?['"][^'"]+['"]\s*;?\s*$/;

/**
 * Determine if a source line is the start of an import declaration.
 *
 * Handles:
 * - `import { x } from 'y'`
 * - `import * as x from 'y'`
 * - `import x from 'y'`
 * - `import 'y'` (side-effect)
 * - `import type { x } from 'y'`
 */
function isImportLine(line: string): boolean {
  const trimmed = line.trimStart();
  return trimmed.startsWith('import ') && IMPORT_DECL.test(line);
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
 * Transform test source code to hoist mock.module() and vi.mock() calls
 * above import declarations.
 *
 * @param source - The original test file source code
 * @param _filename - The file path (reserved for future source-map support)
 * @returns The transformed source, or the original if no hoisting needed
 */
export function hoistMocks(
  source: string,
  _filename?: string,
): { code: string; hoisted: boolean } {
  const lines = source.split('\n');

  // ---- 1. Find the range of import declarations (first & last) ----
  let firstImportLine = -1;

  for (let i = 0; i < lines.length; i++) {
    if (isImportLine(lines[i]!)) {
      if (firstImportLine === -1) firstImportLine = i;
    }
  }

  // No imports → nothing to hoist above
  if (firstImportLine === -1) {
    return { code: source, hoisted: false };
  }

  // ---- 2. Find all top-level mock call spans that appear after the first import ----
  // We work on the raw source (not lines) to correctly handle multi-line calls.

  // Build a mapping: lineIndex → character offset of line start
  const lineOffsets: number[] = [];
  {
    let off = 0;
    for (const line of lines) {
      lineOffsets.push(off);
      off += line.length + 1; // +1 for '\n'
    }
  }

  const firstImportOffset = lineOffsets[firstImportLine]!;

  const mockSpans: MockSpan[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (!MOCK_CALL_START.test(line)) continue;

    const lineStart = lineOffsets[i]!;

    // Only hoist if this call comes after the first import
    if (lineStart < firstImportOffset) continue;

    // Only hoist top-level calls (brace depth === 0)
    if (braceDepthAt(source, lineStart) !== 0) continue;

    // Find the opening paren
    const lineRelIdx = line.indexOf('(');
    if (lineRelIdx === -1) continue;

    const parenStart = lineStart + lineRelIdx;
    const callEnd = findCallEnd(source, parenStart);

    // The span starts at the beginning of the line (preserve indentation)
    mockSpans.push({
      start: lineStart,
      end: callEnd,
      text: source.slice(lineStart, callEnd),
    });
  }

  if (mockSpans.length === 0) {
    return { code: source, hoisted: false };
  }

  // ---- 3. Remove the mock spans from source (back-to-front to keep offsets valid) ----
  let modified = source;
  for (let i = mockSpans.length - 1; i >= 0; i--) {
    const span = mockSpans[i]!;
    let end = span.end;
    // Also strip the trailing newline if present
    if (end < modified.length && modified[end] === '\n') {
      end++;
    }
    modified = modified.slice(0, span.start) + modified.slice(end);
  }

  // ---- 4. Collapse runs of 3+ consecutive newlines left by the removal ----
  modified = modified.replace(/\n{3,}/g, '\n\n');

  // ---- 5. Insert hoisted calls before the first import ----
  // Recalculate firstImportOffset after modifications
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
