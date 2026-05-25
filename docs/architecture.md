# Architecture

This document describes the internal architecture of NogginLessDom, including
module structure, design principles, the dependency graph, and the build
pipeline.

**v0.0.16** -- 58 source files, 31K+ lines of TypeScript, 2156 tests, zero
runtime dependencies, 9 dev dependencies.

## Design Principles

Every architectural decision in NogginLessDom is guided by these principles:

1. **Zero runtime dependencies.** The published package has an empty
   `dependencies` field. No third-party code ships to consumers. This is not
   aspirational -- it is a hard constraint enforced by CI and code review.

2. **Node built-ins only.** All functionality is built on top of `node:test`,
   `node:assert`, and standard Web/Node APIs. No polyfills, no shims, no
   vendored libraries.

3. **Security first.** The project exists because every dependency is an attack
   vector. DOM parsing never uses `eval()`, `new Function()`, or any form of
   dynamic code execution. HTML input is validated and sanitized through
   deterministic parsing, not regular expressions operating on untrusted input.

4. **API compatibility.** The public API follows widely adopted testing
   conventions. The function signatures and behavior match what developers
   expect from a modern testing framework, making adoption straightforward.

5. **Explicit over implicit.** The framework avoids magic globals, hidden
   configuration, and auto-detection. Behavior is controlled through explicit
   function calls and clearly documented options.

## Module Structure

NogginLessDom is organized into five core modules, each responsible for a
distinct concern. All modules are exported from the top-level `src/index.ts`
entry point.

### test-runner (`src/test-runner/`) -- 1 file, ~493 lines

Wraps the built-in `node:test` module to provide a comprehensive test runner
interface. Exports:

- `describe(name, fn)` -- Define a test suite with `skip`, `only`, `todo`,
  `concurrent`, `each`, `skipIf`, `runIf`, and `shuffle` modifiers.
- `it(name, fn, options?)` / `test` -- Define a test case with `skip`, `only`,
  `todo`, `concurrent`, `each`, `skipIf`, `runIf`, `fails`, `retry`, and
  `shuffle` modifiers.
- `beforeEach(fn)` / `afterEach(fn)` -- Per-test lifecycle hooks.
- `beforeAll(fn)` / `afterAll(fn)` -- Per-suite lifecycle hooks, mapped to
  `node:test`'s `before` and `after`.
- `onTestFailed(callback)` / `onTestFinished(callback)` -- Test lifecycle
  event callbacks.

The mapping layer is intentionally thin. NogginLessDom does not reimplement test
scheduling, parallel execution, or reporting -- it relies on the battle-tested
`node:test` infrastructure for all of that. Advanced features like `shuffle`
use a seeded Fisher-Yates algorithm for reproducible randomization.

### assertions (`src/assertions/`) -- 5 files, ~2,474 lines

Wraps `node:assert` to provide an `expect(value)` API with 30+ chainable
matchers. The module translates each matcher call into the corresponding
`node:assert` function:

- `toBe(expected)` maps to `assert.strictEqual`
- `toEqual(expected)` maps to `assert.deepStrictEqual` (with asymmetric
  matcher support)
- `toThrow()` maps to `assert.throws`
- Boolean/null matchers map to `assert.strictEqual` with the appropriate literal

Additional capabilities:

- **Object/collection matchers** -- `toMatchObject`, `toContainEqual`,
  `toSatisfy`, `toBeTypeOf`
- **Mock matchers** -- `toHaveBeenCalled`, `toHaveBeenCalledTimes`,
  `toHaveBeenCalledWith`, `toHaveBeenLastCalledWith`,
  `toHaveBeenNthCalledWith`, `toHaveBeenCalledOnce`, `toHaveReturned`,
  `toHaveReturnedTimes`, `toHaveReturnedWith`, `toHaveLastReturnedWith`
- **Snapshot matchers** -- `toMatchSnapshot`, `toMatchInlineSnapshot`,
  `toMatchFileSnapshot`, `toThrowErrorMatchingSnapshot`,
  `toThrowErrorMatchingInlineSnapshot`
