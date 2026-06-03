/**
 * Unused import detection — scans source files and identifies imported symbols
 * that are never referenced in the file body.
 * @module test-runner/unused-imports
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UnusedImport {
  file: string;
  importSource: string;
  importedSymbols: string[];
  line: number;
  isNamespaceImport: boolean;
  isTypeOnly: boolean;
}

export interface UnusedImportConfig {
  enabled?: boolean;
  strict?: boolean;
  ignoreTypeImports?: boolean;
  ignoreSideEffectImports?: boolean;
  exclude?: string[];
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface ParsedImport {
  line: number;
  source: string;
  symbols: { original: string; local: string }[];
  isNamespace: boolean;
  namespaceName: string | null;
  defaultName: string | null;
  isSideEffect: boolean;
  isTypeOnly: boolean;
  raw: string;
}

// ---------------------------------------------------------------------------
// Module-level config
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: Required<UnusedImportConfig> = {
  enabled: true,
  strict: false,
  ignoreTypeImports: true,
  ignoreSideEffectImports: true,
  exclude: [],
};

let currentConfig: Required<UnusedImportConfig> = { ...DEFAULT_CONFIG };

// ---------------------------------------------------------------------------
// Config API
// ---------------------------------------------------------------------------

export function configureUnusedImportDetection(
  config: UnusedImportConfig,
): void {
  currentConfig = { ...DEFAULT_CONFIG, ...config };
}

export function getUnusedImportConfig(): UnusedImportConfig {
  return { ...currentConfig };
}

export function resetUnusedImportConfig(): void {
  currentConfig = { ...DEFAULT_CONFIG };
}

// ---------------------------------------------------------------------------
// Import parsing
// ---------------------------------------------------------------------------

function parseImports(content: string): ParsedImport[] {
  const results: ParsedImport[] = [];
  const lines = content.split('\n');

  // We process line by line to track line numbers
  const importRegex =
    /^(\s*import\s+(?:type\s+)?)([\s\S]*?)\s+from\s+['"]([^'"]+)['"];?\s*$/;
  const sideEffectRegex = /^\s*import\s+['"]([^'"]+)['"];?\s*$/;
  const reExportRegex =
    /^\s*export\s+\{[^}]*\}\s+from\s+['"]([^'"]+)['"];?\s*$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const lineNum = i + 1;

    // Check for side-effect imports: import 'foo'
    const sideEffectMatch = sideEffectRegex.exec(line);
    if (sideEffectMatch) {
      results.push({
        line: lineNum,
        source: sideEffectMatch[1]!,
        symbols: [],
        isNamespace: false,
        namespaceName: null,
        defaultName: null,
        isSideEffect: true,
        isTypeOnly: false,
        raw: line.trim(),
      });
      continue;
    }

    // Check for re-exports (these are not real imports for our purposes)
    if (reExportRegex.test(line)) {
      continue;
    }

    // Check for standard imports
    const match = importRegex.exec(line);
    if (!match) continue;

    const prefix = match[1]!;
    const importClause = match[2]!;
    const source = match[3]!;
    const isTypeOnly = /\btype\s+/.test(prefix);

    const parsed: ParsedImport = {
      line: lineNum,
      source,
      symbols: [],
      isNamespace: false,
      namespaceName: null,
      defaultName: null,
      isSideEffect: false,
      isTypeOnly,
      raw: line.trim(),
    };

    // Parse the import clause
    // Case 1: import * as ns from '...'
    const nsMatch = /^\*\s+as\s+(\w+)$/.exec(importClause.trim());
    if (nsMatch) {
      parsed.isNamespace = true;
      parsed.namespaceName = nsMatch[1]!;
      results.push(parsed);
      continue;
    }

    // Case 2: import Default from '...'
    // Case 3: import Default, { a, b } from '...'
    // Case 4: import { a, b as c } from '...'
    const trimmed = importClause.trim();

    // Extract default import name (before any braces)
    const defaultAndNamed = /^(\w+)\s*,?\s*(\{.*\})?$/.exec(trimmed);
    if (defaultAndNamed) {
      const defaultName = defaultAndNamed[1]!;
      parsed.defaultName = defaultName;

      if (defaultAndNamed[2]) {
        // Also has named imports
        parseNamedImports(defaultAndNamed[2], parsed);
      }
      results.push(parsed);
      continue;
    }

    // Just named imports: { a, b as c }
    const namedOnly = /^\{([^}]*)\}$/.exec(trimmed);
    if (namedOnly) {
      parseNamedImports(trimmed, parsed);
      results.push(parsed);
      continue;
    }

    results.push(parsed);
  }

  return results;
}

function parseNamedImports(clause: string, parsed: ParsedImport): void {
  // Remove braces
  const inner = clause.replace(/^\{|\}$/g, '').trim();
  if (!inner) return;

  const parts = inner.split(',');
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const aliasMatch = /^(\w+)\s+as\s+(\w+)$/.exec(trimmed);
    if (aliasMatch) {
      parsed.symbols.push({
        original: aliasMatch[1]!,
        local: aliasMatch[2]!,
      });
    } else {
      parsed.symbols.push({ original: trimmed, local: trimmed });
    }
  }
}

// ---------------------------------------------------------------------------
// Body extraction — everything after the import block
// ---------------------------------------------------------------------------

function getFileBody(content: string): string {
  const lines = content.split('\n');
  let lastImportLine = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (
      /^\s*import\s+/.test(line) ||
      /^\s*export\s+\{[^}]*\}\s+from\s+/.test(line)
    ) {
      lastImportLine = i;
    }
  }

  return lines.slice(lastImportLine + 1).join('\n');
}

// ---------------------------------------------------------------------------
// Comment stripping for single-line comments
// ---------------------------------------------------------------------------

function stripSingleLineComments(body: string): string {
  // Remove single-line comments (// ...)
  return body.replace(/\/\/[^\n]*/g, '');
}

