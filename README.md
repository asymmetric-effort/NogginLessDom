<!-- markdownlint-disable MD041 -->
<img src="logo.png" alt="NogginLessDom" width="64" align="left" style="margin-right: 12px;" />

# NogginLessDom

A zero-dependency testing framework built on `node:test` and `node:assert`.

<br clear="both" />

## Overview

NogginLessDom is a comprehensive testing framework for Node.js that provides a
full-featured test runner, assertion library, DOM simulation, mocking
utilities, code coverage, and snapshot testing -- all with **zero runtime
dependencies**. Every algorithm is implemented from scratch using only Node.js
built-in modules (`node:test`, `node:assert`, `node:fs`).

By eliminating third-party runtime dependencies entirely, NogginLessDom removes
the supply chain attack surface that comes with traditional testing toolchains.
There are no transitive `node_modules` to audit beyond dev tooling (9 dev
dependencies).

**v0.0.16** -- 58 source files, 31K+ lines of code, 2156 tests.

## Features

### Test Runner

- `describe`, `it`, `test` with `skip`, `only`, `todo`, `concurrent`, and
  `each` support
- Conditional execution with `skipIf` and `runIf`
- `fails` modifier for expected-failure tests
- `shuffle` for randomized test ordering (seeded Fisher-Yates)
- `retry(n)` for flaky test tolerance
- Lifecycle hooks: `beforeEach`, `afterEach`, `beforeAll`, `afterAll`
- `onTestFailed` and `onTestFinished` callbacks

### Assertions (30+ Matchers)

- **Equality** -- `toBe`, `toEqual`, `toStrictEqual`
- **Truthiness** -- `toBeTruthy`, `toBeFalsy`, `toBeNull`, `toBeUndefined`,
  `toBeDefined`, `toBeNaN`
- **Type** -- `toBeInstanceOf`, `toBeTypeOf`
- **Numeric** -- `toBeGreaterThan`, `toBeGreaterThanOrEqual`, `toBeLessThan`,
  `toBeLessThanOrEqual`, `toBeCloseTo`
- **String** -- `toMatch`
- **Collection** -- `toContain`, `toContainEqual`, `toHaveLength`,
  `toHaveProperty`, `toMatchObject`
- **Exception** -- `toThrow`
- **Custom** -- `toSatisfy`
- **Mock** -- `toHaveBeenCalled`, `toHaveBeenCalledTimes`,
  `toHaveBeenCalledWith`, `toHaveBeenLastCalledWith`,
  `toHaveBeenNthCalledWith`, `toHaveBeenCalledOnce`, `toHaveReturned`,
  `toHaveReturnedTimes`, `toHaveReturnedWith`, `toHaveLastReturnedWith`
- **Snapshot** -- `toMatchSnapshot`, `toMatchInlineSnapshot`,
  `toMatchFileSnapshot`, `toThrowErrorMatchingSnapshot`,
  `toThrowErrorMatchingInlineSnapshot`
- **Modifiers** -- `.not`, `.resolves`, `.rejects`
- **Assertion tracking** -- `expect.assertions(n)`, `expect.hasAssertions()`

### Asymmetric Matchers

- `expect.anything()`, `expect.any(constructor)`
- `expect.stringContaining()`, `expect.stringMatching()`
- `expect.objectContaining()`, `expect.arrayContaining()`
- `expect.not.objectContaining()`, `expect.not.arrayContaining()`,
  `expect.not.stringContaining()`, `expect.not.stringMatching()`
- Custom matchers via `expect.extend()`

### DOM Simulation

- **Core** -- `Document`, `DocumentFragment`, `Element`, `Node`, `TextNode`,
  `Comment`
- **24 Typed HTML Elements** -- `HTMLInputElement`, `HTMLButtonElement`,
  `HTMLFormElement`, `HTMLSelectElement`, `HTMLTextAreaElement`,
  `HTMLAnchorElement`, `HTMLImageElement`, `HTMLLabelElement`,
  `HTMLOptionElement`, `HTMLDialogElement`, `HTMLCanvasElement`,
  `HTMLTemplateElement`, `HTMLIFrameElement`, `HTMLVideoElement`,
  `HTMLAudioElement`, `HTMLProgressElement`, `HTMLMeterElement`,
  `HTMLDetailsElement`, `HTMLTableElement`, `HTMLTableRowElement`,
  `HTMLTableCellElement`, `HTMLFieldSetElement`, `HTMLScriptElement`,
  `HTMLSlotElement`
- **Collections** -- `NodeList`, `HTMLCollection`, `DOMTokenList`,
  `CSSStyleDeclaration`
- **Events** -- `Event`, `CustomEvent`, `MouseEvent`, `KeyboardEvent`,
  `FocusEvent`, `InputEvent`, `WheelEvent`, `PointerEvent`, `TouchEvent`,
  `DragEvent`, `ClipboardEvent`, `TransitionEvent`, `AnimationEvent`,
  `ErrorEvent`, `MessageEvent`, `StorageEvent`, `PopStateEvent`,
  `ProgressEvent`, `HashChangeEvent`, `BeforeUnloadEvent` with
  bubbling/capture propagation
- **Shadow DOM & Custom Elements** -- `ShadowRoot`, `CustomElementRegistry`
- **Observer APIs** -- `MutationObserver`, `IntersectionObserver`,
  `ResizeObserver`
- **Traversal** -- `TreeWalker`, `NodeIterator`, `NodeFilter`, `Range`,
  `Selection`
- **Parsing** -- `DOMParser`, `XMLSerializer`, HTML parser/serializer, CSS
  selector engine
- **Data** -- `FormData`, `Headers`, `DataTransfer`, `CookieJar`
- **Abort** -- `AbortController`, `AbortSignal`
- **Utilities** -- `ValidityState`, `atob`, `btoa`

