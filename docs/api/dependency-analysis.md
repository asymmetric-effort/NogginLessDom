# Dependency Analysis

NogginLessDom includes built-in tools for analyzing your project's import
structure. These tools detect circular dependencies, measure import depth,
find unused imports, and build dependency graphs.

All functions are available from the top-level package import:

```typescript
import {
  // Cycle detection
  detectCircularImports,
  formatCycleReport,
  buildForwardGraph,
  configureCycleDetection,
  getCycleDetectionConfig,
  resetCycleDetectionConfig,

  // Depth analysis
  analyzeImportDepth,
  configureDepthCheck,
  getDepthCheckConfig,
  resetDepthCheckConfig,

  // Unused imports
  detectUnusedImports,
  formatUnusedImportReport,
  configureUnusedImportDetection,
  getUnusedImportConfig,
  resetUnusedImportConfig,

  // Dependency graphs
  buildDependencyGraph,
  exportGraphJSON,
  exportGraphDOT,
  exportGraphMermaid,
  saveGraph,
} from '@asymmetric-effort/nogginlessdom';
```

## Circular Dependency Detection

Detect circular import chains that cause initialization issues and break
module mocking.

### `detectCircularImports(entryFiles, options?)`

Scans files starting from `entryFiles` and returns an array of detected
circular dependencies.

```typescript
const cycles = detectCircularImports(['src/index.ts'], {
  cwd: process.cwd(),
  exclude: ['node_modules'],
  maxCycles: 50,
});
```

**Parameters:**

- `entryFiles: string[]` — files to start analysis from
- `options.cwd?: string` — working directory (default: `process.cwd()`)
- `options.exclude?: string[]` — patterns to exclude
- `options.maxCycles?: number` — maximum cycles to detect (default: 50)

**Returns:** `CircularDependency[]`

```typescript
interface CircularDependency {
  cycle: string[];      // ordered file chain forming the cycle
  files: Set<string>;   // unique files involved
}
```

### `formatCycleReport(cycles)`

Formats detected cycles into a human-readable report string.

```typescript
const report = formatCycleReport(cycles);
console.log(report);
```

### `buildForwardGraph(entryFiles, options?)`

Builds a forward dependency graph (file → files it imports). Only includes
relative imports; bare specifiers and `node:` built-ins are skipped.

```typescript
const graph = buildForwardGraph(['src/index.ts']);
// Map<string, Set<string>>
```

### Configuration

```typescript
configureCycleDetection({
  enabled: true,
  strict: false,
  exclude: ['**/*.test.ts'],
  maxCycles: 100,
});
```

**Environment variable:** `DETECT_CYCLES`

- `1` or `true` — warn on cycles (continues test run)
- `strict` — fail on cycles (exits before running tests)

## Import Depth Analysis

Measure how deep your import chains go and identify files with excessive
nesting.

### `analyzeImportDepth(entryFiles, options?)`

Computes the longest import chain depth for each file.

```typescript
const result = analyzeImportDepth(['src/index.ts'], {
  cwd: process.cwd(),
  exclude: [],
  threshold: 10,
});
```

**Parameters:**

- `entryFiles: string[]` — files to analyze
- `options.threshold?: number` — depth threshold for flagging (default: Infinity)

**Returns:** `DepthAnalysisResult`

```typescript
interface DepthAnalysisResult {
  entries: DepthAnalysis[];
  maxDepth: number;
  averageDepth: number;
  filesExceedingThreshold: DepthAnalysis[];
}

interface DepthAnalysis {
  file: string;
  depth: number;
  chain: string[];
  directImports: number;
  transitiveImports: number;
}
```

### Configuration

```typescript
configureDepthCheck({
  threshold: 10,
  strict: false,
  exclude: [],
});
```

**Environment variable:** `IMPORT_DEPTH_THRESHOLD`

- `N` — warn if any file exceeds depth N
- `N:strict` — fail if any file exceeds depth N

## Unused Import Detection

Find imports that are declared but never used in your source code.

### `detectUnusedImports(files, options?)`

```typescript
const unused = detectUnusedImports(['src/index.ts'], {
  cwd: process.cwd(),
  exclude: [],
  ignoreTypeImports: false,
  ignoreSideEffectImports: true,
});
```

**Returns:** `UnusedImport[]`

### `formatUnusedImportReport(unused)`

Formats unused imports into a human-readable report.

```typescript
const report = formatUnusedImportReport(unused);
console.log(report);
```

### Configuration

```typescript
configureUnusedImportDetection({
  enabled: true,
  strict: false,
  exclude: [],
  ignoreTypeImports: false,
  ignoreSideEffectImports: true,
});
```

**Environment variable:** `DETECT_UNUSED_IMPORTS`

- `1` or `true` — warn on unused imports
- `strict` — fail on unused imports

## Dependency Graphs

Build a full dependency graph and export it in multiple formats.

### `buildDependencyGraph(entryFiles, options?)`

```typescript
const graph = buildDependencyGraph(['src/index.ts'], {
  cwd: process.cwd(),
  exclude: [],
  includeMetadata: false,
  relativePaths: true,
});
```

**Returns:** `DependencyGraph`

```typescript
interface DependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  summary: {
    totalFiles: number;
    totalEdges: number;
    maxDepth: number;
    averageImports: number;
    cycleCount: number;
    leafCount: number;
    hubFiles: string[];
  };
}
```

### Export Formats

```typescript
// JSON string
const json = exportGraphJSON(graph);

// Graphviz DOT format
const dot = exportGraphDOT(graph);

// Mermaid diagram format
const mermaid = exportGraphMermaid(graph);
```

### `saveGraph(entryFiles, outputPath, options?)`

Builds and saves a dependency graph to a file in one step.

```typescript
saveGraph(['src/index.ts'], 'deps.json', { format: 'json' });
saveGraph(['src/index.ts'], 'deps.dot', { format: 'dot' });
saveGraph(['src/index.ts'], 'deps.md', { format: 'mermaid' });
```

**Environment variable:** `EXPORT_DEPENDENCY_GRAPH`

Set to a file path to automatically export the graph during test runs. The
format is inferred from the file extension (`.json`, `.dot`, `.mmd`).

## CLI Usage

All dependency analysis tools are available via the CLI:

```bash
nogginlessdom cycles src/
nogginlessdom depth src/
nogginlessdom unused src/
nogginlessdom graph src/ --format dot -o deps.dot
```

See the [CLI Reference](cli.md) for full details.
