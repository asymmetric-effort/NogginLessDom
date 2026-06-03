# Coverage API Reference

The coverage module provides code coverage collection, reporting, threshold
enforcement, baseline tracking, and integration with V8 and Istanbul providers.

```typescript
import {
  startCoverage, takeCoverage, stopCoverage, reportCoverage,
  checkCoverageThresholds,
} from '@asymmetric-effort/nogginlessdom';
```

---

## Quick Start

```typescript
import {
  startCoverage,
  takeCoverage,
  stopCoverage,
} from '@asymmetric-effort/nogginlessdom';

// Start collecting coverage
await startCoverage({
  provider: 'v8',
  reporter: ['text', 'json'],
  reportsDirectory: './coverage',
});

// Run your tests...

// Take a snapshot without stopping
const snapshot = await takeCoverage();
console.log(snapshot.summary.lines.pct);

// Stop collection and generate reports
const result = await stopCoverage();
console.log(result.summary);

if (result.thresholdResult && !result.thresholdResult.passed) {
  console.error('Coverage thresholds not met:', result.thresholdResult.failures);
}
```

---

## Coverage Lifecycle

### startCoverage

Starts code coverage collection. Throws if collection is already active.

```typescript
await startCoverage(config?: Partial<CoverageConfig>): Promise<void>
```

Behavior:

1. Resolves configuration by merging defaults with provided config
2. Cleans the reports directory if `clean` is true
3. Initializes the coverage provider (V8, Istanbul, or custom)
4. If `changed` is set, determines the changed file list via git

### takeCoverage

Takes a coverage snapshot without stopping collection. Can be called multiple
times.

```typescript
await takeCoverage(): Promise<CoverageResult>
```

Returns a `CoverageResult` with `coverageMap`, `summary`, and optionally
`thresholdResult`.

### stopCoverage

Stops coverage collection, generates reports, and returns the final results.

```typescript
await stopCoverage(): Promise<CoverageResult>
```

Additional behavior beyond `takeCoverage`:

- Auto-updates thresholds if `thresholds.autoUpdate` is true
- Skips report generation if thresholds failed and `reportOnFailure` is false

### reportCoverage

Generates coverage reports from an existing `CoverageMap` without requiring
active collection.

```typescript
await reportCoverage(
  coverageMap: CoverageMap,
  config?: Partial<CoverageConfig>,
): Promise<void>
```

### checkCoverageThresholds

Checks a coverage summary against configured thresholds.

```typescript
const result = checkCoverageThresholds(summary, thresholds);
// result.passed: boolean
// result.failures: Array<{ metric, actual, expected }>
```

---

## CoverageResult

```typescript
interface CoverageResult {
  coverageMap: CoverageMap;
  summary: CoverageSummary;
  thresholdResult?: ThresholdResult;
}

interface ThresholdResult {
  passed: boolean;
  failures: ThresholdFailure[];
}

interface ThresholdFailure {
  metric: string;   // 'lines', 'functions', 'branches', 'statements'
  actual: number;    // actual percentage
  expected: number;  // configured threshold
}
```

---

## Providers

### V8 Provider (default)

Uses the Node.js inspector API (`node:inspector/promises`) for precise,
low-overhead coverage. Collects statement, function, and branch coverage from
V8's internal counters.

```typescript
await startCoverage({ provider: 'v8' });
```

Silently degrades if the V8 inspector is not available (e.g., in Bun).

### Istanbul Provider

Uses Istanbul-style instrumentation for coverage collection. Useful when V8
coverage is not available or when you need Istanbul-compatible output.

```typescript
await startCoverage({ provider: 'istanbul' });
```

Supports IPC-based coverage merging for parallel test execution via
`sendCoverageToParent` and `receiveCoverageFromWorker`.

### Custom Provider

Provide a path to a module that exports a `createProvider()` function. The
module must be within the project directory.

```typescript
await startCoverage({
  customProviderModule: './my-coverage-provider.ts',
});
```

The custom provider module must export:

```typescript
export function createProvider(): {
  start(): Promise<void>;
  take(): Promise<V8ScriptCoverage[]>;
  stop(): Promise<V8ScriptCoverage[]>;
};
```

---

## Reporters

NogginLessDom includes 12 built-in reporters. Configure one or more via the
`reporter` array.

```typescript
await startCoverage({
  reporter: ['text', 'json', 'lcov'],
});
```

### Available Reporters

| Reporter | Output | Description |
|---|---|---|
| `text` | stdout | Human-readable table to the console |
| `text-summary` | stdout | Condensed summary line |
| `json` | `coverage-final.json` | Full coverage data in JSON format |
| `json-summary` | `coverage-summary.json` | Summary-only JSON |
| `lcov` | `lcov.info` + HTML | LCOV format with HTML report |
| `lcovonly` | `lcov.info` | LCOV format without HTML |
| `html` | `index.html` + files | Multi-page HTML report |
| `html-spa` | `index.html` | Single-page HTML app |
| `cobertura` | `cobertura-coverage.xml` | Cobertura XML format (CI integration) |
| `clover` | `clover.xml` | Clover XML format (Atlassian tools) |
| `teamcity` | stdout | TeamCity service messages |
| `none` | -- | No output (for threshold-only checks) |

### Reporter Options

All reporters receive:

```typescript
interface ReporterOptions {
  reportsDirectory: string;
  skipFull?: boolean;        // skip files with 100% coverage
  watermarks?: {
    lines: [number, number];
    functions: [number, number];
    branches: [number, number];
    statements: [number, number];
  };
}
```

Watermarks control color coding: values below the first number are red, between
the two numbers are yellow, and above the second number are green.

---

## Thresholds

### Configuration

```typescript
await startCoverage({
  thresholds: {
    lines: 80,
    functions: 75,
    branches: 70,
    statements: 80,
  },
});
```

### The 100 Shorthand

Set all metrics to 100% with a single flag:

```typescript
thresholds: { 100: true }
// Equivalent to: lines: 100, functions: 100, branches: 100, statements: 100
```

Individual metrics can override the shorthand:

```typescript
thresholds: { 100: true, branches: 90 }
// lines: 100, functions: 100, branches: 90, statements: 100
```

### Per-file Thresholds

Enable per-file checking so every file must individually meet the thresholds:

```typescript
thresholds: {
  perFile: true,
  lines: 80,
}
```

### Glob-pattern Thresholds

Set different thresholds for specific file patterns:

```typescript
thresholds: {
  lines: 80,
  glob: {
    'src/utils/**': { lines: 95, branches: 90 },
    'src/legacy/**': { lines: 50 },
  },
}
```

Glob-specific thresholds override the base thresholds for matching files.

### autoUpdate

When enabled, automatically writes a `.coveragethresholds.json` file in the
reports directory whenever coverage improves beyond the configured thresholds.

```typescript
thresholds: {
  lines: 80,
  autoUpdate: true,
}
```

### reportOnFailure

Controls whether reports are generated when thresholds fail:

```typescript
await startCoverage({
  thresholds: { lines: 90 },
  reportOnFailure: false,  // skip reports when thresholds fail
});
```

---

## Baselines

Baselines allow tracking coverage over time and detecting regressions.

### saveBaseline

Saves the current coverage as a baseline file.

```typescript
import { saveBaseline } from '@asymmetric-effort/nogginlessdom';

saveBaseline(coverageMap);
// Writes to ./coverage/.baseline.json

saveBaseline(coverageMap, './custom-path.json');
```

### loadBaseline

Loads a previously saved baseline. Returns null if the file does not exist.

```typescript
import { loadBaseline } from '@asymmetric-effort/nogginlessdom';

const baseline = loadBaseline();
if (baseline) {
  console.log(baseline.version);    // 1
  console.log(baseline.timestamp);  // ISO date string
  console.log(baseline.summary);    // { [filePath]: { lines, functions, branches, statements } }
}
```

### diffBaseline

