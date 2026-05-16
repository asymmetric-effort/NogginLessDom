import { createElement } from '@asymmetric-effort/specifyjs';
import { content } from '../generated/content.js';

interface MarkdownPageProps {
  title: string;
  section: string;
}

export function MarkdownPage(props: MarkdownPageProps): ReturnType<typeof createElement> {
  const entry = content[props.section];
  const title = entry?.title || props.title;
  const html = entry?.html || '<p>Content not found.</p>';

  // Set document title imperatively (no hooks needed)
  if (typeof document !== 'undefined') {
    document.title = `${title} | NogginLessDom`;
  }

  return createElement(
    'main',
    {
      style: {
        maxWidth: '800px',
        margin: '0 auto',
        padding: '3rem 2rem',
        color: 'var(--text-secondary)',
        fontFamily: 'system-ui, sans-serif',
        lineHeight: '1.7',
      },
    },
    createElement('div', { dangerouslySetInnerHTML: { __html: html } }),
    createElement(
      'div',
      { style: { marginTop: '3rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' } },
      createElement(
        'a',
        { href: '#/', style: { color: 'var(--accent)', textDecoration: 'none', fontSize: '0.9rem' } },
        '\u2190 Back to home',
      ),
    ),
  );
}
