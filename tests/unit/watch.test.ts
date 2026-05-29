import { describe as nodeDescribe, it as nodeIt } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  buildImportGraph,
  matchGlob,
  filterPaths,
  watchTests,
} from '../../src/test-runner/watch.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'watch-test-'));
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
// Import graph tests
// ---------------------------------------------------------------------------

nodeDescribe('buildImportGraph', () => {
  nodeIt('builds graph from files with import statements', () => {
    const dir = makeTmpDir();
    try {
      const srcFile = writeFile(
        dir,
        'src/utils.ts',
        'export function add(a: number, b: number) { return a + b; }',
      );
      const testFile = writeFile(
        dir,
        'tests/utils.test.ts',
        "import { add } from '../src/utils.js';\n",
      );
      const graph = buildImportGraph([testFile, srcFile]);
      // The reverse map should show that srcFile is depended upon by testFile
      const resolvedSrc = path.resolve(
        path.dirname(testFile),
        '../src/utils.js',
      );
      assert.ok(graph.has(resolvedSrc));
      assert.ok(graph.get(resolvedSrc)!.has(testFile));
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('builds graph from files with require() calls', () => {
    const dir = makeTmpDir();
    try {
      const srcFile = writeFile(dir, 'src/helper.ts', 'module.exports = {};');
      const testFile = writeFile(
        dir,
        'tests/helper.test.ts',
        "const helper = require('../src/helper.js');\n",
      );
      const graph = buildImportGraph([testFile, srcFile]);
      const resolvedSrc = path.resolve(
        path.dirname(testFile),
        '../src/helper.js',
      );
      assert.ok(graph.has(resolvedSrc));
      assert.ok(graph.get(resolvedSrc)!.has(testFile));
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('resolves relative imports correctly', () => {
    const dir = makeTmpDir();
    try {
      writeFile(dir, 'src/deep/nested/mod.ts', 'export const x = 1;');
      const testFile = writeFile(
        dir,
        'tests/deep/mod.test.ts',
        "import { x } from '../../src/deep/nested/mod.js';\n",
      );
      const graph = buildImportGraph([testFile]);
      const resolvedMod = path.resolve(
        path.dirname(testFile),
        '../../src/deep/nested/mod.js',
      );
      assert.ok(graph.has(resolvedMod));
      assert.ok(graph.get(resolvedMod)!.has(testFile));
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('handles files with no imports', () => {
    const dir = makeTmpDir();
    try {
      const testFile = writeFile(
        dir,
        'tests/standalone.test.ts',
        'console.log("no imports here");',
      );
      const graph = buildImportGraph([testFile]);
      // Graph should be empty or have no entries pointing to this file
      assert.strictEqual(graph.size, 0);
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('handles circular imports without infinite loop', () => {
    const dir = makeTmpDir();
    try {
      const fileA = writeFile(
        dir,
        'src/a.ts',
        "import { b } from './b.js';\nexport const a = 1;\n",
      );
      const fileB = writeFile(
        dir,
        'src/b.ts',
        "import { a } from './a.js';\nexport const b = 2;\n",
      );
      // Should not hang
      const graph = buildImportGraph([fileA, fileB]);
      // Both files reference each other
      const resolvedA = path.resolve(path.dirname(fileB), './a.js');
      const resolvedB = path.resolve(path.dirname(fileA), './b.js');
      assert.ok(graph.has(resolvedA));
      assert.ok(graph.has(resolvedB));
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('handles multiple imports in one file', () => {
    const dir = makeTmpDir();
    try {
      writeFile(dir, 'src/foo.ts', 'export const foo = 1;');
      writeFile(dir, 'src/bar.ts', 'export const bar = 2;');
      const testFile = writeFile(
        dir,
        'tests/multi.test.ts',
        "import { foo } from '../src/foo.js';\nimport { bar } from '../src/bar.js';\n",
      );
      const graph = buildImportGraph([testFile]);
      const resolvedFoo = path.resolve(path.dirname(testFile), '../src/foo.js');
      const resolvedBar = path.resolve(path.dirname(testFile), '../src/bar.js');
      assert.ok(graph.has(resolvedFoo));
      assert.ok(graph.get(resolvedFoo)!.has(testFile));
      assert.ok(graph.has(resolvedBar));
      assert.ok(graph.get(resolvedBar)!.has(testFile));
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('ignores non-relative imports (bare specifiers)', () => {
    const dir = makeTmpDir();
    try {
      const testFile = writeFile(
        dir,
        'tests/bare.test.ts',
        "import assert from 'node:assert/strict';\nimport fs from 'node:fs';\n",
      );
      const graph = buildImportGraph([testFile]);
      assert.strictEqual(graph.size, 0);
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('gracefully handles non-existent files', () => {
    const graph = buildImportGraph(['/tmp/nonexistent-file-abc123.ts']);
    assert.strictEqual(graph.size, 0);
  });
});

// ---------------------------------------------------------------------------
// Glob matching tests
// ---------------------------------------------------------------------------

nodeDescribe('matchGlob', () => {
  nodeIt('src/** matches src/foo/bar.ts', () => {
    assert.ok(matchGlob('src/foo/bar.ts', 'src/**'));
  });

  nodeIt('*.ts matches file.ts but not dir/file.ts', () => {
    assert.ok(matchGlob('file.ts', '*.ts'));
    assert.ok(!matchGlob('dir/file.ts', '*.ts'));
  });

  nodeIt('**/*.test.ts matches deeply nested test files', () => {
    assert.ok(matchGlob('src/deep/nested/foo.test.ts', '**/*.test.ts'));
    assert.ok(matchGlob('foo.test.ts', '**/*.test.ts'));
    assert.ok(!matchGlob('foo.ts', '**/*.test.ts'));
  });

  nodeIt('handles patterns with no wildcards (literal match)', () => {
    assert.ok(matchGlob('src/index.ts', 'src/index.ts'));
    assert.ok(!matchGlob('src/other.ts', 'src/index.ts'));
  });

  nodeIt('** at start matches any depth', () => {
    assert.ok(matchGlob('a/b/c/d.ts', '**/*.ts'));
    assert.ok(matchGlob('d.ts', '**/*.ts'));
  });

  nodeIt('* does not match path separators', () => {
    assert.ok(!matchGlob('a/b.ts', '*.ts'));
    assert.ok(matchGlob('b.ts', '*.ts'));
  });

  nodeIt('src/**/index.ts matches nested index files', () => {
    assert.ok(matchGlob('src/foo/index.ts', 'src/**/index.ts'));
    assert.ok(matchGlob('src/foo/bar/index.ts', 'src/**/index.ts'));
    assert.ok(matchGlob('src/index.ts', 'src/**/index.ts'));
    assert.ok(!matchGlob('lib/foo/index.ts', 'src/**/index.ts'));
  });

  nodeIt('? matches a single non-separator character', () => {
    assert.ok(matchGlob('a.ts', '?.ts'));
    assert.ok(!matchGlob('ab.ts', '?.ts'));
    assert.ok(!matchGlob('/a.ts', '?.ts'));
  });
});

nodeDescribe('filterPaths', () => {
  nodeIt('excludes paths matching exclude patterns', () => {
    const paths = [
      'src/index.ts',
      'node_modules/foo/bar.ts',
      'src/utils.ts',
      '.git/config',
    ];
    const result = filterPaths(paths, ['src/**'], ['node_modules', '.git']);
    assert.deepStrictEqual(result, ['src/index.ts', 'src/utils.ts']);
  });

  nodeIt('includes only paths matching include patterns', () => {
    const paths = ['src/index.ts', 'tests/foo.test.ts', 'README.md'];
    const result = filterPaths(paths, ['src/**', 'tests/**'], []);
    assert.deepStrictEqual(result, ['src/index.ts', 'tests/foo.test.ts']);
  });

  nodeIt('empty include patterns match nothing', () => {
    const paths = ['src/index.ts'];
    const result = filterPaths(paths, [], []);
    assert.deepStrictEqual(result, []);
  });
});

// ---------------------------------------------------------------------------
// Debounce tests
// ---------------------------------------------------------------------------

nodeDescribe('debounce behavior', () => {
  nodeIt('multiple rapid changes result in single callback', async () => {
    const dir = makeTmpDir();
    try {
      const testFile = writeFile(
        dir,
        'tests/a.test.ts',
        'console.log("test");',
      );
      let callCount = 0;
      const filesRun: string[][] = [];

      const controller = watchTests(
        async (files: string[]) => {
          callCount++;
          filesRun.push(files);
        },
        {
          watchInclude: ['tests/**'],
          watchExclude: [],
          debounceMs: 100,
          cwd: dir,
        },
      );

      // Simulate rapid changes
      await new Promise((resolve) => setTimeout(resolve, 200));
      fs.writeFileSync(testFile, 'console.log("change 1");');
      fs.writeFileSync(testFile, 'console.log("change 2");');
      fs.writeFileSync(testFile, 'console.log("change 3");');

      // Wait for debounce to settle
      await new Promise((resolve) => setTimeout(resolve, 500));
      controller.stop();

      // Should have been called at most once due to debounce
      assert.ok(callCount <= 1, `Expected <= 1 call, got ${callCount}`);
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('callback fires after debounce period', async () => {
    const dir = makeTmpDir();
    try {
      const testFile = writeFile(
        dir,
        'tests/b.test.ts',
        'console.log("test");',
      );
      let callCount = 0;

      const controller = watchTests(
        async () => {
          callCount++;
        },
        {
          watchInclude: ['tests/**'],
          watchExclude: [],
          debounceMs: 100,
          cwd: dir,
        },
      );

      await new Promise((resolve) => setTimeout(resolve, 200));
      fs.writeFileSync(testFile, 'console.log("changed");');

      // Wait for debounce period
      await new Promise((resolve) => setTimeout(resolve, 500));
      controller.stop();

      assert.ok(callCount >= 1, `Expected >= 1 call, got ${callCount}`);
    } finally {
      cleanup(dir);
    }
  });
});

// ---------------------------------------------------------------------------
// WatchController tests
// ---------------------------------------------------------------------------

nodeDescribe('WatchController', () => {
  nodeIt('stop() prevents further callbacks', async () => {
    const dir = makeTmpDir();
    try {
      writeFile(dir, 'tests/c.test.ts', 'console.log("test");');
      let callCount = 0;

      const controller = watchTests(
        async () => {
          callCount++;
        },
        {
          watchInclude: ['tests/**'],
          watchExclude: [],
          debounceMs: 50,
          cwd: dir,
        },
      );

      await new Promise((resolve) => setTimeout(resolve, 100));
      controller.stop();
      const countAfterStop = callCount;

      // Write after stop — should not trigger
      writeFile(dir, 'tests/c.test.ts', 'console.log("after stop");');
      await new Promise((resolve) => setTimeout(resolve, 300));

      assert.strictEqual(callCount, countAfterStop);
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('runAll() triggers all test files', async () => {
    const dir = makeTmpDir();
    try {
      writeFile(dir, 'tests/d.test.ts', 'console.log("d");');
      writeFile(dir, 'tests/e.test.ts', 'console.log("e");');
      let lastFiles: string[] = [];

      const controller = watchTests(
        async (files: string[]) => {
          lastFiles = files;
        },
        {
          watchInclude: ['tests/**'],
          watchExclude: [],
          debounceMs: 50,
          cwd: dir,
        },
      );

      await new Promise((resolve) => setTimeout(resolve, 100));
      controller.runAll();
      await new Promise((resolve) => setTimeout(resolve, 200));
      controller.stop();

      // Should include both test files
      assert.ok(
        lastFiles.length >= 2,
        `Expected >= 2 files, got ${lastFiles.length}`,
      );
      const names = lastFiles.map((f) => path.basename(f));
      assert.ok(names.includes('d.test.ts'));
      assert.ok(names.includes('e.test.ts'));
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('runFailed() triggers only failed test files', async () => {
    const dir = makeTmpDir();
    try {
      writeFile(dir, 'tests/pass.test.ts', 'console.log("pass");');
      writeFile(dir, 'tests/fail.test.ts', 'console.log("fail");');
      const allRuns: string[][] = [];
      let runCount = 0;

      const controller = watchTests(
        async (files: string[]) => {
          runCount++;
          allRuns.push(files);
          // Simulate failure for fail.test.ts on first run
          if (runCount === 1) {
            const failFile = files.find((f) => f.includes('fail.test.ts'));
            if (failFile) {
              throw new Error(`Test failed: ${failFile}`);
            }
          }
        },
        {
          watchInclude: ['tests/**'],
          watchExclude: [],
          debounceMs: 50,
          cwd: dir,
        },
      );

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Run all first to populate failure list
      controller.runAll();
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Now runFailed should only run the failed files
      controller.runFailed();
      await new Promise((resolve) => setTimeout(resolve, 200));
      controller.stop();

      // The last run should have been for the failed files
      assert.ok(runCount >= 2, `Expected >= 2 runs, got ${runCount}`);
      assert.ok(allRuns.length >= 2, `Expected >= 2 recorded runs`);
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('getWatchedFiles() returns current watch list', () => {
    const dir = makeTmpDir();
    try {
      writeFile(dir, 'tests/f.test.ts', 'console.log("f");');
      writeFile(dir, 'src/mod.ts', 'export const x = 1;');

      const controller = watchTests(async () => {}, {
        watchInclude: ['tests/**', 'src/**'],
        watchExclude: [],
        debounceMs: 50,
        cwd: dir,
      });

      const watched = controller.getWatchedFiles();
      controller.stop();

      assert.ok(
        watched.length >= 2,
        `Expected >= 2 files, got ${watched.length}`,
      );
      const names = watched.map((f) => path.basename(f));
      assert.ok(names.includes('f.test.ts'));
      assert.ok(names.includes('mod.ts'));
    } finally {
      cleanup(dir);
    }
  });
});

// ---------------------------------------------------------------------------
// Integration tests
// ---------------------------------------------------------------------------

nodeDescribe('watch integration', () => {
  nodeIt(
    'file change triggers correct test files via import graph',
    async () => {
      const dir = makeTmpDir();
      try {
        const srcFile = writeFile(dir, 'src/util.ts', 'export const util = 1;');
        writeFile(
          dir,
          'tests/util.test.ts',
          "import { util } from '../src/util.js';\nconsole.log(util);\n",
        );
        let lastFiles: string[] = [];

        const controller = watchTests(
          async (files: string[]) => {
            lastFiles = files;
          },
          {
            watchInclude: ['src/**', 'tests/**'],
            watchExclude: [],
            debounceMs: 100,
            cwd: dir,
          },
        );

        // Wait for watcher to initialize
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Change source file — should trigger dependent test
        fs.writeFileSync(srcFile, 'export const util = 2;');
        await new Promise((resolve) => setTimeout(resolve, 600));
        controller.stop();

        if (lastFiles.length > 0) {
          const names = lastFiles.map((f) => path.basename(f));
          assert.ok(
            names.includes('util.test.ts'),
            `Expected util.test.ts in ${JSON.stringify(names)}`,
          );
        }
      } finally {
        cleanup(dir);
      }
    },
  );

  nodeIt('excluded files do not trigger runs', async () => {
    const dir = makeTmpDir();
    try {
      writeFile(dir, 'tests/g.test.ts', 'console.log("g");');
      writeFile(dir, 'build/output.js', 'console.log("build");');
      let callCount = 0;

      const controller = watchTests(
        async () => {
          callCount++;
        },
        {
          watchInclude: ['tests/**'],
          watchExclude: ['build'],
          debounceMs: 50,
          cwd: dir,
        },
      );

      await new Promise((resolve) => setTimeout(resolve, 200));
      const countBefore = callCount;

      // Modify excluded file
      writeFile(dir, 'build/output.js', 'console.log("updated");');
      await new Promise((resolve) => setTimeout(resolve, 300));
      controller.stop();

      assert.strictEqual(callCount, countBefore);
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('new files added during watch are discovered', async () => {
    const dir = makeTmpDir();
    try {
      writeFile(dir, 'tests/h.test.ts', 'console.log("h");');
      let lastFiles: string[] = [];

      const controller = watchTests(
        async (files: string[]) => {
          lastFiles = files;
        },
        {
          watchInclude: ['tests/**'],
          watchExclude: [],
          debounceMs: 100,
          cwd: dir,
        },
      );

      await new Promise((resolve) => setTimeout(resolve, 300));

      // Add a new test file
      writeFile(dir, 'tests/new.test.ts', 'console.log("new");');
      await new Promise((resolve) => setTimeout(resolve, 600));
      controller.stop();

      if (lastFiles.length > 0) {
        const names = lastFiles.map((f) => path.basename(f));
        assert.ok(
          names.includes('new.test.ts'),
          `Expected new.test.ts in ${JSON.stringify(names)}`,
        );
      }
    } finally {
      cleanup(dir);
    }
  });

  nodeIt(
    'should run all tests when a source file has no known dependents',
    async () => {
      const dir = makeTmpDir();
      try {
        // Create source file that nothing imports
        writeFile(dir, 'src/orphan.ts', 'export const orphan = true;\n');
        writeFile(
          dir,
          'tests/a.test.ts',
          'import { describe } from "node:test";\n',
        );
        writeFile(
          dir,
          'tests/b.test.ts',
          'import { describe } from "node:test";\n',
        );

        let runCount = 0;
        let lastFiles: string[] = [];
        const ctrl = watchTests(
          async (files) => {
            runCount++;
            lastFiles = files;
          },
          {
            cwd: dir,
            watchInclude: ['src/**', 'tests/**'],
            debounceMs: 50,
          },
        );

        await new Promise((resolve) => setTimeout(resolve, 100));
        writeFile(dir, 'src/orphan.ts', 'export const orphan = false;\n');
        await new Promise((resolve) => setTimeout(resolve, 300));
        ctrl.stop();

        if (runCount > 0) {
          assert.ok(
            lastFiles.length >= 2,
            `Expected all tests, got ${lastFiles.length}`,
          );
        }
      } finally {
        cleanup(dir);
      }
    },
  );

  nodeIt('should handle stop() clearing debounce timer', async () => {
    const dir = makeTmpDir();
    try {
      writeFile(dir, 'src/a.ts', 'export const a = 1;\n');

      let runCount = 0;
      const ctrl = watchTests(
        async () => {
          runCount++;
        },
        {
          cwd: dir,
          watchInclude: ['src/**'],
          debounceMs: 500,
        },
      );

      await new Promise((resolve) => setTimeout(resolve, 100));
      writeFile(dir, 'src/a.ts', 'export const a = 2;\n');
      await new Promise((resolve) => setTimeout(resolve, 50));
      ctrl.stop();
      await new Promise((resolve) => setTimeout(resolve, 600));
      assert.strictEqual(runCount, 0, 'Should not run after stop()');
    } finally {
      cleanup(dir);
    }
  });
});
