/**
 * AST parse cache with file-level mtime invalidation.
 *
 * Provides a cache layer over steamroller's parseAst for efficient repeated
 * parsing. When steamroller is unavailable, falls back to regex-based import
 * extraction.
 *
 * @module test-runner/parse-cache
 */

import * as fs from 'node:fs';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import { extractImportsFromAST, type FileImports } from './ast-imports.js';

/* eslint-disable @typescript-eslint/no-explicit-any */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CachedParse {
  ast: any;
  mtime: number;
  imports: FileImports;
  source: string;
}

// ---------------------------------------------------------------------------
// Steamroller loader
// ---------------------------------------------------------------------------

let parseAstFn: ((source: string) => any) | null | undefined;

function tryLoadParseAst(): ((source: string) => any) | null {
  if (parseAstFn !== undefined) return parseAstFn;

  try {
    const ownRequire = createRequire(
      path.resolve(process.cwd(), '__placeholder__.js'),
    );
    const resolved = ownRequire.resolve(
      '@asymmetric-effort/steamroller/parseAst',
    );
    const mod = ownRequire(resolved);
    const fn = mod.parseAst as (source: string) => any;
    parseAstFn = fn;
    return fn;
  } catch {
    try {
      const basePath = path.resolve(
        process.cwd(),
        'node_modules/@asymmetric-effort/steamroller/dist',
      );
      const ownRequire = createRequire(
        path.resolve(process.cwd(), '__placeholder__.js'),
      );
      const mod = ownRequire(path.join(basePath, 'parse-ast.js'));
      const fn = mod.parseAst as (source: string) => any;
      parseAstFn = fn;
      return fn;
    } catch {
      parseAstFn = null;
      return null;
    }
  }
}

// ---------------------------------------------------------------------------
// Regex-based fallback import extraction
// ---------------------------------------------------------------------------

