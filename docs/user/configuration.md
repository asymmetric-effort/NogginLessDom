# Configuration

NogginLessDom is designed to work with minimal configuration. Most settings are
managed through Bun's configuration file (`bunfig.toml`), standard TypeScript
configuration, and environment variables.

## Test File Patterns

By default, Bun discovers test files matching these patterns:

- `**/*.test.ts`
- `**/*.test.tsx`
- `**/*.spec.ts`
- `**/*.spec.tsx`

Files in `node_modules/` are excluded. You can override test file discovery
by passing explicit paths:

```bash
# Run tests in a specific directory
bun test tests/unit

# Run a specific test file
bun test tests/unit/assertions/expect.test.ts

# Run multiple specific files
bun test tests/unit/dom/element.test.ts tests/unit/dom/document.test.ts
```

### Programmatic Test File Filtering

You can set a file pattern programmatically:

```typescript
import {
  setTestFilePattern,
  clearTestFilePattern,
  getTestFilePattern,
} from '@asymmetric-effort/nogginlessdom';

// Only run test files matching this glob
setTestFilePattern('**/dom/**/*.test.ts');

// Check current pattern
console.log(getTestFilePattern());

// Clear the pattern
clearTestFilePattern();
```

## TypeScript Configuration

NogginLessDom targets ESNext and uses ESM modules. Your `tsconfig.json` should
be compatible with these settings:

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true
  }
}
```

If you are using Bun, add `bun-types` to your `types` array for full runtime
type support:

```json
{
  "compilerOptions": {
    "types": ["bun-types"]
  }
}
```

NogginLessDom ships with TypeScript type declarations (`*.d.ts`). No additional
`@types/` packages are needed.

## Coverage Configuration

Coverage is configured in `bunfig.toml` at the project root.

### Basic Coverage

```toml
[test]
coverage = true
```

### Coverage Thresholds

Set minimum coverage percentages. The test run fails if any threshold is not
met:

```toml
[test]
coverage = true
coverageThreshold = { line = 90, function = 90, statement = 90 }
```

| Threshold Field | Description                              |
| --------------- | ---------------------------------------- |
| `line`          | Minimum percentage of lines covered      |
| `function`      | Minimum percentage of functions covered  |
| `statement`     | Minimum percentage of statements covered |

### Coverage Providers

NogginLessDom supports two coverage providers:

- **V8** -- Uses the V8 JavaScript engine's built-in coverage instrumentation.
  Fast and accurate for Node.js and Bun environments.
- **Istanbul** -- Traditional instrumentation-based coverage. Useful for
  compatibility with existing toolchains.

### Coverage Reporters

The framework includes 11 coverage reporters:

| Reporter       | Description                         |
| -------------- | ----------------------------------- |
| `text`         | Terminal table output               |
| `text-summary` | Condensed terminal summary          |
| `json`         | JSON coverage data                  |
| `json-summary` | JSON coverage summary               |
| `lcov`         | LCOV format with optional HTML      |
| `lcov-only`    | LCOV format without HTML            |
| `html`         | Full HTML coverage report           |
| `html-spa`     | Single-page application HTML report |
| `clover`       | Clover XML format                   |
| `cobertura`    | Cobertura XML format                |
| `teamcity`     | TeamCity service messages           |

### Per-Test Coverage

Track coverage on a per-test basis using the programmatic API:

```typescript
import {
  startCoverage,
  takeCoverage,
  stopCoverage,
  reportCoverage,
} from '@asymmetric-effort/nogginlessdom';

startCoverage();
// ... run code under test ...
const data = takeCoverage();
stopCoverage();
reportCoverage(data);
```

## Reporter Configuration

NogginLessDom provides built-in test reporters that can be configured
programmatically:

```typescript
import {
  configureReporters,
  DefaultReporter,
  VerboseReporter,
  DotReporter,
  JsonReporter,
  SilentReporter,
} from '@asymmetric-effort/nogginlessdom';
```

### Available Reporters

| Reporter          | Description                                    |
| ----------------- | ---------------------------------------------- |
| `DefaultReporter` | Standard output with pass/fail indicators      |
| `VerboseReporter` | Detailed output with timing and nested suites  |
| `DotReporter`     | Minimal dot-per-test output for CI             |
| `JsonReporter`    | Machine-readable JSON output                   |
| `SilentReporter`  | Suppresses all output (useful for programmatic |
|                   | use)                                           |

### Bun Test Reporters

You can also use Bun's built-in reporter flags:

```bash
# Default reporter
bun test

# JUnit reporter (for CI systems)
bun test --reporter junit

