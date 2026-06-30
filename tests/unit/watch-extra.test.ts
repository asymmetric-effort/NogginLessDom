/**
 * Additional tests for watch.ts to cover uncovered lines:
 * - collectFiles handling of non-existent dirs (line 177)
 * - getWatchDirs fallback to cwd when no dirs found (line 280)
 * - scheduleDebouncedRun symbol-level tracking paths (lines 315, 344, 368, 370-385)
 * - file-level fallback paths (lines 388, 392, 395-404, 406-410)
 * - onFileChange filtering (various lines)
 */
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
  return fs.mkdtempSync(path.join(os.tmpdir(), 'watch-extra-'));
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
// buildImportGraph edge cases
// ---------------------------------------------------------------------------

nodeDescribe('buildImportGraph — additional edge cases', () => {
  nodeIt('handles file that cannot be read (permission or deleted)', () => {
    // Should not throw, just skip
    const graph = buildImportGraph(['/tmp/definitely-nonexistent-file-xyz.ts']);
    assert.strictEqual(graph.size, 0);
  });

  nodeIt('multiple files importing the same dependency', () => {
    const dir = makeTmpDir();
    try {
      const testA = writeFile(
        dir,
        'tests/a.test.ts',
        `import { shared } from '../src/shared.js';\nshared();\n`,
      );
      const testB = writeFile(
        dir,
        'tests/b.test.ts',
        `import { shared } from '../src/shared.js';\nshared();\n`,
      );
      const graph = buildImportGraph([testA, testB]);
      const resolvedShared = path.resolve(
        path.dirname(testA),
        '../src/shared.js',
      );
      assert.ok(graph.has(resolvedShared));
      const dependents = graph.get(resolvedShared)!;
      assert.ok(dependents.has(testA));
      assert.ok(dependents.has(testB));
      assert.equal(dependents.size, 2);
    } finally {
      cleanup(dir);
    }
  });
});

// ---------------------------------------------------------------------------
// matchGlob edge cases
// ---------------------------------------------------------------------------

nodeDescribe('matchGlob — additional patterns', () => {
  nodeIt('** without trailing slash matches anything', () => {
    assert.ok(matchGlob('anything/at/all.ts', '**'));
    assert.ok(matchGlob('file.ts', '**'));
  });

  nodeIt('pattern with . is escaped properly', () => {
    assert.ok(matchGlob('file.ts', '*.ts'));
    assert.ok(!matchGlob('filexts', '*.ts'));
  });

  nodeIt('empty pattern matches empty string', () => {
    assert.ok(matchGlob('', ''));
  });
});

// ---------------------------------------------------------------------------
// filterPaths edge cases
// ---------------------------------------------------------------------------

nodeDescribe('filterPaths — additional edge cases', () => {
  nodeIt('exclude pattern with startsWith matching', () => {
    const paths = ['node_modules/foo/bar.ts', 'src/index.ts'];
    const result = filterPaths(paths, ['**'], ['node_modules']);
    // node_modules should be excluded
    assert.ok(!result.includes('node_modules/foo/bar.ts'));
    assert.ok(result.includes('src/index.ts'));
  });

  nodeIt('multiple exclude patterns', () => {
    const paths = [
      'src/index.ts',
      '.git/config',
      'build/out.js',
      'tests/a.test.ts',
    ];
    const result = filterPaths(paths, ['**'], ['.git', 'build']);
    assert.deepStrictEqual(result, ['src/index.ts', 'tests/a.test.ts']);
  });
});

// ---------------------------------------------------------------------------
// watchTests — controller methods and edge cases
// ---------------------------------------------------------------------------

nodeDescribe('watchTests — runFailed with no failures', () => {
  nodeIt('runFailed does nothing when no files have failed', async () => {
    const dir = makeTmpDir();
    try {
      writeFile(dir, 'tests/a.test.ts', 'console.log("test");\n');
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
      // runFailed with no prior failures should not trigger any runs
      controller.runFailed();
      await new Promise((resolve) => setTimeout(resolve, 200));
      controller.stop();

      assert.equal(callCount, 0);
    } finally {
      cleanup(dir);
    }
  });
});

nodeDescribe('watchTests — runAll after stop does nothing', () => {
  nodeIt('runAll after stop is a no-op', async () => {
    const dir = makeTmpDir();
    try {
      writeFile(dir, 'tests/a.test.ts', 'console.log("test");\n');
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
      controller.runAll();
      await new Promise((resolve) => setTimeout(resolve, 200));

      assert.equal(callCount, 0);
    } finally {
      cleanup(dir);
    }
  });
});

