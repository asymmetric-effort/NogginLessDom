# Architecture

This document describes the internal architecture of NogginLessDom, including
the zero-dependency philosophy, module structure, dependency graph, build
pipeline, and security design.

**v0.0.25** -- 80 source files, 28K+ lines of TypeScript, 3100+ tests, zero
runtime dependencies, 9 dev dependencies.

## Overview

NogginLessDom is a testing framework built entirely on Node.js built-in
modules. The published package has an empty `dependencies` field. No
third-party code ships to consumers.

This is not aspirational -- it is a hard constraint enforced by CI, code
review, and automated checks. Every algorithm, parser, and data structure is
implemented from scratch. The framework wraps `node:test` and `node:assert`
for test execution and assertion foundations, then builds everything else
(DOM simulation, mocking, coverage, snapshot testing, dependency analysis)
as pure TypeScript with no external imports.

### Design Principles

1. **Zero runtime dependencies.** The `dependencies` field is `{}`. No
   third-party code ships to consumers.
2. **Node built-ins only.** Built on `node:test`, `node:assert`, and standard
   Node.js APIs. No polyfills, shims, or vendored libraries.
3. **Security first.** No `eval()`, `new Function()`, or dynamic code
   execution. HTML input is validated through deterministic parsing.
4. **API compatibility.** Public API follows widely adopted testing conventions
   for straightforward adoption.
5. **Explicit over implicit.** No magic globals, hidden configuration, or
   auto-detection. Behavior is controlled through explicit function calls.

## Module Dependency Graph

The framework is organized into six core modules. All are exported from
`src/index.ts`.

```text
src/index.ts
  |
  +-- src/test-runner/    -->  node:test
  |     (test execution, lifecycle, reporters, watch, dependency analysis)
  |
  +-- src/assertions/     -->  node:assert, node:fs (snapshots)
  |     (expect, matchers, asymmetric matchers, snapshots, diff)
  |
  +-- src/dom/            -->  (no external deps; pure implementation)
  |     (Document, Element, events, window, CSS, observers, canvas,
  |      SVG, IndexedDB, workers, WebSocket, and more)
  |
  +-- src/mocking/        -->  (no external deps; pure implementation)
  |     (fn, spyOn, vi, fake timers, module mocking, global stubbing)
  |
  +-- src/coverage/       -->  node:fs, node:path, node:inspector
  |     (V8/Istanbul providers, reporters, thresholds, source maps)
  |
  +-- src/hoist/          -->  (no external deps; regex-based transform)
        (mock hoisting for ESM compatibility)
```

There are no cross-dependencies between the six modules. Each can be imported
and used independently.

## Test Runner Module

**Location:** `src/test-runner/`

Wraps the built-in `node:test` module to provide a comprehensive test runner
interface.

| File                  | Responsibility                                           |
| --------------------- | -------------------------------------------------------- |
| `index.ts`            | `describe`, `it`, `test`, lifecycle hooks, and modifiers |
| `reporter.ts`         | `ReporterManager` and five built-in reporters            |
| `watch.ts`            | File watching, import graph building, glob matching      |
| `cycle-detection.ts`  | Circular import detection with configurable strictness   |
| `depth-analysis.ts`   | Import chain depth analysis                              |
| `unused-imports.ts`   | Unused import detection                                  |
| `dependency-graph.ts` | Dependency graph building with JSON, DOT, Mermaid export |

The mapping layer to `node:test` is intentionally thin. NogginLessDom does not
reimplement test scheduling, parallel execution, or native reporting -- it
relies on the battle-tested `node:test` infrastructure. Advanced features like
`shuffle` use a seeded Fisher-Yates algorithm for reproducible randomization.

## Assertions Module

**Location:** `src/assertions/`

Wraps `node:assert` to provide an `expect(value)` API with 30+ chainable
matchers.

