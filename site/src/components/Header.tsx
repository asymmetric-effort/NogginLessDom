import { createElement } from '@asymmetric-effort/specifyjs';

export function Header(): ReturnType<typeof createElement> {
  return createElement(
    'header',
    {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 20px',
        borderBottom: '1px solid var(--border)',
        backgroundColor: 'var(--bg-primary)',
        position: 'sticky',
        top: '0',
        zIndex: '10',
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
          color: 'var(--text-primary)',
          textDecoration: 'none',
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
      { style: { display: 'flex', flexWrap: 'wrap', gap: '8px' } },
      navLink('#/', 'Home'),
      navLink('#/getting-started', 'Get Started'),
      navLink('#/api', 'API'),
      navLink('#/docs', 'Docs'),
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

function navLink(
  href: string,
  text: string,
): ReturnType<typeof createElement> {
  return createElement('a', { href, style: navLinkStyle() }, text);
}

function navLinkStyle(): Record<string, string> {
  return {
    padding: '6px 14px',
    borderRadius: '6px',
    backgroundColor: 'var(--bg-tertiary)',
    color: 'var(--accent)',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '500',
  };
}
