# Getting Started

This guide walks you through installing NogginLessDom, writing your first test,
and exploring the framework's core capabilities. By the end you will have a
working test suite using the test runner, assertions, DOM simulation, mocking,
snapshots, and coverage.

## Installation

Install NogginLessDom as a dev dependency. It has zero runtime dependencies, so
this is the only package you need.

With Bun (recommended):

```bash
bun add -d @asymmetric-effort/nogginlessdom
```

With npm:

```bash
npm install --save-dev @asymmetric-effort/nogginlessdom
```

For additional package managers and TypeScript setup, see the
[Installation Guide](user/installation.md).

## Your First Test

Create a file named `math.test.ts`:

```typescript
import { describe, it, expect } from '@asymmetric-effort/nogginlessdom';

describe('Math', () => {
  it('adds two numbers', () => {
    expect(1 + 2).toBe(3);
  });

  it('handles negative numbers', () => {
    expect(-1 + -2).toBe(-3);
  });
});
```

This test file uses three functions from NogginLessDom:

- `describe` groups related tests into a suite.
- `it` defines a single test case.
- `expect` creates an assertion that checks a value against a matcher.

## Running Tests

Run your tests with Bun:

```bash
bun test
```

You should see output indicating that both tests passed. Under the hood,
NogginLessDom delegates to `node:test`, so you get the same reliable test
execution and reporting that Node.js provides natively.

Run a specific file:

```bash
bun test math.test.ts
```

Run tests matching a name pattern:

```bash
bun test --grep "adds two"
```

## Assertions

NogginLessDom provides an `expect()` function with 30+ chainable matchers:

```typescript
import { describe, it, expect } from '@asymmetric-effort/nogginlessdom';

describe('Assertions', () => {
  it('checks equality', () => {
    expect('hello').toBe('hello');
    expect({ a: 1 }).toEqual({ a: 1 });
    expect({ a: 1, b: 2 }).toMatchObject({ a: 1 });
  });

  it('checks truthiness', () => {
    expect(true).toBeTruthy();
    expect(0).toBeFalsy();
    expect(null).toBeNull();
    expect(undefined).toBeUndefined();
  });

  it('checks types and numbers', () => {
    expect('hello').toBeTypeOf('string');
    expect(new Date()).toBeInstanceOf(Date);
    expect(3.14).toBeCloseTo(Math.PI, 1);
    expect(10).toBeGreaterThan(5);
  });

  it('checks collections', () => {
    expect([1, 2, 3]).toContain(2);
    expect([1, 2, 3]).toHaveLength(3);
    expect({ name: 'Alice' }).toHaveProperty('name');
  });

  it('uses negation', () => {
    expect(1).not.toBe(2);
    expect('foo').not.toContain('bar');
  });

  it('checks exceptions', () => {
    expect(() => {
      throw new Error('oops');
    }).toThrow('oops');
  });

  it('uses asymmetric matchers', () => {
    expect({ name: 'Alice', age: 30 }).toEqual(
      expect.objectContaining({ name: 'Alice' }),
    );
    expect([1, 2, 3]).toEqual(expect.arrayContaining([1, 3]));
  });

  it('uses custom predicates', () => {
    expect(42).toSatisfy((n: number) => n > 0 && n < 100);
  });
});
```

## DOM Testing

NogginLessDom includes a complete DOM simulation. No separate DOM library is
needed. Create documents, add elements, query the tree, dispatch events, and
assert the results.

```typescript
import {
  describe,
  it,
  expect,
  beforeEach,
  Document,
  Event,
  CustomEvent,
  createWindow,
} from '@asymmetric-effort/nogginlessdom';

describe('DOM', () => {
  let doc: Document;

  beforeEach(() => {
    doc = new Document();
  });

  it('creates and queries elements', () => {
    const div = doc.createElement('div');
    div.id = 'app';
    div.className = 'container main';

    const heading = doc.createElement('h1');
    heading.textContent = 'Welcome';
    div.appendChild(heading);

    const paragraph = doc.createElement('p');
    paragraph.textContent = 'Hello, world!';
    div.appendChild(paragraph);

    doc.appendChild(div);

    expect(doc.getElementById('app')).toBeDefined();
    expect(doc.querySelector('h1')?.textContent).toBe('Welcome');
    expect(doc.querySelectorAll('p')).toHaveLength(1);
    expect(div.classList.contains('container')).toBe(true);
  });

  it('handles events with bubbling', () => {
    const parent = doc.createElement('div');
    const button = doc.createElement('button');
    parent.appendChild(button);

    const clicks: string[] = [];
    parent.addEventListener('click', () => clicks.push('parent'));
    button.addEventListener('click', () => clicks.push('button'));

    button.dispatchEvent(new Event('click', { bubbles: true }));
    expect(clicks).toEqual(['button', 'parent']);
  });

  it('dispatches custom events with detail', () => {
    const el = doc.createElement('div');
    let received: unknown = null;

    el.addEventListener('notify', (e: Event) => {
      received = (e as CustomEvent).detail;
    });

    el.dispatchEvent(
      new CustomEvent('notify', { detail: { message: 'hello' } }),
    );
    expect(received).toEqual({ message: 'hello' });
  });

  it('uses innerHTML for complex structures', () => {
    const container = doc.createElement('div');
    container.innerHTML = `
      <nav>
        <a href="/">Home</a>
        <a href="/about">About</a>
      </nav>
    `;
    doc.appendChild(container);

    const links = doc.querySelectorAll('a');
    expect(links).toHaveLength(2);
  });

  it('provides a full window environment', () => {
    const window = createWindow();
    expect(window.document).toBeDefined();
    expect(window.location).toBeDefined();
    expect(window.history).toBeDefined();
    expect(window.navigator).toBeDefined();
    expect(window.localStorage).toBeDefined();
  });
});
```