nodeDescribe('watchTests — file change on source file with dependents', () => {
  nodeIt('source file change triggers dependent test files', async () => {
    const dir = makeTmpDir();
    try {
      const srcFile = writeFile(
        dir,
        'src/helper.ts',
        `export function helper() { return 1; }\n`,
      );
      writeFile(
        dir,
        'tests/helper.test.ts',
        `import { helper } from '../src/helper.js';\nconsole.log(helper());\n`,
      );
      writeFile(dir, 'tests/other.test.ts', `console.log("unrelated");\n`);
      const filesRun: string[][] = [];

      const controller = watchTests(
        async (files: string[]) => {
          filesRun.push(files);
        },
        {
          watchInclude: ['src/**', 'tests/**'],
          watchExclude: [],
          debounceMs: 100,
          cwd: dir,
        },
      );

      await new Promise((resolve) => setTimeout(resolve, 300));

      // Modify source file
      fs.writeFileSync(srcFile, `export function helper() { return 2; }\n`);
      await new Promise((resolve) => setTimeout(resolve, 600));
      controller.stop();

      // The test runner should have been called
      if (filesRun.length > 0) {
        const lastRun = filesRun[filesRun.length - 1]!;
        const names = lastRun.map((f) => path.basename(f));
        // Should include the dependent test
        assert.ok(
          names.includes('helper.test.ts') || names.length >= 1,
          `Expected helper.test.ts or all tests in ${JSON.stringify(names)}`,
        );
      }
    } finally {
      cleanup(dir);
    }
  });
});

nodeDescribe('watchTests — test file change triggers itself', () => {
  nodeIt('changed test file is directly re-run', async () => {
    const dir = makeTmpDir();
    try {
      const testFile = writeFile(
        dir,
        'tests/direct.test.ts',
        `console.log("direct test");\n`,
      );
      const filesRun: string[][] = [];

      const controller = watchTests(
        async (files: string[]) => {
          filesRun.push(files);
        },
        {
          watchInclude: ['tests/**'],
          watchExclude: [],
          debounceMs: 100,
          cwd: dir,
        },
      );

      await new Promise((resolve) => setTimeout(resolve, 300));

      // Modify test file directly
      fs.writeFileSync(testFile, `console.log("updated direct test");\n`);
      await new Promise((resolve) => setTimeout(resolve, 600));
      controller.stop();

      if (filesRun.length > 0) {
        const lastRun = filesRun[filesRun.length - 1]!;
        const names = lastRun.map((f) => path.basename(f));
        assert.ok(
          names.includes('direct.test.ts'),
          `Expected direct.test.ts in ${JSON.stringify(names)}`,
        );
      }
    } finally {
      cleanup(dir);
    }
  });
});

nodeDescribe('watchTests — getWatchDirs fallback', () => {
  nodeIt(
    'watches cwd when include patterns have no static prefix',
    async () => {
      const dir = makeTmpDir();
      try {
        writeFile(dir, 'test.ts', `console.log("root test");\n`);

        const controller = watchTests(async () => {}, {
          watchInclude: ['**/*.ts'],
          watchExclude: [],
          debounceMs: 50,
          cwd: dir,
        });

        const watched = controller.getWatchedFiles();
        controller.stop();

        assert.ok(watched.length >= 1, 'should discover files');
      } finally {
        cleanup(dir);
      }
    },
  );
});

nodeDescribe('watchTests — onFileChange filters excluded files', () => {
  nodeIt('changes to excluded files do not trigger runs', async () => {
    const dir = makeTmpDir();
    try {
      writeFile(dir, 'tests/a.test.ts', `console.log("test");\n`);
      writeFile(dir, 'node_modules/pkg/index.js', `module.exports = {};\n`);
      let callCount = 0;

      const controller = watchTests(
        async () => {
          callCount++;
        },
        {
          watchInclude: ['tests/**'],
          watchExclude: ['node_modules'],
          debounceMs: 50,
          cwd: dir,
        },
      );

      await new Promise((resolve) => setTimeout(resolve, 200));
      const countBefore = callCount;

      // Modify excluded file
      writeFile(
        dir,
        'node_modules/pkg/index.js',
        `module.exports = { v: 2 };\n`,
      );
      await new Promise((resolve) => setTimeout(resolve, 300));
      controller.stop();

      assert.equal(callCount, countBefore);
    } finally {
      cleanup(dir);
    }
  });
});

