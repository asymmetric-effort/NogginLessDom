import { createElement } from '@asymmetric-effort/specifyjs';

export function QuickStart(): ReturnType<typeof createElement> {
  const example = `import { describe, it, expect } from '@asymmetric-effort/nogginlessdom';

describe('math', () => {
  it('adds numbers', () => {
    expect(1 + 1).toBe(2);
  });

  it('compares objects deeply', () => {
    expect({ a: 1, b: [2, 3] }).toEqual({ a: 1, b: [2, 3] });
  });

  it('checks types and properties', () => {
    expect('hello world').toContain('world');
    expect({ name: 'test' }).toHaveProperty('name');
    expect(() => { throw new Error('fail'); }).toThrow('fail');
  });
});`;

  const domExample = `import { describe, it, expect, Document } from '@asymmetric-effort/nogginlessdom';

describe('DOM', () => {
  it('creates and queries elements', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    div.setAttribute('id', 'app');
    div.classList.add('container');
    const span = doc.createElement('span');
    span.textContent = 'Hello';
    div.appendChild(span);

    expect(div.querySelector('span').textContent).toBe('Hello');
    expect(div.classList.contains('container')).toBe(true);
  });
});`;

  const mockExample = `import { describe, it, expect, vi } from '@asymmetric-effort/nogginlessdom';

describe('mocking', () => {
  it('tracks calls with vi.fn()', () => {
    const mockFn = vi.fn((x: number) => x * 2);
    mockFn(5);

    expect(mockFn).toHaveBeenCalledWith(5);
    expect(mockFn).toHaveReturnedWith(10);
  });

  it('uses fake timers', () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    setTimeout(callback, 1000);
    vi.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalled();
    vi.useRealTimers();
  });
});`;

  return createElement(
    'section',
    {
      style: {
        padding: '3rem 20px',
        backgroundColor: 'var(--bg-secondary)',
      },
    },
    createElement(
      'h2',
      {
        style: {
          textAlign: 'center',
          color: 'var(--text-primary)',
          marginBottom: '2rem',
          fontSize: '1.5rem',
        },
      },
      'Quick Start',
    ),
    createElement(
      'div',
      {
        style: {
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
          maxWidth: '900px',
          margin: '0 auto',
        },
      },
      codeBlock('Unit Testing', example),
      codeBlock('DOM Testing', domExample),
      codeBlock('Mocking & Timers', mockExample),
    ),
  );
}

function codeBlock(
  title: string,
  code: string,
): ReturnType<typeof createElement> {
  return createElement(
    'div',
    null,
    createElement(
      'h3',
      {
        style: {
          color: 'var(--text-primary)',
          marginBottom: '0.5rem',
          fontSize: '1.2rem',
        },
      },
      title,
    ),
    createElement(
      'pre',
      {
        style: {
          padding: '12px 16px',
          backgroundColor: 'var(--code-bg)',
          borderRadius: '6px',
          overflow: 'auto',
          fontSize: '13px',
          lineHeight: '1.5',
          color: 'var(--code-text)',
          fontFamily: 'monospace',
        },
      },
      createElement('code', null, code),
    ),
  );
}
