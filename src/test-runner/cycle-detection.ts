/**
 * Circular dependency detection for the test runner.
 * Builds a forward dependency graph and detects cycles via DFS.
 * @module test-runner/cycle-detection
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CircularDependency {
  cycle: string[];
  files: Set<string>;
}

export interface CycleDetectionConfig {
  enabled?: boolean;
  strict?: boolean;
  exclude?: string[];
  maxCycles?: number; // default: 50
}

// ---------------------------------------------------------------------------
// Config state
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: CycleDetectionConfig = {
  enabled: false,
  strict: false,
  exclude: [],
  maxCycles: 50,
};

let currentConfig: CycleDetectionConfig = { ...DEFAULT_CONFIG };

/**
 * Configure cycle detection for test runner integration.
 * Checks the DETECT_CYCLES env var when enabled is not explicitly set.
 */
export function configureCycleDetection(config: CycleDetectionConfig): void {
  currentConfig = { ...currentConfig, ...config };
  if (config.enabled === undefined && process.env.DETECT_CYCLES) {
    currentConfig.enabled =
      process.env.DETECT_CYCLES === '1' || process.env.DETECT_CYCLES === 'true';
  }
}

export function getCycleDetectionConfig(): CycleDetectionConfig {
  return { ...currentConfig };
}

export function resetCycleDetectionConfig(): void {
  currentConfig = { ...DEFAULT_CONFIG };
}

// ---------------------------------------------------------------------------
// Import extraction (reused from watch.ts pattern)
// ---------------------------------------------------------------------------

/**
 * Extract import/require specifiers from file contents.
 * Returns only relative specifiers (starting with . or ..).
 * Skips bare specifiers and node: built-ins.
 */
function extractImports(content: string): string[] {
  const specifiers: string[] = [];

  // Match: import ... from '...' or import '...'
  const importRegex = /import\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g;
  let match: RegExpExecArray | null;
  while ((match = importRegex.exec(content)) !== null) {
    const specifier = match[1];
    if (
      specifier &&
      (specifier.startsWith('./') || specifier.startsWith('../'))
    ) {
      specifiers.push(specifier);
    }
  }

  // Match: require('...')
  const requireRegex = /require\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = requireRegex.exec(content)) !== null) {
    const specifier = match[1];
    if (
      specifier &&
      (specifier.startsWith('./') || specifier.startsWith('../'))
    ) {
      specifiers.push(specifier);
    }
  }

  return specifiers;
}

// ---------------------------------------------------------------------------
// Import resolution
// ---------------------------------------------------------------------------

const EXTENSIONS = ['', '.ts', '.js', '.tsx', '.jsx'];

/**
 * Resolve a relative import specifier to an actual file on disk.
 * Tries the raw resolved path, then common extensions, then index files.
 * Falls back to the raw resolved path if nothing is found.
 */
function resolveSpecifier(fromDir: string, specifier: string): string {
  const resolved = path.resolve(fromDir, specifier);

  for (const ext of EXTENSIONS) {
    const candidate = resolved + ext;
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  // Try swapping extension (e.g. ./b.js -> ./b.ts)
  const parsedPath = path.parse(resolved);
  if (parsedPath.ext) {
    const withoutExt = path.join(parsedPath.dir, parsedPath.name);
    for (const ext of EXTENSIONS) {
      if (ext && ext !== parsedPath.ext) {
        const candidate = withoutExt + ext;
        if (fs.existsSync(candidate)) {
          return candidate;
        }
      }
    }
  }

  return resolved;
}

// ---------------------------------------------------------------------------
// Forward graph builder
// ---------------------------------------------------------------------------

/**
 * Build a forward dependency graph (file -> files it imports).
 * Only includes relative imports; bare specifiers and node: built-ins are skipped.
 */
export function buildForwardGraph(
  entryFiles: string[],
  options?: { cwd?: string; exclude?: string[] },
): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();
  const exclude = options?.exclude ?? [];
  const cwd = options?.cwd ?? process.cwd();

  for (const file of entryFiles) {
    const absFile = path.isAbsolute(file) ? file : path.resolve(cwd, file);

    if (isExcluded(absFile, exclude, cwd)) {
      continue;
    }

    let content: string;
    try {
      content = fs.readFileSync(absFile, 'utf8');
    } catch {
      continue;
    }

    const imports = extractImports(content);
    const fileDir = path.dirname(absFile);
    const deps = new Set<string>();

    for (const specifier of imports) {
      const resolved = resolveSpecifier(fileDir, specifier);
      if (!isExcluded(resolved, exclude, cwd)) {
        deps.add(resolved);
      }
    }

    graph.set(absFile, deps);
  }

  return graph;
}

