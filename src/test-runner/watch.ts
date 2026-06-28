/**
 * Watch mode for the test runner — file watching, import graph building,
 * and intelligent test re-running based on file changes.
 * @module test-runner/watch
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  buildSymbolDependencyMap,
  diffExports,
  getAffectedTestFiles,
  loadParser,
  isParserAvailable,
  type SymbolDependency,
} from './symbol-tracker.js';

// ---------------------------------------------------------------------------
// Glob matching
// ---------------------------------------------------------------------------

/**
 * Match a file path against a glob pattern.
 * Supports `*` (single segment, no separators) and `**` (any depth).
 */
export function matchGlob(filePath: string, pattern: string): boolean {
  const regex = globToRegex(pattern);
  return regex.test(filePath);
}

/**
 * Convert a glob pattern to a RegExp.
 */
function globToRegex(pattern: string): RegExp {
  let regexStr = '';
  let i = 0;

  while (i < pattern.length) {
    const char = pattern[i]!;

    if (char === '*' && pattern[i + 1] === '*') {
      // ** — match any depth (including empty)
      i += 2;
      if (pattern[i] === '/') {
        i++; // skip trailing slash of **/
        regexStr += '(?:.+/)?';
      } else {
        regexStr += '.*';
      }
    } else if (char === '*') {
      // * — match anything except /
      regexStr += '[^/]*';
      i++;
    } else if (char === '?') {
      regexStr += '[^/]';
      i++;
    } else if (char === '.') {
      regexStr += '\\.';
      i++;
    } else {
      regexStr += char;
      i++;
    }
  }

  return new RegExp(`^${regexStr}$`);
}

/**
 * Filter an array of paths by include and exclude glob patterns.
 * A path is included if it matches any include pattern and does not
 * match any exclude pattern.
 */
export function filterPaths(
  paths: string[],
  include: string[],
  exclude: string[],
): string[] {
  return paths.filter((p) => {
    const included = include.some((pattern) => matchGlob(p, pattern));
    if (!included) return false;
    const excluded = exclude.some(
      (pattern) =>
        matchGlob(p, pattern) ||
        matchGlob(p, `${pattern}/**`) ||
        p.startsWith(`${pattern}/`),
    );
    return !excluded;
  });
}

// ---------------------------------------------------------------------------
// Import graph builder
// ---------------------------------------------------------------------------

/**
 * Extract import/require specifiers from file contents.
 * Returns only relative specifiers (starting with . or ..).
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

/**
 * Build a reverse dependency map: imported file path -> set of files that import it.
 * Each key is a resolved absolute path of the imported module.
 * Each value is a set of absolute paths of files that import that module.
 */
export function buildImportGraph(files: string[]): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();

  for (const file of files) {
    let content: string;
    try {
      content = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }

    const imports = extractImports(content);
    const fileDir = path.dirname(file);

    for (const specifier of imports) {
      const resolved = path.resolve(fileDir, specifier);
      let dependents = graph.get(resolved);
      if (!dependents) {
        dependents = new Set<string>();
        graph.set(resolved, dependents);
      }
      dependents.add(file);
    }
  }

  return graph;
}

// ---------------------------------------------------------------------------
// File discovery
// ---------------------------------------------------------------------------

/**
 * Recursively collect all files under a directory.
 */
function collectFiles(dir: string): string[] {
  const results: string[] = [];

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(fullPath));
    } else if (entry.isFile()) {
      results.push(fullPath);
    }
  }

  return results;
}

/**
 * Get all files matching include/exclude patterns relative to cwd.
 */
function discoverFiles(
  cwd: string,
  include: string[],
  exclude: string[],
): string[] {
  const allFiles = collectFiles(cwd);
  const relative = allFiles.map((f) => path.relative(cwd, f));
  const filtered = filterPaths(relative, include, exclude);
  return filtered.map((f) => path.resolve(cwd, f));
}

