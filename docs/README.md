# NogginLessDom Documentation

NogginLessDom (`@asymmetric-effort/nogginlessdom`) is a zero-dependency testing
framework built entirely on Node.js built-in modules. It wraps `node:test` and
`node:assert` to deliver a comprehensive test runner, assertion library, DOM
simulation, mocking utilities, code coverage, snapshot testing, and dependency
analysis while eliminating the entire third-party supply chain attack surface.

## Getting Started

- [Getting Started](getting-started.md) -- Installation, first test, and a
  walkthrough of all core features with runnable examples.

## Architecture

- [Architecture](architecture.md) -- Zero-dependency philosophy, module
  structure, dependency graph, build pipeline, and security design.

## API Reference

Detailed documentation for every exported function, class, and matcher.

- [API Reference Index](api/README.md) -- Overview of all exported modules.
- [Test Runner](api/test-runner.md) -- `describe`, `it`, `test`, lifecycle
  hooks, modifiers (`skip`, `only`, `todo`, `each`, `retry`, `shuffle`),
  reporters, watch mode, and dependency analysis tools.
- [Assertions](api/assertions.md) -- `expect()` with 30+ matchers, `.not`,
  `.resolves`, `.rejects`, asymmetric matchers, custom matchers, assertion
  tracking, and snapshot testing.
- [DOM Simulation](api/dom.md) -- `Document`, `Element`, `Node`, 29 typed
  HTML elements, 20 event types, Shadow DOM, Custom Elements, Observer APIs,
  SVG, Canvas, IndexedDB, Web Workers, WebSocket, and Window environment.
- [Mocking](api/mocking.md) -- `fn()`, `spyOn()`, mock instances, module
  mocking, fake timers with `Date` mocking, global/env stubbing, async
  utilities, and the `vi` namespace.

## User Guide

Guides for end users adopting NogginLessDom in their projects.

- [User Guide Index](user/README.md) -- Orientation and quick start.
- [Installation](user/installation.md) -- Installing via Bun, npm, yarn, or
  pnpm. Verifying the install, TypeScript setup, and what gets installed.
- [Configuration](user/configuration.md) -- Test file patterns, TypeScript
  configuration, coverage settings, reporter configuration, watch mode, test
  filtering, mock auto-cleanup, test isolation, serial execution, dependency
  analysis, and environment variables reference.

## Developer Guide

Guides for contributors to the NogginLessDom project itself.

- [Developer Guide Index](developer/README.md) -- Contributor orientation and
  links to all developer docs.
- [Environment Setup](developer/setup.md) -- Prerequisites, cloning, IDE
  configuration, and project structure.
- [Testing](developer/testing.md) -- Test organization, coverage requirements,
  naming conventions, and running tests.
- [Building](developer/building.md) -- Build process, output artifacts, clean
  builds, and troubleshooting.
- [Releasing](developer/releasing.md) -- Semantic versioning, release targets,
  npm publishing, and pre-release checklist.

## Quick Links

- [GitHub Repository](https://github.com/asymmetric-effort/NogginLessDom)
- [Issue Tracker](https://github.com/asymmetric-effort/NogginLessDom/issues)
- [Contributing Guide](../CONTRIBUTING.md)
- [Security Policy](../SECURITY.md)
- [License (MIT)](../LICENSE.txt)
