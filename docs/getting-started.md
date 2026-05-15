# Getting Started

This guide walks you through installing NogginLessDom, writing your first test,
and running it. By the end, you will have a working test suite using the test
runner, assertions, and DOM simulation.

## Installation

Install NogginLessDom as a dev dependency. It has zero runtime dependencies, so
this is the only package you need.

With Bun:

```bash
bun add -d @asymmetric-effort/nogginlessdom
```

With npm:

```bash
npm install --save-dev @asymmetric-effort/nogginlessdom
```

## Writing Your First Test

Create a file named `example.test.ts`:

```typescript
import { describe, it, expect } from '@asymmetric-effort/nogginlessdom';

describe('Math', () => {
  it('should add two numbers', () => {
    expect(1 + 2).toBe(3);
  });

  it('should handle negative numbers', () => {
    expect(-1 + -2).toBe(-3);
  });
});
```

## Running Tests

Run your tests with Bun:

```bash
bun test
```

You should see output indicating that both tests passed. Under the hood,
NogginLessDom delegates to `node:test`, so you get the same reliable test
execution and reporting that Node.js provides natively.

## Assertions

NogginLessDom provides an `expect()` function with chainable matchers that
mirror familiar testing conventions:

```typescript
import { describe, it, expect } from '@asymmetric-effort/nogginlessdom';

describe('Assertions', () => {
  it('checks equality', () => {
    expect('hello').toBe('hello');
    expect({ a: 1 }).toEqual({ a: 1 });
  });

  it('checks truthiness', () => {
    expect(true).toBeTruthy();
    expect(0).toBeFalsy();
    expect(null).toBeNull();
    expect(undefined).toBeUndefined();
  });

  it('checks negation', () => {
    expect(1).not.toBe(2);
    expect('foo').not.toContain('bar');
  });

  it('checks exceptions', () => {
    expect(() => {
      throw new Error('oops');
    }).toThrow('oops');
  });
});
```

## DOM Testing

NogginLessDom includes a full-featured DOM simulation. You do not need to
install any separate DOM library.

```typescript
import {
  describe,
  it,
  expect,
  Document,
} from '@asymmetric-effort/nogginlessdom';

describe('DOM', () => {
  it('should create and query elements', () => {
    const doc = new Document();

    const div = doc.createElement('div');
    div.id = 'app';
    div.className = 'container';

    const paragraph = doc.createElement('p');
    paragraph.textContent = 'Hello, world!';

    div.appendChild(paragraph);
    doc.appendChild(div);

    const found = doc.getElementById('app');
    expect(found).toBeDefined();
    expect(found?.tagName).toBe('DIV');

    const p = doc.querySelector('p');
    expect(p?.textContent).toBe('Hello, world!');
  });

  it('should handle events', () => {
    const doc = new Document();
    const button = doc.createElement('button');

    let clicked = false;
    button.addEventListener('click', () => {
      clicked = true;
    });

    button.dispatchEvent(new Event('click'));
    expect(clicked).toBe(true);
  });
});
```

## Mocking

Create mock functions and spy on existing methods:

```typescript
import { describe, it, expect, fn, spyOn } from '@asymmetric-effort/nogginlessdom';

describe('Mocking', () => {
  it('should track calls to a mock function', () => {
    const mockFn = fn((x: number) => x * 2);

    mockFn(3);
    mockFn(5);

    expect(mockFn.mock.calls).toHaveLength(2);
    expect(mockFn.mock.calls[0]).toEqual([3]);
    expect(mockFn.mock.results[0]).toEqual({ type: 'return', value: 6 });
  });

  it('should spy on object methods', () => {
    const calculator = {
      add: (a: number, b: number) => a + b,
    };

    const spy = spyOn(calculator, 'add');
    calculator.add(1, 2);

    expect(spy.mock.calls[0]).toEqual([1, 2]);
    spy.mockRestore();
  });
});
```

## Timer Mocking

Control the passage of time in your tests:

```typescript
import {
  describe,
  it,
  expect,
  fn,
  useFakeTimers,
  useRealTimers,
} from '@asymmetric-effort/nogginlessdom';

describe('Timers', () => {
  it('should advance fake timers', () => {
    useFakeTimers();

    const callback = fn();
    setTimeout(callback, 1000);

    expect(callback.mock.calls).toHaveLength(0);
    advanceTimersByTime(1000);
    expect(callback.mock.calls).toHaveLength(1);

    useRealTimers();
  });
});
```

## Configuration

NogginLessDom respects Bun's test configuration in `bunfig.toml`:

```toml
[test]
coverage = true
coverageThreshold = { line = 98, function = 98, statement = 98 }
```

For more details, see the [Configuration Guide](user/configuration.md).

## Next Steps

- Read the full [API Reference](api/README.md) for detailed documentation of
  every function and class.
- See the [User Guide](user/README.md) for installation, configuration, and
  migration guides.
- Check the [Architecture](architecture.md) document to understand how the
  framework is built.
- If you want to contribute, see the [Developer Guide](developer/README.md).
