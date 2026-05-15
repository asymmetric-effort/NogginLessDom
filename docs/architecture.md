# Architecture

This document describes the internal architecture of NogginLessDom, including
module structure, design principles, the dependency graph, and the build
pipeline.

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

4. **API compatibility.** The public API mirrors vitest and jsdom as closely as
   possible. Users migrating from those tools should find the transition
   straightforward, with identical function signatures and equivalent behavior.

5. **Explicit over implicit.** The framework avoids magic globals, hidden
   configuration, and auto-detection. Behavior is controlled through explicit
   function calls and clearly documented options.

## Module Structure

NogginLessDom is organized into four core modules, each responsible for a
distinct concern. All modules are exported from the top-level `src/index.ts`
entry point.

### test-runner (`src/test-runner/`)

Wraps the built-in `node:test` module to provide a vitest-compatible test runner
interface. Exports:

- `describe(name, fn)` -- Define a test suite. Delegates to `node:test`'s
  `describe`.
- `it(name, fn, options?)` -- Define a test case. Delegates to `node:test`'s
  `it` with option mapping for `skip`, `only`, `todo`, and `timeout`.
- `test` -- Alias for `it`.
- `beforeEach(fn)` / `afterEach(fn)` -- Per-test lifecycle hooks.
- `beforeAll(fn)` / `afterAll(fn)` -- Per-suite lifecycle hooks, mapped to
  `node:test`'s `before` and `after`.

The mapping layer is intentionally thin. NogginLessDom does not reimplement test
scheduling, parallel execution, or reporting -- it relies on the battle-tested
`node:test` infrastructure for all of that.

### assertions (`src/assertions/`)

Wraps `node:assert` to provide an `expect(value)` API with chainable matchers.
The module translates each matcher call into the corresponding `node:assert`
function:

- `toBe(expected)` maps to `assert.strictEqual`
- `toEqual(expected)` maps to `assert.deepStrictEqual`
- `toThrow()` maps to `assert.throws`
- Boolean/null matchers map to `assert.strictEqual` with the appropriate literal

The `.not` modifier inverts assertions by delegating to `assert.notStrictEqual`,
`assert.notDeepStrictEqual`, and `assert.doesNotThrow` as appropriate.

Async matchers `.resolves` and `.rejects` unwrap promises before applying the
inner matcher, mapping to `assert.rejects` where applicable.

### dom (`src/dom/`)

Provides a jsdom-equivalent DOM simulation without any third-party code. This is
the largest and most complex module. Key classes:

- **`Document`** -- The root of the DOM tree. Supports `createElement`,
  `createTextNode`, `getElementById`, `querySelector`, and `querySelectorAll`.

- **`Element`** -- Represents an HTML element. Supports attributes
  (`getAttribute`, `setAttribute`, `removeAttribute`, `hasAttribute`), event
  handling (`addEventListener`, `removeEventListener`, `dispatchEvent`),
  tree queries (`querySelector`, `querySelectorAll`, `getElementsByTagName`,
  `getElementsByClassName`), and properties (`innerHTML`, `outerHTML`, `id`,
  `className`, `tagName`, `classList`).

- **`Node`** -- Base class for all DOM nodes. Provides `appendChild`,
  `removeChild`, `textContent`, `childNodes`, `parentNode`, `cloneNode`,
  `nodeType`, and `nodeName`.

- **`TextNode`** -- Represents a text node with `textContent` and `nodeType`.

- **`Event`** -- Represents a DOM event with `type`, `bubbles`, `cancelable`,
  `preventDefault()`, and `stopPropagation()`.

The DOM module implements CSS selector matching for `querySelector` and
`querySelectorAll`, supporting tag selectors, class selectors, ID selectors,
attribute selectors, and combinators.

### mocking (`src/mocking/`)

Provides spy, stub, and timer mocking utilities:

- **`fn(impl?)`** -- Create a mock function, optionally with an initial
  implementation.
- **`spyOn(obj, method)`** -- Spy on an existing object method.
- **`MockInstance`** -- Interface for mock metadata (`mock.calls`,
  `mock.results`, `mock.lastCall`) and control (`mockReturnValue`,
  `mockImplementation`, `mockClear`, `mockReset`, `mockRestore`).
- **Timer mocking** -- `useFakeTimers(now?)`, `useRealTimers()`,
  `advanceTimersByTime(ms)`, `runAllTimers()`.

Timer mocking intercepts `setTimeout`, `setInterval`, and `clearTimeout` at the
global level and provides deterministic control over time progression.

## Dependency Graph

```text
src/index.ts
  |
  +-- src/test-runner/    -->  node:test
  |
  +-- src/assertions/     -->  node:assert
  |
  +-- src/dom/            -->  (no external deps; pure implementation)
  |
  +-- src/mocking/        -->  (no external deps; pure implementation)
```

The test-runner and assertions modules depend on Node.js built-in modules. The
DOM and mocking modules are entirely self-contained with zero imports outside
the project.

There are no cross-dependencies between the four modules. Each can be imported
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

| Make Target      | Description                                     |
| ---------------- | ----------------------------------------------- |
| `make build`     | Clean build: removes `build/`, compiles, emits  |
| `make clean`     | Removes `build/` directory and Docker artifacts |
| `make lint`      | Runs markdownlint, eslint, and prettier         |
| `make test`      | Runs unit, integration, and e2e test suites     |

### CI Pipeline

The CI pipeline runs `make lint`, `make test`, and `make build` in sequence.
CodeQL static analysis runs on every push and on a weekly schedule. Dependabot
monitors dev dependencies for known vulnerabilities.
