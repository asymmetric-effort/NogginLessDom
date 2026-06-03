import { describe as nodeDescribe, it as nodeIt } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  analyzeImportDepth,
  configureDepthCheck,
  getDepthCheckConfig,
  resetDepthCheckConfig,
} from '../../src/test-runner/depth-analysis.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'depth-test-'));
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
// analyzeImportDepth
// ---------------------------------------------------------------------------

nodeDescribe('analyzeImportDepth', () => {
  // Happy path 1: linear chain A→B→C
  nodeIt('linear chain A→B→C: correct depths', () => {
    const dir = makeTmpDir();
    try {
      const a = writeFile(dir, 'a.ts', "import { y } from './b.js';");
      const b = writeFile(dir, 'b.ts', "import { z } from './c.js';");
      const c = writeFile(dir, 'c.ts', 'export const z = 1;');

      const result = analyzeImportDepth([a, b, c], { cwd: dir });

      const entryA = result.entries.find((e) => e.file === a);
      const entryB = result.entries.find((e) => e.file === b);
      const entryC = result.entries.find((e) => e.file === c);

      assert.ok(entryA);
      assert.equal(entryA.depth, 2);
      assert.ok(entryB);
      assert.equal(entryB.depth, 1);
      assert.ok(entryC);
      assert.equal(entryC.depth, 0);
    } finally {
      cleanup(dir);
    }
  });

  // Happy path 2: branching graph
  nodeIt('branching graph: correct max depth via longest branch', () => {
    const dir = makeTmpDir();
    try {
      // a → b → d, a → c (short branch)
      const a = writeFile(
        dir,
        'a.ts',
        "import { y } from './b.js';\nimport { z } from './c.js';",
      );
      const b = writeFile(dir, 'b.ts', "import { w } from './d.js';");
      const c = writeFile(dir, 'c.ts', 'export const z = 1;');
      const d = writeFile(dir, 'd.ts', 'export const w = 1;');

      const result = analyzeImportDepth([a, b, c, d], { cwd: dir });

      const entryA = result.entries.find((e) => e.file === a);
      assert.ok(entryA);
      assert.equal(entryA.depth, 2); // a → b → d is longest
    } finally {
      cleanup(dir);
    }
  });

  // Happy path 3: entry points correctly identified
  nodeIt('entry points correctly identified in result', () => {
    const dir = makeTmpDir();
    try {
      const a = writeFile(dir, 'a.ts', "import { y } from './b.js';");
      const b = writeFile(dir, 'b.ts', 'export const y = 1;');

      const result = analyzeImportDepth([a, b], { cwd: dir });

      assert.equal(result.entries.length, 2);
      const files = result.entries.map((e) => e.file);
      assert.ok(files.includes(a));
      assert.ok(files.includes(b));
    } finally {
      cleanup(dir);
    }
  });

  // Happy path 4: direct vs transitive import counts
  nodeIt('direct vs transitive import counts accurate', () => {
    const dir = makeTmpDir();
    try {
      // a imports b and c directly; b imports d
      const a = writeFile(
        dir,
        'a.ts',
        "import { y } from './b.js';\nimport { z } from './c.js';",
      );
      const b = writeFile(dir, 'b.ts', "import { w } from './d.js';");
      const c = writeFile(dir, 'c.ts', 'export const z = 1;');
      const d = writeFile(dir, 'd.ts', 'export const w = 1;');

      const result = analyzeImportDepth([a, b, c, d], { cwd: dir });

      const entryA = result.entries.find((e) => e.file === a);
      assert.ok(entryA);
      assert.equal(entryA.directImports, 2); // b and c
      assert.equal(entryA.transitiveImports, 3); // b, c, d
    } finally {
      cleanup(dir);
    }
  });

  // Happy path 5: max and average stats
  nodeIt('max and average stats computed correctly', () => {
    const dir = makeTmpDir();
    try {
      const a = writeFile(dir, 'a.ts', "import { y } from './b.js';");
      const b = writeFile(dir, 'b.ts', 'export const y = 1;');

      const result = analyzeImportDepth([a, b], { cwd: dir });

      assert.equal(result.maxDepth, 1);
      assert.equal(result.averageDepth, 0.5); // (1 + 0) / 2
    } finally {
      cleanup(dir);
    }
  });

  // Happy path 6: threshold filtering
  nodeIt('threshold filtering returns only exceeding files', () => {
    const dir = makeTmpDir();
    try {
      const a = writeFile(dir, 'a.ts', "import { y } from './b.js';");
      const b = writeFile(dir, 'b.ts', "import { z } from './c.js';");
      const c = writeFile(dir, 'c.ts', 'export const z = 1;');

      const result = analyzeImportDepth([a, b, c], {
        cwd: dir,
        threshold: 1,
      });

      // Only a (depth 2) exceeds threshold of 1
      assert.equal(result.filesExceedingThreshold.length, 1);
      assert.equal(result.filesExceedingThreshold[0]!.file, a);
    } finally {
      cleanup(dir);
    }
  });

  // Happy path 7: IMPORT_DEPTH_THRESHOLD env var
  nodeIt('IMPORT_DEPTH_THRESHOLD env var works', () => {
    resetDepthCheckConfig();
    const original = process.env.IMPORT_DEPTH_THRESHOLD;
    try {
      process.env.IMPORT_DEPTH_THRESHOLD = '5';
      configureDepthCheck({});

      const config = getDepthCheckConfig();
      assert.equal(config.threshold, 5);
      assert.equal(config.enabled, true);
    } finally {
      if (original === undefined) {
        delete process.env.IMPORT_DEPTH_THRESHOLD;
      } else {
        process.env.IMPORT_DEPTH_THRESHOLD = original;
      }
      resetDepthCheckConfig();
    }
  });

  // Sad path 8: single file, no imports
  nodeIt('single file, no imports → depth 0', () => {
    const dir = makeTmpDir();
    try {
      const a = writeFile(dir, 'a.ts', 'export const x = 1;');

      const result = analyzeImportDepth([a], { cwd: dir });

      assert.equal(result.entries.length, 1);
      assert.equal(result.entries[0]!.depth, 0);
      assert.equal(result.maxDepth, 0);
    } finally {
      cleanup(dir);
    }
  });

  // Sad path 9: circular dependency doesn't cause infinite loop
  nodeIt('circular dependency does not cause infinite loop', () => {
    const dir = makeTmpDir();
    try {
      const a = writeFile(dir, 'a.ts', "import { y } from './b.js';");
      const b = writeFile(dir, 'b.ts', "import { x } from './a.js';");

      // Should complete without hanging
      const result = analyzeImportDepth([a, b], { cwd: dir });

      assert.ok(result.entries.length > 0);
      // Depths should be finite
      for (const entry of result.entries) {
        assert.ok(Number.isFinite(entry.depth));
      }
    } finally {
      cleanup(dir);
    }
  });

  // Sad path 10: empty entry files
  nodeIt('empty entry files → empty result', () => {
    const result = analyzeImportDepth([]);

    assert.equal(result.entries.length, 0);
    assert.equal(result.maxDepth, 0);
    assert.equal(result.averageDepth, 0);
    assert.equal(result.filesExceedingThreshold.length, 0);
  });

  // Sad path 11: non-existent files
  nodeIt('handles non-existent files gracefully', () => {
    const result = analyzeImportDepth(['/nonexistent/file.ts'], {
      cwd: '/tmp',
    });

    assert.equal(result.entries.length, 0);
  });

  // Sad path 12: exclude patterns
  nodeIt('exclude patterns filter files', () => {
    const dir = makeTmpDir();
    try {
      const a = writeFile(
        dir,
        'src/a.ts',
        "import { y } from '../vendor/b.js';",
      );
      writeFile(dir, 'vendor/b.ts', 'export const y = 1;');

      const result = analyzeImportDepth([a], {
        cwd: dir,
        exclude: ['vendor'],
      });

      const entryA = result.entries.find((e) => e.file === a);
      assert.ok(entryA);
      // Vendor import excluded, so depth should be 0
      assert.equal(entryA.depth, 0);
      assert.equal(entryA.directImports, 0);
    } finally {
      cleanup(dir);
    }
  });

  // Sad path 13: file importing only bare specifiers
  nodeIt('file importing only bare specifiers → depth 0', () => {
    const dir = makeTmpDir();
    try {
      const a = writeFile(
        dir,
        'a.ts',
        "import lodash from 'lodash';\nimport fs from 'node:fs';",
      );

      const result = analyzeImportDepth([a], { cwd: dir });

      const entryA = result.entries.find((e) => e.file === a);
      assert.ok(entryA);
      assert.equal(entryA.depth, 0);
      assert.equal(entryA.directImports, 0);
    } finally {
      cleanup(dir);
    }
  });
});

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

nodeDescribe('depth check configuration', () => {
  // Sad path 14: configureDepthCheck sets config
  nodeIt('configureDepthCheck sets config correctly', () => {
    resetDepthCheckConfig();
    configureDepthCheck({ enabled: true, threshold: 5, strict: true });

    const config = getDepthCheckConfig();
    assert.equal(config.enabled, true);
    assert.equal(config.threshold, 5);
    assert.equal(config.strict, true);

    resetDepthCheckConfig();
  });

  nodeIt('resetDepthCheckConfig restores defaults', () => {
    configureDepthCheck({ enabled: true, threshold: 3 });
    resetDepthCheckConfig();

    const config = getDepthCheckConfig();
    assert.equal(config.enabled, false);
    assert.equal(config.threshold, 10);
    assert.equal(config.strict, false);
  });

  nodeIt('getDepthCheckConfig returns a copy', () => {
    resetDepthCheckConfig();
    const config1 = getDepthCheckConfig();
    config1.threshold = 99;

    const config2 = getDepthCheckConfig();
    assert.equal(config2.threshold, 10);

    resetDepthCheckConfig();
  });
});
