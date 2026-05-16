/**
 * Build-time content generation script.
 * Reads markdown files and generates a TypeScript module with HTML content.
 *
 * Usage: bun scripts/build-content.ts
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { markdownToHtml } from './markdown.js';

const ROOT = resolve(dirname(import.meta.path), '..', '..');
const OUT_DIR = resolve(dirname(import.meta.path), '..', 'src', 'generated');

// Route mapping: file path (relative to project root) → content key
const routeMap: Array<[string, string]> = [
  ['README.md', 'home'],
  ['docs/getting-started.md', 'getting-started'],
  ['docs/api/README.md', 'api'],
  ['docs/api/test-runner.md', 'api/test-runner'],
  ['docs/api/assertions.md', 'api/assertions'],
  ['docs/api/dom.md', 'api/dom'],
  ['docs/api/mocking.md', 'api/mocking'],
  ['docs/README.md', 'docs'],
  ['docs/architecture.md', 'architecture'],
  ['docs/developer/README.md', 'developer'],
  ['docs/developer/setup.md', 'developer/setup'],
  ['docs/developer/testing.md', 'developer/testing'],
  ['docs/developer/building.md', 'developer/building'],
  ['docs/developer/releasing.md', 'developer/releasing'],
  ['docs/user/README.md', 'user'],
  ['docs/user/installation.md', 'user/installation'],
  ['docs/user/configuration.md', 'user/configuration'],
];

function extractTitle(markdown: string): string {
  const match = markdown.match(/^#\s+(.+)/m);
  return match ? match[1].trim() : 'Untitled';
}

function stripReadmeHeader(markdown: string): string {
  // Remove markdownlint-disable comment and the logo/image header from README.md
  let result = markdown;
  // Remove <!-- markdownlint-disable ... --> lines
  result = result.replace(/<!--\s*markdownlint-disable[^>]*-->\s*/g, '');
  // Remove the <img> logo tag and surrounding whitespace
  result = result.replace(/<img[^>]*\/?\s*>\s*/g, '');
  // Remove <br clear="both" /> tags
  result = result.replace(/<br[^>]*\/?\s*>\s*/g, '');
  return result.trim();
}

// Build a reverse map: file path → hash route for link rewriting
const fileToRoute = new Map<string, string>();
for (const [filePath, key] of routeMap) {
  fileToRoute.set(filePath, `#/${key === 'home' ? '' : key}`);
  // Also map without docs/ prefix for relative links from within docs/
  if (filePath.startsWith('docs/')) {
    fileToRoute.set(filePath.slice(5), `#/${key}`);
  }
}

const GITHUB_BASE = 'https://github.com/asymmetric-effort/NogginLessDom/blob/main/';

/**
 * Rewrite links in generated HTML:
 * - Relative .md links → hash routes (#/route)
 * - Root files (CONTRIBUTING.md, SECURITY.md, LICENSE.txt) → GitHub URLs
 * - Directory links (docs/api/) → hash routes
 */
function rewriteLinks(html: string, sourceKey: string): string {
  return html.replace(/href="([^"]+)"/g, (_match, href: string) => {
    // Skip external links and already-hash links
    if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('#')) {
      return `href="${href}"`;
    }

    // Resolve relative paths based on source file location
    let resolved = href;
    const sourceDir = sourceKey.includes('/') ? sourceKey.replace(/\/[^/]+$/, '') : '';

    // Strip anchor fragments for lookup
    const anchorIdx = resolved.indexOf('#');
    const anchor = anchorIdx !== -1 ? resolved.slice(anchorIdx) : '';
    const pathOnly = anchorIdx !== -1 ? resolved.slice(0, anchorIdx) : resolved;

    if (pathOnly === '') {
      // Pure anchor link
      return `href="${href}"`;
    }

    // Try to resolve relative to source directory
    // sourceKey 'developer' means the file is docs/developer/README.md
    // so relative links like 'setup.md' should resolve to docs/developer/setup.md
    const candidates = [
      pathOnly,
      sourceDir ? `${sourceDir}/${pathOnly}` : pathOnly,
      `${sourceKey}/${pathOnly}`,
      `docs/${pathOnly}`,
      `docs/${sourceDir}/${pathOnly}`,
      `docs/${sourceKey}/${pathOnly}`,
    ];

    for (const candidate of candidates) {
      // Normalize: remove ../ and ./
      const normalized = candidate
        .replace(/^\.\//, '')
        .replace(/[^/]+\/\.\.\//g, '')
        .replace(/\/+/g, '/');

      if (fileToRoute.has(normalized)) {
        return `href="${fileToRoute.get(normalized)!}${anchor}"`;
      }

      // Try with /README.md for directory links
      const dirReadme = normalized.replace(/\/$/, '') + '/README.md';
      if (fileToRoute.has(dirReadme)) {
        return `href="${fileToRoute.get(dirReadme)!}${anchor}"`;
      }
    }

    // Root project files → GitHub links
    if (pathOnly.match(/^(\.\.\/)*[A-Z][A-Z_]+\.(md|txt)$/)) {
      const filename = pathOnly.replace(/^\.\.\//g, '');
      return `href="${GITHUB_BASE}${filename}"`;
    }

    // Unresolved — point to GitHub as fallback
    const cleanPath = pathOnly.replace(/^\.\.\//g, '');
    return `href="${GITHUB_BASE}${cleanPath}"`;
  });
}

function main() {
  if (!existsSync(OUT_DIR)) {
    mkdirSync(OUT_DIR, { recursive: true });
  }

  const entries: Record<string, { title: string; html: string }> = {};

  for (const [filePath, key] of routeMap) {
    const fullPath = resolve(ROOT, filePath);
    if (!existsSync(fullPath)) {
      console.warn(`Warning: ${filePath} not found, skipping.`);
      continue;
    }

    let markdown = readFileSync(fullPath, 'utf-8');

    // Strip header from root README
    if (key === 'home') {
      markdown = stripReadmeHeader(markdown);
    }

    const title = extractTitle(markdown);
    const rawHtml = markdownToHtml(markdown);
    const html = rewriteLinks(rawHtml, key);

    entries[key] = { title, html };
    console.log(`  ${key}: "${title}" (${html.length} bytes)`);
  }

  // Generate TypeScript module
  const tsContent = `// Auto-generated by scripts/build-content.ts — do not edit manually.
export const content: Record<string, { title: string; html: string }> = ${JSON.stringify(entries, null, 2)};
`;

  const outPath = resolve(OUT_DIR, 'content.ts');
  writeFileSync(outPath, tsContent, 'utf-8');

  // Also write pure JSON for vite.config.ts noscript plugin consumption
  const jsonPath = resolve(OUT_DIR, 'content.json');
  writeFileSync(jsonPath, JSON.stringify(entries, null, 2), 'utf-8');

  console.log(`\nGenerated ${outPath} with ${Object.keys(entries).length} pages.`);
}

main();
