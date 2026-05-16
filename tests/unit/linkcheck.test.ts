import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

const PROJECT_ROOT = resolve(import.meta.dirname, '../../');

function getAllMarkdownFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (
      entry === 'node_modules' ||
      entry === 'site' ||
      entry === '.git' ||
      entry === 'build' ||
      entry === 'e2e'
    )
      continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...getAllMarkdownFiles(full));
    } else if (entry.endsWith('.md')) {
      files.push(full);
    }
  }
  return files;
}

function extractLocalLinks(content: string): string[] {
  const links: string[] = [];
  // Match [text](path) but not http/https/mailto links
  const regex = /\[([^\]]*)\]\(([^)]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    const href = match[2]!;
    if (
      !href.startsWith('http://') &&
      !href.startsWith('https://') &&
      !href.startsWith('mailto:') &&
      !href.startsWith('#')
    ) {
      // Strip anchor fragment
      const pathOnly = href.split('#')[0]!;
      if (pathOnly.length > 0) {
        links.push(pathOnly);
      }
    }
  }
  return links;
}

describe('Documentation Link Integrity', () => {
  const mdFiles = getAllMarkdownFiles(PROJECT_ROOT);

  it('should find markdown files', () => {
    assert.ok(mdFiles.length > 0, 'Should find at least one markdown file');
  });

  for (const file of mdFiles) {
    const relativePath = file.replace(PROJECT_ROOT + '/', '');

    it(`no broken links in ${relativePath}`, () => {
      const content = readFileSync(file, 'utf-8');
      const links = extractLocalLinks(content);
      const broken: string[] = [];

      for (const link of links) {
        const resolvedPath = resolve(dirname(file), link);
        if (!existsSync(resolvedPath)) {
          broken.push(`${link} -> ${resolvedPath}`);
        }
      }

      assert.deepStrictEqual(
        broken,
        [],
        `Broken links in ${relativePath}:\n${broken.join('\n')}`,
      );
    });
  }
});

function getDocsMarkdownFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...getDocsMarkdownFiles(full));
    } else if (entry.endsWith('.md')) {
      files.push(full);
    }
  }
  return files;
}

describe('Documentation Tree Content', () => {
  const docsDir = join(PROJECT_ROOT, 'docs');
  const docFiles = getDocsMarkdownFiles(docsDir);

  it('should find markdown files in docs/', () => {
    assert.ok(
      docFiles.length > 0,
      'Should find at least one markdown file in docs/',
    );
  });

  for (const file of docFiles) {
    const relativePath = file.replace(PROJECT_ROOT + '/', '');

    it(`${relativePath} has at least 10 lines of content`, () => {
      const content = readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      assert.ok(
        lines.length >= 10,
        `${relativePath} has only ${lines.length} lines, expected at least 10`,
      );
    });

    it(`${relativePath} starts with a heading`, () => {
      const content = readFileSync(file, 'utf-8');
      const firstLine = content.trimStart().split('\n')[0]!.trim();
      assert.ok(
        firstLine.startsWith('# ') || firstLine.startsWith('## '),
        `${relativePath} does not start with a heading (# or ##). First line: "${firstLine}"`,
      );
    });
  }
});

describe('No Dead Migration File Links', () => {
  const allMdFiles = getAllMarkdownFiles(PROJECT_ROOT);

  it('no links to deleted migration files exist', () => {
    const deadLinks: string[] = [];

    for (const file of allMdFiles) {
      const content = readFileSync(file, 'utf-8');
      const links = extractLocalLinks(content);
      const relativePath = file.replace(PROJECT_ROOT + '/', '');

      for (const link of links) {
        if (/migrat/i.test(link)) {
          const resolvedPath = resolve(dirname(file), link);
          if (!existsSync(resolvedPath)) {
            deadLinks.push(`${relativePath}: ${link} -> ${resolvedPath}`);
          }
        }
      }
    }

    assert.deepStrictEqual(
      deadLinks,
      [],
      `Dead migration file links found:\n${deadLinks.join('\n')}`,
    );
  });
});
