import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  shouldIncludeFile,
  matchesPattern,
} from '../../src/coverage/filter.js';
import type { CoverageConfig } from '../../src/coverage/config.js';

function makeConfig(overrides: Partial<CoverageConfig> = {}): CoverageConfig {
  return {
    enabled: true,
    provider: 'v8',
    include: ['**/*.ts', '**/*.js'],
    exclude: [],
    reportsDirectory: './coverage',
    reporter: ['text'],
    clean: true,
    skipFull: false,
    all: false,
    watermarks: {
      lines: [50, 80],
      functions: [50, 80],
      branches: [50, 80],
      statements: [50, 80],
    },
    ...overrides,
  };
}

describe('shouldIncludeFile', () => {
  describe('include patterns', () => {
    it('should include files matching include patterns', () => {
      const config = makeConfig({ include: ['src/**/*.ts'] });
      assert.equal(shouldIncludeFile('src/index.ts', config), true);
    });

    it('should exclude files not matching include patterns', () => {
      const config = makeConfig({ include: ['src/**/*.ts'] });
      assert.equal(shouldIncludeFile('lib/index.js', config), false);
    });

    it('should support * wildcard matching non-slash chars', () => {
      const config = makeConfig({ include: ['src/*.ts'] });
      assert.equal(shouldIncludeFile('src/index.ts', config), true);
      assert.equal(shouldIncludeFile('src/deep/index.ts', config), false);
    });

    it('should support ** wildcard matching across directories', () => {
      const config = makeConfig({ include: ['src/**/*.ts'] });
      assert.equal(shouldIncludeFile('src/deep/nested/file.ts', config), true);
    });

    it('should support ? wildcard matching single character', () => {
      const config = makeConfig({ include: ['src/?.ts'] });
      assert.equal(shouldIncludeFile('src/a.ts', config), true);
      assert.equal(shouldIncludeFile('src/ab.ts', config), false);
    });

    it('should include all files when include is empty', () => {
      const config = makeConfig({ include: [] });
      assert.equal(shouldIncludeFile('anything.ts', config), true);
    });
  });

  describe('exclude patterns', () => {
    it('should exclude files matching exclude patterns', () => {
      const config = makeConfig({
        include: ['**/*.ts'],
        exclude: ['**/*.test.ts'],
      });
      assert.equal(shouldIncludeFile('src/index.test.ts', config), false);
    });

    it('should include files not matching exclude patterns', () => {
      const config = makeConfig({
        include: ['**/*.ts'],
        exclude: ['**/*.test.ts'],
      });
      assert.equal(shouldIncludeFile('src/index.ts', config), true);
    });
  });

  describe('default excludes', () => {
    it('should exclude node_modules by default', () => {
      const config = makeConfig({ include: ['**/*.ts'] });
      assert.equal(
        shouldIncludeFile('node_modules/pkg/index.ts', config),
        false,
      );
    });

    it('should exclude .git by default', () => {
      const config = makeConfig({ include: ['**/*.ts'] });
      assert.equal(
        shouldIncludeFile('.git/hooks/pre-commit.ts', config),
        false,
      );
    });

    it('should exclude test directories by default', () => {
      const config = makeConfig({ include: ['**/*.ts'] });
      assert.equal(shouldIncludeFile('test/some.test.ts', config), false);
      assert.equal(shouldIncludeFile('tests/some.test.ts', config), false);
    });

    it('should exclude coverage directory by default', () => {
      const config = makeConfig({ include: ['**/*.ts'] });
      assert.equal(shouldIncludeFile('coverage/lcov.info', config), false);
    });

    it('should exclude dist and build directories by default', () => {
      const config = makeConfig({ include: ['**/*.ts'] });
      assert.equal(shouldIncludeFile('dist/index.ts', config), false);
      assert.equal(shouldIncludeFile('build/index.ts', config), false);
    });
  });

  describe('glob edge cases', () => {
    it('should handle patterns without wildcards as literal match', () => {
      const config = makeConfig({ include: ['src/index.ts'] });
      assert.equal(shouldIncludeFile('src/index.ts', config), true);
      assert.equal(shouldIncludeFile('src/other.ts', config), false);
    });

    it('should handle dot files', () => {
      const config = makeConfig({ include: ['**/*.ts'] });
      assert.equal(shouldIncludeFile('.hidden/file.ts', config), true);
    });
  });

  // GHSA-f9pv-ghr6-r2qm: ReDoS in glob-to-regex
  describe('globToRegex metacharacter escaping', () => {
    it('should escape parentheses in glob patterns', () => {
      assert.equal(matchesPattern('src/(test).ts', 'src/(test).ts'), true);
      assert.equal(matchesPattern('src/test.ts', 'src/(test).ts'), false);
    });

    it('should escape square brackets in glob patterns', () => {
      assert.equal(matchesPattern('src/[file].ts', 'src/[file].ts'), true);
    });

    it('should escape curly braces in glob patterns', () => {
      assert.equal(matchesPattern('src/{file}.ts', 'src/{file}.ts'), true);
    });

    it('should escape plus sign in glob patterns', () => {
      assert.equal(matchesPattern('src/a+b.ts', 'src/a+b.ts'), true);
      assert.equal(matchesPattern('src/aab.ts', 'src/a+b.ts'), false);
    });

    it('should escape pipe in glob patterns', () => {
      assert.equal(matchesPattern('src/a|b.ts', 'src/a|b.ts'), true);
    });

    it('should escape caret in glob patterns', () => {
      assert.equal(matchesPattern('src/^test.ts', 'src/^test.ts'), true);
    });

    it('should escape dollar sign in glob patterns', () => {
      assert.equal(matchesPattern('src/test$.ts', 'src/test$.ts'), true);
    });

    it('should not cause ReDoS with crafted metacharacter input', () => {
      const start = Date.now();
      // This would hang with unescaped metacharacters in the regex
      matchesPattern(
        'aaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        '((((((((((((((((((((((((((((',
      );
      const elapsed = Date.now() - start;
      // Should complete in well under 1 second
      assert.ok(
        elapsed < 1000,
        `globToRegex took ${elapsed}ms, possible ReDoS`,
      );
    });
  });
});