| File            | Responsibility                                             |
| --------------- | ---------------------------------------------------------- |
| `index.ts`      | `expect()`, all matchers, `.not`, `.resolves`, `.rejects`  |
| `asymmetric.ts` | Asymmetric matchers and negated variants                   |
| `snapshot.ts`   | `SnapshotClient`, `SnapshotManager`, `SnapshotEnvironment` |
| `diff.ts`       | `objectDiff`, `stringDiff`, ANSI error formatting          |
| `extend.ts`     | `expect.extend()` for user-defined matchers                |

Each matcher call translates to the corresponding `node:assert` function:

- `toBe(expected)` maps to `assert.strictEqual`
- `toEqual(expected)` maps to `assert.deepStrictEqual`
- `toThrow()` maps to `assert.throws`
- `.not` delegates to `assert.notStrictEqual`, `assert.notDeepStrictEqual`,
  `assert.doesNotThrow`
- `.resolves` / `.rejects` unwrap promises before applying the inner matcher

## DOM Module

**Location:** `src/dom/`

The largest module. Provides a complete DOM environment for testing without any
third-party code.

### Core

| File       | Contents                                                       |
| ---------- | -------------------------------------------------------------- |
| `index.ts` | `Node`, `Element`, `Document`, `DocumentFragment`, `TextNode`, |
|            | `Comment`, `Event`, `NodeList`, `HTMLCollection`,              |
|            | `DOMTokenList`, `CSSStyleDeclaration`, `TreeWalker`,           |
|            | `NodeIterator`                                                 |

### HTML Elements

| File               | Contents                                           |
| ------------------ | -------------------------------------------------- |
| `html-elements.ts` | 29 typed HTML element classes plus `ValidityState` |

### Events

| File        | Contents                                                    |
| ----------- | ----------------------------------------------------------- |
| `events.ts` | 20 event classes including `CustomEvent`, `MouseEvent`,     |
|             | `KeyboardEvent`, `FocusEvent`, `PointerEvent`, `DragEvent`, |
|             | `ClipboardEvent`, and more                                  |

### Window and Browser APIs

| File             | Contents                                                 |
| ---------------- | -------------------------------------------------------- |
| `window.ts`      | `Window`, `Storage`, `Location`, `History`, `Navigator`, |
|                  | `Clipboard`, `Permissions`, `MediaQueryList`, `Request`, |
|                  | `Response`, `createWindow()`                             |
| `performance.ts` | `Performance`, `PerformanceObserver`                     |
| `animation.ts`   | `Animation`, `KeyframeEffect`, `AnimationTimeline`       |
| `websocket.ts`   | `WebSocket`, `CloseEvent`, `WSMessageEvent`              |
| `workers.ts`     | `Worker`, `SharedWorker`, `MessagePort`,                 |
|                  | `ServiceWorkerContainer`, `ServiceWorker`                |
| `indexeddb.ts`   | `IDBFactory`, `IDBDatabase`, `IDBObjectStore`,           |
|                  | `IDBTransaction`, `IDBRequest`, `IDBIndex`, `IDBCursor`, |
|                  | `IDBKeyRange`                                            |
| `xhr.ts`         | `XMLHttpRequest`                                         |
| `media-query.ts` | `parseMediaQuery`, `evaluateMediaQuery`                  |

### DOM Infrastructure

