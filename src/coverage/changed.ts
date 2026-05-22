/**
 * Changed-file detection for --changed flag (Issue #54).
 * Uses git to determine which files have changed relative to a base branch or HEAD.
 */

import { execFileSync } from 'node:child_process';

/**
 * Get the list of files changed relative to a base branch or HEAD.
 *
 * @param baseBranch - If provided, diff against `<baseBranch>...HEAD`.
 *                     If omitted, diff against `HEAD` (uncommitted changes).
 * @returns Array of changed file paths (relative to the repo root).
 */
export function getChangedFiles(baseBranch?: string): string[] {
  try {
    let output: string;
    if (baseBranch) {
      // Validate branch name to prevent injection
      if (!/^[a-zA-Z0-9_./-]+$/.test(baseBranch)) {
        throw new Error(`Invalid branch name: ${baseBranch}`);
      }
      // Use execFileSync (no shell) to avoid command injection
      output = execFileSync(
        'git',
        ['diff', '--name-only', `${baseBranch}...HEAD`],
        { encoding: 'utf-8' },
      );
    } else {
      output = execFileSync('git', ['diff', '--name-only', 'HEAD'], {
        encoding: 'utf-8',
      });
    }
    return output
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  } catch {
    return [];
  }
}