- **Asymmetric matchers** -- `expect.anything()`, `expect.any()`,
  `expect.stringContaining()`, `expect.stringMatching()`,
  `expect.objectContaining()`, `expect.arrayContaining()`, plus negated
  variants via `expect.not.*`
- **Custom matchers** -- `expect.extend()` for user-defined matchers
- **Assertion tracking** -- `expect.assertions(n)`, `expect.hasAssertions()`,
  `expect.getState()`, `expect.resetState()`, `expect.verifyAssertions()`
- **Snapshot infrastructure** -- `SnapshotClient`, `SnapshotManager`,
  `SnapshotEnvironment`, custom serializers via `expect.addSnapshotSerializer()`

The `.not` modifier inverts assertions by delegating to `assert.notStrictEqual`,
`assert.notDeepStrictEqual`, and `assert.doesNotThrow` as appropriate.

Async matchers `.resolves` and `.rejects` unwrap promises before applying the
inner matcher, mapping to `assert.rejects` where applicable.

### dom (`src/dom/`) -- 25 files, ~7,244 lines

Provides a complete DOM environment for testing without third-party code. This is
the largest and most complex module. Key components:

**Core classes (`index.ts`, ~1,955 lines):**

- `Node` -- Base class for all DOM nodes with full tree manipulation API.
- `TextNode`, `Comment`, `DocumentFragment` -- Non-element node types.
- `Element` -- Full element implementation with attributes, events, queries,
  Shadow DOM, and tree manipulation.
- `Document` -- DOM tree root with element factory and tree-wide queries.
- `Event` -- Base event class with bubbling, capture, and propagation control.

**Typed HTML elements (`html-elements.ts`, ~1,125 lines):**

24 element classes: `HTMLAnchorElement`, `HTMLButtonElement`,
`HTMLInputElement`, `HTMLSelectElement`, `HTMLOptionElement`,
`HTMLTextAreaElement`, `HTMLFormElement`, `HTMLImageElement`,
`HTMLLabelElement`, `HTMLDialogElement`, `HTMLCanvasElement`,
`HTMLTemplateElement`, `HTMLIFrameElement`, `HTMLVideoElement`,
`HTMLAudioElement`, `HTMLProgressElement`, `HTMLMeterElement`,
`HTMLDetailsElement`, `HTMLTableElement`, `HTMLTableRowElement`,
`HTMLTableCellElement`, `HTMLFieldSetElement`, `HTMLScriptElement`,
`HTMLSlotElement`, plus `ValidityState`.

**Event system (`events.ts`, ~549 lines):**

19 specialized event classes: `CustomEvent`, `MouseEvent`, `KeyboardEvent`,
`FocusEvent`, `InputEvent`, `WheelEvent`, `PointerEvent`, `TouchEvent`,
`DragEvent`, `ClipboardEvent`, `TransitionEvent`, `AnimationEvent`,
`ErrorEvent`, `MessageEvent`, `StorageEvent`, `PopStateEvent`,
`ProgressEvent`, `HashChangeEvent`, `BeforeUnloadEvent`.

**Window environment (`window.ts`, ~876 lines):**

`Window`, `Storage`, `Location`, `History`, `Navigator`, `MediaQueryList`,
`Request`, `Response`, `createWindow()` factory.

**CSS selector engine (`selector.ts`, ~501 lines):**

Full selector matching with tag, class, ID, attribute, combinators, and
pseudo-class support.

**Other DOM modules:**

