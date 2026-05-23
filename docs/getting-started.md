# Getting Started

This guide walks you through installing NogginLessDom, writing your first test,
and running it. By the end, you will have a working test suite using the test
runner, assertions, DOM simulation, and mocking.

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

  it('checks types', () => {
    expect('hello').toBeTypeOf('string');
    expect(42).toBeTypeOf('number');
    expect(new Date()).toBeInstanceOf(Date);
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

NogginLessDom includes a complete DOM simulation with 24 typed HTML element
classes, 20 event types, Shadow DOM, Custom Elements, and more. You do not need
to install a separate DOM library.

```typescript
import {
  describe,
  it,
  expect,
  Document,
  Event,
  CustomEvent,
  MutationObserver,
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

  it('should handle events with bubbling', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    const button = doc.createElement('button');
    div.appendChild(button);

    const clicks: string[] = [];
    div.addEventListener('click', () => clicks.push('div'));
    button.addEventListener('click', () => clicks.push('button'));

    button.dispatchEvent(new Event('click', { bubbles: true }));
    expect(clicks).toEqual(['button', 'div']);
  });

  it('should dispatch custom events', () => {
    const doc = new Document();
    const el = doc.createElement('div');
    let received: unknown = null;

    el.addEventListener('myevent', (e: Event) => {
      received = (e as CustomEvent).detail;
    });

    el.dispatchEvent(new CustomEvent('myevent', { detail: { key: 'value' } }));
    expect(received).toEqual({ key: 'value' });
  });
});
```

## Mocking

Create mock functions, spy on existing methods (including accessors), and use
the `vi` namespace for a comprehensive mocking API:

```typescript
import { describe, it, expect, fn, spyOn, vi } from '@asymmetric-effort/nogginlessdom';

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

  it('should mock resolved values', () => {
    const fetchData = fn();
    fetchData.mockResolvedValue({ id: 1, name: 'Test' });

    expect(fetchData()).resolves.toEqual({ id: 1, name: 'Test' });
  });
});
```

## Timer Mocking

Control the passage of time in your tests, including full `Date` mocking:

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
    const clock = useFakeTimers();

    const callback = fn();
    setTimeout(callback, 1000);

    expect(callback.mock.calls).toHaveLength(0);
    clock.advanceTimersByTime(1000);
    expect(callback.mock.calls).toHaveLength(1);

    useRealTimers();
  });

  it('should mock Date', () => {
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
  it('should match a snapshot', () => {
    const data = { name: 'Alice', items: [1, 2, 3] };
    expect(data).toMatchSnapshot();
  });

  it('should match an inline snapshot', () => {
    expect({ greeting: 'hello' }).toMatchInlineSnapshot();
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