| File                       | Contents                                      |
| -------------------------- | --------------------------------------------- |
| `selector.ts`              | CSS selector engine with combinators and      |
|                            | pseudo-classes                                |
| `collections.ts`           | `NodeList`, `HTMLCollection`                  |
| `shadow.ts`                | `ShadowRoot`                                  |
| `custom-elements.ts`       | `CustomElementRegistry`                       |
| `mutation-observer.ts`     | `MutationObserver`, `MutationRecord`          |
| `intersection-observer.ts` | `IntersectionObserver`                        |
| `resize-observer.ts`       | `ResizeObserver`                              |
| `style.ts`                 | `CSSStyleDeclaration`                         |
| `token-list.ts`            | `DOMTokenList`                                |
| `tree-walker.ts`           | `TreeWalker`, `NodeIterator`, `NodeFilter`    |
| `range.ts`                 | `Range`                                       |
| `selection.ts`             | `Selection`                                   |
| `css-cascade.ts`           | CSS parsing, specificity, cascade, shorthand  |
|                            | expansion                                     |
| `svg.ts`                   | SVG element classes (`SVGSVGElement`,         |
|                            | `SVGPathElement`, `SVGCircleElement`, etc.)   |
| `canvas.ts`                | `CanvasRenderingContext2D`, `CanvasGradient`, |
|                            | `ImageData`                                   |

### Data and Parsing

| File                 | Contents                                      |
| -------------------- | --------------------------------------------- |
| `html-parser.ts`     | HTML string parser                            |
| `html-serializer.ts` | Node-to-HTML serialization                    |
| `dom-parser.ts`      | `DOMParser`, `XMLSerializer`                  |
| `form-data.ts`       | `FormData`                                    |
| `blob.ts`            | `Blob`                                        |
| `headers.ts`         | `Headers`                                     |
| `cookie.ts`          | `CookieJar`                                   |
| `data-transfer.ts`   | `DataTransfer`, `DataTransferItemList`        |
| `abort.ts`           | `AbortController`, `AbortSignal`              |
| `web-apis.ts`        | `atob`, `btoa`, `TextEncoder`, `TextDecoder`, |
|                      | `structuredClone`, `crypto`                   |

## Mocking Module

**Location:** `src/mocking/`

Provides spy, stub, timer mocking, module mocking, and utility functions.

| File       | Responsibility                                               |
| ---------- | ------------------------------------------------------------ |
| `index.ts` | `fn()`, `spyOn()`, timer mocking, module mocking, global/env |
|            | stubbing, bulk operations, async utilities                   |
| `vi.ts`    | `vi` convenience namespace combining all mocking utilities   |

Key capabilities:

- **Mock functions** with full call/result tracking, chained return values,
  promise helpers, and `withImplementation()`
- **Spy on methods and accessors** (getters/setters)
- **Fake timers** with `advanceTimersByTime`, `runAllTimers`,
  `setSystemTime`, and full `Date` constructor mocking
- **Module mocking** with `mock.module()`, `mock.doMock()`, and
  `mock.hoisted()` for ESM compatibility
- **Global stubbing** with `stubGlobal()` and env stubbing with `stubEnv()`
- **Async utilities** with `waitFor()` and `waitUntil()`

## Coverage Module

**Location:** `src/coverage/`

Provides code coverage collection, analysis, and reporting.

| File                   | Responsibility                                       |
| ---------------------- | ---------------------------------------------------- |
| `index.ts`             | Public API (`startCoverage`, `takeCoverage`,         |
|                        | `stopCoverage`, `reportCoverage`,                    |
|                        | `checkCoverageThresholds`)                           |
| `v8-provider.ts`       | V8 coverage provider using `node:inspector`          |
| `istanbul-provider.ts` | Istanbul instrumentation-based coverage provider     |
| `v8-to-istanbul.ts`    | V8-to-Istanbul format conversion                     |
| `coverage-map.ts`      | Core data structure for file coverage with merge     |
| `source-map.ts`        | Maps coverage data back to original source positions |
| `config.ts`            | Coverage configuration resolution                    |
| `nyc-config.ts`        | NYC config compatibility                             |
| `thresholds.ts`        | Configurable coverage thresholds with enforcement    |
| `filter.ts`            | File inclusion/exclusion filtering                   |
| `ignore.ts`            | Istanbul ignore comment parsing                      |
| `changed.ts`           | Coverage for changed files only                      |
| `reporters/`           | 11 reporter implementations                          |

## Hoist Module

**Location:** `src/hoist/`

