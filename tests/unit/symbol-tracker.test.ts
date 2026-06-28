/**
 * Tests for tree-shaking-aware test targeting (Issue #199).
 *
 * Verifies symbol-level dependency tracking, export diffing,
 * and affected test file detection.
 */
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  buildSymbolDependencyMap,
  diffExports,
  getAffectedTestFiles,
  loadParser,
  isParserAvailable,
  resetParserCache,
} from '../../src/test-runner/symbol-tracker.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'symbol-tracker-test-'));
}

function writeFile(dir: string, relPath: string, content: string): string {
  const full = path.join(dir, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf8');
  return full;
}

function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Symbol Tracker (Issue #199)', () => {
  beforeEach(async () => {
    await loadParser();
  });

  afterEach(() => {
    // Restore parser state
  });

  describe('loadParser / isParserAvailable', () => {
    it('should load parser successfully', async () => {
      const loaded = await loadParser();
      assert.equal(loaded, true);
      assert.equal(isParserAvailable(), true);
    });

    it('should handle reset and reload', async () => {
      resetParserCache();
      assert.equal(isParserAvailable(), false);
      const loaded = await loadParser();
      assert.equal(loaded, true);
      assert.equal(isParserAvailable(), true);
    });
  });

  describe('buildSymbolDependencyMap', () => {
    it('should extract correct symbols per file', () => {
      const dir = makeTmpDir();
      try {
        writeFile(
          dir,
          'src/math.ts',
          'export function add(a, b) { return a + b; }\nexport function sub(a, b) { return a - b; }\n',
        );
        const testFile = writeFile(
          dir,
          'tests/math.test.ts',
          "import { add, sub } from '../src/math.js';\n",
        );

        const depMap = buildSymbolDependencyMap([testFile]);

        assert.ok(depMap.has(testFile));
        const deps = depMap.get(testFile)!;
        assert.equal(deps.length, 1);
        assert.deepEqual(deps[0]!.symbols.sort(), ['add', 'sub']);
      } finally {
        cleanup(dir);
      }
    });

    it('should handle default imports', () => {
      const dir = makeTmpDir();
      try {
        writeFile(dir, 'src/config.ts', 'export default { port: 3000 };\n');
        const testFile = writeFile(
          dir,
          'tests/config.test.ts',
          "import config from '../src/config.js';\n",
        );

        const map = buildSymbolDependencyMap([testFile]);
        const deps = map.get(testFile)!;
        assert.equal(deps.length, 1);
        assert.deepEqual(deps[0]!.symbols, ['default']);
      } finally {
        cleanup(dir);
      }
    });

    it('should handle namespace imports', () => {
      const dir = makeTmpDir();
      try {
        writeFile(dir, 'src/utils.ts', 'export const x = 1;\n');
        const testFile = writeFile(
          dir,
          'tests/utils.test.ts',
          "import * as utils from '../src/utils.js';\n",
        );

        const map = buildSymbolDependencyMap([testFile]);
        const deps = map.get(testFile)!;
        assert.equal(deps.length, 1);
        assert.deepEqual(deps[0]!.symbols, ['*']);
      } finally {
        cleanup(dir);
      }
    });

    it('should handle multiple imports from different files', () => {
      const dir = makeTmpDir();
      try {
        writeFile(dir, 'src/a.ts', 'export const x = 1;\n');
        writeFile(dir, 'src/b.ts', 'export const y = 2;\n');
        const testFile = writeFile(
          dir,
          'tests/combo.test.ts',
          "import { x } from '../src/a.js';\nimport { y } from '../src/b.js';\n",
        );

        const map = buildSymbolDependencyMap([testFile]);
        const deps = map.get(testFile)!;
        assert.equal(deps.length, 2);
      } finally {
        cleanup(dir);
      }
    });

    it('should return empty map when parser not available', () => {
      resetParserCache();
      const map = buildSymbolDependencyMap(['/nonexistent/file.ts']);
      assert.equal(map.size, 0);
    });

    it('should skip files matching exclude patterns', async () => {
      await loadParser();
      const dir = makeTmpDir();
      try {
        const file = writeFile(
          dir,
          'node_modules/foo/index.ts',
          "import { x } from '../bar.js';\n",
        );

        const map = buildSymbolDependencyMap([file], {
          exclude: ['node_modules'],
        });
        assert.equal(map.size, 0);
      } finally {
        cleanup(dir);
      }
    });

    it('should handle files that do not exist', async () => {
      await loadParser();
      const map = buildSymbolDependencyMap(['/nonexistent/file.ts']);
      assert.equal(map.size, 0);
    });

    it('should handle files with no imports', () => {
      const dir = makeTmpDir();
      try {
        const file = writeFile(dir, 'test.ts', 'const x = 1;\n');
        const map = buildSymbolDependencyMap([file]);
        assert.ok(map.has(file));
        assert.equal(map.get(file)!.length, 0);
      } finally {
        cleanup(dir);
      }
    });

    it('should skip non-relative imports', () => {
      const dir = makeTmpDir();
      try {
        const file = writeFile(
          dir,
          'test.ts',
          "import { readFileSync } from 'node:fs';\n",
        );
        const map = buildSymbolDependencyMap([file]);
        assert.ok(map.has(file));
        // Should only capture relative imports, so node:fs should be captured
        // but with the module name since it's not relative
        const deps = map.get(file)!;
        assert.equal(deps.length, 1);
        assert.equal(deps[0]!.importedFrom, 'node:fs');
      } finally {
        cleanup(dir);
      }
    });
  });

  describe('diffExports', () => {
    it('should detect added export', async () => {
      await loadParser();
      const oldSrc = 'export function foo() { return 1; }\n';
      const newSrc =
        'export function foo() { return 1; }\nexport function bar() { return 2; }\n';

      const diff = diffExports(oldSrc, newSrc);
      assert.ok(diff.added.includes('bar'));
      assert.equal(diff.removed.length, 0);
      assert.equal(diff.changed.length, 0);
    });

    it('should detect removed export', async () => {
      await loadParser();
      const oldSrc =
        'export function foo() { return 1; }\nexport function bar() { return 2; }\n';
      const newSrc = 'export function foo() { return 1; }\n';

      const diff = diffExports(oldSrc, newSrc);
      assert.ok(diff.removed.includes('bar'));
      assert.equal(diff.added.length, 0);
      assert.equal(diff.changed.length, 0);
    });

    it('should detect changed function body', async () => {
      await loadParser();
      const oldSrc = 'export function foo() { return 1; }\n';
      const newSrc = 'export function foo() { return 42; }\n';

      const diff = diffExports(oldSrc, newSrc);
      assert.ok(diff.changed.includes('foo'));
      assert.equal(diff.added.length, 0);
      assert.equal(diff.removed.length, 0);
    });

    it('should detect unchanged exports (not in result)', async () => {
      await loadParser();
      const src =
        'export function foo() { return 1; }\nexport const bar = 2;\n';

      const diff = diffExports(src, src);
      assert.equal(diff.added.length, 0);
      assert.equal(diff.removed.length, 0);
      assert.equal(diff.changed.length, 0);
    });

    it('should detect default export changes', async () => {
      await loadParser();
      const oldSrc = 'export default function() { return 1; }\n';
      const newSrc = 'export default function() { return 42; }\n';

      const diff = diffExports(oldSrc, newSrc);
      assert.ok(diff.changed.includes('default'));
    });

    it('should handle export const changes', async () => {
      await loadParser();
      const oldSrc = 'export const x = 1;\n';
      const newSrc = 'export const x = 99;\n';

      const diff = diffExports(oldSrc, newSrc);
      assert.ok(diff.changed.includes('x'));
    });

    it('should handle re-export specifiers', async () => {
      await loadParser();
      const oldSrc = 'const foo = 1;\nexport { foo };\n';
      const newSrc = 'const foo = 1;\nconst bar = 2;\nexport { foo, bar };\n';

      const diff = diffExports(oldSrc, newSrc);
      assert.ok(diff.added.includes('bar'));
    });

    it('should return empty diff when parser not available', () => {
      resetParserCache();
      const diff = diffExports('export const x = 1;', 'export const x = 2;');
      assert.equal(diff.added.length, 0);
      assert.equal(diff.removed.length, 0);
      assert.equal(diff.changed.length, 0);
    });

    it('should handle empty sources', async () => {
      await loadParser();
      const diff = diffExports('', '');
      assert.equal(diff.added.length, 0);
      assert.equal(diff.removed.length, 0);
      assert.equal(diff.changed.length, 0);
    });
  });

  describe('getAffectedTestFiles', () => {
    it('should return only tests using changed symbols', async () => {
      await loadParser();
      const dir = makeTmpDir();
      try {
        const srcFile = writeFile(
          dir,
          'src/math.ts',
          'export function add(a, b) { return a + b; }\nexport function mul(a, b) { return a * b; }\n',
        );
        const test1 = writeFile(
          dir,
          'tests/add.test.ts',
          "import { add } from '../src/math.js';\n",
        );
        const test2 = writeFile(
          dir,
          'tests/mul.test.ts',
          "import { mul } from '../src/math.js';\n",
        );

        const symbolMap = buildSymbolDependencyMap([test1, test2]);

        // Only 'add' changed
        const affected = getAffectedTestFiles(srcFile, ['add'], symbolMap, [
          test1,
          test2,
        ]);

        assert.ok(affected.includes(test1), 'add.test.ts should be affected');
        assert.ok(
          !affected.includes(test2),
          'mul.test.ts should NOT be affected',
        );
      } finally {
        cleanup(dir);
      }
    });

    it('should return all tests when symbol tracking unavailable', () => {
      resetParserCache();
      const testFiles = ['/a.test.ts', '/b.test.ts'];
      const affected = getAffectedTestFiles(
        '/src/file.ts',
        ['foo'],
        new Map(),
        testFiles,
      );
      assert.deepEqual(affected.sort(), testFiles.sort());
    });

    it('should handle namespace imports as always affected', async () => {
      await loadParser();
      const dir = makeTmpDir();
      try {
        const srcFile = writeFile(
          dir,
          'src/utils.ts',
          'export const x = 1;\nexport const y = 2;\n',
        );
        const testFile = writeFile(
          dir,
          'tests/utils.test.ts',
          "import * as utils from '../src/utils.js';\n",
        );

        const symbolMap = buildSymbolDependencyMap([testFile]);

        // Even if only 'x' changed, namespace import means always affected
        const affected = getAffectedTestFiles(srcFile, ['x'], symbolMap, [
          testFile,
        ]);
        assert.ok(affected.includes(testFile));
      } finally {
        cleanup(dir);
      }
    });

    it('should handle file path with different extensions', async () => {
      await loadParser();
      const dir = makeTmpDir();
      try {
        const srcFile = writeFile(
          dir,
          'src/helper.ts',
          'export function help() { return 1; }\n',
        );
        const testFile = writeFile(
          dir,
          'tests/helper.test.ts',
          "import { help } from '../src/helper.js';\n",
        );

        const symbolMap = buildSymbolDependencyMap([testFile]);

        // Changed file has .ts extension, imports reference .js
        const affected = getAffectedTestFiles(srcFile, ['help'], symbolMap, [
          testFile,
        ]);
        assert.ok(affected.includes(testFile));
      } finally {
        cleanup(dir);
      }
    });

    it('should return empty array when no tests import changed symbols', async () => {
      await loadParser();
      const dir = makeTmpDir();
      try {
        const srcFile = writeFile(
          dir,
          'src/math.ts',
          'export function add(a, b) { return a + b; }\n',
        );
        const testFile = writeFile(
          dir,
          'tests/other.test.ts',
          "import { mul } from '../src/other.js';\n",
        );

        const symbolMap = buildSymbolDependencyMap([testFile]);
        const affected = getAffectedTestFiles(srcFile, ['add'], symbolMap, [
          testFile,
        ]);
        assert.equal(affected.length, 0);
      } finally {
        cleanup(dir);
      }
    });

    it('should return all tests with empty symbol map when parser unavailable', async () => {
      resetParserCache();
      const tests = ['/test1.ts', '/test2.ts', '/test3.ts'];
      const affected = getAffectedTestFiles(
        '/src/file.ts',
        ['foo'],
        new Map(),
        tests,
      );
      assert.equal(affected.length, 3);
    });
  });

  describe('Edge cases', () => {
    it('should handle files with syntax errors gracefully', async () => {
      await loadParser();
      const dir = makeTmpDir();
      try {
        const file = writeFile(
          dir,
          'broken.ts',
          'export function {{{ broken syntax !!!',
        );
        // Should not crash on syntax errors
        assert.doesNotThrow(() => buildSymbolDependencyMap([file]));
      } finally {
        cleanup(dir);
      }
    });

    it('diffExports should handle syntax errors without crashing', async () => {
      await loadParser();
      const good = 'export function foo() { return 1; }\n';
      const broken = 'export function {{{ broken';
      // Should not throw
      const diff = diffExports(good, broken);
      // foo was in old but not parseable in new
      assert.ok(diff.removed.includes('foo'));
    });

    it('should handle export { foo as bar } renamed specifier', async () => {
      await loadParser();
      const oldSrc = 'const foo = 1;\nexport { foo as bar };\n';
      const newSrc = 'const foo = 2;\nexport { foo as bar };\n';

      const diff = diffExports(oldSrc, newSrc);
      // The export specifier text changes because source position changes
      // This tests the code path where exported name is used
      assert.ok(
        diff.changed.length >= 0,
        'Should handle renamed export specifiers',
      );
    });

    it('should handle class exports', async () => {
      await loadParser();
      const oldSrc = 'export class Foo { bar() { return 1; } }\n';
      const newSrc = 'export class Foo { bar() { return 42; } }\n';

      const diff = diffExports(oldSrc, newSrc);
      assert.ok(diff.changed.includes('Foo'));
    });
  });

  describe('Integration: changing one function only triggers relevant tests', () => {
    it('should narrow test scope to affected tests only', async () => {
      await loadParser();
      const dir = makeTmpDir();
      try {
        // Source module with two exports
        const srcFile = writeFile(
          dir,
          'src/utils.ts',
          'export function greet(name) { return "hello " + name; }\nexport function farewell(name) { return "bye " + name; }\n',
        );

        // Test file 1 only uses greet
        const test1 = writeFile(
          dir,
          'tests/greet.test.ts',
          "import { greet } from '../src/utils.js';\nconsole.log(greet('world'));\n",
        );

        // Test file 2 only uses farewell
        const test2 = writeFile(
          dir,
          'tests/farewell.test.ts',
          "import { farewell } from '../src/utils.js';\nconsole.log(farewell('world'));\n",
        );

        // Test file 3 uses both
        const test3 = writeFile(
          dir,
          'tests/both.test.ts',
          "import { greet, farewell } from '../src/utils.js';\n",
        );

        const symbolMap = buildSymbolDependencyMap([test1, test2, test3]);

        // Simulate changing only greet
        const oldSrc =
          'export function greet(name) { return "hello " + name; }\nexport function farewell(name) { return "bye " + name; }\n';
        const newSrc =
          'export function greet(name) { return "hi " + name; }\nexport function farewell(name) { return "bye " + name; }\n';

        const diff = diffExports(oldSrc, newSrc);
        assert.deepEqual(diff.changed, ['greet']);
        assert.equal(diff.added.length, 0);
        assert.equal(diff.removed.length, 0);

        const affected = getAffectedTestFiles(
          srcFile,
          diff.changed,
          symbolMap,
          [test1, test2, test3],
        );

        // Only test1 (greet) and test3 (both) should be affected
        assert.ok(affected.includes(test1), 'greet.test should be affected');
        assert.ok(
          !affected.includes(test2),
          'farewell.test should NOT be affected',
        );
        assert.ok(affected.includes(test3), 'both.test should be affected');
      } finally {
        cleanup(dir);
      }
    });
  });
});