## Mocking

Create mock functions, spy on existing methods (including property accessors),
and control time with fake timers.

### Mock Functions

```typescript
import { describe, it, expect, fn } from '@asymmetric-effort/nogginlessdom';

describe('Mock functions', () => {
  it('tracks calls and return values', () => {
    const mockFn = fn((x: number) => x * 2);

    mockFn(3);
    mockFn(5);

    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(mockFn).toHaveBeenCalledWith(3);
    expect(mockFn.mock.results[0]).toEqual({ type: 'return', value: 6 });
  });

  it('stubs return values', () => {
    const fetchUser = fn();
    fetchUser.mockReturnValue({ id: 1, name: 'Alice' });

    expect(fetchUser()).toEqual({ id: 1, name: 'Alice' });
  });

  it('mocks async functions', () => {
    const fetchData = fn();
    fetchData.mockResolvedValue({ status: 'ok' });

    expect(fetchData()).resolves.toEqual({ status: 'ok' });
  });
});
```

### Spying on Methods

```typescript
import { describe, it, expect, spyOn } from '@asymmetric-effort/nogginlessdom';

describe('Spying', () => {
  it('spies on object methods', () => {
    const calculator = {
      add: (a: number, b: number) => a + b,
    };

    const spy = spyOn(calculator, 'add');
    calculator.add(2, 3);

    expect(spy).toHaveBeenCalledWith(2, 3);
    spy.mockRestore();
  });
});
```

### Fake Timers

```typescript
import {
  describe,
  it,
  expect,
  fn,
  useFakeTimers,
  useRealTimers,
} from '@asymmetric-effort/nogginlessdom';

describe('Fake timers', () => {
  it('advances timers by time', () => {
    const clock = useFakeTimers();
    const callback = fn();

    setTimeout(callback, 5000);
    expect(callback).not.toHaveBeenCalled();

    clock.advanceTimersByTime(5000);
    expect(callback).toHaveBeenCalledOnce();

    useRealTimers();
  });

  it('mocks the Date constructor', () => {
    const clock = useFakeTimers({ now: new Date('2026-01-01T00:00:00Z') });

    expect(Date.now()).toBe(new Date('2026-01-01T00:00:00Z').getTime());

    clock.setSystemTime(new Date('2026-06-15T12:00:00Z'));
    expect(Date.now()).toBe(new Date('2026-06-15T12:00:00Z').getTime());

    useRealTimers();
  });
});
```

## Snapshot Testing

Capture and compare values across test runs:

```typescript
import { describe, it, expect } from '@asymmetric-effort/nogginlessdom';

describe('Snapshots', () => {
  it('matches a snapshot', () => {
    const data = { name: 'Alice', items: [1, 2, 3] };
    expect(data).toMatchSnapshot();
  });

  it('matches an inline snapshot', () => {
    expect({ greeting: 'hello' }).toMatchInlineSnapshot();
  });
});
```

On the first run, snapshots are created and saved. On subsequent runs, values
are compared against the stored snapshots. Update snapshots when intentional
changes occur by passing the `--update-snapshots` flag.

## Coverage

Enable code coverage in `bunfig.toml`:

```toml
[test]
coverage = true
coverageThreshold = { line = 90, function = 90, statement = 90 }
```

Then run tests as usual:

```bash
bun test
```

Coverage data is collected automatically. If any metric falls below the
configured threshold, the test run fails with a non-zero exit code. The
framework supports V8 and Istanbul providers with 11 output formats. See the
[Configuration Guide](user/configuration.md) for full coverage options.

## Watch Mode

Re-run tests automatically when files change:

```bash
bun test --watch
```

This watches your source and test files and re-runs the relevant test suite
whenever a change is detected. Combine with `--grep` to watch a specific
subset of tests during development.

## Next Steps

- [API Reference](api/README.md) -- Detailed documentation of every function,
  class, and matcher
- [Configuration Guide](user/configuration.md) -- Test patterns, coverage,
  reporters, dependency analysis, and environment variables
- [Architecture](architecture.md) -- How the framework is built, module
  structure, and design principles
- [Installation Guide](user/installation.md) -- Additional package managers,
  TypeScript configuration, and what gets installed
