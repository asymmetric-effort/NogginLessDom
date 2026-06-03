/**
 * Dependency graph visualization — builds and exports dependency graphs
 * in JSON, DOT, and Mermaid formats.
 * @module test-runner/dependency-graph
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DependencyNode {
  id: string;
  imports: string[];
  importedBy: string[];
  depth: number;
  directImportCount: number;
  transitiveImportCount: number;
  isEntryPoint: boolean;
  isLeaf: boolean;
  inCycle: boolean;
  metadata?: { loc?: number; exportCount?: number };
}

export interface DependencyEdge {
  from: string;
  to: string;
  type: 'static' | 'dynamic';
  symbols?: string[];
}

export interface DependencyGraph {
  version: 1;
  generated: string;
  root: string;
  entryPoints: string[];
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  summary: {
    totalFiles: number;
    totalEdges: number;
    maxDepth: number;
    averageImports: number;
    cycleCount: number;
    leafCount: number;
    hubFiles: string[];
  };
}

// ---------------------------------------------------------------------------
// Import extraction (reuses regex patterns from watch.ts)
// ---------------------------------------------------------------------------

interface ExtractedImport {
  specifier: string;
  type: 'static' | 'dynamic';
  symbols?: string[];
}

function extractImportsFromContent(content: string): ExtractedImport[] {
  const results: ExtractedImport[] = [];

  // Static imports: import ... from '...' or import '...'
  const importRegex = /import\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g;
  let match: RegExpExecArray | null;
  while ((match = importRegex.exec(content)) !== null) {
    const specifier = match[1];
    if (
      specifier &&
      (specifier.startsWith('./') || specifier.startsWith('../'))
    ) {
      // Extract symbols if present
      const fullMatch = match[0];
      const symbols = extractSymbolsFromImport(fullMatch);
      results.push({ specifier, type: 'static', symbols });
    }
  }

  // Dynamic imports: import('...')
  const dynamicRegex = /import\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = dynamicRegex.exec(content)) !== null) {
    const specifier = match[1];
    if (
      specifier &&
      (specifier.startsWith('./') || specifier.startsWith('../'))
    ) {
      results.push({ specifier, type: 'dynamic' });
    }
  }

  // Re-exports: export { ... } from '...'
  const reExportRegex = /export\s+\{[^}]*\}\s+from\s+['"]([^'"]+)['"]/g;
  while ((match = reExportRegex.exec(content)) !== null) {
    const specifier = match[1];
    if (
      specifier &&
      (specifier.startsWith('./') || specifier.startsWith('../'))
    ) {
      results.push({ specifier, type: 'static' });
    }
  }

  return results;
}

function extractSymbolsFromImport(importStr: string): string[] | undefined {
  const braceMatch = /\{([^}]+)\}/.exec(importStr);
  if (!braceMatch) return undefined;

  const symbols: string[] = [];
  const inner = braceMatch[1]!;
  for (const part of inner.split(',')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const asMatch = /^(\w+)\s+as\s+\w+$/.exec(trimmed);
    symbols.push(asMatch ? asMatch[1]! : trimmed);
  }
  return symbols.length > 0 ? symbols : undefined;
}

// ---------------------------------------------------------------------------
// File resolution
// ---------------------------------------------------------------------------

function resolveImportPath(
  fromFile: string,
  specifier: string,
  _cwd: string,
): string {
  const dir = path.dirname(fromFile);
  const resolved = path.resolve(dir, specifier);

  // Try with common extensions
  const extensions = [
    '',
    '.ts',
    '.js',
    '.tsx',
    '.jsx',
    '/index.ts',
    '/index.js',
  ];
  for (const ext of extensions) {
    const fullPath = resolved + ext;
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }

  // Return the resolved path even if file doesn't exist
  return resolved;
}

// ---------------------------------------------------------------------------
// Cycle detection (DFS-based)
// ---------------------------------------------------------------------------

function detectCycles(forwardGraph: Map<string, Set<string>>): Set<string> {
  const inCycle = new Set<string>();
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const stack: string[] = [];

  function dfs(node: string): void {
    visited.add(node);
    inStack.add(node);
    stack.push(node);

    const neighbors = forwardGraph.get(node) ?? new Set();
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor);
      } else if (inStack.has(neighbor)) {
        // Found a cycle — mark all nodes in the cycle
        const cycleStart = stack.indexOf(neighbor);
        for (let i = cycleStart; i < stack.length; i++) {
          inCycle.add(stack[i]!);
        }
        inCycle.add(neighbor);
      }
    }

    stack.pop();
    inStack.delete(node);
  }

  for (const node of forwardGraph.keys()) {
    if (!visited.has(node)) {
      dfs(node);
    }
  }

  return inCycle;
}

// ---------------------------------------------------------------------------
// BFS depth calculation
// ---------------------------------------------------------------------------

function computeDepths(
  entryPoints: string[],
  forwardGraph: Map<string, Set<string>>,
): Map<string, number> {
  const depths = new Map<string, number>();
  const queue: string[] = [];

  for (const entry of entryPoints) {
    depths.set(entry, 0);
    queue.push(entry);
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentDepth = depths.get(current)!;
    const neighbors = forwardGraph.get(current) ?? new Set();

    for (const neighbor of neighbors) {
      if (!depths.has(neighbor)) {
        depths.set(neighbor, currentDepth + 1);
        queue.push(neighbor);
      }
    }
  }

  return depths;
}

// ---------------------------------------------------------------------------
// Transitive import counting
// ---------------------------------------------------------------------------

function countTransitiveImports(
  node: string,
  forwardGraph: Map<string, Set<string>>,
): number {
  const visited = new Set<string>();
  const stack = [node];

  while (stack.length > 0) {
    const current = stack.pop()!;
    const neighbors = forwardGraph.get(current) ?? new Set();
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        stack.push(neighbor);
      }
    }
  }

  return visited.size;
}

// ---------------------------------------------------------------------------
// Metadata extraction
// ---------------------------------------------------------------------------

function extractMetadata(
  filePath: string,
): { loc?: number; exportCount?: number } | undefined {
  let content: string;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    return undefined;
  }

  const loc = content.split('\n').length;
  const exportRegex =
    /\bexport\s+(?:function|class|const|let|var|default|interface|type|enum)\b/g;
  let exportCount = 0;
  while (exportRegex.exec(content) !== null) {
    exportCount++;
  }

  return { loc, exportCount };
}

// ---------------------------------------------------------------------------
// Main graph builder
// ---------------------------------------------------------------------------

export function buildDependencyGraph(
  entryFiles: string[],
  options?: {
    cwd?: string;
    exclude?: string[];
    includeMetadata?: boolean;
    relativePaths?: boolean;
  },
): DependencyGraph {
  // Check env var
  const envVal = process.env['EXPORT_DEPENDENCY_GRAPH'];
  if (envVal === '0' || envVal === 'false') {
    return emptyGraph(options?.cwd ?? process.cwd(), []);
  }

  const cwd = options?.cwd ?? process.cwd();
  const exclude = options?.exclude ?? [];
  const includeMetadata = options?.includeMetadata ?? false;
  const relativePaths = options?.relativePaths ?? true;

  if (entryFiles.length === 0) {
    return emptyGraph(cwd, []);
  }

  // Build forward graph by crawling from entry points
  const forwardGraph = new Map<string, Set<string>>();
  const reverseGraph = new Map<string, Set<string>>();
  const allEdges: DependencyEdge[] = [];
  const visited = new Set<string>();
  const queue: string[] = [];

  // Resolve entry files
  const resolvedEntries: string[] = [];
  for (const entry of entryFiles) {
    const resolved = path.isAbsolute(entry) ? entry : path.resolve(cwd, entry);
    resolvedEntries.push(resolved);
    queue.push(resolved);
  }

  while (queue.length > 0) {
    const file = queue.shift()!;
    if (visited.has(file)) continue;
    visited.add(file);

    // Check exclude
    const relPath = path.relative(cwd, file);
    if (exclude.some((pattern) => relPath.includes(pattern))) {
      continue;
    }

    if (!forwardGraph.has(file)) {
      forwardGraph.set(file, new Set());
    }
    if (!reverseGraph.has(file)) {
      reverseGraph.set(file, new Set());
    }

    let content: string;
    try {
      content = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }

    const imports = extractImportsFromContent(content);
    for (const imp of imports) {
      const resolved = resolveImportPath(file, imp.specifier, cwd);

      // Check exclude for target
      const resolvedRel = path.relative(cwd, resolved);
      if (exclude.some((pattern) => resolvedRel.includes(pattern))) {
        continue;
      }

      forwardGraph.get(file)!.add(resolved);

      if (!reverseGraph.has(resolved)) {
        reverseGraph.set(resolved, new Set());
      }
      reverseGraph.get(resolved)!.add(file);

      if (!forwardGraph.has(resolved)) {
        forwardGraph.set(resolved, new Set());
      }

      const fromId = relativePaths ? path.relative(cwd, file) : file;
      const toId = relativePaths ? path.relative(cwd, resolved) : resolved;

      allEdges.push({
        from: fromId,
        to: toId,
        type: imp.type,
        ...(imp.symbols ? { symbols: imp.symbols } : {}),
      });

      if (!visited.has(resolved)) {
        queue.push(resolved);
      }
    }
  }

  // Compute depths, cycles, transitive counts
  const depths = computeDepths(resolvedEntries, forwardGraph);
  const cycleNodes = detectCycles(forwardGraph);

  // Build nodes
  const nodes: DependencyNode[] = [];
  for (const file of visited) {
    const relPath = path.relative(cwd, file);
    const exclude2 = exclude.some((pattern) => relPath.includes(pattern));
    if (exclude2) continue;

    const id = relativePaths ? relPath : file;
    const forward = forwardGraph.get(file) ?? new Set();
    const reverse = reverseGraph.get(file) ?? new Set();

    const node: DependencyNode = {
      id,
      imports: [...forward].map((f) =>
        relativePaths ? path.relative(cwd, f) : f,
      ),
      importedBy: [...reverse].map((f) =>
        relativePaths ? path.relative(cwd, f) : f,
      ),
      depth: depths.get(file) ?? -1,
      directImportCount: forward.size,
      transitiveImportCount: countTransitiveImports(file, forwardGraph),
      isEntryPoint: resolvedEntries.includes(file),
      isLeaf: forward.size === 0,
      inCycle: cycleNodes.has(file),
    };

    if (includeMetadata) {
      node.metadata = extractMetadata(file);
    }

    nodes.push(node);
  }

  // Count cycles (number of distinct strongly-connected components)
  const cycleCount = countDistinctCycles(forwardGraph, cycleNodes);

  // Summary
  const maxDepth = Math.max(
    0,
    ...nodes.map((n) => n.depth).filter((d) => d >= 0),
  );
  const totalImports = nodes.reduce((sum, n) => sum + n.directImportCount, 0);
  const averageImports =
    nodes.length > 0
      ? Math.round((totalImports / nodes.length) * 100) / 100
      : 0;
  const leafCount = nodes.filter((n) => n.isLeaf).length;

  // Hub files: top 5 by importedBy count
  const sortedByImportedBy = [...nodes].sort(
    (a, b) => b.importedBy.length - a.importedBy.length,
  );
  const hubFiles = sortedByImportedBy
    .slice(0, 5)
    .filter((n) => n.importedBy.length > 0)
    .map((n) => n.id);

  return {
    version: 1,
    generated: new Date().toISOString(),
    root: cwd,
    entryPoints: resolvedEntries.map((e) =>
      relativePaths ? path.relative(cwd, e) : e,
    ),
    nodes,
    edges: allEdges,
    summary: {
      totalFiles: nodes.length,
      totalEdges: allEdges.length,
      maxDepth,
      averageImports,
      cycleCount,
      leafCount,
      hubFiles,
    },
  };
}

// ---------------------------------------------------------------------------
// Cycle counting
// ---------------------------------------------------------------------------

function countDistinctCycles(
  forwardGraph: Map<string, Set<string>>,
  cycleNodes: Set<string>,
): number {
  if (cycleNodes.size === 0) return 0;

  // Use union-find to group cycle nodes by reachability
  const parent = new Map<string, string>();
  for (const node of cycleNodes) {
    parent.set(node, node);
  }

  function find(x: string): string {
    let root = x;
    while (parent.get(root) !== root) {
      root = parent.get(root)!;
    }
    parent.set(x, root);
    return root;
  }

  function union(a: string, b: string): void {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) {
      parent.set(ra, rb);
    }
  }

  for (const node of cycleNodes) {
    const neighbors = forwardGraph.get(node) ?? new Set();
    for (const neighbor of neighbors) {
      if (cycleNodes.has(neighbor)) {
        union(node, neighbor);
      }
    }
  }

  const roots = new Set<string>();
  for (const node of cycleNodes) {
    roots.add(find(node));
  }
  return roots.size;
}

// ---------------------------------------------------------------------------
// Empty graph helper
// ---------------------------------------------------------------------------

function emptyGraph(cwd: string, entryPoints: string[]): DependencyGraph {
  return {
    version: 1,
    generated: new Date().toISOString(),
    root: cwd,
    entryPoints,
    nodes: [],
    edges: [],
    summary: {
      totalFiles: 0,
      totalEdges: 0,
      maxDepth: 0,
      averageImports: 0,
      cycleCount: 0,
      leafCount: 0,
      hubFiles: [],
    },
  };
}

// ---------------------------------------------------------------------------
// Export formats
// ---------------------------------------------------------------------------

export function exportGraphJSON(
  graph: DependencyGraph,
  pretty?: boolean,
): string {
  return pretty ? JSON.stringify(graph, null, 2) : JSON.stringify(graph);
}

export function exportGraphDOT(graph: DependencyGraph): string {
  const lines: string[] = ['digraph dependencies {', '  rankdir=LR;'];

  for (const edge of graph.edges) {
    lines.push(`  "${edge.from}" -> "${edge.to}";`);
  }

  lines.push('}');
  return lines.join('\n');
}

export function exportGraphMermaid(graph: DependencyGraph): string {
  const lines: string[] = ['graph LR'];

  for (const edge of graph.edges) {
    lines.push(
      `  ${sanitizeMermaidId(edge.from)} --> ${sanitizeMermaidId(edge.to)}`,
    );
  }

  return lines.join('\n');
}

function sanitizeMermaidId(id: string): string {
  // Mermaid IDs can't contain certain characters; wrap in quotes if needed
  if (/[/\\. ]/.test(id)) {
    return `${id.replace(/["/\\]/g, '_')}["${id}"]`;
  }
  return id;
}

// ---------------------------------------------------------------------------
// Save graph to disk
// ---------------------------------------------------------------------------

export function saveGraph(
  entryFiles: string[],
  outputPath: string,
  options?: {
    format?: 'json' | 'dot' | 'mermaid';
    pretty?: boolean;
    cwd?: string;
    exclude?: string[];
  },
): void {
  const graph = buildDependencyGraph(entryFiles, {
    cwd: options?.cwd,
    exclude: options?.exclude,
  });

  // Detect format from extension if not specified
  const format = options?.format ?? detectFormat(outputPath);

  let content: string;
  switch (format) {
    case 'dot':
      content = exportGraphDOT(graph);
      break;
    case 'mermaid':
      content = exportGraphMermaid(graph);
      break;
    case 'json':
    default:
      content = exportGraphJSON(graph, options?.pretty ?? true);
      break;
  }

  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outputPath, content, 'utf8');
}

function detectFormat(outputPath: string): 'json' | 'dot' | 'mermaid' {
  const ext = path.extname(outputPath).toLowerCase();
  switch (ext) {
    case '.dot':
      return 'dot';
    case '.mmd':
    case '.mermaid':
      return 'mermaid';
    default:
      return 'json';
  }
}