function extractImportsWithRegex(content: string): FileImports {
  const result: FileImports = {
    staticImports: [],
    dynamicImports: [],
    reExports: [],
  };

  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const lineNum = i + 1;

    // Side-effect import
    const sideEffectMatch = /^\s*import\s+['"]([^'"]+)['"];?\s*$/.exec(line);
    if (sideEffectMatch) {
      result.staticImports.push({
        source: sideEffectMatch[1]!,
        symbols: [],
        isTypeOnly: false,
        isSideEffect: true,
        isNamespace: false,
        line: lineNum,
      });
      continue;
    }

    // Re-export
    const reExportMatch =
      /^\s*export\s+\{([^}]*)\}\s+from\s+['"]([^'"]+)['"];?\s*$/.exec(line);
    if (reExportMatch) {
      const symbols = reExportMatch[1]!
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => {
          const aliasMatch = /^(\w+)(?:\s+as\s+\w+)?$/.exec(s);
          return aliasMatch ? aliasMatch[1]! : s;
        });
      result.reExports.push({
        source: reExportMatch[2]!,
        symbols,
        line: lineNum,
      });
      continue;
    }

    // Standard import
    const importMatch =
      /^\s*import\s+(type\s+)?(.+?)\s+from\s+['"]([^'"]+)['"];?\s*$/.exec(line);
    if (importMatch) {
      const isTypeOnly = !!importMatch[1];
      const clause = importMatch[2]!.trim();
      const source = importMatch[3]!;

      // Namespace import
      const nsMatch = /^\*\s+as\s+(\w+)$/.exec(clause);
      if (nsMatch) {
        result.staticImports.push({
          source,
          symbols: [],
          isTypeOnly,
          isSideEffect: false,
          isNamespace: true,
          namespaceName: nsMatch[1],
          line: lineNum,
        });
        continue;
      }

      // Named imports with optional default
      const symbols: string[] = [];
      let isNamespace = false;
      let namespaceName: string | undefined;

      // Extract default import
      const defaultMatch = /^(\w+)\s*,?\s*(\{.*\})?$/.exec(clause);
      if (defaultMatch) {
        symbols.push(defaultMatch[1]!);
        if (defaultMatch[2]) {
          const inner = defaultMatch[2].replace(/^\{|\}$/g, '').trim();
          for (const part of inner.split(',')) {
            const trimmed = part.trim();
            if (!trimmed) continue;
            const aliasMatch = /^(\w+)\s+as\s+(\w+)$/.exec(trimmed);
            symbols.push(aliasMatch ? aliasMatch[2]! : trimmed);
          }
        }
      } else {
        // Just named imports
        const namedMatch = /^\{([^}]*)\}$/.exec(clause);
        if (namedMatch) {
          for (const part of namedMatch[1]!.split(',')) {
            const trimmed = part.trim();
            if (!trimmed) continue;
            const aliasMatch = /^(\w+)\s+as\s+(\w+)$/.exec(trimmed);
            symbols.push(aliasMatch ? aliasMatch[2]! : trimmed);
          }
        }
      }

      result.staticImports.push({
        source,
        symbols,
        isTypeOnly,
        isSideEffect: false,
        isNamespace,
        namespaceName,
        line: lineNum,
      });
      continue;
    }

    // Dynamic import
    const dynamicMatch = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/.exec(line);
    if (dynamicMatch) {
      result.dynamicImports.push({
        source: dynamicMatch[1]!,
        line: lineNum,
      });
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// ParseCache class
// ---------------------------------------------------------------------------

export class ParseCache {
  private cache: Map<string, CachedParse> = new Map();
  private _hitCount = 0;
  private _missCount = 0;

  /**
   * Parse a file and return its AST, or return a cached AST if the file
   * has not been modified since the last parse.
   *
   * Returns `null` if steamroller is unavailable or parsing fails.
   */
  getAST(filePath: string): any | null {
    const parseAst = tryLoadParseAst();
    if (!parseAst) return null;

    let mtime: number;
    let source: string;
    try {
      const stat = fs.statSync(filePath);
      mtime = stat.mtimeMs;
    } catch {
      return null;
    }

    const cached = this.cache.get(filePath);
    if (cached && cached.mtime === mtime) {
      this._hitCount++;
      return cached.ast;
    }

    try {
      source = fs.readFileSync(filePath, 'utf8');
    } catch {
      return null;
    }

    this._missCount++;
    let ast: any;
    try {
      ast = parseAst(source);
    } catch {
      return null; // Parse failure
    }

    const imports = extractImportsFromAST(ast, source);
    this.cache.set(filePath, { ast, mtime, imports, source });
    return ast;
  }

  /**
   * Extract imports from a file, using the AST cache when available.
   * Falls back to regex-based extraction when steamroller is unavailable.
   */
  getImports(filePath: string): FileImports {
    // Check if we have a cached result
    const cached = this.cache.get(filePath);
    if (cached) {
      let mtime: number;
      try {
        mtime = fs.statSync(filePath).mtimeMs;
      } catch {
        return extractImportsWithRegex('');
      }
      if (cached.mtime === mtime) {
        this._hitCount++;
        return cached.imports;
      }
    }

    // Try AST-based extraction
    const ast = this.getAST(filePath);
    if (ast) {
      const entry = this.cache.get(filePath)!;
      return entry.imports;
    }

    // Fallback to regex
    this._missCount++;
    let content: string;
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch {
      return extractImportsWithRegex('');
    }
    return extractImportsWithRegex(content);
  }

  /**
   * Remove a file from the cache.
   */
  invalidate(filePath: string): void {
    this.cache.delete(filePath);
  }

  /**
   * Remove all entries from the cache.
   */
  clear(): void {
    this.cache.clear();
    this._hitCount = 0;
    this._missCount = 0;
  }

  /** Number of cache hits since creation / last clear. */
  get hitCount(): number {
    return this._hitCount;
  }

  /** Number of cache misses since creation / last clear. */
  get missCount(): number {
    return this._missCount;
  }
}

/* eslint-enable @typescript-eslint/no-explicit-any */
