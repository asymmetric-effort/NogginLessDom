# NogginLessDom Documentation

NogginLessDom (`@asymmetric-effort/nogginlessdom`) is a zero-dependency testing
framework built entirely on Node.js built-in modules. It wraps `node:test` and
`node:assert` to deliver a comprehensive test runner, assertion library, DOM
simulation, and mocking utilities while eliminating the entire third-party
supply chain attack surface.

## Documentation Sections

### Overview

- [Architecture](architecture.md) -- System design, module structure, design
  principles, dependency graph, and build pipeline.
- [Getting Started](getting-started.md) -- Installation, first test, running
  tests, and basic configuration.

### API Reference

- [API Reference Index](api/README.md) -- Overview of all exported modules.
- [Test Runner](api/test-runner.md) -- `describe`, `it`, `test`, lifecycle
  hooks, and test options.
- [Assertions](api/assertions.md) -- `expect()` and all matchers (`toBe`,
  `toEqual`, `toThrow`, `.not`, `.resolves`, `.rejects`, and more).
- [DOM Simulation](api/dom.md) -- `Document`, `Element`, `Node`, `TextNode`,
  and `Event` APIs.
- [Mocking](api/mocking.md) -- `fn()`, `spyOn()`, mock instances, and timer
  mocking utilities.

### Developer Guide

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

### User Guide

- [User Guide Index](user/README.md) -- Orientation for end users adopting
  NogginLessDom.
- [Installation](user/installation.md) -- Installing via Bun or npm, verifying
  the install, and TypeScript setup.
- [Configuration](user/configuration.md) -- Test file patterns, `bunfig.toml`
  settings, coverage thresholds, DOM options, and custom reporters.

## Quick Links

- [GitHub Repository](https://github.com/asymmetric-effort/NogginLessDom)
- [Issue Tracker](https://github.com/asymmetric-effort/NogginLessDom/issues)
- [Contributing Guide](../CONTRIBUTING.md)
- [Security Policy](../SECURITY.md)
- [License (MIT)](../LICENSE.txt)