# Custom reporter module
bun test --reporter ./reporters/custom.ts
```

## Watch Mode Configuration

Re-run tests automatically when files change:

```bash
bun test --watch
```

You can configure watch mode in `bunfig.toml`:

```toml
[test]
# watch = false
```

Combine watch mode with test filtering for focused development:

```bash
bun test --watch --grep "DOM element"
```

### Programmatic Watch API

```typescript
import { watchTests } from '@asymmetric-effort/nogginlessdom';

const controller = watchTests({
  // Watch options
});
```

## Test Filtering

### Command-Line Filtering

```bash
# Run tests matching a name pattern
bun test --grep "should handle"

# Run tests in a specific file
bun test path/to/file.test.ts

# Run tests in a specific directory
bun test tests/unit/dom
```

### Programmatic Name Filtering

```typescript
import {
  setTestNamePattern,
  clearTestNamePattern,
  getTestNamePattern,
} from '@asymmetric-effort/nogginlessdom';

// Only run tests whose names match this regex
setTestNamePattern(/DOM.*element/i);

// Check current pattern
console.log(getTestNamePattern());

// Clear the filter
clearTestNamePattern();
```

### Test Modifiers

Filter tests directly in your test code:

```typescript
import { describe, it } from '@asymmetric-effort/nogginlessdom';

describe('Feature', () => {
  it('runs normally', () => { /* ... */ });
  it.skip('is skipped', () => { /* ... */ });
  it.only('runs exclusively', () => { /* ... */ });
  it.todo('is planned for later');
});
```

Conditional execution:

```typescript
import { describe, it } from '@asymmetric-effort/nogginlessdom';

const isCI = process.env.CI === 'true';

describe('Platform tests', () => {
  it.skipIf(isCI)('skipped in CI', () => { /* ... */ });
  it.runIf(!isCI)('only runs locally', () => { /* ... */ });
});
```

## Mock Auto-Cleanup Configuration

Configure how mock functions are automatically cleaned up between tests:

```typescript
import {
  configureMockBehavior,
  getMockConfig,
} from '@asymmetric-effort/nogginlessdom';

configureMockBehavior({
  // Configuration options for mock behavior
});

// Check current mock configuration
const config = getMockConfig();
```

### Auto-Cleanup with Lifecycle Hooks

Install automatic mock cleanup in your test setup:

```typescript
import { installAutoMockCleanup } from '@asymmetric-effort/nogginlessdom';

// Automatically restore all mocks after each test
installAutoMockCleanup();
```

This registers `afterEach` hooks that call `restoreAllMocks()` so mocks do not
leak between tests.

## Test Isolation Configuration

Control how tests are isolated from each other:

```typescript
import { configureIsolation } from '@asymmetric-effort/nogginlessdom';
import type { IsolationConfig } from '@asymmetric-effort/nogginlessdom';

const config: IsolationConfig = {
  // Isolation settings
};

configureIsolation(config);
```

## Serial Execution

Force tests to run sequentially instead of concurrently:

```typescript
import {
  setSerialMode,
  getSerialMode,
} from '@asymmetric-effort/nogginlessdom';

// Enable serial execution
setSerialMode(true);

// Check current mode
console.log(getSerialMode()); // true
```

This is useful when tests share state or interact with resources that do not
support concurrent access.

## Test Setup Files

Run setup code before all tests by creating a preload file:

```toml
[test]
preload = ["./tests/setup.ts"]
```

Example `tests/setup.ts`:

```typescript
import {
  Document,
  installAutoMockCleanup,
} from '@asymmetric-effort/nogginlessdom';

// Auto-cleanup mocks after each test
installAutoMockCleanup();

// Create a global document available to all tests
globalThis.testDocument = new Document();
```

## DOM Configuration

The DOM simulation does not require configuration for basic use. Simply import
and instantiate:

```typescript
import { Document } from '@asymmetric-effort/nogginlessdom';

const doc = new Document();
```

### Shared Document via Lifecycle Hooks

```typescript
import {
  describe,
  beforeEach,
  Document,
} from '@asymmetric-effort/nogginlessdom';

describe('Component Tests', () => {
  let doc: Document;

  beforeEach(() => {
    doc = new Document();
    const root = doc.createElement('div');
    root.id = 'root';
    doc.appendChild(root);
  });

  // tests use `doc` here...
});
```

### innerHTML for Complex Structures

```typescript
const container = doc.createElement('div');
container.innerHTML = `
  <header>
    <nav>
      <a href="/">Home</a>
      <a href="/about">About</a>
    </nav>
  </header>
  <main>
    <h1>Welcome</h1>
  </main>
`;
doc.appendChild(container);
```

## Dependency Analysis

NogginLessDom includes built-in tools for analyzing your project's import
structure. These can be enabled via environment variables or the programmatic
API.

### Circular Dependency Detection

Detect circular import chains that cause initialization issues and break
module mocking.

```bash
# Warn on cycles (continues test run)
DETECT_CYCLES=1 bun test

