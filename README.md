<!-- markdownlint-disable MD041 -->
<img src="logo.png" alt="NogginLessDom" width="64" align="left" style="margin-right: 12px;" />

# NogginLessDom

A zero-dependency testing framework built on `node:test` and `node:assert`.

<br clear="both" />

## Overview

NogginLessDom is a comprehensive testing framework for Node.js that provides a
full-featured test runner, assertion library, DOM simulation, and mocking
utilities -- all with **zero runtime dependencies**. Every algorithm is
implemented from scratch using only Node.js built-in modules (`node:test`,
`node:assert`, `node:fs`).

By eliminating third-party runtime dependencies entirely, NogginLessDom removes
the supply chain attack surface that comes with traditional testing toolchains.
There are no transitive `node_modules` to audit beyond dev tooling.

## Features

- **Test Runner** -- `describe`, `it`, `test` with `skip`, `only`, `todo`,
  `each`, and `concurrent` support
- **Assertions** -- `expect()` with 20+ matchers, `.not`, `.resolves`,
  `.rejects`, asymmetric matchers, and `expect.extend()`
- **DOM Simulation** -- `Document`, `Element`, `Node`, `Event`, `TextNode`,
  `Comment`, `HTMLCollection`, `NodeList`, `DOMTokenList`, `CSSStyleDeclaration`
- **Typed HTML Elements** -- `HTMLInputElement`, `HTMLButtonElement`,
  `HTMLFormElement`, `HTMLSelectElement`, `HTMLAnchorElement`, and more
- **Window Environment** -- `Window`, `Storage`, `Location`, `History`,
  `Navigator`, `MediaQueryList`
- **Observer APIs** -- `MutationObserver`, `IntersectionObserver`,
  `ResizeObserver`
- **Shadow DOM & Custom Elements** -- `ShadowRoot`, `CustomElementRegistry`
- **Mocking** -- `fn()`, `spyOn()`, module mocking, `stubGlobal()`,
  `clearAllMocks()`, `restoreAllMocks()`
- **Fake Timers** -- `useFakeTimers()`, `useRealTimers()`,
  `advanceTimersByTime()`, `runAllTimers()`, `setSystemTime()`
- **Snapshot Testing** -- `toMatchSnapshot()`, `toMatchInlineSnapshot()`
- **TypeScript First** -- written in strict TypeScript with full type
  declarations
- **Zero Dependencies** -- no runtime dependencies at all

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

| Module          | Key Exports                                                     | Docs                                      |
| --------------- | --------------------------------------------------------------- | ----------------------------------------- |
| **Test Runner** | `describe`, `it`, `test`, lifecycle hooks, `.each`              | [test-runner.md](docs/api/test-runner.md) |
| **Assertions**  | `expect()` with 20+ matchers, `.not`, `.resolves`, `.rejects`   | [assertions.md](docs/api/assertions.md)   |
| **DOM**         | `Document`, `Element`, `Node`, `Event`, `Window`, `Storage`     | [dom.md](docs/api/dom.md)                 |
| **Mocking**     | `fn`, `spyOn`, `mock`, `useFakeTimers`, `useRealTimers`         | [mocking.md](docs/api/mocking.md)         |

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