function isExcluded(absFile: string, exclude: string[], cwd: string): boolean {
  if (exclude.length === 0) return false;
  const rel = path.relative(cwd, absFile);
  return exclude.some(
    (pattern) =>
      rel.startsWith(pattern) || rel.includes(`/${pattern}`) || rel === pattern,
  );
}

// ---------------------------------------------------------------------------
// Cycle detection via DFS
// ---------------------------------------------------------------------------

/**
 * Normalize a cycle by rotating it to start with the lexicographically smallest file.
 */
function normalizeCycle(cycle: string[]): string[] {
  if (cycle.length === 0) return cycle;

  let minIndex = 0;
  for (let i = 1; i < cycle.length; i++) {
    if (cycle[i]! < cycle[minIndex]!) {
      minIndex = i;
    }
  }

  return [...cycle.slice(minIndex), ...cycle.slice(0, minIndex)];
}

/**
 * Create a string key for deduplication of cycles.
 */
function cycleKey(cycle: string[]): string {
  return normalizeCycle(cycle).join('\0');
}

/**
 * Detect circular imports via DFS with back-edge detection.
 */
export function detectCircularImports(
  entryFiles: string[],
  options?: { cwd?: string; exclude?: string[]; maxCycles?: number },
): CircularDependency[] {
  if (entryFiles.length === 0) return [];

  const cwd = options?.cwd ?? process.cwd();
  const exclude = options?.exclude ?? [];
  const maxCycles = options?.maxCycles ?? 50;

  const graph = buildForwardGraph(entryFiles, { cwd, exclude });

  const cycles: CircularDependency[] = [];
  const seenCycleKeys = new Set<string>();
  const globalVisited = new Set<string>();

  function dfs(node: string, pathStack: string[], onStack: Set<string>): void {
    if (cycles.length >= maxCycles) return;

    if (onStack.has(node)) {
      // Found a cycle: extract the cycle from the path stack
      const cycleStart = pathStack.indexOf(node);
      const cyclePath = pathStack.slice(cycleStart);
      const key = cycleKey(cyclePath);
      if (!seenCycleKeys.has(key)) {
        seenCycleKeys.add(key);
        const normalized = normalizeCycle(cyclePath);
        cycles.push({
          cycle: [...normalized, normalized[0]!],
          files: new Set(cyclePath),
        });
      }
      return;
    }

    if (globalVisited.has(node)) return;

    onStack.add(node);
    pathStack.push(node);

    const deps = graph.get(node);
    if (deps) {
      for (const dep of deps) {
        if (cycles.length >= maxCycles) break;
        dfs(dep, pathStack, onStack);
      }
    }

    pathStack.pop();
    onStack.delete(node);
    globalVisited.add(node);
  }

  for (const file of graph.keys()) {
    if (cycles.length >= maxCycles) break;
    if (!globalVisited.has(file)) {
      dfs(file, [], new Set());
    }
  }

  return cycles;
}

// ---------------------------------------------------------------------------
// Report formatting
// ---------------------------------------------------------------------------

/**
 * Format detected cycles as a human-readable report.
 * Each cycle appears on one line, arrow-separated.
 */
export function formatCycleReport(cycles: CircularDependency[]): string {
  if (cycles.length === 0) {
    return 'No circular dependencies detected.';
  }

  const lines = cycles.map((c) => c.cycle.join(' → '));
  return [
    `Found ${cycles.length} circular ${cycles.length === 1 ? 'dependency' : 'dependencies'}:`,
    '',
    ...lines,
  ].join('\n');
}
