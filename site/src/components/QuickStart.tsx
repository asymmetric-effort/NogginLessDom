import { createElement } from '@asymmetric-effort/specifyjs';

export function QuickStart(): ReturnType<typeof createElement> {
  const example = `import { describe, it, expect } from '@asymmetric-effort/nogginlessdom';

describe('math', () => {
  it('adds numbers', () => {
    expect(1 + 1).toBe(2);
  });

  it('compares objects', () => {
    expect({ a: 1 }).toEqual({ a: 1 });
  });
});`;

  const domExample = `import { describe, it, expect, Document } from '@asymmetric-effort/nogginlessdom';

describe('DOM', () => {
  it('creates elements', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    div.setAttribute('id', 'app');
    div.textContent = 'Hello';

    expect(div.tagName).toBe('DIV');
    expect(div.id).toBe('app');
    expect(div.textContent).toBe('Hello');
  });
});`;

  return createElement(
    'section',
    {
      style: {
        padding: '4rem 2rem',
        backgroundColor: 'var(--bg-tertiary)',
        fontFamily: 'system-ui, sans-serif',
      },
    },
    createElement(
      'h2',
      { style: { textAlign: 'center', color: 'var(--text-primary)', marginBottom: '2rem', fontSize: '2rem' } },
      'Quick Start',
    ),
    createElement(
      'div',
      {
        style: {
          display: 'flex',
          flexWrap: 'wrap',
          gap: '2rem',
          maxWidth: '960px',
          margin: '0 auto',
        },
      },
      codeBlock('Unit Testing', example),
      codeBlock('DOM Testing', domExample),
    ),
  );
}

function codeBlock(title: string, code: string): ReturnType<typeof createElement> {
  return createElement(
    'div',
    { style: { flex: '1', minWidth: '300px' } },
    createElement(
      'h3',
      { style: { color: 'var(--accent)', marginBottom: '0.75rem', fontSize: '1rem' } },
      title,
    ),
    createElement(
      'pre',
      {
        style: {
          padding: '1.5rem',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: '8px',
          border: '1px solid var(--border)',
          overflow: 'auto',
          fontSize: '0.85rem',
          lineHeight: '1.5',
          color: 'var(--text-secondary)',
          fontFamily: 'monospace',
        },
      },
      createElement('code', null, code),
    ),
  );
}