// ---------------------------------------------------------------------------
// Symbol usage checking
// ---------------------------------------------------------------------------

function isSymbolUsed(symbolName: string, body: string): boolean {
  const strippedBody = stripSingleLineComments(body);
  const regex = new RegExp(`\\b${escapeRegex(symbolName)}\\b`);
  return regex.test(strippedBody);
}

function isNamespaceUsed(nsName: string, body: string): boolean {
  const strippedBody = stripSingleLineComments(body);
  const dotRegex = new RegExp(`\\b${escapeRegex(nsName)}\\.`);
  const bareRegex = new RegExp(`\\b${escapeRegex(nsName)}\\b`);
  return dotRegex.test(strippedBody) || bareRegex.test(strippedBody);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ---------------------------------------------------------------------------
// Re-export detection
// ---------------------------------------------------------------------------

function getReExportedSymbols(content: string): Set<string> {
  const symbols = new Set<string>();
  const reExportRegex =
    /^\s*export\s+\{([^}]*)\}\s+from\s+['"][^'"]+['"];?\s*$/gm;
  let match: RegExpExecArray | null;
  while ((match = reExportRegex.exec(content)) !== null) {
    const inner = match[1]!;
    for (const part of inner.split(',')) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const aliasMatch = /^(\w+)(?:\s+as\s+\w+)?$/.exec(trimmed);
      if (aliasMatch) {
        symbols.add(aliasMatch[1]!);
      }
    }
  }
  return symbols;
}

// ---------------------------------------------------------------------------
// Main detection function
// ---------------------------------------------------------------------------

export function detectUnusedImports(
  files: string[],
  options?: {
    cwd?: string;
    exclude?: string[];
    ignoreTypeImports?: boolean;
    ignoreSideEffectImports?: boolean;
  },
): UnusedImport[] {
  // Check env var
  const envVal = process.env['DETECT_UNUSED_IMPORTS'];
  if (envVal === '0' || envVal === 'false') {
    return [];
  }

  const cwd = options?.cwd ?? process.cwd();
  const exclude = options?.exclude ?? currentConfig.exclude;
  const ignoreTypeImports =
    options?.ignoreTypeImports ?? currentConfig.ignoreTypeImports;
  const ignoreSideEffectImports =
    options?.ignoreSideEffectImports ?? currentConfig.ignoreSideEffectImports;

  const results: UnusedImport[] = [];

  for (const rawFile of files) {
    const filePath = path.isAbsolute(rawFile)
      ? rawFile
      : path.resolve(cwd, rawFile);

    // Check exclude patterns
    const relPath = path.relative(cwd, filePath);
    if (exclude.some((pattern) => relPath.includes(pattern))) {
      continue;
    }

    let content: string;
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch {
      continue; // Non-existent or unreadable file
    }

    if (!content.trim()) continue;

    const imports = parseImports(content);
    const body = getFileBody(content);
    const reExported = getReExportedSymbols(content);

    for (const imp of imports) {
      // Skip side-effect imports
      if (imp.isSideEffect && ignoreSideEffectImports) continue;

      // Skip type-only imports
      if (imp.isTypeOnly && ignoreTypeImports) continue;

      const unusedSymbols: string[] = [];

      // Check namespace import
      if (imp.isNamespace && imp.namespaceName) {
        if (!isNamespaceUsed(imp.namespaceName, body)) {
          unusedSymbols.push(imp.namespaceName);
        }
      }

      // Check default import
      if (imp.defaultName) {
        if (
          !isSymbolUsed(imp.defaultName, body) &&
          !reExported.has(imp.defaultName)
        ) {
          unusedSymbols.push(imp.defaultName);
        }
      }

      // Check named imports
      for (const sym of imp.symbols) {
        if (!isSymbolUsed(sym.local, body) && !reExported.has(sym.original)) {
          unusedSymbols.push(sym.local);
        }
      }

      if (unusedSymbols.length > 0) {
        results.push({
          file: filePath,
          importSource: imp.source,
          importedSymbols: unusedSymbols,
          line: imp.line,
          isNamespaceImport: imp.isNamespace,
          isTypeOnly: imp.isTypeOnly,
        });
      }
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Report formatting
// ---------------------------------------------------------------------------

export function formatUnusedImportReport(unused: UnusedImport[]): string {
  if (unused.length === 0) return '';

  const lines: string[] = [];
  for (const entry of unused) {
    const symbolList = entry.importedSymbols.join(', ');
    const symbolDesc =
      entry.importedSymbols.length === 1
        ? `'${entry.importedSymbols[0]}' is never used`
        : `'${symbolList}' are never used`;

    const importDesc = entry.isNamespaceImport
      ? `* as ${entry.importedSymbols[0]} from '${entry.importSource}'`
      : `{ ${symbolList} } from '${entry.importSource}'`;

    lines.push(`\u26a0 Unused import in ${entry.file}:`);
    lines.push(`    Line ${entry.line}: ${importDesc} \u2014 ${symbolDesc}`);
  }

  return lines.join('\n');
}
