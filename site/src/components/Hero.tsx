import { createElement } from '@asymmetric-effort/specifyjs';

export function Hero(): ReturnType<typeof createElement> {
  return createElement(
    'section',
    {
      style: {
        textAlign: 'center',
        padding: '6rem 2rem 4rem',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-secondary)',
        fontFamily: 'system-ui, sans-serif',
      },
    },
    createElement('img', {
      src: '/logo.png',
      alt: 'NogginLessDom',
      width: '96',
      height: '96',
      style: { borderRadius: '16px', marginBottom: '1.5rem' },
    }),
    createElement(
      'h1',
      {
        style: {
          fontSize: '3rem',
          fontWeight: 'bold',
          marginBottom: '1rem',
          color: 'var(--text-primary)',
        },
      },
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
          color: 'var(--text-muted)',
        },
      },
      'A zero-dependency TypeScript testing framework with 30+ assertion matchers, 23+ typed HTML elements, complete mocking with vi namespace, snapshot testing, and built-in code coverage. 2,100+ tests across 58 source files ensure rock-solid reliability with maximum supply chain security.',
    ),
    createElement(
      'div',
      {
        style: {
          display: 'flex',
          gap: '1rem',
          justifyContent: 'center',
          flexWrap: 'wrap',
        },
      },
      createElement(
        'a',
        {
          href: '#/getting-started',
          style: {
            padding: '0.75rem 2rem',
            backgroundColor: 'var(--accent)',
            color: 'var(--bg-primary)',
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
            border: '1px solid var(--accent)',
            color: 'var(--accent)',
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
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: '8px',
          fontFamily: 'monospace',
          fontSize: '0.9rem',
          color: 'var(--accent)',
        },
      },
      'bun add -d @asymmetric-effort/nogginlessdom',
    ),
  );
}
