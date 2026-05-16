/**
 * Snapshot testing utilities for comprehensive snapshot matching.
 * @module snapshots
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Serialize a value into a human-readable snapshot string.
 */
export function serialize(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'number' || typeof value === 'boolean')
    return String(value);
  if (typeof value === 'function') {
    const name = value.name || 'anonymous';
    return `[Function ${name}]`;
  }
  if (value instanceof RegExp) return String(value);
  if (value instanceof Date) return `Date(${value.toISOString()})`;
  if (value instanceof Error) return `Error(${value.message})`;
  if (value instanceof Map) {
    const entries = Array.from(value.entries() as Iterable<[unknown, unknown]>)
      .map(([k, v]) => `  ${JSON.stringify(k)} => ${JSON.stringify(v)},`)
      .join('\n');
    return `Map {\n${entries}\n}`;
  }
  if (value instanceof Set) {
    const items = Array.from(value.values() as Iterable<unknown>)
      .map((v) => `  ${JSON.stringify(v)},`)
      .join('\n');
    return `Set {\n${items}\n}`;
  }
  // Objects and arrays
  return JSON.stringify(value, null, 2);
}

/**
 * Escape backticks and backslashes for snapshot file template literals.
 */
function escapeForTemplate(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
}

/**
 * Unescape template literal content from snapshot file.
 */
function unescapeFromTemplate(str: string): string {
  return str.replace(/\\\$/g, '$').replace(/\\`/g, '`').replace(/\\\\/g, '\\');
}

/**
 * Read all snapshots from a snapshot file. Returns a map of name -> serialized value.
 */
function readSnapshotFile(filePath: string): Map<string, string> {
  const snapshots = new Map<string, string>();
  if (!fs.existsSync(filePath)) return snapshots;

  const content = fs.readFileSync(filePath, 'utf-8');
  const regex = /exports\['(.+?)'\]\s*=\s*`([\s\S]*?)`;/g;
  let match: RegExpExecArray | null = regex.exec(content);
  while (match !== null) {
    snapshots.set(match[1]!, unescapeFromTemplate(match[2]!));
    match = regex.exec(content);
  }
  return snapshots;
}

/**
 * Write all snapshots to a snapshot file.
 */
function writeSnapshotFile(
  filePath: string,
  snapshots: Map<string, string>,
): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const lines: string[] = [];
  for (const [name, value] of snapshots) {
    lines.push(`exports['${name}'] = \`${escapeForTemplate(value)}\`;`);
  }
  fs.writeFileSync(filePath, lines.join('\n\n') + '\n', 'utf-8');
}

/**
 * Determine the snapshot file path for a given test file.
 * Uses the caller's file to determine location.
 */
function getSnapshotFilePath(): string {
  const err = new Error();
  const stack = err.stack ?? '';
  const lines = stack.split('\n');

  // Walk the stack to find the first frame outside this module
  for (const line of lines) {
    // Match file paths in stack traces
    const match = /(?:at\s+.*?\s+\(|at\s+)(\/[^:)]+\.(?:ts|js))/.exec(line);
    if (match) {
      const filePath = match[1]!;
      // Skip this file and the assertions/index file
      if (
        filePath.includes('snapshots.ts') ||
        filePath.includes('snapshots.js')
      )
        continue;
      if (filePath.includes('assertions/index')) continue;
      // Found the test file
      const dir = path.dirname(filePath);
      const basename = path.basename(filePath, path.extname(filePath));
      return path.join(dir, '__snapshots__', `${basename}.snap`);
    }
  }

  // Fallback: use cwd
  return path.join(process.cwd(), '__snapshots__', 'unknown.snap');
}

/**
 * Check if snapshots should be updated (via env var).
 */
function shouldUpdate(): boolean {
  return process.env.UPDATE_SNAPSHOTS === '1';
}

/**
 * Match a value against a stored snapshot.
 * Creates the snapshot on first run, compares on subsequent runs.
 */
export function matchSnapshot(actual: unknown, snapshotName: string): void {
  const snapshotFile = getSnapshotFilePath();
  const snapshots = readSnapshotFile(snapshotFile);
  const serialized = serialize(actual);

  if (!snapshots.has(snapshotName) || shouldUpdate()) {
    // First run or update mode: store snapshot
    snapshots.set(snapshotName, serialized);
    writeSnapshotFile(snapshotFile, snapshots);
    return;
  }

  const stored = snapshots.get(snapshotName)!;
  if (serialized !== stored) {
    throw new Error(
      `Snapshot mismatch for "${snapshotName}":\n` +
        `Expected:\n${stored}\n` +
        `Received:\n${serialized}`,
    );
  }
}

/**
 * Match a value against an inline snapshot string.
 * If no inline snapshot provided, passes and logs a message.
 */
export function matchInlineSnapshot(
  actual: unknown,
  inlineSnapshot?: string,
): void {
  const serialized = serialize(actual);

  if (inlineSnapshot === undefined) {
    // First run: no inline snapshot provided
    // eslint-disable-next-line no-console
    console.log(
      `[Snapshot] Inline snapshot needs to be added manually. Serialized value:\n${serialized}`,
    );
    return;
  }

  if (serialized !== inlineSnapshot) {
    throw new Error(
      `Inline snapshot mismatch:\n` +
        `Expected:\n${inlineSnapshot}\n` +
        `Received:\n${serialized}`,
    );
  }
}
