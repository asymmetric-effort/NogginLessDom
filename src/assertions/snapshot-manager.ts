/**
 * SnapshotManager coordinates snapshot clients across multiple test files.
 * @module snapshot-manager
 */

import { SnapshotClient } from './snapshot-client.js';
import type { SnapshotEnvironment } from './snapshot-environment.js';

/**
 * Summary of all snapshot operations across all test files.
 */
export interface SnapshotManagerSummary {
  added: number;
  updated: number;
  removed: number;
  passed: number;
  failed: number;
  unchecked: number;
}

/**
 * SnapshotManager tracks snapshot clients for multiple test files.
 * It aggregates results and handles cleanup of obsolete snapshots.
 */
export class SnapshotManager {
  private clients: Map<string, SnapshotClient> = new Map();
  private environment: SnapshotEnvironment;
  private summary: SnapshotManagerSummary = {
    added: 0,
    updated: 0,
    removed: 0,
    passed: 0,
    failed: 0,
    unchecked: 0,
  };

  constructor(environment: SnapshotEnvironment) {
    this.environment = environment;
  }

  /**
   * Get or create a SnapshotClient for the given test file.
   * If a client already exists for this file, it is returned.
   */
  getClient(testFile: string): SnapshotClient {
    const existing = this.clients.get(testFile);
    if (existing) {
      return existing;
    }
    const client = new SnapshotClient(this.environment);
    this.clients.set(testFile, client);
    return client;
  }

  /**
   * Finish processing a test file: collect its results into the
   * aggregate summary and save its snapshots.
   */
  async finishFile(testFile: string): Promise<void> {
    const client = this.clients.get(testFile);
    if (!client) return;

    const result = client.finishTest();
    this.summary.added += result.added;
    this.summary.updated += result.updated;
    this.summary.passed += result.matched;

    await client.saveSnapshots();
  }

  /**
   * Get the aggregate summary across all managed test files.
   */
  getSummary(): SnapshotManagerSummary {
    return { ...this.summary };
  }

  /**
   * Clean up obsolete snapshot files by removing snapshot files
   * for test files that are no longer tracked.
   */
  async cleanup(): Promise<void> {
    for (const [testFile, client] of this.clients) {
      const snapshotPath = this.environment.resolveSnapshotPath(testFile);
      const keys = client.getSnapshotKeys();
      if (keys.length === 0) {
        await this.environment.removeSnapshotFile(snapshotPath);
        this.summary.removed++;
      }
    }
  }

  /**
   * Clear all tracked clients and reset the summary.
   */
  reset(): void {
    this.clients.clear();
    this.summary = {
      added: 0,
      updated: 0,
      removed: 0,
      passed: 0,
      failed: 0,
      unchecked: 0,
    };
  }
}

/**
 * Print a human-readable snapshot summary line.
 * Format: "Snapshots: X passed, Y added, Z updated, W removed, V obsolete"
 */
export function printSnapshotSummary(summary: SnapshotManagerSummary): void {
  const parts = [
    `${summary.passed} passed`,
    `${summary.added} added`,
    `${summary.updated} updated`,
    `${summary.removed} removed`,
    `${summary.unchecked} obsolete`,
  ];
  // eslint-disable-next-line no-console
  console.log(`Snapshots: ${parts.join(', ')}`);
}
