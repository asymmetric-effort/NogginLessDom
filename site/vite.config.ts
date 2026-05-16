import { defineConfig } from 'vite';
import { mkdirSync } from 'fs';
import { specifyJsSeoPlugin, specifyJsNoscriptPlugin } from '@asymmetric-effort/specifyjs/build';

export default defineConfig({
  base: '/',
  plugins: [
    {
      name: 'ensure-dist',
      writeBundle() {
        mkdirSync('dist', { recursive: true });
      },
    },
    specifyJsSeoPlugin({
      siteUrl: 'https://nogginlessdom.asymmetric-effort.com',
      title: 'NogginLessDom',
      description:
        'A zero-dependency testing framework with comprehensive test runner, assertions, DOM simulation, and mocking.' +
        'Built on node:test and node:assert for maximum supply chain security.',
      routes: [
        '/',
        '#/getting-started',
        '#/api',
        '#/api/test-runner',
        '#/api/assertions',
        '#/api/dom',
        '#/api/mocking',
        '#/docs',
        '#/contributing',
      ],
      npmPackage: '@asymmetric-effort/nogginlessdom',
      author: 'Asymmetric Effort, LLC',
      license: 'MIT',
      repository: 'https://github.com/asymmetric-effort/NogginLessDom',
      robotsRules: ['User-agent: *', 'Allow: /'],
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'SoftwareSourceCode',
        name: 'NogginLessDom',
        description:
          'A zero-dependency testing framework with comprehensive test runner, assertions, DOM simulation, and mocking.',
        codeRepository: 'https://github.com/asymmetric-effort/NogginLessDom',
        programmingLanguage: 'TypeScript',
        license: 'https://opensource.org/licenses/MIT',
        author: {
          '@type': 'Organization',
          name: 'Asymmetric Effort, LLC',
        },
      },
    }),
    specifyJsNoscriptPlugin({
      title: 'NogginLessDom',
      sections: [
        {
          id: 'home',
          title: 'Home',
          html: '<h1>NogginLessDom</h1><p>A zero-dependency testing framework with comprehensive test runner, assertions, DOM simulation, and mocking. Built on node:test and node:assert for maximum supply chain security.</p>',
        },
        {
          id: 'getting-started',
          title: 'Getting Started',
          html: '<h2>Installation</h2><pre><code>bun add -d @asymmetric-effort/nogginlessdom</code></pre><h2>First Test</h2><pre><code>import { describe, it, expect } from \'@asymmetric-effort/nogginlessdom\';\n\ndescribe(\'example\', () =&gt; {\n  it(\'works\', () =&gt; {\n    expect(1 + 1).toBe(2);\n  });\n});</code></pre>',
        },
        {
          id: 'api',
          title: 'API Reference',
          html: '<h2>API Reference</h2><ul><li><a href="#api/test-runner">Test Runner</a> &mdash; describe, it, test, beforeEach, afterEach, beforeAll, afterAll</li><li><a href="#api/assertions">Assertions</a> &mdash; expect() with 20+ matchers</li><li><a href="#api/dom">DOM</a> &mdash; Document, Element, Node, Event simulation</li><li><a href="#api/mocking">Mocking</a> &mdash; fn(), spyOn(), fake timers</li></ul>',
        },
        {
          id: 'contributing',
          title: 'Contributing',
          html: '<h2>Contributing</h2><p>See <a href="https://github.com/asymmetric-effort/NogginLessDom/blob/main/CONTRIBUTING.md">CONTRIBUTING.md</a> for guidelines.</p>',
        },
      ],
    }),
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
