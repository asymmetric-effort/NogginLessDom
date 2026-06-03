<!-- markdownlint-disable MD041 -->
<img src="logo.png" alt="NogginLessDom" width="64" align="left" style="margin-right: 12px;" />

# NogginLessDom

A zero-dependency testing framework built on `node:test` and `node:assert`.

<br clear="both" />

NogginLessDom is a comprehensive testing framework for Node.js that ships a
full-featured test runner, assertion library, DOM simulation, mocking
utilities, code coverage, snapshot testing, and dependency analysis -- all with
**zero runtime dependencies**. Every algorithm is implemented from scratch
using only Node.js built-in modules. No third-party code ships to consumers,
eliminating the supply chain attack surface entirely.

**v0.0.25** -- 80 source files, 28K+ lines of TypeScript, 3100+ tests.

## Key Features

- **Test Runner** -- `describe`, `it`, `test` with `skip`, `only`, `todo`,
  `concurrent`, `each`, `shuffle`, `retry`, `fails`, `skipIf`, `runIf`,
  and full lifecycle hooks
- **30+ Assertions** -- `expect()` with equality, truthiness, type, numeric,
  string, collection, exception, mock, and snapshot matchers plus `.not`,
  `.resolves`, `.rejects` modifiers
- **DOM Simulation** -- `Document`, `Element`, 29 typed HTML elements, 20
  event types, Shadow DOM, Custom Elements, Observer APIs, SVG, Canvas,
  IndexedDB, Web Workers, WebSocket, and more
- **Mocking** -- `fn()`, `spyOn()`, module mocking, fake timers with full
  `Date` mocking, global/env stubbing, and async utilities
- **Code Coverage** -- V8 and Istanbul providers, 11 reporters, configurable
  thresholds, source map support, per-test tracking
- **Dependency Analysis** -- circular import detection, import depth analysis,
  unused import detection, dependency graph visualization
- **Zero Dependencies** -- empty `dependencies` in `package.json`, no
  transitive `node_modules` to audit

## Quick Start

Install as a dev dependency:

```bash
bun add -d @asymmetric-effort/nogginlessdom
```

Create a test file (`example.test.ts`):

```typescript
import { describe, it, expect } from '@asymmetric-effort/nogginlessdom';

describe('Math', () => {
  it('adds two numbers', () => {
    expect(1 + 2).toBe(3);
  });

  it('compares objects deeply', () => {
    expect({ a: 1, b: [2, 3] }).toEqual({ a: 1, b: [2, 3] });
  });

  it('checks exceptions', () => {
    expect(() => {
      throw new Error('oops');
    }).toThrow('oops');
  });
});
```

Run the tests:

```bash
bun test
```

## DOM Testing

NogginLessDom includes a full DOM simulation. No separate DOM library needed.

```typescript
import {
  describe,
  it,
  expect,
  Document,
  Event,
} from '@asymmetric-effort/nogginlessdom';

describe('DOM', () => {
  it('creates and queries elements', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    div.id = 'app';
    div.className = 'container';

    const paragraph = doc.createElement('p');
    paragraph.textContent = 'Hello, world!';
    div.appendChild(paragraph);
    doc.appendChild(div);

    expect(doc.getElementById('app')).toBeDefined();
    expect(doc.querySelector('p')?.textContent).toBe('Hello, world!');
    expect(doc.querySelectorAll('.container')).toHaveLength(1);
  });

  it('handles events with bubbling', () => {
    const doc = new Document();
    const parent = doc.createElement('div');
    const button = doc.createElement('button');
    parent.appendChild(button);

    const clicks: string[] = [];
    parent.addEventListener('click', () => clicks.push('parent'));
    button.addEventListener('click', () => clicks.push('button'));

    button.dispatchEvent(new Event('click', { bubbles: true }));
    expect(clicks).toEqual(['button', 'parent']);
  });
});
```

## Mocking

Create mock functions, spy on methods, and control time:

