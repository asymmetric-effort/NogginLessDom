import { defineConfig } from 'vite';
import { mkdirSync, readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { specifyJsSeoPlugin, specifyJsNoscriptPlugin } from '@asymmetric-effort/specifyjs/build';

const VERSION = readFileSync(resolve(__dirname, '../VERSION'), 'utf-8').trim();

// Load generated content for noscript fallback (built by prebuild script)
const contentPath = resolve(__dirname, 'src/generated/content.json');
let noscriptSections: Array<{ id: string; title: string; html: string }> = [];

if (existsSync(contentPath)) {
  try {
    const parsed = JSON.parse(readFileSync(contentPath, 'utf-8')) as Record<string, { title: string; html: string }>;
    for (const [id, entry] of Object.entries(parsed)) {
      noscriptSections.push({ id, title: entry.title, html: entry.html });
    }
  } catch {
    // Fall through to fallback
  }
}

// Fallback if content not generated yet
if (noscriptSections.length === 0) {
  noscriptSections = [
    { id: 'home', title: 'Home', html: '<h1>NogginLessDom</h1><p>A zero-dependency testing framework.</p>' },
  ];
}

const allRoutes = [
  '/',
  '#/getting-started',
  '#/api',
  '#/api/test-runner',
  '#/api/assertions',
  '#/api/dom',
  '#/api/mocking',
  '#/docs',
  '#/architecture',
  '#/developer',
  '#/developer/setup',
  '#/developer/testing',
  '#/developer/building',
  '#/developer/releasing',
  '#/user',
  '#/user/installation',
  '#/user/configuration',
  '#/contributing',
];

export default defineConfig({
  base: '/',
  define: {
    __APP_VERSION__: JSON.stringify(VERSION),
  },
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
        'A zero-dependency testing framework with comprehensive test runner, assertions, DOM simulation, and mocking. ' +
        'Built on node:test and node:assert for maximum supply chain security.',
      routes: allRoutes,
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
      sections: noscriptSections,
    }),
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