/**
 * Determine if a file path looks like a test file.
 */
function isTestFile(filePath: string): boolean {
  const base = path.basename(filePath);
  return (
    base.includes('.test.') ||
    base.includes('.spec.') ||
    base.includes('_test.') ||
    base.includes('_spec.')
  );
}

// ---------------------------------------------------------------------------
// Watch mode
// ---------------------------------------------------------------------------

export interface WatchOptions {
  watchInclude?: string[];
  watchExclude?: string[];
  debounceMs?: number;
  cwd?: string;
}

export interface WatchController {
  stop(): void;
  runAll(): void;
  runFailed(): void;
  getWatchedFiles(): string[];
}

/**
 * Watch for file changes and re-run affected test files.
 *
 * @param testRunner - Callback that receives the list of test files to run
 * @param options - Watch configuration options
 * @returns A controller to manage the watch session
 */
export function watchTests(
  testRunner: (files: string[]) => Promise<void>,
  options?: WatchOptions,
): WatchController {
  const include = options?.watchInclude ?? ['src/**', 'tests/**'];
  const exclude = options?.watchExclude ?? ['node_modules', '.git', 'build'];
  const debounceMs = options?.debounceMs ?? 300;
  const cwd = options?.cwd ?? process.cwd();

  let stopped = false;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  const pendingChanges = new Set<string>();
  const failedFiles = new Set<string>();
  const watchers: fs.FSWatcher[] = [];

  /**
   * Discover the set of directories to watch based on include patterns.
   */
  function getWatchDirs(): string[] {
    const dirs = new Set<string>();
    for (const pattern of include) {
      // Extract the leading static portion of the pattern
      const firstWild = pattern.search(/[*?]/);
      const staticPart =
        firstWild === -1 ? pattern : pattern.slice(0, firstWild);
      const dir = staticPart.endsWith('/')
        ? staticPart.slice(0, -1)
        : path.dirname(staticPart || '.');
      const fullDir = path.resolve(cwd, dir || '.');
      if (fs.existsSync(fullDir)) {
        dirs.add(fullDir);
      }
    }
    // Fallback: watch cwd if no specific dirs found
    if (dirs.size === 0) {
      dirs.add(cwd);
    }
    return [...dirs];
  }

  function getAllWatchedFiles(): string[] {
    return discoverFiles(cwd, include, exclude);
  }

  function getTestFiles(): string[] {
    return getAllWatchedFiles().filter(isTestFile);
  }

  async function runTests(files: string[]): Promise<void> {
    if (stopped || files.length === 0) return;
    try {
      await testRunner(files);
      // On success, remove from failed set
      for (const f of files) {
        failedFiles.delete(f);
      }
    } catch {
      // Record failed files
      for (const f of files) {
        failedFiles.add(f);
      }
    }
  }

  // Cache previous file contents for symbol-level diffing (Issue #199)
  const previousFileContents = new Map<string, string>();

  function scheduleDebouncedRun(): void {
    if (stopped) return;
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      if (stopped) return;
      debounceTimer = null;
      const changes = [...pendingChanges];
      pendingChanges.clear();

      // Rebuild import graph for affected test lookup
      const allFiles = getAllWatchedFiles();
      const graph = buildImportGraph(allFiles);
      const testFilesToRun = new Set<string>();

      // Issue #199: Try symbol-level tracking when steamroller is available
      const useSymbolTracking = isParserAvailable();
      let symbolMap: Map<string, SymbolDependency[]> | null = null;
      if (useSymbolTracking) {
        const tests = getTestFiles();
        symbolMap = buildSymbolDependencyMap(tests);
      }

      for (const changedFile of changes) {
        if (isTestFile(changedFile)) {
          testFilesToRun.add(changedFile);
        } else if (useSymbolTracking && symbolMap) {
          // Issue #199: Symbol-level test targeting
          let newContent: string;
          try {
            newContent = fs.readFileSync(changedFile, 'utf8');
          } catch {
            continue;
          }
          const oldContent = previousFileContents.get(changedFile) ?? '';
          previousFileContents.set(changedFile, newContent);

          const diff = diffExports(oldContent, newContent);
          const changedSymbols = [
            ...diff.added,
            ...diff.removed,
            ...diff.changed,
          ];

          if (changedSymbols.length > 0) {
            const tests = getTestFiles();
            const affected = getAffectedTestFiles(
              changedFile,
              changedSymbols,
              symbolMap,
              tests,
            );
            for (const t of affected) {
              testFilesToRun.add(t);
            }
          } else {
            // No export changes detected — fall back to file-level
            for (const [dep, dependents] of graph) {
              const changedNoExt = changedFile.replace(/\.\w+$/, '');
              const depNoExt = dep.replace(/\.\w+$/, '');
              if (changedNoExt === depNoExt || changedFile === dep) {
                for (const d of dependents) {
                  if (isTestFile(d)) {
                    testFilesToRun.add(d);
                  }
                }
              }
            }
            if (testFilesToRun.size === 0) {
              const tests = getTestFiles();
              for (const t of tests) {
                testFilesToRun.add(t);
              }
            }
          }
        } else {
          // File-level fallback (no symbol tracking)
          // Find test files that depend on this source file
          // Check multiple possible resolutions for the key
          for (const [dep, dependents] of graph) {
            // Match if the changed file matches the dependency
            // (the graph stores resolved import paths which may have .js extension)
            const changedNoExt = changedFile.replace(/\.\w+$/, '');
            const depNoExt = dep.replace(/\.\w+$/, '');
            if (changedNoExt === depNoExt || changedFile === dep) {
              for (const d of dependents) {
                if (isTestFile(d)) {
                  testFilesToRun.add(d);
                }
              }
            }
          }
          // If it's a source file with no known dependents, run all tests
          if (testFilesToRun.size === 0 && !isTestFile(changedFile)) {
            const tests = getTestFiles();
            for (const t of tests) {
              testFilesToRun.add(t);
            }
          }
        }
      }

      if (testFilesToRun.size > 0) {
        void runTests([...testFilesToRun]);
      }
    }, debounceMs);
  }

  function onFileChange(dir: string, filename: string | null): void {
    if (stopped || !filename) return;

    const fullPath = path.resolve(dir, filename);
    const relative = path.relative(cwd, fullPath);

    // Check include/exclude
    const included = include.some((p) => matchGlob(relative, p));
    const excluded = exclude.some(
      (p) =>
        matchGlob(relative, p) ||
        matchGlob(relative, `${p}/**`) ||
        relative.startsWith(`${p}/`),
    );

    if (!included || excluded) return;

    pendingChanges.add(fullPath);
    scheduleDebouncedRun();
  }

  // Issue #199: Try to load steamroller parser for symbol-level tracking
  void loadParser();

  // Start watching directories
  const watchDirs = getWatchDirs();
  for (const dir of watchDirs) {
    try {
      const watcher = fs.watch(dir, { recursive: true }, (_event, filename) => {
        onFileChange(dir, filename);
      });
      watchers.push(watcher);
    } catch {
      // Directory may not exist or be inaccessible
    }
  }

  const controller: WatchController = {
    stop(): void {
      stopped = true;
      if (debounceTimer !== null) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      for (const watcher of watchers) {
        watcher.close();
      }
      watchers.length = 0;
    },

    runAll(): void {
      if (stopped) return;
      const tests = getTestFiles();
      void runTests(tests);
    },

    runFailed(): void {
      if (stopped) return;
      const failed = [...failedFiles].filter((f) => fs.existsSync(f));
      if (failed.length > 0) {
        void runTests(failed);
      }
    },

    getWatchedFiles(): string[] {
      return getAllWatchedFiles();
    },
  };

  return controller;
}