```typescript
import {
  describe,
  it,
  expect,
  fn,
  spyOn,
  useFakeTimers,
  useRealTimers,
} from '@asymmetric-effort/nogginlessdom';

describe('Mocking', () => {
  it('tracks mock function calls', () => {
    const mockFn = fn((x: number) => x * 2);
    mockFn(3);
    mockFn(5);

    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(mockFn).toHaveBeenCalledWith(3);
    expect(mockFn.mock.results[0]).toEqual({ type: 'return', value: 6 });
  });

  it('spies on object methods', () => {
    const obj = { greet: (name: string) => `Hello, ${name}` };
    const spy = spyOn(obj, 'greet');

    obj.greet('Alice');
    expect(spy).toHaveBeenCalledWith('Alice');
    spy.mockRestore();
  });

  it('controls fake timers', () => {
    const clock = useFakeTimers();
    const callback = fn();

    setTimeout(callback, 1000);
    expect(callback).not.toHaveBeenCalled();

    clock.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledOnce();

    useRealTimers();
  });
});
```

## Code Coverage

Enable coverage in `bunfig.toml`:

```toml
[test]
coverage = true
coverageThreshold = { line = 90, function = 90, statement = 90 }
```

Run tests with coverage:

```bash
bun test
```

Coverage data is collected automatically when enabled. The framework supports
V8 and Istanbul providers with 11 output formats including text, HTML, LCOV,
Cobertura, and more. See the [Configuration Guide](docs/user/configuration.md)
for full details.

## Why NogginLessDom?

### Zero Supply Chain Risk

The `dependencies` field in `package.json` is `{}`. When you install
NogginLessDom, you get exactly one package with no transitive dependency tree.
Package takeovers, typosquatting, and malicious updates in transitive
dependencies cannot affect your test toolchain.

### Built on Node.js Built-ins

The test runner wraps `node:test`. Assertions wrap `node:assert`. These are
battle-tested modules maintained by the Node.js team, guaranteed to be
available in every Node.js >= 20 environment. NogginLessDom adds a familiar
API layer on top without reinventing core functionality.

### Everything in One Package

Test runner, assertions, DOM simulation, mocking, coverage, snapshots, and
dependency analysis -- all from a single import. No need to install and
configure separate packages for each capability.

### Security by Design

DOM parsing never uses `eval()`, `new Function()`, or dynamic code execution.
HTML input is validated through deterministic parsing. Path operations include
symlink protection and traversal validation.

## Documentation

Full documentation is available in the [`docs/`](docs/) directory:

- [Getting Started](docs/getting-started.md) -- Installation, first test, and
  core features walkthrough
- [Installation](docs/user/installation.md) -- All package managers, TypeScript
  setup, and verification
- [Configuration](docs/user/configuration.md) -- Test patterns, coverage,
  reporters, dependency analysis, and environment variables
- [Architecture](docs/architecture.md) -- Module structure, dependency graph,
  build pipeline, and security design
- [API Reference](docs/api/) -- Detailed documentation for every module

## API Overview

| Module          | Key Exports                                                                    | Docs                                      |
| --------------- | ------------------------------------------------------------------------------ | ----------------------------------------- |
| **Test Runner** | `describe`, `it`, `test`, lifecycle hooks, `.each`, `.skip`, `.only`, `.retry` | [test-runner.md](docs/api/test-runner.md) |
| **Assertions**  | `expect()` with 30+ matchers, `.not`, `.resolves`, `.rejects`                  | [assertions.md](docs/api/assertions.md)   |
| **DOM**         | `Document`, `Element`, 29 HTML elements, 20 event types, `Window`, `Storage`   | [dom.md](docs/api/dom.md)                 |
| **Mocking**     | `fn`, `spyOn`, `mock`, `vi`, `useFakeTimers`, module mocking                   | [mocking.md](docs/api/mocking.md)         |
| **Coverage**    | V8 + Istanbul providers, 11 reporters, thresholds, per-test tracking           | [architecture.md](docs/architecture.md)   |
| **Snapshots**   | `toMatchSnapshot`, `toMatchInlineSnapshot`, custom serializers                 | [assertions.md](docs/api/assertions.md)   |

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
