/**
 * Custom test reporter API for NogginLessDom.
 * Provides pluggable reporters for test output formatting.
 * @module test-runner/reporter
 */

import { writeFileSync, appendFileSync } from 'node:fs';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface TestEvent {
  name: string;
  suite?: string;
  file?: string;
  duration?: number;
  error?: Error;
  reason?: string;
}

export interface RunSummary {
  passed: number;
  failed: number;
  skipped: number;
  todo: number;
  duration: number;
}

export interface TestReporter {
  onSuiteStart?(event: TestEvent): void;
  onSuiteEnd?(event: TestEvent): void;
  onTestStart?(event: TestEvent): void;
  onTestPass?(event: TestEvent): void;
  onTestFail?(event: TestEvent): void;
  onTestSkip?(event: TestEvent): void;
  onTestTodo?(event: TestEvent): void;
  onRunStart?(info: { files: string[]; totalTests: number }): void;
  onRunEnd?(summary: RunSummary): void;
}

export interface ReporterOptions {
  outputFile?: string;
  colors?: boolean;
}

// ---------------------------------------------------------------------------
// Output helper
// ---------------------------------------------------------------------------

type WriteFn = (text: string) => void;

function makeWriter(options?: ReporterOptions): WriteFn {
  if (options?.outputFile) {
    const filePath = options.outputFile;
    // Truncate file on first call, then append
    let first = true;
    return (text: string): void => {
      if (first) {
        writeFileSync(filePath, text);
        first = false;
      } else {
        appendFileSync(filePath, text);
      }
    };
  }
  return (text: string): void => {
    process.stdout.write(text);
  };
}

function supportsColor(options?: ReporterOptions): boolean {
  if (options?.colors !== undefined) return options.colors;
  return process.stdout.isTTY === true;
}

function color(text: string, code: string, enabled: boolean): string {
  if (!enabled) return text;
  return `\x1b[${code}m${text}\x1b[0m`;
}

// ---------------------------------------------------------------------------
// Built-in Reporters
// ---------------------------------------------------------------------------

/**
 * DefaultReporter — passes through to console (current behavior).
 */
export class DefaultReporter implements TestReporter {
  private write: WriteFn;
  private useColor: boolean;

  constructor(options?: ReporterOptions) {
    this.write = makeWriter(options);
    this.useColor = supportsColor(options);
  }

  onTestPass(event: TestEvent): void {
    this.write(color(`  PASS `, '32', this.useColor) + `${event.name}\n`);
  }

  onTestFail(event: TestEvent): void {
    this.write(color(`  FAIL `, '31', this.useColor) + `${event.name}\n`);
    if (event.error) {
      this.write(`    ${event.error.message}\n`);
    }
  }

  onRunEnd(summary: RunSummary): void {
    this.write(
      `\nTests: ${summary.passed} passed, ${summary.failed} failed, ` +
        `${summary.skipped} skipped, ${summary.todo} todo\n` +
        `Duration: ${summary.duration}ms\n`,
    );
  }
}

/**
 * VerboseReporter — prints every test name with a check/cross and duration.
 */
export class VerboseReporter implements TestReporter {
  private write: WriteFn;
  private useColor: boolean;

  constructor(options?: ReporterOptions) {
    this.write = makeWriter(options);
    this.useColor = supportsColor(options);
  }

  onSuiteStart(event: TestEvent): void {
    this.write(`\n${event.name}\n`);
  }

  onTestPass(event: TestEvent): void {
    const dur = event.duration !== undefined ? ` (${event.duration}ms)` : '';
    this.write(
      color('  \u2713 ', '32', this.useColor) + `${event.name}${dur}\n`,
    );
  }

  onTestFail(event: TestEvent): void {
    const dur = event.duration !== undefined ? ` (${event.duration}ms)` : '';
    this.write(
      color('  \u2717 ', '31', this.useColor) + `${event.name}${dur}\n`,
    );
    if (event.error) {
      this.write(`    ${event.error.message}\n`);
    }
  }

  onTestSkip(event: TestEvent): void {
    this.write(
      color('  - ', '33', this.useColor) + `${event.name} (skipped)\n`,
    );
  }

  onTestTodo(event: TestEvent): void {
    this.write(
      color('  \u25CB ', '35', this.useColor) + `${event.name} (todo)\n`,
    );
  }

  onRunEnd(summary: RunSummary): void {
    this.write(
      `\nTests: ${summary.passed} passed, ${summary.failed} failed, ` +
        `${summary.skipped} skipped, ${summary.todo} todo\n` +
        `Duration: ${summary.duration}ms\n`,
    );
  }
}

/**
 * DotReporter — single character per test: `.` pass, `F` fail, `s` skip.
 */
export class DotReporter implements TestReporter {
  private write: WriteFn;
  private useColor: boolean;

  constructor(options?: ReporterOptions) {
    this.write = makeWriter(options);
    this.useColor = supportsColor(options);
  }

  onTestPass(_event: TestEvent): void {
    this.write(color('.', '32', this.useColor));
  }

  onTestFail(_event: TestEvent): void {
    this.write(color('F', '31', this.useColor));
  }

  onTestSkip(_event: TestEvent): void {
    this.write(color('s', '33', this.useColor));
  }

  onTestTodo(_event: TestEvent): void {
    this.write(color('t', '35', this.useColor));
  }

  onRunEnd(summary: RunSummary): void {
    this.write(
      `\n\nTests: ${summary.passed} passed, ${summary.failed} failed, ` +
        `${summary.skipped} skipped, ${summary.todo} todo\n` +
        `Duration: ${summary.duration}ms\n`,
    );
  }
}