Computes the difference between current coverage and a saved baseline.

```typescript
import { diffBaseline } from '@asymmetric-effort/nogginlessdom';

const baseline = loadBaseline();
const diff = diffBaseline(currentCoverageMap, baseline);

diff.improved;   // [{ file, metric, from, to }]
diff.regressed;  // [{ file, metric, from, to }]
diff.added;      // [filePath, ...] (new files)
diff.removed;    // [filePath, ...] (deleted files)
diff.unchanged;  // [filePath, ...]
```

### Baseline History

Track baselines over time with automatic rotation.

```typescript
import {
  saveBaselineHistory,
  loadBaselineHistory,
} from '@asymmetric-effort/nogginlessdom';

// Append current baseline to history (keeps last 50 entries by default)
saveBaselineHistory(baseline);
saveBaselineHistory(baseline, './history.json', 100); // custom path and max

// Load all history entries
const history = loadBaselineHistory();
// Returns CoverageBaseline[]
```

---

## Changed Files

Filter coverage to only include files changed in git, useful for incremental
CI coverage checks.

```typescript
await startCoverage({
  changed: true,          // diff against HEAD (uncommitted changes)
});

await startCoverage({
  changed: 'main',        // diff against main...HEAD
});
```

### getChangedFiles

Low-level function to get the list of changed files.

```typescript
import { getChangedFiles } from '@asymmetric-effort/nogginlessdom';

const files = getChangedFiles();          // uncommitted changes
const files2 = getChangedFiles('main');   // changes since main
```

---

## Ignore Directives

Source code comments can exclude lines, blocks, and files from coverage.

### Supported Directives

All three directive prefixes are recognized: `v8`, `istanbul`, and `c8`.

#### Ignore Next Line

```typescript
/* v8 ignore next */
unreachableLine();

/* istanbul ignore next */
anotherLine();

/* c8 ignore next */
yetAnother();

/* v8 ignore next -- reason for ignoring */
withReason();
```

#### Ignore Next N Lines

```typescript
/* v8 ignore next 3 */
line1();
line2();
line3();
```

#### Ignore Block (Start/Stop)

```typescript
/* v8 ignore start */
function legacyCode() {
  // all lines ignored
}
/* v8 ignore stop */
```

#### Ignore Entire File

```typescript
/* istanbul ignore file */
```

#### Ignore Class

```typescript
/* istanbul ignore class -- legacy */
class LegacyAdapter {
  // entire class ignored
}
```

#### Ignore If / Else Branches

```typescript
/* istanbul ignore if */
if (rareBranch) { ... }

/* istanbul ignore else */
if (common) { ... } else { ... }
```

### ignoreClassMethods

Exclude specific class method names from function coverage:

```typescript
await startCoverage({
  ignoreClassMethods: ['toString', 'valueOf'],
});
```

---

## Parallel Processing

Control the number of files processed concurrently during V8 coverage
transformation.

```typescript
await startCoverage({
  processingConcurrency: 4,  // process 4 files at a time (default: 1)
});
```

The async variant `processV8CoverageBatchedAsync` uses `Promise.all` for true
parallel processing.

---

## Configuration Reference

### CoverageConfig

```typescript
interface CoverageConfig {
  enabled?: boolean;              // Enable coverage (default: false)
  provider?: 'v8' | 'istanbul';  // Coverage provider (default: 'v8')
  include?: string[];             // Glob patterns to include
  exclude?: string[];             // Glob patterns to exclude
  reportsDirectory?: string;      // Output directory (default: './coverage')
  reporter?: string[];            // Reporter names (default: ['text', 'json'])
  clean?: boolean;                // Clean reports dir before run (default: true)
  thresholds?: CoverageThresholds;
  watermarks?: CoverageWatermarks;
  skipFull?: boolean;             // Skip 100% covered files in reports
  all?: boolean;                  // Include uncovered files (default: false)
  cleanOnRerun?: boolean;         // Clean on re-run (default: true)
  allowExternal?: boolean;        // Allow files outside project root
  extension?: string[];           // File extensions (default: ['.ts','.js','.tsx','.jsx'])
  reportOnFailure?: boolean;      // Generate reports even when thresholds fail
  processingConcurrency?: number; // Files processed in parallel (default: 1)
  changed?: boolean | string;     // Filter to git-changed files
  customProviderModule?: string;  // Path to custom provider module
  ignoreClassMethods?: string[];  // Method names to exclude
}
```

