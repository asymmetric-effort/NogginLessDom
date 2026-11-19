import { createElement } from '@asymmetric-effort/specifyjs';
import { content } from '../generated/content.js';

interface MarkdownPageProps {
  title: string;
  section: string;
}

export function MarkdownPage(
  props: MarkdownPageProps,
): ReturnType<typeof createElement> {
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
      className: 'ns-section-content',
      style: {
        maxWidth: '900px',
        margin: '0 auto',
        padding: '2rem 20px',
        color: 'var(--text-secondary)',
        lineHeight: '1.6',
      },
    },
    createElement('div', { dangerouslySetInnerHTML: { __html: html } }),
    createElement(
      'div',
      {
        style: {
          marginTop: '2rem',
          paddingTop: '1rem',
          borderTop: '1px solid var(--border)',
          fontSize: '13px',
        },
      },
      createElement(
        'a',
        {
          href: '#/',
          style: {
            color: 'var(--accent)',
            textDecoration: 'none',
          },
        },
        '\u2190 Back to home',
      ),
    ),
  );
}