- `collections.ts` (~140 lines) -- `NodeList`, `HTMLCollection`
- `shadow.ts` (~62 lines) -- `ShadowRoot`
- `custom-elements.ts` (~92 lines) -- `CustomElementRegistry`
- `mutation-observer.ts` (~267 lines) -- `MutationObserver`, `MutationRecord`
- `intersection-observer.ts` (~127 lines) -- `IntersectionObserver`
- `resize-observer.ts` (~105 lines) -- `ResizeObserver`
- `style.ts` (~163 lines) -- `CSSStyleDeclaration`
- `token-list.ts` (~130 lines) -- `DOMTokenList`
- `tree-walker.ts` (~456 lines) -- `TreeWalker`, `NodeIterator`, `NodeFilter`
- `range.ts` (~573 lines) -- `Range`
- `selection.ts` (~140 lines) -- `Selection`
- `html-parser.ts` (~200 lines) -- HTML string parser
- `html-serializer.ts` (~78 lines) -- Node-to-HTML serialization
- `dom-parser.ts` (~44 lines) -- `DOMParser`, `XMLSerializer`
- `cookie.ts` (~119 lines) -- `CookieJar`
- `form-data.ts` (~107 lines) -- `FormData`
- `headers.ts` (~127 lines) -- `Headers`
- `data-transfer.ts` (~108 lines) -- `DataTransfer`, `DataTransferItemList`
- `abort.ts` (~140 lines) -- `AbortController`, `AbortSignal`
- `web-apis.ts` (~57 lines) -- `atob`, `btoa`, `TextEncoder`, `TextDecoder`,
  `Blob`, `structuredClone`, `queueMicrotask`, `crypto`

### mocking (`src/mocking/`) -- 2 files, ~1,109 lines

Provides spy, stub, timer mocking, module mocking, and utility functions:

- **`fn(impl?)`** -- Create a mock function with full call/result tracking,
  `mock.instances`, `mock.contexts`, chained return values, resolved/rejected
  promise helpers, `withImplementation()`, and naming.
- **`spyOn(obj, method, accessorType?)`** -- Spy on methods or property
  accessors (getters/setters).
- **`MockInstance`** -- Full interface for mock metadata and control.
- **Timer mocking** -- `useFakeTimers(options?)` returns a `FakeTimerController`
  with `advanceTimersByTime`, `advanceTimersToNextTimer`, `runAllTimers`,
  `runOnlyPendingTimers`, `setSystemTime`, `getTimerCount`, and async variants.
  Full `Date` constructor and `Date.now()` mocking. Selective API faking via
  `toFake` option.
- **Module mocking** -- `mock.module()`, `mock.doMock()`, `mock.importActual()`,
  `mock.importMock()`, `mock.require()`, `mock.unmock()`, `mock.doUnmock()`,
  `mock.resetModules()`, `mock.getMockedModule()`, `mock.hoisted()`.
- **Global stubbing** -- `stubGlobal()`, `unstubAllGlobals()`.
- **Env stubbing** -- `stubEnv()`, `unstubAllEnvs()`.
- **Bulk operations** -- `clearAllMocks()`, `resetAllMocks()`,
  `restoreAllMocks()`.
- **Async utilities** -- `waitFor()`, `waitUntil()` with configurable timeout
  and interval.
- **Type utilities** -- `mocked()` identity function for TypeScript narrowing,
  `isMockFunction()` type guard.
- **`vi` namespace** -- Single object combining all mocking utilities for
  convenience.

### coverage (`src/coverage/`) -- 15 files, ~4,662 lines

Provides code coverage collection, analysis, and reporting:

- **Providers** -- V8 coverage provider (`v8-provider.ts`) and Istanbul
  coverage provider (`istanbul-provider.ts`).
- **V8-to-Istanbul conversion** (`v8-to-istanbul.ts`) -- Translates V8's
  function-based coverage format to Istanbul's line/statement/branch format.
- **Coverage map** (`coverage-map.ts`) -- Core data structure for file coverage
  data with merge support.
- **Source map support** (`source-map.ts`) -- Maps coverage data back to
  original source positions.
- **Configuration** (`config.ts`, `nyc-config.ts`) -- Coverage configuration
  resolution and NYC config compatibility.
- **Thresholds** (`thresholds.ts`) -- Configurable coverage thresholds with
  enforcement.