# Fail on cycles (exits before running tests)
DETECT_CYCLES=strict bun test
```

Programmatic API:

```typescript
import {
  detectCircularImports,
  formatCycleReport,
  configureCycleDetection,
} from '@asymmetric-effort/nogginlessdom';

// Detect cycles in specific files
const cycles = detectCircularImports(['src/index.ts']);
if (cycles.length > 0) {
  console.log(formatCycleReport(cycles));
}

// Enable during test runs
configureCycleDetection({ enabled: true, strict: true });
```

### Import Depth Analysis

Analyze the depth of your import chains to catch barrel file explosion and
deeply nested module structures.

```bash
# Warn if any file exceeds depth 8
IMPORT_DEPTH_THRESHOLD=8 bun test

# Strict mode
IMPORT_DEPTH_THRESHOLD=8:strict bun test
```

Programmatic API:

```typescript
import { analyzeImportDepth } from '@asymmetric-effort/nogginlessdom';

const result = analyzeImportDepth(['src/index.ts'], { threshold: 10 });
console.log('Max depth:', result.maxDepth);
console.log('Average depth:', result.averageDepth.toFixed(1));
for (const entry of result.filesExceedingThreshold) {
  console.log(`  ${entry.file}: depth ${entry.depth}`);
  console.log(`    Chain: ${entry.longestChain.join(' -> ')}`);
}
```

### Unused Import Detection

Find imports that are declared but never referenced in your source files.

```bash
# Warn on unused imports
DETECT_UNUSED_IMPORTS=1 bun test

# Fail on unused imports
DETECT_UNUSED_IMPORTS=strict bun test
```

Programmatic API:

```typescript
import {
  detectUnusedImports,
  formatUnusedImportReport,
} from '@asymmetric-effort/nogginlessdom';

const unused = detectUnusedImports(['src/**/*.ts']);
if (unused.length > 0) {
  console.log(formatUnusedImportReport(unused));
}
```

Configuration options:

```typescript
import {
  configureUnusedImportDetection,
} from '@asymmetric-effort/nogginlessdom';

configureUnusedImportDetection({
  enabled: true,
  strict: false,
  ignoreTypeImports: true,
  ignoreSideEffectImports: true,
  exclude: ['**/*.d.ts'],
});
```

### Dependency Graph Visualization

Export your project's import graph for visualization and analysis.

```bash
# Write JSON graph after tests
EXPORT_DEPENDENCY_GRAPH=deps.json bun test

# Generate Graphviz DOT
EXPORT_DEPENDENCY_GRAPH=deps.dot bun test

# Generate Mermaid
EXPORT_DEPENDENCY_GRAPH=deps.mmd bun test
```

Programmatic API:

```typescript
import {
  buildDependencyGraph,
  exportGraphJSON,
  exportGraphDOT,
  exportGraphMermaid,
  saveGraph,
} from '@asymmetric-effort/nogginlessdom';
import * as fs from 'node:fs';

const graph = buildDependencyGraph(['src/index.ts']);

// JSON export
fs.writeFileSync('deps.json', exportGraphJSON(graph, true));

// Graphviz (render with: dot -Tpng deps.dot -o deps.png)
fs.writeFileSync('deps.dot', exportGraphDOT(graph));

// Mermaid (paste into GitHub markdown)
console.log(exportGraphMermaid(graph));

// Save directly to a file (format inferred from extension)
saveGraph(graph, 'deps.json');

// Summary
console.log('Files:', graph.summary.totalFiles);
console.log('Max depth:', graph.summary.maxDepth);
console.log('Cycles:', graph.summary.cycleCount);
console.log('Hub files:', graph.summary.hubFiles.join(', '));
```

## Environment Variables Reference

| Variable                  | Values          | Description                                                  |
| ------------------------- | --------------- | ------------------------------------------------------------ |
| `NODE_ENV`                | `test`          | Set to `test` during test runs (Bun default)                 |
| `CI`                      | `true`          | Set in CI environments; can affect reporter and snapshot     |
|                           |                 | behavior                                                     |
| `BUN_DEBUG`               | `true`          | Enable Bun debug output                                      |
| `DETECT_CYCLES`           | `1`, `strict`   | Enable circular dependency detection; `strict` fails the run |
| `IMPORT_DEPTH_THRESHOLD`  | `N`, `N:strict` | Warn or fail if import depth exceeds N                       |
| `DETECT_UNUSED_IMPORTS`   | `1`, `strict`   | Enable unused import detection; `strict` fails the run       |
| `EXPORT_DEPENDENCY_GRAPH` | file path       | Export dependency graph to the given file (JSON, DOT, or     |
|                           |                 | Mermaid based on extension)                                  |
