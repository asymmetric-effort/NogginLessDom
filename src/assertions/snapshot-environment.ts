/**
 * Snapshot environment abstraction for reading/writing snapshot files.
 * @module snapshot-environment
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Interface for snapshot file I/O operations.
 * Allows different environments (Node, browser, etc.) to provide
 * their own implementations.
 */
export interface SnapshotEnvironment {
  /** Get the version string for snapshot file headers. */
  getVersion(): string;

  /** Get the header comment for snapshot files. */
  getHeader(): string;

  /** Read the contents of a snapshot file. Returns empty string if not found. */
  readSnapshotFile(filepath: string): Promise<string>;

  /** Write content to a snapshot file, creating directories as needed. */
  saveSnapshotFile(filepath: string, content: string): Promise<void>;

  /** Resolve the snapshot file path for a given test file path. */
  resolveSnapshotPath(testPath: string): string;

  /** Remove a snapshot file. */
  removeSnapshotFile(filepath: string): Promise<void>;

  /** Ensure a directory exists, creating it recursively if needed. */
  prepareDirectory(dirPath: string): Promise<void>;
}

/**
 * Node.js implementation of SnapshotEnvironment using the fs module.
 */
export class NodeSnapshotEnvironment implements SnapshotEnvironment {
  private version: string;
  private snapshotDir: string;

  constructor(version = '1', snapshotDir = '__snapshots__') {
    // GHSA-wj89-8mc6-xpwx: Reject absolute paths or paths containing '..'
    if (path.isAbsolute(snapshotDir)) {
      throw new Error(
        `snapshotDir must be a relative path, got absolute: ${snapshotDir}`,
      );
    }
    const normalized = path.normalize(snapshotDir);
    if (normalized.includes('..')) {
      throw new Error(
        `snapshotDir must not contain path traversal (..): ${snapshotDir}`,
      );
    }
    this.version = version;
    this.snapshotDir = snapshotDir;
  }

  getVersion(): string {
    return this.version;
  }

  getHeader(): string {
    return `// Snapshot v${this.version}, https://nogginlessdom.asymmetric-effort.com`;
  }

  async readSnapshotFile(filepath: string): Promise<string> {
    try {
      return fs.readFileSync(filepath, 'utf-8');
    } catch {
      return '';
    }
  }

  async saveSnapshotFile(filepath: string, content: string): Promise<void> {
    // GHSA-wj89-8mc6-xpwx: Validate filepath does not contain path traversal
    const normalized = path.normalize(filepath);
    if (normalized.includes('..')) {
      throw new Error(
        `Snapshot file path must not contain path traversal (..): ${filepath}`,
      );
    }
    const resolved = path.resolve(filepath);
    // GHSA-vxqq-6phm-8778: Reject symlinks to prevent TOCTOU attacks
    try {
      const stat = fs.lstatSync(resolved);
      if (stat.isSymbolicLink()) {
        throw new Error(
          `Refusing to write snapshot to symlink target: ${filepath}`,
        );
      }
    } catch (err) {
      // File doesn't exist yet — that's fine, we'll create it
      if (
        err instanceof Error &&
        'code' in err &&
        (err as NodeJS.ErrnoException).code === 'ENOENT'
      ) {
        // OK — file will be created
      } else {
        throw err;
      }
    }
    const dir = path.dirname(resolved);
    await this.prepareDirectory(dir);
    fs.writeFileSync(resolved, content, 'utf-8');
  }

  resolveSnapshotPath(testPath: string): string {
    const basename = path.basename(testPath, path.extname(testPath));
    if (path.isAbsolute(this.snapshotDir)) {
      return path.join(this.snapshotDir, `${basename}.snap`);
    }
    const dir = path.dirname(testPath);
    return path.join(dir, this.snapshotDir, `${basename}.snap`);
  }

  async removeSnapshotFile(filepath: string): Promise<void> {
    try {
      fs.unlinkSync(filepath);
    } catch {
      // File may not exist, ignore
    }
  }

  async prepareDirectory(dirPath: string): Promise<void> {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }
}
