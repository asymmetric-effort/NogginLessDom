/**
 * AST-based import extraction and symbol usage detection.
 *
 * Uses steamroller's parseAst to walk ESTree AST nodes and extract
 * import/export information. Falls back gracefully when steamroller
 * is unavailable.
 *
 * @module test-runner/ast-imports
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FileImports {
  staticImports: Array<{
    source: string;
    symbols: string[];
    isTypeOnly: boolean;
    isSideEffect: boolean;
    isNamespace: boolean;
    namespaceName?: string;
    line: number;
  }>;
  dynamicImports: Array<{ source: string; line: number }>;
  reExports: Array<{ source: string; symbols: string[]; line: number }>;
}

// ---------------------------------------------------------------------------
// Import extraction from ESTree AST
// ---------------------------------------------------------------------------

/**
 * Compute the 1-based line number for a character offset in source text.
 */
function lineOfOffset(source: string, offset: number): number {
  let line = 1;
  for (let i = 0; i < offset && i < source.length; i++) {
    if (source[i] === '\n') line++;
  }
  return line;
}

/**
 * Extract import and export information from an ESTree Program AST.
 *
 * @param ast - An ESTree Program node (from steamroller's parseAst)
 * @param source - The original source text (used to compute line numbers)
 */
export function extractImportsFromAST(ast: any, source?: string): FileImports {
  const result: FileImports = {
    staticImports: [],
    dynamicImports: [],
    reExports: [],
  };

  const src = source ?? '';

  for (const node of ast.body) {
    // Handle ImportDeclaration
    if (node.type === 'ImportDeclaration') {
      const importSource = node.source?.value ?? '';
      const line = src ? lineOfOffset(src, node.start) : 0;
      const isTypeOnly = node.importKind === 'type';

      // Side-effect import: no specifiers
      if (!node.specifiers || node.specifiers.length === 0) {
        result.staticImports.push({
          source: importSource,
          symbols: [],
          isTypeOnly,
          isSideEffect: true,
          isNamespace: false,
          line,
        });
        continue;
      }

      const symbols: string[] = [];
      let isNamespace = false;
      let namespaceName: string | undefined;

      for (const spec of node.specifiers) {
        if (spec.type === 'ImportNamespaceSpecifier') {
          isNamespace = true;
          namespaceName = spec.local?.name;
        } else if (spec.type === 'ImportDefaultSpecifier') {
          symbols.push(spec.local?.name ?? 'default');
        } else if (spec.type === 'ImportSpecifier') {
          symbols.push(spec.local?.name ?? spec.imported?.name ?? '');
        }
      }

      result.staticImports.push({
        source: importSource,
        symbols,
        isTypeOnly,
        isSideEffect: false,
        isNamespace,
        namespaceName,
        line,
      });
    }

    // Handle ExportNamedDeclaration with source (re-exports)
    if (node.type === 'ExportNamedDeclaration' && node.source) {
      const exportSource = node.source.value ?? '';
      const line = src ? lineOfOffset(src, node.start) : 0;
      const symbols: string[] = [];

      if (node.specifiers) {
        for (const spec of node.specifiers) {
          symbols.push(spec.local?.name ?? spec.exported?.name ?? '');
        }
      }

      result.reExports.push({
        source: exportSource,
        symbols,
        line,
      });
    }
  }

  // Walk the entire tree looking for dynamic import() calls
  walkNode(ast, (node: any) => {
    if (
      node.type === 'ImportExpression' ||
      (node.type === 'CallExpression' && node.callee?.type === 'Import')
    ) {
      const arg = node.source ?? node.arguments?.[0];
      const importSource =
        arg?.type === 'Literal' ? (arg.value as string) : '<dynamic>';
      const line = src ? lineOfOffset(src, node.start) : 0;
      result.dynamicImports.push({ source: importSource, line });
    }
  });

  return result;
}

// ---------------------------------------------------------------------------
// Symbol usage detection
// ---------------------------------------------------------------------------

/**
 * Walk the AST looking for Identifier nodes matching the given symbols.
 * Excludes identifiers that appear in import/export declarations.
 *
 * @returns The set of symbols that are actually used in the code body.
 */
export function findUsedSymbols(ast: any, symbols: string[]): Set<string> {
  const symbolSet = new Set(symbols);
  const used = new Set<string>();

  walkNode(ast, (node: any, parent: any) => {
    if (node.type !== 'Identifier') return;
    if (!symbolSet.has(node.name)) return;

    // Skip identifiers inside import/export declarations
    if (parent?.type === 'ImportDeclaration') return;
    if (parent?.type === 'ImportSpecifier') return;
    if (parent?.type === 'ImportDefaultSpecifier') return;
    if (parent?.type === 'ImportNamespaceSpecifier') return;
    if (
      parent?.type === 'ExportSpecifier' ||
      parent?.type === 'ExportNamedDeclaration'
    ) {
      return;
    }

    used.add(node.name);
  });

  return used;
}

// ---------------------------------------------------------------------------
// AST walking utility
// ---------------------------------------------------------------------------

/**
 * Simple recursive AST walker. Calls `visitor(node, parent)` for every node.
 */
function walkNode(
  node: any,
  visitor: (node: any, parent: any) => void,
  parent?: any,
): void {
  if (!node || typeof node !== 'object') return;

  // If it has a `type` property it's an AST node
  if (typeof node.type === 'string') {
    visitor(node, parent);
  }

  const currentParent = typeof node.type === 'string' ? node : parent;

  for (const key of Object.keys(node)) {
    // Skip source location properties and non-child properties
    if (key === 'start' || key === 'end' || key === 'type') continue;
    const val = node[key];
    if (Array.isArray(val)) {
      for (const item of val) {
        if (item && typeof item === 'object' && typeof item.type === 'string') {
          walkNode(item, visitor, currentParent);
        }
      }
    } else if (val && typeof val === 'object' && typeof val.type === 'string') {
      walkNode(val, visitor, currentParent);
    }
  }
}

/* eslint-enable @typescript-eslint/no-explicit-any */
