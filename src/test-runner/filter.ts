/**
 * Test name and file pattern filtering.
 *
 * Allows filtering tests by name pattern (string or RegExp) and by file glob.
 * Integrates with the test runner so that non-matching tests are reported as
 * skipped rather than silently omitted.
 *
 * @module test-runner/filter
 */

import { matchGlob } from './watch.js';

// ---------------------------------------------------------------------------
// Name pattern state
// ---------------------------------------------------------------------------

let namePattern: RegExp | null = null;
let nameInvert = false;

/**
 * Set a test name filter pattern. When active, tests whose full name
 * (built from the describe stack joined with ` > `) does not match will
 * be automatically skipped.
 *
 * @param pattern - A string (converted to a RegExp) or a RegExp.
 * @param options - Optional. Set `invert: true` to skip tests that *match*.
 */
export function setTestNamePattern(
  pattern: string | RegExp,
  options?: { invert?: boolean },
): void {
  namePattern = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
  nameInvert = options?.invert === true;
}

/**
 * Remove the active test name filter.
 */
export function clearTestNamePattern(): void {
  namePattern = null;
  nameInvert = false;
}

/**
 * Return the current test name filter state.
 */
export function getTestNamePattern(): {
  pattern: RegExp | null;
  invert: boolean;
} {
  return { pattern: namePattern, invert: nameInvert };
}

// ---------------------------------------------------------------------------
// File pattern state
// ---------------------------------------------------------------------------

let filePattern: string | null = null;

/**
 * Set a file glob pattern. Test files whose paths do not match will be
 * skipped entirely.
 */
export function setTestFilePattern(glob: string): void {
  filePattern = glob;
}

/**
 * Remove the active file pattern filter.
 */
export function clearTestFilePattern(): void {
  filePattern = null;
}

/**
 * Return the current file glob pattern (or `null` if none is set).
 */
export function getTestFilePattern(): string | null {
  return filePattern;
}

/**
 * Check whether a file path matches the current file pattern.
 * Returns `true` when there is no pattern or the path matches.
 */
export function fileMatchesPattern(filePath: string): boolean {
  if (filePattern === null) return true;
  return matchGlob(filePath, filePattern);
}

// ---------------------------------------------------------------------------
// Describe stack — tracks nested describe() names
// ---------------------------------------------------------------------------

const describeStack: string[] = [];

/**
 * Push a describe name onto the stack. Called when entering a describe block.
 */
export function pushDescribe(name: string): void {
  describeStack.push(name);
}

/**
 * Pop the most recent describe name from the stack.
 */
export function popDescribe(): void {
  describeStack.pop();
}

/**
 * Build the full test name by joining the describe stack with the test name.
 */
export function buildFullName(testName: string): string {
  if (describeStack.length === 0) return testName;
  return describeStack.join(' > ') + ' > ' + testName;
}

/**
 * Get the current describe stack (shallow copy).
 */
export function getDescribeStack(): string[] {
  return describeStack.slice();
}

/**
 * Reset the describe stack. Useful for test isolation.
 */
export function resetDescribeStack(): void {
  describeStack.length = 0;
}

// ---------------------------------------------------------------------------
// Pattern matching
// ---------------------------------------------------------------------------

/**
 * Check whether a test with the given full name should be skipped
 * based on the current name pattern.
 *
 * Returns `true` when the test should be **skipped**.
 */
export function shouldSkipTest(fullName: string): boolean {
  if (namePattern === null) return false;
  const matches = namePattern.test(fullName);
  // Normal mode: skip when the name does NOT match.
  // Invert mode: skip when the name DOES match.
  return nameInvert ? matches : !matches;
}

// ---------------------------------------------------------------------------
// Environment variable initialisation
// ---------------------------------------------------------------------------

/**
 * Read `TEST_NAME_PATTERN` and `TEST_FILE_PATTERN` from `process.env` and
 * apply them. Called once at module load time.
 */
export function initFromEnv(): void {
  const envName = process.env.TEST_NAME_PATTERN;
  if (envName !== undefined && envName !== '') {
    setTestNamePattern(envName);
  }

  const envFile = process.env.TEST_FILE_PATTERN;
  if (envFile !== undefined && envFile !== '') {
    setTestFilePattern(envFile);
  }
}

// Auto-initialise from environment on first import.
initFromEnv();
