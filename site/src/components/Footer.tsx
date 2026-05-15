import { createElement } from '@asymmetric-effort/specifyjs';

export function Footer(): ReturnType<typeof createElement> {
  return createElement(
    'footer',
    {
      style: {
        padding: '2rem',
        textAlign: 'center',
        borderTop: '1px solid #2a2a3e',
        backgroundColor: '#0d0d1a',
        fontFamily: 'system-ui, sans-serif',
        color: '#666',
        fontSize: '0.85rem',
      },
    },
    createElement(
      'p',
      null,
      'MIT License \u00A9 2024\u20132026 ',
      createElement(
        'a',
        {
          href: 'https://github.com/asymmetric-effort',
          style: { color: '#00d4aa', textDecoration: 'none' },
          target: '_blank',
          rel: 'noopener noreferrer',
        },
        'Asymmetric Effort, LLC',
      ),
    ),
    createElement(
      'p',
      { style: { marginTop: '0.5rem' } },
      createElement(
        'a',
        {
          href: 'https://github.com/asymmetric-effort/NogginLessDom',
          style: { color: '#888', textDecoration: 'none' },
          target: '_blank',
          rel: 'noopener noreferrer',
        },
        'GitHub',
      ),
      ' \u00B7 ',
      createElement(
        'a',
        {
          href: 'https://github.com/asymmetric-effort/NogginLessDom/blob/main/SECURITY.md',
          style: { color: '#888', textDecoration: 'none' },
          target: '_blank',
          rel: 'noopener noreferrer',
        },
        'Security',
      ),
      ' \u00B7 ',
      createElement(
        'a',
        {
          href: 'https://github.com/asymmetric-effort/NogginLessDom/blob/main/CONTRIBUTING.md',
          style: { color: '#888', textDecoration: 'none' },
          target: '_blank',
          rel: 'noopener noreferrer',
        },
        'Contributing',
      ),
    ),
  );
}
