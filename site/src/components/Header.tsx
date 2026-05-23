import { createElement } from '@asymmetric-effort/specifyjs';

export function Header(): ReturnType<typeof createElement> {
  return createElement(
    'header',
    {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1rem 2rem',
        borderBottom: '1px solid var(--border)',
        backgroundColor: 'var(--bg-primary)',
        position: 'sticky',
        top: '0',
        zIndex: '100',
      },
    },
    createElement(
      'a',
      {
        href: '#/',
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '1.25rem',
          fontWeight: 'bold',
          color: 'var(--accent)',
          textDecoration: 'none',
          fontFamily: 'monospace',
        },
      },
      createElement('img', {
        src: '/logo.png',
        alt: 'NogginLessDom',
        width: '32',
        height: '32',
        style: { borderRadius: '6px' },
      }),
      'NogginLessDom',
    ),
    createElement(
      'nav',
      { style: { display: 'flex', gap: '1.5rem' } },
      createElement(
        'a',
        { href: '#/getting-started', style: navLinkStyle() },
        'Get Started',
      ),
      createElement('a', { href: '#/api', style: navLinkStyle() }, 'API'),
      createElement('a', { href: '#/docs', style: navLinkStyle() }, 'Docs'),
      createElement(
        'a',
        {
          href: 'https://github.com/asymmetric-effort/NogginLessDom',
          style: navLinkStyle(),
          target: '_blank',
          rel: 'noopener noreferrer',
        },
        'GitHub',
      ),
    ),
  );
}

function navLinkStyle(): Record<string, string> {
  return {
    color: 'var(--text-muted)',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontFamily: 'system-ui, sans-serif',
  };
}