### Window Environment

- `Window`, `Storage`, `Location`, `History`, `Navigator`, `MediaQueryList`
- `Request`, `Response`, `fetch`, `URL`, `crypto`
- `createWindow()` factory for isolated environments

### Mocking

- `fn()` -- create mock functions with full call/result tracking
- `spyOn()` -- spy on methods and property accessors (get/set)
- `vi` namespace -- comprehensive compatibility API
- **Mock control** -- `mockReturnValue`, `mockReturnValueOnce`,
  `mockResolvedValue`, `mockResolvedValueOnce`, `mockRejectedValue`,
  `mockRejectedValueOnce`, `mockImplementation`, `mockImplementationOnce`,
  `mockName`, `getMockName`, `getMockImplementation`, `withImplementation`
- **Reset** -- `mockClear`, `mockReset`, `mockRestore`
- **Bulk operations** -- `clearAllMocks`, `resetAllMocks`, `restoreAllMocks`
- **Module mocking** -- `mock.module`, `mock.doMock`, `mock.importActual`,
  `mock.importMock`, `mock.require`, `mock.unmock`, `mock.doUnmock`,
  `mock.resetModules`, `mock.hoisted`
- **Globals** -- `stubGlobal`, `unstubAllGlobals`, `stubEnv`, `unstubAllEnvs`
- **Fake timers** -- `useFakeTimers`, `useRealTimers`, `advanceTimersByTime`,
  `advanceTimersByTimeAsync`, `advanceTimersToNextTimer`,
  `advanceTimersToNextTimerAsync`, `runAllTimers`, `runAllTimersAsync`,
  `runOnlyPendingTimers`, `runOnlyPendingTimersAsync`, `setSystemTime`,
  `getMockedSystemTime`, `getRealSystemTime`, `getTimerCount` with full `Date`
  constructor mocking
- **Async utilities** -- `waitFor`, `waitUntil`

### Code Coverage

- V8 and Istanbul coverage providers
- 11 reporters: text, text-summary, JSON, JSON-summary, LCOV, lcov-only,
  HTML, HTML-SPA, Clover, Cobertura, Teamcity
- Source map support
- Configurable thresholds with auto-update
- Per-test coverage tracking
- Uncovered file collection

### Snapshot Testing

- `SnapshotClient` with file and inline snapshot support
- Custom serializers via `expect.addSnapshotSerializer()`
- File snapshots with `toMatchFileSnapshot()`
- Error snapshots with `toThrowErrorMatchingSnapshot()` and
  `toThrowErrorMatchingInlineSnapshot()`
- Update modes for CI and development workflows
- `SnapshotManager` and `SnapshotEnvironment` for advanced control

### General

- **TypeScript First** -- written in strict TypeScript with full type
  declarations
- **Zero Dependencies** -- no runtime dependencies at all (9 dev deps only)

## Installation

```bash
bun add -d @asymmetric-effort/nogginlessdom
```

Or with npm:

```bash
npm install --save-dev @asymmetric-effort/nogginlessdom
```

## Quick Start

```typescript
import { describe, it, expect, Document, fn } from '@asymmetric-effort/nogginlessdom';

describe('my first test', () => {
  it('compares values', () => {
    expect(1 + 1).toBe(2);
    expect({ a: 1 }).toEqual({ a: 1 });
  });

  it('tests DOM elements', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    div.setAttribute('id', 'app');
    div.textContent = 'Hello World';
    doc.appendChild(div);

    expect(doc.getElementById('app')!.textContent).toBe('Hello World');
  });

  it('tracks mock calls', () => {
    const mock = fn();
    mock('hello');
    expect(mock).toHaveBeenCalledWith('hello');
  });
});
```

Run with:

```bash
bun test
```

## API Overview

| Module          | Key Exports                                                                     | Docs                                      |
| --------------- | ------------------------------------------------------------------------------- | ----------------------------------------- |
| **Test Runner** | `describe`, `it`, `test`, lifecycle hooks, `.each`, `.skip`, `.only`, `.retry`  | [test-runner.md](docs/api/test-runner.md) |
| **Assertions**  | `expect()` with 30+ matchers, `.not`, `.resolves`, `.rejects`                   | [assertions.md](docs/api/assertions.md)   |
| **DOM**         | `Document`, `Element`, 24 HTML elements, 20 event types, `Window`, `Storage`    | [dom.md](docs/api/dom.md)                 |
| **Mocking**     | `fn`, `spyOn`, `mock`, `vi`, `useFakeTimers`, module mocking                    | [mocking.md](docs/api/mocking.md)         |
| **Coverage**    | V8 + Istanbul providers, 11 reporters, thresholds, per-test tracking            | [architecture.md](docs/architecture.md)   |
| **Snapshots**   | `toMatchSnapshot`, `toMatchInlineSnapshot`, custom serializers                  | [assertions.md](docs/api/assertions.md)   |

## Documentation

Full documentation is available in the [`docs/`](docs/) directory:

- [Getting Started](docs/getting-started.md)
- [API Reference](docs/api/)
- [Architecture](docs/architecture.md)
- [User Guide](docs/user/)
- [Developer Guide](docs/developer/)

## Development

```bash
make setup          # Install dependencies and git hooks
make lint           # Run all linters (markdownlint, eslint, prettier, etc.)
make test           # Run unit, integration, and e2e tests
make build          # Clean build to build/
```

Requires Node.js >= 20.0.0.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development workflow, coding
standards, and pull request guidelines.

## Security

NogginLessDom has **zero runtime dependencies**, which eliminates the supply
chain attack surface entirely. See [SECURITY.md](SECURITY.md) for our security
policy and vulnerability reporting process.

## License

[MIT](LICENSE.txt)