### Default Include Patterns

```text
**/*.{ts,tsx,js,jsx,mts,mjs,cts,cjs}
```

### Default Exclude Patterns

```text
**/node_modules/**
**/test/**
**/tests/**
**/*.test.*
**/*.spec.*
**/coverage/**
**/build/**
**/dist/**
```

### CoverageThresholds

```typescript
interface CoverageThresholds {
  lines?: number;
  functions?: number;
  branches?: number;
  statements?: number;
  perFile?: boolean;
  100?: boolean;          // set all to 100%
  autoUpdate?: boolean;   // auto-update threshold file on improvement
  glob?: Record<string, GlobThresholds>;
}
```

### CoverageWatermarks

```typescript
interface CoverageWatermarks {
  lines?: [number, number];      // default: [50, 80]
  functions?: [number, number];  // default: [50, 80]
  branches?: [number, number];   // default: [50, 80]
  statements?: [number, number]; // default: [50, 80]
}
```

### CoverageSummary

```typescript
interface CoverageSummary {
  lines: { total: number; covered: number; pct: number };
  functions: { total: number; covered: number; pct: number };
  branches: { total: number; covered: number; pct: number };
  statements: { total: number; covered: number; pct: number };
}
```

### CoverageMap

```typescript
class CoverageMap {
  addFileCoverage(fc: FileCoverage): void;
  fileCoverageFor(filePath: string): FileCoverage;
  files(): string[];
  filter(predicate: (filePath: string) => boolean): void;
  toSummary(): CoverageSummary;
}
```

Serialization:

```typescript
import {
  serializeCoverageMap,
  deserializeCoverageMap,
  mergeCoverageMaps,
} from '@asymmetric-effort/nogginlessdom';

const json = serializeCoverageMap(map);
const restored = deserializeCoverageMap(json);
const merged = mergeCoverageMaps([mapA, mapB]);
```

---

## Per-test Coverage Tracking

Track which lines each test covers.

```typescript
import {
  startTestCoverage,
  stopTestCoverage,
  getTestCoverage,
  getAllTestCoverage,
} from '@asymmetric-effort/nogginlessdom';

// Before the test
startTestCoverage('my test name', currentCoverageMap);

// Run test...

// After the test
const delta = stopTestCoverage('my test name', currentCoverageMap);
// delta is a CoverageMap with only the coverage accumulated during the test

// Retrieve later
const coverage = getTestCoverage('my test name');
const all = getAllTestCoverage(); // Map<string, CoverageMap>
```

---

## Additional Exports

### Source Maps

```typescript
import {
  loadSourceMap,
  SourceMapConsumer,
} from '@asymmetric-effort/nogginlessdom';
```

### Istanbul IPC Integration

For parallel test runners using worker processes:

```typescript
import {
  sendCoverageToParent,
  receiveCoverageFromWorker,
} from '@asymmetric-effort/nogginlessdom';
```

### NYC Config Loading

```typescript
import { loadNycConfig } from '@asymmetric-effort/nogginlessdom';
const config = loadNycConfig();
```

### File Filtering

```typescript
import { shouldIncludeFile, matchesPattern } from '@asymmetric-effort/nogginlessdom';

shouldIncludeFile('src/utils/helper.ts', resolvedConfig); // true/false
matchesPattern('src/utils/helper.ts', 'src/utils/**');     // true
```

### Utility Functions

```typescript
import {
  cleanReportsDirectory,
  validateReportsDirectory,
  collectUncoveredFiles,
} from '@asymmetric-effort/nogginlessdom';
```
