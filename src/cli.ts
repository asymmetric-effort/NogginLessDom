#!/usr/bin/env node

/**
 * NogginLessDom CLI — zero-dependency test runner entry point.
 * @module cli
 */

import { setTestNamePattern } from './test-runner/index.js';
import { configureReporters } from './test-runner/reporter.js';
import { startCoverage, stopCoverage } from './coverage/index.js';
import { watchTests } from './test-runner/watch.js';
import {
  detectCircularImports,
  formatCycleReport,
} from './test-runner/cycle-detection.js';
import { analyzeImportDepth } from './test-runner/depth-analysis.js';
import {
  detectUnusedImports,
  formatUnusedImportReport,
} from './test-runner/unused-imports.js';
import {
  buildDependencyGraph,
  exportGraphJSON,
  exportGraphDOT,
  exportGraphMermaid,
  saveGraph,
} from './test-runner/dependency-graph.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ParsedArgs {
  help: boolean;
  watch: boolean;
  reporter: string | undefined;
  coverage: boolean;
  filter: string | undefined;
  bail: boolean;
  subcommand: string | undefined;
  files: string[];
  /** For graph subcommand: output format */
  format: string | undefined;
  /** For graph subcommand: output file path */
  output: string | undefined;
}

const SUBCOMMANDS = ['cycles', 'depth', 'unused', 'graph'];

// ---------------------------------------------------------------------------
// Argument Parsing
// ---------------------------------------------------------------------------