/**
 * JsonReporter — NDJSON output (one JSON object per event, newline delimited).
 */
export class JsonReporter implements TestReporter {
  private write: WriteFn;

  constructor(options?: ReporterOptions) {
    this.write = makeWriter(options);
  }

  onSuiteStart(event: TestEvent): void {
    this.write(JSON.stringify({ type: 'suite:start', ...event }) + '\n');
  }

  onSuiteEnd(event: TestEvent): void {
    this.write(JSON.stringify({ type: 'suite:end', ...event }) + '\n');
  }

  onTestStart(event: TestEvent): void {
    this.write(JSON.stringify({ type: 'test:start', ...event }) + '\n');
  }

  onTestPass(event: TestEvent): void {
    this.write(JSON.stringify({ type: 'test:pass', ...event }) + '\n');
  }

  onTestFail(event: TestEvent): void {
    const serialized = {
      type: 'test:fail',
      ...event,
      error: event.error
        ? { message: event.error.message, stack: event.error.stack }
        : undefined,
    };
    this.write(JSON.stringify(serialized) + '\n');
  }

  onTestSkip(event: TestEvent): void {
    this.write(JSON.stringify({ type: 'test:skip', ...event }) + '\n');
  }

  onTestTodo(event: TestEvent): void {
    this.write(JSON.stringify({ type: 'test:todo', ...event }) + '\n');
  }

  onRunStart(info: { files: string[]; totalTests: number }): void {
    this.write(JSON.stringify({ type: 'run:start', ...info }) + '\n');
  }

  onRunEnd(summary: RunSummary): void {
    this.write(JSON.stringify({ type: 'run:end', ...summary }) + '\n');
  }
}

/**
 * SilentReporter — produces no output.
 */
export class SilentReporter implements TestReporter {
  // All methods intentionally omitted — no output
}

// ---------------------------------------------------------------------------
// Reporter Manager
// ---------------------------------------------------------------------------

/** Map of built-in reporter names to their constructors. */
const BUILTIN_REPORTERS: Record<
  string,
  new (options?: ReporterOptions) => TestReporter
> = {
  default: DefaultReporter,
  verbose: VerboseReporter,
  dot: DotReporter,
  json: JsonReporter,
  silent: SilentReporter,
};

/**
 * Manages a collection of reporters and dispatches test events to them.
 */
export class ReporterManager {
  private reporters: TestReporter[] = [];

  /**
   * Add a reporter by instance or by built-in name.
   */
  addReporter(reporter: TestReporter | string): void {
    if (typeof reporter === 'string') {
      this.reporters.push(ReporterManager.create(reporter));
    } else {
      this.reporters.push(reporter);
    }
  }

  /**
   * Remove a previously added reporter instance.
   */
  removeReporter(reporter: TestReporter): void {
    const idx = this.reporters.indexOf(reporter);
    if (idx !== -1) {
      this.reporters.splice(idx, 1);
    }
  }

  /**
   * Dispatch a named event to all registered reporters.
   * Catches and swallows errors from individual reporters so
   * a broken reporter never crashes the test run.
   */
  notify(event: string, data: unknown): void {
    for (const reporter of this.reporters) {
      try {
        const method = reporter[event as keyof TestReporter];
        if (typeof method === 'function') {
          (method as (data: unknown) => void).call(reporter, data);
        }
      } catch {
        // Swallow reporter errors — must never crash the test run
      }
    }
  }

  /**
   * Get a snapshot of the currently registered reporters.
   */
  getReporters(): TestReporter[] {
    return this.reporters.slice();
  }

  /**
   * Factory method to create a built-in reporter by name.
   * @throws {Error} if the name is not a known built-in reporter.
   */
  static create(name: string, options?: ReporterOptions): TestReporter {
    const Ctor = BUILTIN_REPORTERS[name];
    if (!Ctor) {
      throw new Error(
        `Unknown built-in reporter: "${name}". ` +
          `Available reporters: ${Object.keys(BUILTIN_REPORTERS).join(', ')}`,
      );
    }
    return new Ctor(options);
  }
}

// ---------------------------------------------------------------------------
// Global / singleton manager
// ---------------------------------------------------------------------------

let globalManager: ReporterManager | undefined;

/**
 * Get the global ReporterManager singleton.
 * Creates one with a DefaultReporter if none exists yet.
 */
export function getReporterManager(): ReporterManager {
  if (!globalManager) {
    globalManager = new ReporterManager();
    globalManager.addReporter(new DefaultReporter());
  }
  return globalManager;
}

/**
 * Configure the global reporter manager.
 * Replaces any previously configured reporters.
 */
export function configureReporters(config: {
  reporter?: string | TestReporter;
  reporters?: Array<string | TestReporter>;
  outputFile?: string;
}): void {
  const manager = new ReporterManager();

  if (config.reporters) {
    for (const r of config.reporters) {
      if (typeof r === 'string') {
        manager.addReporter(
          ReporterManager.create(r, { outputFile: config.outputFile }),
        );
      } else {
        manager.addReporter(r);
      }
    }
  } else if (config.reporter) {
    if (typeof config.reporter === 'string') {
      manager.addReporter(
        ReporterManager.create(config.reporter, {
          outputFile: config.outputFile,
        }),
      );
    } else {
      manager.addReporter(config.reporter);
    }
  }

  globalManager = manager;
}

/**
 * Reset the global reporter manager (useful for testing).
 */
export function resetReporterManager(): void {
  globalManager = undefined;
}
