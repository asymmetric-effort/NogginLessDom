/**
 * Changed-file detection for --changed flag (Issue #54).
 * Uses git to determine which files have changed relative to a base branch or HEAD.
 */

import { execSync } from 'node:child_process';

/**
 * Get the list of files changed relative to a base branch or HEAD.
 *
 * @param baseBranch - If provided, diff against `<baseBranch>...HEAD`.
 *                     If omitted, diff against `HEAD` (uncommitted changes).
 * @returns Array of changed file paths (relative to the repo root).
 */
export function getChangedFiles(baseBranch?: string): string[] {
  const command = baseBranch
    ? `git diff --name-only ${baseBranch}...HEAD`
    : 'git diff --name-only HEAD';

  try {
    const output = execSync(command, { encoding: 'utf-8' });
    return output
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  } catch {
    return [];
  }
}
