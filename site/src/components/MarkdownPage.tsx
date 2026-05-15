import { createElement } from '@asymmetric-effort/specifyjs';

interface MarkdownPageProps {
  title: string;
  section: string;
}

const sectionContent: Record<string, string> = {
  'getting-started': `
    <h1>Getting Started</h1>
    <h2>Installation</h2>
    <pre><code>bun add -d @asymmetric-effort/nogginlessdom</code></pre>
    <p>Or with npm:</p>
    <pre><code>npm install --save-dev @asymmetric-effort/nogginlessdom</code></pre>
    <h2>Write Your First Test</h2>
    <pre><code>import { describe, it, expect } from '@asymmetric-effort/nogginlessdom';

describe('my first test', () =&gt; {
  it('should pass', () =&gt; {
    expect(true).toBeTruthy();
  });

  it('should compare values', () =&gt; {
    expect(1 + 1).toBe(2);
  });
});</code></pre>
    <h2>Run Tests</h2>
    <pre><code>bun test</code></pre>
    <h2>DOM Testing</h2>
    <pre><code>import { describe, it, expect, Document } from '@asymmetric-effort/nogginlessdom';

describe('DOM tests', () =&gt; {
  it('creates and queries elements', () =&gt; {
    const doc = new Document();
    const div = doc.createElement('div');
    div.setAttribute('id', 'app');
    div.textContent = 'Hello World';
    doc.appendChild(div);

    const found = doc.getElementById('app');
    expect(found).toBeDefined();
    expect(found!.textContent).toBe('Hello World');
  });
});</code></pre>
    <h2>Mocking</h2>
    <pre><code>import { describe, it, expect, fn } from '@asymmetric-effort/nogginlessdom';

describe('mocking', () =&gt; {
  it('tracks calls', () =&gt; {
    const mock = fn();
    mock('hello');
    mock('world');

    expect(mock.mock.calls).toHaveLength(2);
    expect(mock.mock.calls[0]).toEqual(['hello']);
  });
});</code></pre>
    <p>For full API documentation, see the <a href="#/api">API Reference</a>.</p>
  `,
  api: `
    <h1>API Reference</h1>
    <p>NogginLessDom provides four core modules:</p>
    <ul>
      <li><a href="#/api/test-runner">Test Runner</a> &mdash; describe, it, test, lifecycle hooks</li>
      <li><a href="#/api/assertions">Assertions</a> &mdash; expect() with 20+ matchers</li>
      <li><a href="#/api/dom">DOM</a> &mdash; Document, Element, Node, Event simulation</li>
      <li><a href="#/api/mocking">Mocking</a> &mdash; fn(), spyOn(), fake timers</li>
    </ul>
    <p>All APIs are designed for drop-in compatibility with vitest and jsdom.</p>
  `,
  'api/test-runner': `
    <h1>Test Runner API</h1>
    <p>Wraps <code>node:test</code> with a vitest-compatible API.</p>
    <h2>describe(name, fn)</h2>
    <p>Groups related tests into a suite.</p>
    <h2>it(name, fn, options?) / test(name, fn, options?)</h2>
    <p>Defines a test case. Options: <code>skip</code>, <code>only</code>, <code>todo</code>, <code>timeout</code>.</p>
    <h2>beforeEach(fn) / afterEach(fn)</h2>
    <p>Runs setup/teardown before/after each test in the current suite.</p>
    <h2>beforeAll(fn) / afterAll(fn)</h2>
    <p>Runs setup/teardown once before/after all tests in the current suite.</p>
    <p>See the full <a href="https://github.com/asymmetric-effort/NogginLessDom/blob/main/docs/api/test-runner.md">documentation on GitHub</a>.</p>
  `,
  'api/assertions': `
    <h1>Assertions API</h1>
    <p>Wraps <code>node:assert/strict</code> with a vitest-compatible <code>expect()</code> API.</p>
    <h2>Matchers</h2>
    <ul>
      <li><code>toBe(value)</code> &mdash; Strict equality (===)</li>
      <li><code>toEqual(value)</code> &mdash; Deep equality</li>
      <li><code>toStrictEqual(value)</code> &mdash; Strict deep equality</li>
      <li><code>toBeTruthy()</code> / <code>toBeFalsy()</code></li>
      <li><code>toBeNull()</code> / <code>toBeUndefined()</code> / <code>toBeDefined()</code></li>
      <li><code>toContain(item)</code> / <code>toHaveLength(n)</code></li>
      <li><code>toThrow(expected?)</code></li>
      <li><code>toMatch(pattern)</code></li>
      <li><code>toBeGreaterThan(n)</code> / <code>toBeLessThan(n)</code></li>
      <li><code>toBeCloseTo(n, precision?)</code></li>
      <li><code>toHaveProperty(key, value?)</code></li>
      <li><code>toBeInstanceOf(Class)</code></li>
    </ul>
    <h2>Modifiers</h2>
    <ul>
      <li><code>.not</code> &mdash; Negates the matcher</li>
      <li><code>.resolves</code> &mdash; Unwraps a resolved promise</li>
      <li><code>.rejects</code> &mdash; Unwraps a rejected promise</li>
    </ul>
    <p>See the full <a href="https://github.com/asymmetric-effort/NogginLessDom/blob/main/docs/api/assertions.md">documentation on GitHub</a>.</p>
  `,
  'api/dom': `
    <h1>DOM API</h1>
    <p>Provides jsdom-compatible DOM simulation with zero dependencies.</p>
    <h2>Classes</h2>
    <ul>
      <li><code>Document</code> &mdash; createElement, createTextNode, getElementById, querySelector</li>
      <li><code>Element</code> &mdash; attributes, classList, events, innerHTML, querySelector</li>
      <li><code>Node</code> &mdash; appendChild, removeChild, textContent, childNodes</li>
      <li><code>TextNode</code> &mdash; Text content nodes</li>
      <li><code>Event</code> &mdash; Event creation, bubbling, cancellation</li>
    </ul>
    <p>See the full <a href="https://github.com/asymmetric-effort/NogginLessDom/blob/main/docs/api/dom.md">documentation on GitHub</a>.</p>
  `,
  'api/mocking': `
    <h1>Mocking API</h1>
    <p>Provides vitest-compatible mocking utilities.</p>
    <h2>fn(implementation?)</h2>
    <p>Creates a mock function that tracks calls and return values.</p>
    <h2>spyOn(object, method)</h2>
    <p>Creates a spy on an object method.</p>
    <h2>Timer Mocking</h2>
    <ul>
      <li><code>useFakeTimers(now?)</code> &mdash; Replaces global timers</li>
      <li><code>useRealTimers()</code> &mdash; Restores original timers</li>
      <li><code>advanceTimersByTime(ms)</code> &mdash; Advances fake clock</li>
      <li><code>runAllTimers()</code> &mdash; Runs all pending timers</li>
    </ul>
    <p>See the full <a href="https://github.com/asymmetric-effort/NogginLessDom/blob/main/docs/api/mocking.md">documentation on GitHub</a>.</p>
  `,
  docs: `
    <h1>Documentation</h1>
    <h2>User Guide</h2>
    <ul>
      <li><a href="#/getting-started">Getting Started</a></li>
      <li><a href="https://github.com/asymmetric-effort/NogginLessDom/blob/main/docs/user/installation.md">Installation</a></li>
      <li><a href="https://github.com/asymmetric-effort/NogginLessDom/blob/main/docs/user/configuration.md">Configuration</a></li>
      <li><a href="https://github.com/asymmetric-effort/NogginLessDom/blob/main/docs/user/migration-from-vitest.md">Migration from Vitest</a></li>
      <li><a href="https://github.com/asymmetric-effort/NogginLessDom/blob/main/docs/user/migration-from-jsdom.md">Migration from jsdom</a></li>
    </ul>
    <h2>Developer Guide</h2>
    <ul>
      <li><a href="https://github.com/asymmetric-effort/NogginLessDom/blob/main/docs/developer/setup.md">Development Setup</a></li>
      <li><a href="https://github.com/asymmetric-effort/NogginLessDom/blob/main/docs/developer/testing.md">Testing Guide</a></li>
      <li><a href="https://github.com/asymmetric-effort/NogginLessDom/blob/main/docs/developer/building.md">Building</a></li>
      <li><a href="https://github.com/asymmetric-effort/NogginLessDom/blob/main/docs/developer/releasing.md">Releasing</a></li>
    </ul>
    <h2>Architecture</h2>
    <ul>
      <li><a href="https://github.com/asymmetric-effort/NogginLessDom/blob/main/docs/architecture.md">System Architecture</a></li>
    </ul>
  `,
  contributing: `
    <h1>Contributing</h1>
    <p>We welcome contributions! Please read our
    <a href="https://github.com/asymmetric-effort/NogginLessDom/blob/main/CONTRIBUTING.md">Contributing Guide</a>
    for details on our development workflow, coding standards, and PR process.</p>
    <h2>Quick Links</h2>
    <ul>
      <li><a href="https://github.com/asymmetric-effort/NogginLessDom/blob/main/CODE_OF_CONDUCT.md">Code of Conduct</a></li>
      <li><a href="https://github.com/asymmetric-effort/NogginLessDom/blob/main/SECURITY.md">Security Policy</a></li>
      <li><a href="https://github.com/asymmetric-effort/NogginLessDom/issues">Issue Tracker</a></li>
    </ul>
  `,
};

export function MarkdownPage(props: MarkdownPageProps): ReturnType<typeof createElement> {
  // Set document title imperatively (no hooks needed)
  if (typeof document !== 'undefined') {
    document.title = `${props.title} | NogginLessDom`;
  }

  const html = sectionContent[props.section] || '<p>Content not found.</p>';

  return createElement(
    'main',
    {
      style: {
        maxWidth: '800px',
        margin: '0 auto',
        padding: '3rem 2rem',
        color: '#e0e0e0',
        fontFamily: 'system-ui, sans-serif',
        lineHeight: '1.7',
      },
    },
    createElement('div', { dangerouslySetInnerHTML: { __html: html } }),
    createElement(
      'div',
      { style: { marginTop: '3rem', paddingTop: '1rem', borderTop: '1px solid #2a2a3e' } },
      createElement(
        'a',
        { href: '#/', style: { color: '#00d4aa', textDecoration: 'none', fontSize: '0.9rem' } },
        '\u2190 Back to home',
      ),
    ),
  );
}
