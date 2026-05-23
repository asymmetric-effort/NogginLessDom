/**
 * SnapshotClient manages snapshot state for a single test.
 * Handles matching, updating, and tracking snapshot assertions.
 * @module snapshot-client
 */

import { serialize } from './snapshots.js';
import type { SnapshotEnvironment } from './snapshot-environment.js';

/**
 * Summary of snapshot operations for a single client.
 */
export interface SnapshotSummary {
  added: number;
  updated: number;
  matched: number;
  testName: string;
}

/**
 * SnapshotClient manages the lifecycle of snapshot assertions for a test.
 * Call prepareTest() before each test, assert() for each snapshot check,
 * and finishTest() after to collect results.
 */
export class SnapshotClient {
  private testName: string = '';
  private snapshotCount: number = 0;
  private snapshots: Map<string, string> = new Map();
  private added: number = 0;
  private updated: number = 0;
  private matched: number = 0;
  private environment: SnapshotEnvironment;
  private snapshotFilePath: string = '';

  constructor(environment: SnapshotEnvironment) {
    this.environment = environment;
  }

  /**
   * Prepare the client for a new test. Resets the snapshot counter
   * and sets the test name.
   */
  prepareTest(testName: string): void {
    this.testName = testName;
    this.snapshotCount = 0;
  }

  /**
   * Load snapshots from a file into the internal map.
   * Parses the snapshot file format: exports['name'] = `value`;
   */
  async loadSnapshots(filepath: string): Promise<void> {
    this.snapshotFilePath = filepath;
    const content = await this.environment.readSnapshotFile(filepath);
    if (!content) return;

    const regex = /exports\['(.+?)'\]\s*=\s*`([\s\S]*?)`;/g;
    let match: RegExpExecArray | null = regex.exec(content);
    while (match !== null) {
      const name = match[1];
      const value = match[2];
      if (name !== undefined && value !== undefined) {
        this.snapshots.set(name, unescapeFromTemplate(value));
      }
      match = regex.exec(content);
    }
  }

  /**
   * Assert that a received value matches the stored snapshot.
   * If no snapshot exists, it is created (added).
   * If UPDATE_SNAPSHOTS=1 is set, existing snapshots are overwritten (updated).
   */
  assert(received: unknown, snapshotName?: string): void {
    this.snapshotCount++;
    const key =
      snapshotName ?? `${this.testName} ${String(this.snapshotCount)}`;
    const serialized = serialize(received);
    const shouldUpdate = process.env['UPDATE_SNAPSHOTS'] === '1';

    if (!this.snapshots.has(key)) {
      // New snapshot
      this.snapshots.set(key, serialized);
      this.added++;
      return;
    }

    if (shouldUpdate) {
      const existing = this.snapshots.get(key);
      if (existing !== serialized) {
        this.snapshots.set(key, serialized);
        this.updated++;
      } else {
        this.matched++;
      }
      return;
    }

    const stored = this.snapshots.get(key)!;
    if (serialized !== stored) {
      throw new Error(
        `Snapshot mismatch for "${key}":\n` +
          `Expected:\n${stored}\n` +
          `Received:\n${serialized}`,
      );
    }
    this.matched++;
  }

  /**
   * Finish the current test. Saves updated snapshots to disk
   * and returns the counts of added, updated, and matched snapshots.
   */
  finishTest(): { added: number; updated: number; matched: number } {
    const result = {
      added: this.added,
      updated: this.updated,
      matched: this.matched,
    };
    return result;
  }

  /**
   * Save all current snapshots to the snapshot file.
   */
  async saveSnapshots(): Promise<void> {
    if (!this.snapshotFilePath) return;
    if (this.snapshots.size === 0) return;

    const lines: string[] = [];
    for (const [name, value] of this.snapshots) {
      lines.push(`exports['${name}'] = \`${escapeForTemplate(value)}\`;`);
    }
    await this.environment.saveSnapshotFile(
      this.snapshotFilePath,
      lines.join('\n\n') + '\n',
    );
  }

  /**
   * Get a summary of snapshot operations for this client.
   */
  getSummary(): SnapshotSummary {
    return {
      added: this.added,
      updated: this.updated,
      matched: this.matched,
      testName: this.testName,
    };
  }

  /**
   * Get all currently loaded snapshot keys.
   */
  getSnapshotKeys(): string[] {
    return Array.from(this.snapshots.keys());
  }

  /**
   * Reset internal counters (added/updated/matched) without clearing snapshots.
   */
  resetCounters(): void {
    this.added = 0;
    this.updated = 0;
    this.matched = 0;
  }
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
