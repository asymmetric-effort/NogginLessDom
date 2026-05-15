# API Reference

This section documents every public function, class, and interface exported by
NogginLessDom. All exports are available from the top-level package import:

```typescript
import {
  // Test Runner
  describe, it, test, beforeEach, afterEach, beforeAll, afterAll,

  // Assertions
  expect,

  // DOM Simulation
  Document, Element, Node, TextNode, Event,

  // Mocking
  fn, spyOn, useFakeTimers, useRealTimers,
} from '@asymmetric-effort/nogginlessdom';
```

## Modules

### Test Runner

The test runner wraps `node:test` to provide a vitest-compatible API for
defining test suites, test cases, and lifecycle hooks.

**Exports:** `describe`, `it`, `test`, `beforeEach`, `afterEach`, `beforeAll`,
`afterAll`

[Full Test Runner API Reference](test-runner.md)

### Assertions

The assertions module wraps `node:assert` to provide an `expect(value)` API
with chainable matchers. Supports equality, type checking, collection
inspection, exception testing, and async assertions.

**Exports:** `expect`

[Full Assertions API Reference](assertions.md)

### DOM Simulation

The DOM module provides a jsdom-equivalent DOM simulation built from scratch
with zero dependencies. It implements the core DOM interfaces needed for testing
web applications: document creation, element manipulation, tree traversal, CSS
selector queries, and event dispatching.

**Exports:** `Document`, `Element`, `Node`, `TextNode`, `Event`

[Full DOM API Reference](dom.md)

### Mocking

The mocking module provides utilities for creating mock functions, spying on
object methods, and controlling timers. Mock functions track their calls and
return values, allowing you to make assertions about how code under test
interacts with its dependencies.

**Exports:** `fn`, `spyOn`, `useFakeTimers`, `useRealTimers`

[Full Mocking API Reference](mocking.md)

## Design Notes

All modules are designed to be used independently or together. There are no
cross-dependencies between modules -- you can import only the test runner, only
the assertions, or only the DOM simulation as your use case requires.

Every function maps directly to a Node.js built-in API or is implemented from
scratch within the package. No third-party code is involved at any layer.

The API surface is intentionally compatible with vitest. If you are familiar
with vitest's `describe`, `it`, `expect`, `fn`, and `spyOn`, you already know
how to use NogginLessDom. The DOM API follows the jsdom/browser DOM standard as
closely as practical.
