import { describe as nodeDescribe, it as nodeIt } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  buildForwardGraph,
  detectCircularImports,
  formatCycleReport,
  configureCycleDetection,
  getCycleDetectionConfig,
  resetCycleDetectionConfig,
} from '../../src/test-runner/cycle-detection.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cycle-test-'));
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
// buildForwardGraph
// ---------------------------------------------------------------------------

nodeDescribe('buildForwardGraph', () => {
  nodeIt('builds forward dependency graph from files', () => {
    const dir = makeTmpDir();
    try {
      const a = writeFile(dir, 'a.ts', "import { x } from './b.js';");
      const b = writeFile(dir, 'b.ts', 'export const x = 1;');

      const graph = buildForwardGraph([a, b]);

      assert.ok(graph.has(a));
      const aDeps = graph.get(a)!;
      assert.equal(aDeps.size, 1);
      // The resolved path should point to b.ts (resolved from ./b.js)
      assert.ok(aDeps.has(b));

      assert.ok(graph.has(b));
      assert.equal(graph.get(b)!.size, 0);
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('skips bare specifiers and node: built-ins', () => {
    const dir = makeTmpDir();
    try {
      const a = writeFile(
        dir,
        'a.ts',
        "import fs from 'node:fs';\nimport lodash from 'lodash';\nimport { x } from './b.js';",
      );
      writeFile(dir, 'b.ts', 'export const x = 1;');

      const graph = buildForwardGraph([a]);

      assert.ok(graph.has(a));
      // Only the relative import should be in the graph
      assert.equal(graph.get(a)!.size, 1);
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('handles non-existent files gracefully', () => {
    const graph = buildForwardGraph(['/nonexistent/file.ts']);
    assert.equal(graph.size, 0);
  });

  nodeIt('parses require() calls', () => {
    const dir = makeTmpDir();
    try {
      const a = writeFile(dir, 'a.ts', "const b = require('./b.js');");
      const b = writeFile(dir, 'b.ts', 'module.exports = 1;');

      const graph = buildForwardGraph([a, b]);

      assert.ok(graph.has(a));
      assert.ok(graph.get(a)!.has(b));
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('skips bare require() specifiers', () => {
    const dir = makeTmpDir();
    try {
      const a = writeFile(
        dir,
        'a.ts',
        "const fs = require('node:fs');\nconst _ = require('lodash');",
      );

      const graph = buildForwardGraph([a]);

      assert.ok(graph.has(a));
      assert.equal(graph.get(a)!.size, 0);
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('resolves .js imports to .ts files on disk', () => {
    const dir = makeTmpDir();
    try {
      const a = writeFile(dir, 'a.ts', "import { x } from './b.js';");
      const b = writeFile(dir, 'b.ts', 'export const x = 1;');

      const graph = buildForwardGraph([a, b]);

      assert.ok(graph.get(a)!.has(b));
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('resolves specifiers without extension to existing files', () => {
    const dir = makeTmpDir();
    try {
      const a = writeFile(dir, 'a.ts', "import { x } from './b';");
      const b = writeFile(dir, 'b.ts', 'export const x = 1;');

      const graph = buildForwardGraph([a, b]);

      assert.ok(graph.get(a)!.has(b));
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('resolves .jsx imports to .tsx files on disk', () => {
    const dir = makeTmpDir();
    try {
      const a = writeFile(dir, 'a.ts', "import { x } from './c.jsx';");
      const c = writeFile(dir, 'c.tsx', 'export const x = 1;');

      const graph = buildForwardGraph([a]);

      assert.ok(graph.get(a)!.has(c));
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('falls back to raw path for unresolvable specifiers', () => {
    const dir = makeTmpDir();
    try {
      const a = writeFile(dir, 'a.ts', "import { x } from './nonexistent.js';");

      const graph = buildForwardGraph([a]);

      // Should still have the entry with one unresolved dep
      assert.ok(graph.has(a));
      assert.equal(graph.get(a)!.size, 1);
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('respects exclude patterns', () => {
    const dir = makeTmpDir();
    try {
      const a = writeFile(
        dir,
        'src/a.ts',
        "import { x } from '../vendor/b.js';",
      );
      writeFile(dir, 'vendor/b.ts', 'export const x = 1;');

      const graph = buildForwardGraph([a], { cwd: dir, exclude: ['vendor'] });

      assert.ok(graph.has(a));
      // The vendor import should be excluded
      assert.equal(graph.get(a)!.size, 0);
    } finally {
      cleanup(dir);
    }
  });
});

// ---------------------------------------------------------------------------
// detectCircularImports
// ---------------------------------------------------------------------------

nodeDescribe('detectCircularImports', () => {
  // Happy path 1: A↔B two-file cycle
  nodeIt('detects A↔B two-file cycle', () => {
    const dir = makeTmpDir();
    try {
      const a = writeFile(dir, 'a.ts', "import { y } from './b.js';");
      const b = writeFile(dir, 'b.ts', "import { x } from './a.js';");

      const cycles = detectCircularImports([a, b], { cwd: dir });

      assert.equal(cycles.length, 1);
      // Cycle should contain both files
      assert.equal(cycles[0]!.files.size, 2);
    } finally {
      cleanup(dir);
    }
  });

  // Happy path 2: A→B→C→A three-file cycle
  nodeIt('detects A→B→C→A three-file cycle', () => {
    const dir = makeTmpDir();
    try {
      const a = writeFile(dir, 'a.ts', "import { y } from './b.js';");
      const b = writeFile(dir, 'b.ts', "import { z } from './c.js';");
      const c = writeFile(dir, 'c.ts', "import { x } from './a.js';");

      const cycles = detectCircularImports([a, b, c], { cwd: dir });

      assert.equal(cycles.length, 1);
      assert.equal(cycles[0]!.files.size, 3);
    } finally {
      cleanup(dir);
    }
  });

  // Happy path 3: self-import
  nodeIt('detects self-import (A→A)', () => {
    const dir = makeTmpDir();
    try {
      const a = writeFile(dir, 'a.ts', "import { x } from './a.js';");

      const cycles = detectCircularImports([a], { cwd: dir });

      assert.equal(cycles.length, 1);
      assert.equal(cycles[0]!.cycle.length, 2); // [a, a]
      assert.equal(cycles[0]!.cycle[0], cycles[0]!.cycle[1]);
    } finally {
      cleanup(dir);
    }
  });

  // Happy path 4: multiple independent cycles
  nodeIt('detects multiple independent cycles', () => {
    const dir = makeTmpDir();
    try {
      const a = writeFile(dir, 'a.ts', "import { y } from './b.js';");
      const b = writeFile(dir, 'b.ts', "import { x } from './a.js';");
      const c = writeFile(dir, 'c.ts', "import { w } from './d.js';");
      const d = writeFile(dir, 'd.ts', "import { z } from './c.js';");

      const cycles = detectCircularImports([a, b, c, d], { cwd: dir });

      assert.equal(cycles.length, 2);
    } finally {
      cleanup(dir);
    }
  });

  // Sad path 7: no cycles in acyclic graph
  nodeIt('returns empty array for acyclic graph', () => {
    const dir = makeTmpDir();
    try {
      const a = writeFile(dir, 'a.ts', "import { y } from './b.js';");
      writeFile(dir, 'b.ts', 'export const y = 1;');

      const cycles = detectCircularImports([a], { cwd: dir });

      assert.equal(cycles.length, 0);
    } finally {
      cleanup(dir);
    }
  });

  // Sad path 8: bare specifiers skipped
  nodeIt('skips bare specifiers (not treated as project files)', () => {
    const dir = makeTmpDir();
    try {
      const a = writeFile(
        dir,
        'a.ts',
        "import lodash from 'lodash';\nimport fs from 'node:fs';",
      );

      const cycles = detectCircularImports([a], { cwd: dir });

      assert.equal(cycles.length, 0);
    } finally {
      cleanup(dir);
    }
  });

  // Sad path 9: non-existent files don't crash
  nodeIt('handles non-existent files without crashing', () => {
    const cycles = detectCircularImports(['/nonexistent/a.ts'], {
      cwd: '/tmp',
    });
    assert.equal(cycles.length, 0);
  });

  // Sad path 10: deduplication
  nodeIt('deduplicates same cycle found from different entry points', () => {
    const dir = makeTmpDir();
    try {
      const a = writeFile(dir, 'a.ts', "import { y } from './b.js';");
      const b = writeFile(dir, 'b.ts', "import { x } from './a.js';");

      // Pass both files as entries - same cycle should only appear once
      const cycles = detectCircularImports([a, b], { cwd: dir });

      assert.equal(cycles.length, 1);
    } finally {
      cleanup(dir);
    }
  });

  // Sad path 11: maxCycles limits output
  nodeIt('respects maxCycles limit', () => {
    const dir = makeTmpDir();
    try {
      // Create 3 independent 2-file cycles
      const a1 = writeFile(dir, 'a1.ts', "import { y } from './b1.js';");
      const b1 = writeFile(dir, 'b1.ts', "import { x } from './a1.js';");
      const a2 = writeFile(dir, 'a2.ts', "import { y } from './b2.js';");
      const b2 = writeFile(dir, 'b2.ts', "import { x } from './a2.js';");
      const a3 = writeFile(dir, 'a3.ts', "import { y } from './b3.js';");
      const b3 = writeFile(dir, 'b3.ts', "import { x } from './a3.js';");

      const cycles = detectCircularImports([a1, b1, a2, b2, a3, b3], {
        cwd: dir,
        maxCycles: 2,
      });

      assert.ok(cycles.length <= 2);
    } finally {
      cleanup(dir);
    }
  });

  // Sad path 12: exclude patterns filter files
  nodeIt('respects exclude patterns', () => {
    const dir = makeTmpDir();
    try {
      const a = writeFile(
        dir,
        'src/a.ts',
        "import { y } from '../vendor/b.js';",
      );
      const b = writeFile(
        dir,
        'vendor/b.ts',
        "import { x } from '../src/a.js';",
      );

      const cycles = detectCircularImports([a, b], {
        cwd: dir,
        exclude: ['vendor'],
      });

      // The vendor file should be excluded, breaking the cycle
      assert.equal(cycles.length, 0);
    } finally {
      cleanup(dir);
    }
  });

  // Sad path 13: empty entry files
  nodeIt('returns empty result for empty entry files', () => {
    const cycles = detectCircularImports([]);
    assert.equal(cycles.length, 0);
  });

  // Sad path 14: file with no imports
  nodeIt('returns no cycles for file with no imports', () => {
    const dir = makeTmpDir();
    try {
      const a = writeFile(dir, 'a.ts', 'export const x = 1;');

      const cycles = detectCircularImports([a], { cwd: dir });

      assert.equal(cycles.length, 0);
    } finally {
      cleanup(dir);
    }
  });
});

// ---------------------------------------------------------------------------
// formatCycleReport
// ---------------------------------------------------------------------------

nodeDescribe('formatCycleReport', () => {
  // Happy path 5: correct format
  nodeIt('produces correct arrow-separated format', () => {
    const cycles = [
      {
        cycle: ['src/a.ts', 'src/b.ts', 'src/a.ts'],
        files: new Set(['src/a.ts', 'src/b.ts']),
      },
    ];

    const report = formatCycleReport(cycles);

    assert.ok(report.includes('1 circular dependency'));
    assert.ok(report.includes('src/a.ts → src/b.ts → src/a.ts'));
  });

  nodeIt('handles multiple cycles', () => {
    const cycles = [
      {
        cycle: ['a.ts', 'b.ts', 'a.ts'],
        files: new Set(['a.ts', 'b.ts']),
      },
      {
        cycle: ['c.ts', 'd.ts', 'c.ts'],
        files: new Set(['c.ts', 'd.ts']),
      },
    ];

    const report = formatCycleReport(cycles);

    assert.ok(report.includes('2 circular dependencies'));
    assert.ok(report.includes('a.ts → b.ts → a.ts'));
    assert.ok(report.includes('c.ts → d.ts → c.ts'));
  });

  nodeIt('returns friendly message for no cycles', () => {
    const report = formatCycleReport([]);
    assert.ok(report.includes('No circular dependencies detected'));
  });
});

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

nodeDescribe('cycle detection configuration', () => {
  nodeIt('configureCycleDetection sets config correctly', () => {
    resetCycleDetectionConfig();
    configureCycleDetection({ enabled: true, strict: true, maxCycles: 10 });

    const config = getCycleDetectionConfig();
    assert.equal(config.enabled, true);
    assert.equal(config.strict, true);
    assert.equal(config.maxCycles, 10);

    resetCycleDetectionConfig();
  });

  // Happy path 6: DETECT_CYCLES env var
  nodeIt('DETECT_CYCLES env var enables detection', () => {
    resetCycleDetectionConfig();
    const original = process.env.DETECT_CYCLES;
    try {
      process.env.DETECT_CYCLES = 'true';
      configureCycleDetection({});

      const config = getCycleDetectionConfig();
      assert.equal(config.enabled, true);
    } finally {
      if (original === undefined) {
        delete process.env.DETECT_CYCLES;
      } else {
        process.env.DETECT_CYCLES = original;
      }
      resetCycleDetectionConfig();
    }
  });

  nodeIt('DETECT_CYCLES=1 enables detection', () => {
    resetCycleDetectionConfig();
    const original = process.env.DETECT_CYCLES;
    try {
      process.env.DETECT_CYCLES = '1';
      configureCycleDetection({});

      const config = getCycleDetectionConfig();
      assert.equal(config.enabled, true);
    } finally {
      if (original === undefined) {
        delete process.env.DETECT_CYCLES;
      } else {
        process.env.DETECT_CYCLES = original;
      }
      resetCycleDetectionConfig();
    }
  });

  // Sad path 15: strict mode
  nodeIt('configureCycleDetection strict mode sets config correctly', () => {
    resetCycleDetectionConfig();
    configureCycleDetection({ strict: true });

    const config = getCycleDetectionConfig();
    assert.equal(config.strict, true);

    resetCycleDetectionConfig();
  });

  nodeIt('resetCycleDetectionConfig restores defaults', () => {
    configureCycleDetection({ enabled: true, strict: true, maxCycles: 5 });
    resetCycleDetectionConfig();

    const config = getCycleDetectionConfig();
    assert.equal(config.enabled, false);
    assert.equal(config.strict, false);
    assert.equal(config.maxCycles, 50);
  });

  nodeIt('getCycleDetectionConfig returns a copy', () => {
    resetCycleDetectionConfig();
    const config1 = getCycleDetectionConfig();
    config1.enabled = true;

    const config2 = getCycleDetectionConfig();
    assert.equal(config2.enabled, false);

    resetCycleDetectionConfig();
  });
});
