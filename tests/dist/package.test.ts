/**
 * Package validation tests — verifies npm pack produces a correct package.
 *
 * Uses node:test as the test runner.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..', '..');

describe('dist: npm pack produces a valid package', () => {
  let packOutput: string;

  it('npm pack --dry-run succeeds and lists expected files', () => {
    packOutput = execSync('npm pack --dry-run 2>&1', {
      cwd: projectRoot,
      encoding: 'utf-8',
    });

    // Verify key files appear in pack output
    assert.ok(
      packOutput.includes('build/index.js'),
      'pack should include build/index.js',
    );
    assert.ok(
      packOutput.includes('build/index.d.ts'),
      'pack should include build/index.d.ts',
    );
    assert.ok(
      packOutput.includes('LICENSE.txt'),
      'pack should include LICENSE.txt',
    );
    assert.ok(
      packOutput.includes('README.md'),
      'pack should include README.md',
    );
    assert.ok(
      packOutput.includes('package.json'),
      'pack should include package.json',
    );
  });

  it('package.json has correct main/types/exports fields', () => {
    const pkgPath = resolve(projectRoot, 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

    assert.equal(
      pkg.main,
      'build/index.js',
      'main should point to build/index.js',
    );
    assert.equal(
      pkg.types,
      'build/index.d.ts',
      'types should point to build/index.d.ts',
    );

    assert.ok(pkg.exports, 'exports field should exist');
    assert.ok(pkg.exports['.'], 'exports["."] should exist');
    assert.equal(
      pkg.exports['.'].import,
      './build/index.js',
      'exports["."].import should point to ./build/index.js',
    );
    assert.equal(
      pkg.exports['.'].types,
      './build/index.d.ts',
      'exports["."].types should point to ./build/index.d.ts',
    );
  });

  it('package.json files field includes build/, LICENSE.txt, README.md', () => {
    const pkgPath = resolve(projectRoot, 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

    assert.ok(Array.isArray(pkg.files), 'files should be an array');
    assert.ok(pkg.files.includes('build/'), 'files should include "build/"');
    assert.ok(
      pkg.files.includes('LICENSE.txt'),
      'files should include "LICENSE.txt"',
    );
    assert.ok(
      pkg.files.includes('README.md'),
      'files should include "README.md"',
    );
  });
});
