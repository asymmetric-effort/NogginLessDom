import { createElement } from '@asymmetric-effort/specifyjs';

export function Hero(): ReturnType<typeof createElement> {
  return createElement(
    'section',
    {
      style: {
        textAlign: 'center',
        padding: '6rem 2rem 4rem',
        backgroundColor: '#0d0d1a',
        color: '#e0e0e0',
        fontFamily: 'system-ui, sans-serif',
      },
    },
    createElement(
      'h1',
      { style: { fontSize: '3rem', fontWeight: 'bold', marginBottom: '1rem', color: '#fff' } },
      'NogginLessDom',
    ),
    createElement(
      'p',
      {
        style: {
          fontSize: '1.25rem',
          maxWidth: '640px',
          margin: '0 auto 2rem',
          lineHeight: '1.6',
          color: '#aaa',
        },
      },
      'A zero-dependency testing framework with vitest and jsdom feature parity. Built on node:test and node:assert for maximum supply chain security.',
    ),
    createElement(
      'div',
      { style: { display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' } },
      createElement(
        'a',
        {
          href: '#/getting-started',
          style: {
            padding: '0.75rem 2rem',
            backgroundColor: '#00d4aa',
            color: '#0d0d1a',
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: 'bold',
            fontSize: '1rem',
          },
        },
        'Get Started',
      ),
      createElement(
        'a',
        {
          href: '#/api',
          style: {
            padding: '0.75rem 2rem',
            border: '1px solid #00d4aa',
            color: '#00d4aa',
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: 'bold',
            fontSize: '1rem',
          },
        },
        'API Reference',
      ),
    ),
    createElement(
      'pre',
      {
        style: {
          marginTop: '3rem',
          display: 'inline-block',
          padding: '1rem 2rem',
          backgroundColor: '#1a1a2e',
          borderRadius: '8px',
          fontFamily: 'monospace',
          fontSize: '0.9rem',
          color: '#00d4aa',
        },
      },
      'bun add -d @asymmetric-effort/nogginlessdom',
    ),
  );
}