export function parseArgs(argv: string[]): ParsedArgs {
  const result: ParsedArgs = {
    help: false,
    watch: false,
    reporter: undefined,
    coverage: false,
    filter: undefined,
    bail: false,
    subcommand: undefined,
    files: [],
    format: undefined,
    output: undefined,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] ?? '';

    if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg === '--watch' || arg === '-w') {
      result.watch = true;
    } else if (arg === '--coverage') {
      result.coverage = true;
    } else if (arg === '--bail' || arg === '-b') {
      result.bail = true;
    } else if (arg === '--reporter' || arg === '-r') {
      i++;
      result.reporter = argv[i];
    } else if (arg.startsWith('--reporter=')) {
      result.reporter = arg.substring('--reporter='.length);
    } else if (arg === '--filter' || arg === '-f') {
      i++;
      result.filter = argv[i];
    } else if (arg.startsWith('--filter=')) {
      result.filter = arg.substring('--filter='.length);
    } else if (arg === '--format') {
      i++;
      result.format = argv[i];
    } else if (arg.startsWith('--format=')) {
      result.format = arg.substring('--format='.length);
    } else if (arg === '--output' || arg === '-o') {
      i++;
      result.output = argv[i];
    } else if (arg.startsWith('--output=')) {
      result.output = arg.substring('--output='.length);
    } else if (arg !== '' && !arg.startsWith('-')) {
      // Positional argument: check for subcommand first
      if (!result.subcommand && SUBCOMMANDS.includes(arg)) {
        result.subcommand = arg;
      } else {
        result.files.push(arg);
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Help
// ---------------------------------------------------------------------------

export function showHelp(): void {
  const text = `
Usage: nogginlessdom [options] [subcommand] [files...]

Options:
  -h, --help              Show this help message
  -w, --watch             Watch files and re-run tests on changes
  -r, --reporter <name>   Set test reporter (default, verbose, dot, json, silent)
  --coverage              Enable code coverage collection
  -f, --filter <pattern>  Filter tests by name pattern (regex)
  -b, --bail              Stop on first test failure

Subcommands:
  cycles [files...]       Detect circular imports
  depth [files...]        Analyze import depth
  unused [files...]       Detect unused imports
  graph [files...]        Build and export dependency graph
    --format <fmt>        Graph output format: json, dot, mermaid (default: json)
    -o, --output <path>   Save graph to file instead of stdout

Examples:
  nogginlessdom                          Run all tests
  nogginlessdom --watch                  Run tests in watch mode
  nogginlessdom --coverage --bail        Run with coverage, stop on failure
  nogginlessdom --filter "auth"          Run tests matching "auth"
  nogginlessdom --reporter verbose       Use verbose reporter
  nogginlessdom cycles src/              Detect circular imports in src/
  nogginlessdom graph src/ --format dot  Export dependency graph as DOT
`.trimStart();

  process.stdout.write(text);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export async function main(args: ParsedArgs): Promise<void> {
  if (args.help) {
    showHelp();
    return;
  }

  // --- Subcommand handling ---
  if (args.subcommand === 'cycles') {
    const entryFiles = args.files.length > 0 ? args.files : ['.'];
    const cycles = detectCircularImports(entryFiles);
    const report = formatCycleReport(cycles);
    process.stdout.write(report + '\n');
    if (cycles.length > 0) {
      process.exitCode = 1;
    }
    return;
  }

  if (args.subcommand === 'depth') {
    const entryFiles = args.files.length > 0 ? args.files : ['.'];
    const result = analyzeImportDepth(entryFiles);
    process.stdout.write(`Max depth: ${result.maxDepth}\n`);
    process.stdout.write(`Average depth: ${result.averageDepth.toFixed(2)}\n`);
    if (result.filesExceedingThreshold.length > 0) {
      process.stdout.write(
        `Files exceeding threshold: ${result.filesExceedingThreshold.length}\n`,
      );
      for (const entry of result.filesExceedingThreshold) {
        process.stdout.write(`  ${entry.file}: depth ${entry.depth}\n`);
      }
    }
    return;
  }

  if (args.subcommand === 'unused') {
    const entryFiles = args.files.length > 0 ? args.files : ['.'];
    const unused = detectUnusedImports(entryFiles);
    const report = formatUnusedImportReport(unused);
    process.stdout.write(report + '\n');
    if (unused.length > 0) {
      process.exitCode = 1;
    }
    return;
  }

  if (args.subcommand === 'graph') {
    const entryFiles = args.files.length > 0 ? args.files : ['.'];
    const graph = buildDependencyGraph(entryFiles);
    const format = args.format ?? 'json';
    let output: string;

    if (format === 'dot') {
      output = exportGraphDOT(graph);
    } else if (format === 'mermaid') {
      output = exportGraphMermaid(graph);
    } else {
      output = exportGraphJSON(graph);
    }

    if (args.output) {
      saveGraph(entryFiles, args.output, {
        format: format as 'json' | 'dot' | 'mermaid',
      });
      process.stdout.write(`Graph saved to ${args.output}\n`);
    } else {
      process.stdout.write(output + '\n');
    }
    return;
  }

  // --- Test runner mode ---
  if (args.filter) {
    setTestNamePattern(args.filter);
  }

  if (args.reporter) {
    configureReporters({ reporter: args.reporter });
  }

  if (args.coverage) {
    await startCoverage();
  }

  if (args.watch) {
    const testRunnerFn = async (_files: string[]): Promise<void> => {
      // The test runner is invoked by bun; this is a placeholder for watch mode.
    };
    const watchInclude =
      args.files.length > 0 ? args.files : ['src/**', 'tests/**'];
    watchTests(testRunnerFn, { watchInclude });
    return;
  }

  // For non-watch mode, coverage is stopped when tests finish.
  // The actual test execution is handled by the node:test runner
  // which bun invokes. The CLI sets up configuration before tests run.

  if (args.coverage) {
    await stopCoverage();
  }

  if (args.bail) {
    process.env.NODE_TEST_BAIL = '1';
  }
}

// ---------------------------------------------------------------------------
// Auto-execute when run directly
// ---------------------------------------------------------------------------

const isDirectRun =
  process.argv[1]?.endsWith('cli.js') || process.argv[1]?.endsWith('cli.ts');

if (isDirectRun) {
  main(parseArgs(process.argv.slice(2))).catch((err: Error) => {
    process.stderr.write(`Error: ${err.message}\n`);
    process.exitCode = 1;
  });
}
