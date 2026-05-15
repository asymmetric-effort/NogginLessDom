# User Guide

This section is for end users who are adopting NogginLessDom in their projects.
Whether you are starting fresh or migrating from an existing testing framework,
these guides will help you get up and running.

## Guides

### [Installation](installation.md)

How to install NogginLessDom via Bun or npm, verify the installation, and
configure TypeScript. Covers peer dependency requirements (there are none) and
what gets installed.

### [Configuration](configuration.md)

How to configure test file patterns, coverage thresholds, DOM options, and
custom reporters through `bunfig.toml` and other configuration files.

### [Migration from Vitest](migration-from-vitest.md)

A step-by-step guide for migrating an existing vitest test suite to
NogginLessDom. Includes a side-by-side API comparison table, import changes,
configuration translation, feature parity status, and known differences.

### [Migration from jsdom](migration-from-jsdom.md)

A step-by-step guide for replacing jsdom with NogginLessDom's built-in DOM
simulation. Covers API differences, document creation, element querying, event
handling, and workarounds for missing features.

## Why NogginLessDom?

### Zero Dependencies

NogginLessDom has no runtime dependencies. The `dependencies` field in
`package.json` is `{}`. When you install this package, you get exactly one
package -- no transitive dependency tree, no supply chain risk.

This matters because:

- **Security.** Every dependency is a potential attack vector. Package takeovers,
  typosquatting, and malicious updates in transitive dependencies are real
  threats. NogginLessDom eliminates this surface entirely.
- **Stability.** No dependency can break your build with a bad release. Your
  test framework is as stable as Node.js itself.
- **Speed.** No dependency resolution overhead. Installs are fast. Lock file
  churn is zero.

### Built on Node.js Built-ins

The test runner wraps `node:test`. The assertion library wraps `node:assert`.
These are battle-tested, maintained by the Node.js team, and guaranteed to be
available in every Node.js environment. NogginLessDom adds a familiar API layer
on top without reinventing the core functionality.

### Vitest API Compatibility

If you know vitest, you know NogginLessDom. The `describe`, `it`, `expect`,
`fn`, and `spyOn` APIs are designed to be drop-in replacements. Migration is
primarily an import change.

### jsdom-Compatible DOM

The built-in DOM simulation means you do not need jsdom as a separate
dependency. Create documents, query elements, dispatch events, and test UI
logic -- all from the same zero-dependency package.

## Quick Start

```bash
bun add -d @asymmetric-effort/nogginlessdom
```

```typescript
import { describe, it, expect } from '@asymmetric-effort/nogginlessdom';

describe('my first test', () => {
  it('works', () => {
    expect(1 + 1).toBe(2);
  });
});
```

```bash
bun test
```

For more detail, see the [Getting Started](../getting-started.md) guide.
