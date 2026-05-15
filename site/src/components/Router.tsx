import { createElement, useState, useEffect } from '@asymmetric-effort/specifyjs';
import { Hero } from './Hero.js';
import { Features } from './Features.js';
import { QuickStart } from './QuickStart.js';
import { ApiOverview } from './ApiOverview.js';
import { MarkdownPage } from './MarkdownPage.js';

function getHash(): string {
  return globalThis.location?.hash?.slice(1) || '/';
}

export function Router(): ReturnType<typeof createElement> {
  const [route, setRoute] = useState(getHash());

  useEffect(() => {
    const handler = (): void => setRoute(getHash());
    globalThis.addEventListener('hashchange', handler);
    return (): void => globalThis.removeEventListener('hashchange', handler);
  }, []);

  switch (route) {
    case '/':
      return createElement(
        'main',
        null,
        createElement(Hero, null),
        createElement(Features, null),
        createElement(QuickStart, null),
        createElement(ApiOverview, null),
      );
    case '/getting-started':
      return createElement(MarkdownPage, { title: 'Getting Started', section: 'getting-started' });
    case '/api':
      return createElement(MarkdownPage, { title: 'API Reference', section: 'api' });
    case '/api/test-runner':
      return createElement(MarkdownPage, { title: 'Test Runner API', section: 'api/test-runner' });
    case '/api/assertions':
      return createElement(MarkdownPage, { title: 'Assertions API', section: 'api/assertions' });
    case '/api/dom':
      return createElement(MarkdownPage, { title: 'DOM API', section: 'api/dom' });
    case '/api/mocking':
      return createElement(MarkdownPage, { title: 'Mocking API', section: 'api/mocking' });
    case '/docs':
      return createElement(MarkdownPage, { title: 'Documentation', section: 'docs' });
    case '/contributing':
      return createElement(MarkdownPage, { title: 'Contributing', section: 'contributing' });
    default:
      return createElement(
        'main',
        {
          style: {
            padding: '4rem 2rem',
            textAlign: 'center',
            color: '#aaa',
            fontFamily: 'system-ui, sans-serif',
          },
        },
        createElement('h1', { style: { color: '#fff' } }, '404'),
        createElement('p', null, 'Page not found.'),
        createElement(
          'a',
          { href: '#/', style: { color: '#00d4aa', textDecoration: 'none' } },
          'Go home',
        ),
      );
  }
}
