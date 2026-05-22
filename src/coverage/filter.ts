/**
 * File filtering for coverage results.
 * Implements simple glob matching with *, **, and ? wildcards.
 */

import type { CoverageConfig } from './config.js';

/** Default directory patterns that are always excluded from coverage. */
const DEFAULT_EXCLUDES: readonly string[] = [
  '**/node_modules/**',
  '**/test/**',
  '**/tests/**',
  '**/.git/**',
  '**/coverage/**',
  '**/dist/**',
  '**/build/**',
];

/**
 * Convert a simple glob pattern to a RegExp.
 * Supports:
 * - `**` matches any characters including `/`
 * - `*` matches any characters except `/`
 * - `?` matches a single character (not `/`)
 */
function globToRegex(pattern: string): RegExp {
  let result = '';
  let i = 0;

  while (i < pattern.length) {
    const char = pattern[i]!;

    if (char === '*') {
      if (pattern[i + 1] === '*') {
        // ** matches everything including /
        // Handle **/ as a prefix
        if (pattern[i + 2] === '/') {
          result += '(?:.*/)?';
          i += 3;
        } else {
          result += '.*';
          i += 2;
        }
      } else {
        // * matches everything except /
        result += '[^/]*';
        i += 1;
      }
    } else if (char === '?') {
      result += '[^/]';
      i += 1;
    } else if (char === '.') {
      result += '\\.';
      i += 1;
    } else if (char === '/' || char === '\\') {
      result += '/';
      i += 1;
    } else {
      result += char;
      i += 1;
    }
  }

  return new RegExp(`^${result}$`);
}

function matchesPattern(filePath: string, pattern: string): boolean {
  const regex = globToRegex(pattern);
  return regex.test(filePath);
}

function matchesAny(filePath: string, patterns: readonly string[]): boolean {
  return patterns.some(pattern => matchesPattern(filePath, pattern));
}

/**
 * Determine whether a file should be included in coverage results.
 */
export function shouldIncludeFile(
  filePath: string,
  config: CoverageConfig,
): boolean {
  // Check default excludes first
  if (matchesAny(filePath, DEFAULT_EXCLUDES)) {
    return false;
  }

  // Check user exclude patterns
  const excludePatterns = config.exclude ?? [];
  if (excludePatterns.length > 0 && matchesAny(filePath, excludePatterns)) {
    return false;
  }

  // Check include patterns (empty means include all)
  const includePatterns = config.include ?? [];
  if (includePatterns.length === 0) {
    return true;
  }

  return matchesAny(filePath, includePatterns);
}
