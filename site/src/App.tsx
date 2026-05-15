import { createElement, useState, useHead } from '@asymmetric-effort/specifyjs';
import { Header } from './components/Header.js';
import { Hero } from './components/Hero.js';
import { Features } from './components/Features.js';
import { QuickStart } from './components/QuickStart.js';
import { ApiOverview } from './components/ApiOverview.js';
import { Footer } from './components/Footer.js';
import { Router } from './components/Router.js';

export function App(): ReturnType<typeof createElement> {
  useHead({
    title: 'NogginLessDom — Zero-Dependency Testing Framework',
    meta: [
      {
        name: 'description',
        content:
          'A zero-dependency testing framework with vitest and jsdom feature parity. Built on node:test and node:assert.',
      },
      { name: 'keywords', content: 'testing, vitest, jsdom, zero-dependency, typescript, security' },
      { property: 'og:title', content: 'NogginLessDom' },
      {
        property: 'og:description',
        content: 'Zero-dependency testing framework with vitest and jsdom feature parity.',
      },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: 'https://nogginlessdom.asymmetric-effort.com' },
    ],
  });

  return createElement(
    'div',
    { className: 'app' },
    createElement(Header, null),
    createElement(Router, null),
    createElement(Footer, null),
  );
}
