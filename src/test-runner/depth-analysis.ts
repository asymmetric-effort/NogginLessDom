/**
 * Dependency graph depth analysis for the test runner.
 * Analyzes the longest import chain depth for each file.
 * @module test-runner/depth-analysis
 */

import * as path from 'node:path';

import { buildForwardGraph } from './cycle-detection.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DepthAnalysis {
  file: string;
  depth: number;
  longestChain: string[];
  directImports: number;
  transitiveImports: number;
}

export interface DepthAnalysisResult {
  entries: DepthAnalysis[];
  maxDepth: number;
  averageDepth: number;
  filesExceedingThreshold: DepthAnalysis[];
}

export interface DepthCheckConfig {
  enabled?: boolean;
  threshold?: number;
  strict?: boolean;
}

// ---------------------------------------------------------------------------
// Config state
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: DepthCheckConfig = {
  enabled: false,
  threshold: 10,
  strict: false,
};

let currentConfig: DepthCheckConfig = { ...DEFAULT_CONFIG };

/**
 * Configure depth check for test runner integration.
 * Checks the IMPORT_DEPTH_THRESHOLD env var.
 */
export function configureDepthCheck(config: DepthCheckConfig): void {
  currentConfig = { ...currentConfig, ...config };
  if (config.threshold === undefined && process.env.IMPORT_DEPTH_THRESHOLD) {
    const parsed = parseInt(process.env.IMPORT_DEPTH_THRESHOLD, 10);
    if (!isNaN(parsed)) {
      currentConfig.threshold = parsed;
    }
  }
  if (config.enabled === undefined && process.env.IMPORT_DEPTH_THRESHOLD) {
    currentConfig.enabled = true;
  }
}

export function getDepthCheckConfig(): DepthCheckConfig {
  return { ...currentConfig };
}

export function resetDepthCheckConfig(): void {
  currentConfig = { ...DEFAULT_CONFIG };
}

// ---------------------------------------------------------------------------
// Depth analysis
// ---------------------------------------------------------------------------

/**
 * Count all transitively reachable files from a given node,
 * handling cycles by tracking visited nodes.
 */
function countTransitive(
  node: string,
  graph: Map<string, Set<string>>,
): number {
  const visited = new Set<string>();
  const stack = [node];

  while (stack.length > 0) {
    const current = stack.pop()!;
    const deps = graph.get(current);
    if (!deps) continue;
    for (const dep of deps) {
      if (!visited.has(dep) && dep !== node) {
        visited.add(dep);
        stack.push(dep);
      }
    }
  }

  return visited.size;
}

/**
 * Find the longest path (depth) from a node to a leaf.
 * Uses memoization and a visited set to handle cycles.
 */
function computeDepth(
  node: string,
  graph: Map<string, Set<string>>,
  memo: Map<string, { depth: number; chain: string[] }>,
  visiting: Set<string>,
): { depth: number; chain: string[] } {
  if (memo.has(node)) return memo.get(node)!;

  const deps = graph.get(node);
  if (!deps || deps.size === 0) {
    const result = { depth: 0, chain: [node] };
    memo.set(node, result);
    return result;
  }

  // Mark as visiting to detect cycles
  visiting.add(node);

  let maxDepth = 0;
  let longestChain: string[] = [node];

  for (const dep of deps) {
    if (visiting.has(dep)) {
      // Cycle detected — don't follow
      continue;
    }
    const sub = computeDepth(dep, graph, memo, visiting);
    if (sub.depth + 1 > maxDepth) {
      maxDepth = sub.depth + 1;
      longestChain = [node, ...sub.chain];
    }
  }

  visiting.delete(node);

  const result = { depth: maxDepth, chain: longestChain };
  memo.set(node, result);
  return result;
}

/**
 * Analyze import depth for a set of entry files.
 */
export function analyzeImportDepth(
  entryFiles: string[],
  options?: { cwd?: string; exclude?: string[]; threshold?: number },
): DepthAnalysisResult {
  if (entryFiles.length === 0) {
    return {
      entries: [],
      maxDepth: 0,
      averageDepth: 0,
      filesExceedingThreshold: [],
    };
  }

  const cwd = options?.cwd ?? process.cwd();
  const exclude = options?.exclude ?? [];
  const threshold = options?.threshold ?? Infinity;

  const graph = buildForwardGraph(entryFiles, { cwd, exclude });

  const memo = new Map<string, { depth: number; chain: string[] }>();
  const entries: DepthAnalysis[] = [];

  for (const file of graph.keys()) {
    const { depth, chain } = computeDepth(file, graph, memo, new Set());
    const directDeps = graph.get(file);
    const directImports = directDeps ? directDeps.size : 0;
    const transitiveImports = countTransitive(file, graph);

    entries.push({
      file: path.isAbsolute(file) ? file : path.resolve(cwd, file),
      depth,
      longestChain: chain,
      directImports,
      transitiveImports,
    });
  }

  const maxDepth =
    entries.length > 0 ? Math.max(...entries.map((e) => e.depth)) : 0;
  const averageDepth =
    entries.length > 0
      ? entries.reduce((sum, e) => sum + e.depth, 0) / entries.length
      : 0;

  const filesExceedingThreshold = entries.filter((e) => e.depth > threshold);

  return {
    entries,
    maxDepth,
    averageDepth,
    filesExceedingThreshold,
  };
}