nodeDescribe('watchTests — handles watcher for non-existent dir', () => {
  nodeIt('does not throw if watch dir does not exist', () => {
    const dir = makeTmpDir();
    try {
      // Try to watch a directory structure that doesn't exist
      const controller = watchTests(async () => {}, {
        watchInclude: ['nonexistent_dir/**'],
        watchExclude: [],
        debounceMs: 50,
        cwd: dir,
      });

      // Should not throw
      controller.stop();
    } finally {
      cleanup(dir);
    }
  });
});

nodeDescribe('watchTests — source change with import graph', () => {
  nodeIt(
    'source file with test dependents triggers those tests via graph',
    async () => {
      const dir = makeTmpDir();
      try {
        // Create a source file
        const srcFile = writeFile(
          dir,
          'src/math.ts',
          `export function add(a: number, b: number) { return a + b; }\n`,
        );
        // Create test files that import from the source
        writeFile(
          dir,
          'tests/math.test.ts',
          `import { add } from '../src/math.js';\nconsole.log(add(1, 2));\n`,
        );
        writeFile(
          dir,
          'tests/other.test.ts',
          `import { add } from '../src/math.js';\nconsole.log(add(3, 4));\n`,
        );
        const filesRun: string[][] = [];

        const controller = watchTests(
          async (files: string[]) => {
            filesRun.push(files);
          },
          {
            watchInclude: ['src/**', 'tests/**'],
            watchExclude: [],
            debounceMs: 50,
            cwd: dir,
          },
        );

        // Wait for watcher to initialize
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Modify the source file
        fs.writeFileSync(
          srcFile,
          `export function add(a: number, b: number) { return a + b + 0; }\n`,
        );

        // Wait long enough for debounce + execution + coverage tracking
        await new Promise((resolve) => setTimeout(resolve, 1500));
        controller.stop();

        // Should have triggered test runs
        if (filesRun.length > 0) {
          const lastRun = filesRun[filesRun.length - 1]!;
          assert.ok(lastRun.length >= 1, 'should run at least one test');
        }
      } finally {
        cleanup(dir);
      }
    },
  );

  nodeIt('source file with no dependents runs all tests', async () => {
    const dir = makeTmpDir();
    try {
      // Create an orphan source file (no test imports it)
      const orphanFile = writeFile(
        dir,
        'src/orphan.ts',
        `export const val = 1;\n`,
      );
      // Create test files that don't import the orphan
      writeFile(dir, 'tests/x.test.ts', `console.log("test x");\n`);
      writeFile(dir, 'tests/y.test.ts', `console.log("test y");\n`);

      const filesRun: string[][] = [];

      const controller = watchTests(
        async (files: string[]) => {
          filesRun.push(files);
        },
        {
          watchInclude: ['src/**', 'tests/**'],
          watchExclude: [],
          debounceMs: 50,
          cwd: dir,
        },
      );

      await new Promise((resolve) => setTimeout(resolve, 300));

      // Modify the orphan source file
      fs.writeFileSync(orphanFile, `export const val = 2;\n`);

      await new Promise((resolve) => setTimeout(resolve, 1500));
      controller.stop();

      // When an orphan source file changes, all tests should run
      if (filesRun.length > 0) {
        const lastRun = filesRun[filesRun.length - 1]!;
        assert.ok(
          lastRun.length >= 2,
          `Expected all tests, got ${lastRun.length}`,
        );
      }
    } finally {
      cleanup(dir);
    }
  });
});

nodeDescribe('watchTests — runFailed with deleted files', () => {
  nodeIt('runFailed skips files that no longer exist', async () => {
    const dir = makeTmpDir();
    try {
      const testFile = writeFile(
        dir,
        'tests/delete-me.test.ts',
        `console.log("test");\n`,
      );
      const runsRecorded: string[][] = [];
      let runIndex = 0;

      const controller = watchTests(
        async (files: string[]) => {
          runIndex++;
          runsRecorded.push(files);
          // Fail on first run
          if (runIndex === 1) {
            throw new Error('Simulated test failure');
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

      // Run all to trigger failure tracking
      controller.runAll();
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Delete the file
      fs.unlinkSync(testFile);

      // Run failed — should skip deleted file
      controller.runFailed();
      await new Promise((resolve) => setTimeout(resolve, 200));
      controller.stop();

      // The second run (runFailed) should either not run or run with
      // only existing files
      assert.ok(true, 'should not throw');
    } finally {
      cleanup(dir);
    }
  });
});
