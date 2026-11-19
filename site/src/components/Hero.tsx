import { createElement } from '@asymmetric-effort/specifyjs';

export function Hero(): ReturnType<typeof createElement> {
  return createElement(
    'section',
    {
      style: {
        textAlign: 'center',
        padding: '4rem 20px 3rem',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-secondary)',
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
          fontSize: '2rem',
          fontWeight: 'bold',
          marginBottom: '0.5rem',
          color: 'var(--text-primary)',
        },
      },
      'NogginLessDom',
    ),
    createElement(
      'p',
      {
        style: {
          fontSize: '1.1rem',
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
            padding: '8px 24px',
            backgroundColor: 'var(--accent)',
            color: '#ffffff',
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: '600',
            fontSize: '14px',
          },
        },
        'Get Started',
      ),
      createElement(
        'a',
        {
          href: '#/api',
          style: {
            padding: '8px 24px',
            border: '1px solid var(--accent)',
            color: 'var(--accent)',
            borderRadius: '6px',
            textDecoration: 'none',
            fontWeight: '600',
            fontSize: '14px',
          },
        },
        'API Reference',
      ),
    ),
    createElement(
      'pre',
      {
        style: {
          marginTop: '2rem',
          display: 'inline-block',
          padding: '12px 24px',
          backgroundColor: 'var(--code-bg)',
          borderRadius: '6px',
          fontFamily: 'monospace',
          fontSize: '13px',
          lineHeight: '1.5',
          color: 'var(--code-text)',
        },
      },
      'bun add -d @asymmetric-effort/nogginlessdom',
    ),
  );
}
