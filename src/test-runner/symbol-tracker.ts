/**
 * Tree-shaking-aware test targeting (Issue #199).
 *
 * Uses steamroller's parser to extract symbol-level import/export
 * dependencies, enabling precise test re-runs on symbol changes.
 * @module test-runner/symbol-tracker
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SymbolDependency {
  file: string;
  importedFrom: string;
  symbols: string[];
}

export interface ExportDiff {
  added: string[];
  removed: string[];
  changed: string[];
}

// ---------------------------------------------------------------------------
// Steamroller dynamic loading
// ---------------------------------------------------------------------------

let _parseAst: ((input: string) => Record<string, unknown>) | null = null;
let _loadAttempted = false;
let _available = false;

/**
 * Load steamroller parser. Returns true if available.
 */
export async function loadParser(): Promise<boolean> {
  if (_loadAttempted) return _available;
  _loadAttempted = true;
  try {
    const mod =
      (await import('@asymmetric-effort/steamroller/parseAst')) as unknown as {
        parseAst: (input: string) => Record<string, unknown>;
      };
    _parseAst = mod.parseAst;
    _available = true;
    return true;
  } catch {
    _available = false;
    return false;
  }
}

/**
 * Check whether steamroller parser is available.
 */
export function isParserAvailable(): boolean {
  return _available;
}

/**
 * Reset parser cache (for testing).
 */
export function resetParserCache(): void {
  _parseAst = null;
  _loadAttempted = false;
  _available = false;
}

/**
 * Resolve an import specifier to an absolute file path, trying common
 * extensions when the specifier lacks one.
 */
function resolveImportPath(importedFrom: string, importerDir: string): string {
  if (!importedFrom.startsWith('./') && !importedFrom.startsWith('../')) {
    return importedFrom;
  }
  const base = path.resolve(importerDir, importedFrom);
  if (fs.existsSync(base)) return base;
  const extensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
  for (const ext of extensions) {
    if (fs.existsSync(base + ext)) return base + ext;
  }
  // Try replacing .js -> .ts
  if (base.endsWith('.js')) {
    const tsPath = base.slice(0, -3) + '.ts';
    if (fs.existsSync(tsPath)) return tsPath;
  }
  return base;
}

// ---------------------------------------------------------------------------
// Feature: Symbol-Level Dependency Tracking
// ---------------------------------------------------------------------------

/**
 * Build a map of file -> symbol dependencies using steamroller's parser.
 *
 * For each entry file, extracts which specific symbols are imported and
 * from which modules.
 *
 * @param entryFiles - Absolute paths to files to analyze
 * @param options - Optional cwd and exclude patterns
 * @returns Map from file path to its symbol-level dependencies
 */