- **Filtering** (`filter.ts`, `ignore.ts`) -- File inclusion/exclusion and
  istanbul ignore comment parsing.
- **Changed files** (`changed.ts`) -- Coverage for changed files only.
- **Per-test tracking** -- `startTestCoverage()`, `stopTestCoverage()`,
  `getTestCoverage()`, `getAllTestCoverage()`.

**11 coverage reporters** (`reporters/`):

| Reporter             | Output                              |
| -------------------- | ----------------------------------- |
| `TextReporter`       | Terminal table output               |
| `TextSummaryReporter`| Condensed terminal summary          |
| `JsonReporter`       | JSON coverage data                  |
| `JsonSummaryReporter`| JSON coverage summary               |
| `LcovReporter`       | LCOV format with optional HTML      |
| `LcovOnlyReporter`   | LCOV format without HTML            |
| `HtmlReporter`       | Full HTML coverage report           |
| `HtmlSpaReporter`    | Single-page application HTML report |
| `CloverReporter`     | Clover XML format                   |
| `CoberturaReporter`  | Cobertura XML format                |
| `TeamcityReporter`   | TeamCity service messages           |

## Dependency Graph

```text
src/index.ts
  |
  +-- src/test-runner/    -->  node:test
  |
  +-- src/assertions/     -->  node:assert, node:fs (snapshots)
  |
  +-- src/dom/            -->  (no external deps; pure implementation)
  |
  +-- src/mocking/        -->  (no external deps; pure implementation)
  |
  +-- src/coverage/       -->  node:fs, node:path, node:inspector (V8 coverage)
```

The test-runner and assertions modules depend on Node.js built-in modules. The
DOM and mocking modules are entirely self-contained with zero imports outside
the project. The coverage module uses Node.js file system and inspector APIs.

There are no cross-dependencies between the five modules. Each can be imported
and used independently.

## Build Pipeline

The build process is driven by `make build` and consists of two stages:

```text
TypeScript Source (src/)
        |
        v
  bun build src/index.ts --outdir build --target node
        |
        v
  JavaScript output (build/*.js)
        |
        v
  tsc --emitDeclarationOnly
        |
        v
  Type declarations (build/*.d.ts) + declaration maps + source maps
```

### Build Artifacts

| Artifact               | Description                               |
| ---------------------- | ----------------------------------------- |
| `build/index.js`       | Bundled JavaScript, ESM format            |
| `build/index.d.ts`     | TypeScript type declarations              |
| `build/*.d.ts.map`     | Declaration source maps                   |
| `build/*.js.map`       | JavaScript source maps                    |

### Build Targets

| Make Target      | Description                                                 |
| ---------------- | ----------------------------------------------------------- |
| `make build`     | Clean build: removes `build/`, compiles, emits              |
| `make clean`     | Removes `build/` directory and Docker artifacts             |
| `make lint`      | Runs markdownlint, eslint, yamllint, jsonlint, prettier     |
| `make test`      | Runs unit, integration, and e2e test suites                 |
| `make setup`     | Install dependencies and git hooks                          |

### CI Pipeline

The CI pipeline runs `make lint`, `make test`, and `make build` in sequence.
CodeQL static analysis runs on every push and on a weekly schedule. Dependabot
monitors dev dependencies for known vulnerabilities.

### Dev Dependencies (9)

| Package                              | Purpose                           |
| ------------------------------------ | --------------------------------- |
| `@asymmetric-effort/jsonlint`        | JSON linting                      |
| `@asymmetric-effort/yamllint`        | YAML linting                      |
| `@typescript-eslint/eslint-plugin`   | TypeScript ESLint rules           |
| `@typescript-eslint/parser`          | TypeScript ESLint parser          |
| `bun-types`                          | Bun runtime type definitions      |
| `eslint`                             | JavaScript/TypeScript linting     |
| `markdownlint-cli`                   | Markdown linting                  |
| `prettier`                           | Code formatting                   |
| `typescript`                         | TypeScript compiler               |