Reorders top-level mock calls (`mock.module()`, `vi.mock()`, `vi.hoisted()`)
so they appear before all import declarations. This is necessary for ESM
because import bindings are evaluated before any module-level statements
execute.

| File            | Responsibility                                         |
| --------------- | ------------------------------------------------------ |
| `index.ts`      | `hoistMocks()` -- regex-based source transform         |
| `bun-plugin.ts` | Bun build plugin that applies hoisting during bundling |

The implementation is intentionally regex-based (no AST parser) to preserve the
zero-dependency constraint.

## Build Pipeline

The build process is driven by `make build` and consists of two stages:

```text
TypeScript Source (src/)
        |
        v
  bun build src/index.ts --outdir build --target node
        |
        v
  JavaScript output (build/index.js, ESM format)
        |
        v
  tsc --emitDeclarationOnly
        |
        v
  Type declarations (build/*.d.ts) + source maps
```

### Build Artifacts

| Artifact           | Description                    |
| ------------------ | ------------------------------ |
| `build/index.js`   | Bundled JavaScript, ESM format |
| `build/index.d.ts` | TypeScript type declarations   |
| `build/*.d.ts.map` | Declaration source maps        |
| `build/*.js.map`   | JavaScript source maps         |

### Make Targets

| Target       | Description                                                 |
| ------------ | ----------------------------------------------------------- |
| `make build` | Clean build: removes `build/`, compiles, emits declarations |
| `make clean` | Removes `build/` directory and Docker artifacts             |
| `make lint`  | Runs markdownlint, eslint, yamllint, jsonlint, prettier     |
| `make test`  | Runs unit, integration, and e2e test suites                 |
| `make setup` | Install dependencies and git hooks                          |

### CI Pipeline

The CI pipeline runs `make lint`, `make test`, and `make build` in sequence.
CodeQL static analysis runs on every push and on a weekly schedule. Dependabot
monitors dev dependencies for known vulnerabilities.

### Dev Dependencies (9)

| Package                            | Purpose                       |
| ---------------------------------- | ----------------------------- |
| `@asymmetric-effort/jsonlint`      | JSON linting                  |
| `@asymmetric-effort/yamllint`      | YAML linting                  |
| `@typescript-eslint/eslint-plugin` | TypeScript ESLint rules       |
| `@typescript-eslint/parser`        | TypeScript ESLint parser      |
| `bun-types`                        | Bun runtime type definitions  |
| `eslint`                           | JavaScript/TypeScript linting |
| `markdownlint-cli`                 | Markdown linting              |
| `prettier`                         | Code formatting               |
| `typescript`                       | TypeScript compiler           |

## Security Design

NogginLessDom's security posture stems from architectural decisions, not
bolt-on hardening.

### Zero Dependencies

The `dependencies` field is `{}`. There is no transitive dependency tree to
audit, no packages that can be hijacked, and no supply chain to monitor. This
eliminates entire categories of attacks: package takeovers, typosquatting,
malicious updates, and dependency confusion.

### No Dynamic Code Execution

The DOM module parses HTML without `eval()`, `new Function()`, or any form of
dynamic code execution. HTML input is validated and sanitized through
deterministic parsing algorithms, not regular expressions operating on
untrusted input.

### Path Validation

File operations in the coverage and snapshot modules validate paths before
access. Path traversal attacks (e.g., `../../etc/passwd`) and symlink-based
escapes are detected and rejected.

### Version Validation

The release pipeline validates that `VERSION` matches the semver pattern
`^[0-9]+\.[0-9]+\.[0-9]+$` before proceeding, preventing injection through
the version string (GHSA-482x-9gr3-8prm).

### Minimal Published Surface

The published package contains only the compiled output (`build/`),
`LICENSE.txt`, and `README.md`. Source code, tests, documentation, and build
configuration are excluded, reducing the surface area available for analysis
by potential attackers.
