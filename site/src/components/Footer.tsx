import { createElement } from '@asymmetric-effort/specifyjs';
import { Footer as SpecFooter } from '@asymmetric-effort/specifyjs/components';

declare const __APP_VERSION__: string;
const VERSION =
  typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';

export function Footer(): ReturnType<typeof createElement> {
  return SpecFooter({
    left: createElement('span', null, `v${VERSION}`),
    center: createElement(
      'span',
      null,
      'MIT License \u00A9 2024-2026 Asymmetric Effort, LLC',
    ),
    right: createElement(
      'span',
      null,
      createElement(
        'a',
        {
          href: 'https://github.com/asymmetric-effort/NogginLessDom',
          style: { color: 'var(--text-muted)', textDecoration: 'none' },
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
          style: { color: 'var(--text-muted)', textDecoration: 'none' },
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
          style: { color: 'var(--text-muted)', textDecoration: 'none' },
          target: '_blank',
          rel: 'noopener noreferrer',
        },
        'Contributing',
      ),
    ),
    background: 'var(--bg-primary)',
    color: 'var(--text-dimmed)',
    borderTop: '1px solid var(--border)',
    fontSize: '0.85rem',
    padding: '2rem',
  });
}