export function buildSymbolDependencyMap(
  entryFiles: string[],
  options?: { cwd?: string; exclude?: string[] },
): Map<string, SymbolDependency[]> {
  const result = new Map<string, SymbolDependency[]>();

  if (!_parseAst) {
    return result;
  }

  const excludePatterns = options?.exclude ?? ['node_modules'];
  const parseAst = _parseAst;

  for (const file of entryFiles) {
    // Check exclude patterns
    if (excludePatterns.some((p) => file.includes(p))) continue;

    let content: string;
    try {
      content = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }

    const deps: SymbolDependency[] = [];
    const fileDir = path.dirname(file);

    try {
      const ast = parseAst(content);
      const body = ast['body'] as Record<string, unknown>[] | undefined;
      if (!body) continue;

      for (const node of body) {
        const nodeType = String(node['type'] ?? '');
        if (nodeType !== 'ImportDeclaration') continue;

        const source = node['source'] as Record<string, unknown> | undefined;
        if (!source) continue;
        const importedFrom = String(source['value'] ?? '');
        if (!importedFrom) continue;

        const specifiers = node['specifiers'] as
          | Record<string, unknown>[]
          | undefined;
        if (!specifiers || specifiers.length === 0) continue;

        const symbols: string[] = [];
        for (const spec of specifiers) {
          const specType = String(spec['type'] ?? '');
          if (specType === 'ImportSpecifier') {
            const imported = spec['imported'] as
              | Record<string, unknown>
              | undefined;
            if (imported) {
              symbols.push(String(imported['name'] ?? ''));
            }
          } else if (specType === 'ImportDefaultSpecifier') {
            symbols.push('default');
          } else if (specType === 'ImportNamespaceSpecifier') {
            symbols.push('*');
          }
        }

        if (symbols.length > 0) {
          const resolvedPath = resolveImportPath(importedFrom, fileDir);
          deps.push({
            file,
            importedFrom: resolvedPath,
            symbols,
          });
        }
      }
    } catch {
      // Parse error — skip file
      continue;
    }

    result.set(file, deps);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Feature: AST Export Diffing
// ---------------------------------------------------------------------------

interface ExportInfo {
  name: string;
  bodyText: string;
}

/**
 * Extract exported declarations from source text using steamroller's parser.
 */
function extractExports(source: string): ExportInfo[] {
  if (!_parseAst) return [];

  const exports: ExportInfo[] = [];
  const parseAst = _parseAst;

  try {
    const ast = parseAst(source);
    const body = ast['body'] as Record<string, unknown>[] | undefined;
    if (!body) return exports;

    for (const node of body) {
      const nodeType = String(node['type'] ?? '');

      if (nodeType === 'ExportNamedDeclaration') {
        const declaration = node['declaration'] as Record<
          string,
          unknown
        > | null;
        const specifiers = node['specifiers'] as
          | Record<string, unknown>[]
          | undefined;

        if (declaration) {
          const declType = String(declaration['type'] ?? '');
          const declStart = Number(declaration['start'] ?? 0);
          const declEnd = Number(declaration['end'] ?? 0);
          const bodyText = source.slice(declStart, declEnd);

          if (
            declType === 'FunctionDeclaration' ||
            declType === 'ClassDeclaration'
          ) {
            const id = declaration['id'] as Record<string, unknown> | null;
            const name = id ? String(id['name'] ?? '') : '(anonymous)';
            exports.push({ name, bodyText });
          } else if (declType === 'VariableDeclaration') {
            const declarations = declaration['declarations'] as
              | Record<string, unknown>[]
              | undefined;
            if (declarations) {
              for (const d of declarations) {
                const idNode = d['id'] as Record<string, unknown> | undefined;
                const dStart = Number(d['start'] ?? 0);
                const dEnd = Number(d['end'] ?? 0);
                const name = idNode ? String(idNode['name'] ?? '') : '';
                exports.push({
                  name,
                  bodyText: source.slice(dStart, dEnd),
                });
              }
            }
          }
        }

        // export { foo, bar as baz }
        if (specifiers && specifiers.length > 0) {
          for (const spec of specifiers) {
            const local = spec['local'] as Record<string, unknown> | undefined;
            const exported = spec['exported'] as
              | Record<string, unknown>
              | undefined;
            const name = exported
              ? String(exported['name'] ?? '')
              : local
                ? String(local['name'] ?? '')
                : '';
            // For re-exports, the body text is the specifier range
            const specStart = Number(spec['start'] ?? 0);
            const specEnd = Number(spec['end'] ?? 0);
            exports.push({ name, bodyText: source.slice(specStart, specEnd) });
          }
        }
      }

      if (nodeType === 'ExportDefaultDeclaration') {
        const declaration = node['declaration'] as Record<
          string,
          unknown
        > | null;
        const declStart = Number(declaration?.['start'] ?? 0);
        const declEnd = Number(declaration?.['end'] ?? 0);
        exports.push({
          name: 'default',
          bodyText: declaration ? source.slice(declStart, declEnd) : '',
        });
      }
    }
  } catch {
    // Parse error — return empty
  }

  return exports;
}

/**
 * Diff the exports between two versions of a source file.
 *
 * Detects added, removed, and changed export names by comparing
 * the body text of each exported declaration.
 *
 * @param oldSource - Previous version of the source file
 * @param newSource - Current version of the source file
 * @returns Diff of export names
 */
export function diffExports(oldSource: string, newSource: string): ExportDiff {
  const oldExports = extractExports(oldSource);
  const newExports = extractExports(newSource);

  const oldMap = new Map<string, string>();
  for (const e of oldExports) {
    oldMap.set(e.name, e.bodyText);
  }

  const newMap = new Map<string, string>();
  for (const e of newExports) {
    newMap.set(e.name, e.bodyText);
  }

  const added: string[] = [];
  const removed: string[] = [];
  const changed: string[] = [];

  // Find added and changed
  for (const [name, bodyText] of newMap) {
    if (!oldMap.has(name)) {
      added.push(name);
    } else if (oldMap.get(name) !== bodyText) {
      changed.push(name);
    }
    // If same body text — unchanged, not included in result
  }

  // Find removed
  for (const name of oldMap.keys()) {
    if (!newMap.has(name)) {
      removed.push(name);
    }
  }

  return { added, removed, changed };
}

// ---------------------------------------------------------------------------
// Feature: Affected Test File Detection
// ---------------------------------------------------------------------------

/**
 * Given a changed file and changed symbols, return only the test files
 * that import those specific changed symbols from the changed file.
 *
 * Falls back to returning all test files that import from the changed
 * file if symbol tracking is unavailable.
 *
 * @param changedFile - Absolute path to the changed file
 * @param changedSymbols - Names of changed/added/removed exports
 * @param symbolMap - Symbol dependency map from buildSymbolDependencyMap
 * @param testFiles - All available test file paths
 * @returns Test files affected by the change
 */
export function getAffectedTestFiles(
  changedFile: string,
  changedSymbols: string[],
  symbolMap: Map<string, SymbolDependency[]>,
  testFiles: string[],
): string[] {
  if (!_available || symbolMap.size === 0) {
    // Fall back: return all test files
    return [...testFiles];
  }

  const changedNoExt = changedFile.replace(/\.\w+$/, '');
  const affected = new Set<string>();

  for (const testFile of testFiles) {
    const deps = symbolMap.get(testFile);
    if (!deps) continue;

    for (const dep of deps) {
      const depNoExt = dep.importedFrom.replace(/\.\w+$/, '');
      if (dep.importedFrom === changedFile || depNoExt === changedNoExt) {
        // Check if this test file imports any of the changed symbols
        if (dep.symbols.includes('*')) {
          // Namespace import — always affected
          affected.add(testFile);
        } else {
          for (const sym of changedSymbols) {
            if (dep.symbols.includes(sym)) {
              affected.add(testFile);
              break;
            }
          }
        }
      }
    }
  }

  return [...affected];
}
