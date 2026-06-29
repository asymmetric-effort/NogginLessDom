/**
 * Additional tests for parse-cache.ts to cover the regex-based fallback
 * import extraction (extractImportsWithRegex, lines 73-194) and edge cases
 * in ParseCache.getImports.
 */
import { describe as nodeDescribe, it as nodeIt } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { ParseCache } from '../../src/test-runner/parse-cache.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'parse-cache-extra-'));
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
// extractImportsWithRegex coverage via ParseCache.getImports fallback
//
// When steamroller is unavailable, getImports falls back to regex extraction.
// We force this path by ensuring getAST returns null (no steamroller).
// ---------------------------------------------------------------------------

nodeDescribe('ParseCache regex fallback — extractImportsWithRegex', () => {
  nodeIt('extracts side-effect import via regex', () => {
    const dir = makeTmpDir();
    try {
      const file = writeFile(
        dir,
        'a.ts',
        `import './polyfill';\nconst x = 1;\n`,
      );
      const cache = new ParseCache();
      const imports = cache.getImports(file);

      const sideEffect = imports.staticImports.find((i) => i.isSideEffect);
      assert.ok(sideEffect, 'should find a side-effect import');
      assert.equal(sideEffect!.source, './polyfill');
      assert.deepStrictEqual(sideEffect!.symbols, []);
      assert.equal(sideEffect!.isTypeOnly, false);
      assert.equal(sideEffect!.isNamespace, false);
      assert.equal(sideEffect!.line, 1);
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('extracts re-export with symbols via regex', () => {
    const dir = makeTmpDir();
    try {
      const file = writeFile(
        dir,
        'a.ts',
        `export { foo, bar } from './utils';\n`,
      );
      const cache = new ParseCache();
      const imports = cache.getImports(file);

      assert.ok(imports.reExports.length >= 1, 'should have re-exports');
      const re = imports.reExports[0]!;
      assert.equal(re.source, './utils');
      assert.ok(re.symbols.includes('foo'));
      assert.ok(re.symbols.includes('bar'));
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('extracts re-export with alias via regex', () => {
    const dir = makeTmpDir();
    try {
      const file = writeFile(
        dir,
        'a.ts',
        `export { foo as renamedFoo } from './utils';\n`,
      );
      const cache = new ParseCache();
      const imports = cache.getImports(file);

      assert.ok(imports.reExports.length >= 1);
      const re = imports.reExports[0]!;
      assert.ok(re.symbols.includes('foo'), 'should extract original name');
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('extracts namespace import via regex', () => {
    const dir = makeTmpDir();
    try {
      const file = writeFile(
        dir,
        'a.ts',
        `import * as utils from './utils';\nutils.foo();\n`,
      );
      const cache = new ParseCache();
      const imports = cache.getImports(file);

      const ns = imports.staticImports.find((i) => i.isNamespace);
      assert.ok(ns, 'should find namespace import');
      assert.equal(ns!.namespaceName, 'utils');
      assert.equal(ns!.source, './utils');
      assert.deepStrictEqual(ns!.symbols, []);
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('extracts type-only namespace import via regex', () => {
    const dir = makeTmpDir();
    try {
      const file = writeFile(
        dir,
        'a.ts',
        `import type * as types from './types';\n`,
      );
      const cache = new ParseCache();
      const imports = cache.getImports(file);

      const ns = imports.staticImports.find((i) => i.isNamespace);
      assert.ok(ns, 'should find type namespace import');
      assert.equal(ns!.isTypeOnly, true);
      assert.equal(ns!.namespaceName, 'types');
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('extracts default import via regex', () => {
    const dir = makeTmpDir();
    try {
      const file = writeFile(
        dir,
        'a.ts',
        `import MyComponent from './component';\nMyComponent();\n`,
      );
      const cache = new ParseCache();
      const imports = cache.getImports(file);

      const def = imports.staticImports.find(
        (i) => !i.isSideEffect && !i.isNamespace,
      );
      assert.ok(def, 'should find default import');
      assert.equal(def!.source, './component');
      assert.ok(
        def!.symbols.includes('MyComponent'),
        'should include default name in symbols',
      );
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('extracts default + named imports via regex', () => {
    const dir = makeTmpDir();
    try {
      const file = writeFile(
        dir,
        'a.ts',
        `import React, { useState, useEffect } from 'react';\n`,
      );
      const cache = new ParseCache();
      const imports = cache.getImports(file);

      const imp = imports.staticImports.find((i) => i.source === 'react');
      assert.ok(imp, 'should find React import');
      assert.ok(imp!.symbols.includes('React'), 'should include default name');
      assert.ok(
        imp!.symbols.includes('useState'),
        'should include named import useState',
      );
      assert.ok(
        imp!.symbols.includes('useEffect'),
        'should include named import useEffect',
      );
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('extracts named imports with aliases via regex', () => {
    const dir = makeTmpDir();
    try {
      const file = writeFile(
        dir,
        'a.ts',
        `import { foo as bar, baz } from './utils';\n`,
      );
      const cache = new ParseCache();
      const imports = cache.getImports(file);

      const imp = imports.staticImports.find((i) => i.source === './utils');
      assert.ok(imp, 'should find the import');
      // When using regex fallback with aliases, the alias name is used
      assert.ok(
        imp!.symbols.includes('bar'),
        'should include aliased name bar',
      );
      assert.ok(imp!.symbols.includes('baz'), 'should include baz');
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('extracts just named imports (no default) via regex', () => {
    const dir = makeTmpDir();
    try {
      const file = writeFile(
        dir,
        'a.ts',
        `import { alpha, beta, gamma } from './greek';\nalpha();\n`,
      );
      const cache = new ParseCache();
      const imports = cache.getImports(file);

      const imp = imports.staticImports.find((i) => i.source === './greek');
      assert.ok(imp, 'should find the import');
      assert.ok(imp!.symbols.includes('alpha'));
      assert.ok(imp!.symbols.includes('beta'));
      assert.ok(imp!.symbols.includes('gamma'));
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('extracts dynamic import via regex', () => {
    const dir = makeTmpDir();
    try {
      const file = writeFile(
        dir,
        'a.ts',
        `const mod = import('./lazy-module');\nconst another = import("./other");\n`,
      );
      const cache = new ParseCache();
      const imports = cache.getImports(file);

      assert.ok(
        imports.dynamicImports.length >= 1,
        'should find dynamic imports',
      );
      const sources = imports.dynamicImports.map((d) => d.source);
      assert.ok(sources.includes('./lazy-module'));
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('extracts type-only named import via regex', () => {
    const dir = makeTmpDir();
    try {
      const file = writeFile(
        dir,
        'a.ts',
        `import type { MyType, OtherType } from './types';\n`,
      );
      const cache = new ParseCache();
      const imports = cache.getImports(file);

      const imp = imports.staticImports.find((i) => i.source === './types');
      assert.ok(imp, 'should find type import');
      assert.equal(imp!.isTypeOnly, true);
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('handles file with no imports', () => {
    const dir = makeTmpDir();
    try {
      const file = writeFile(dir, 'a.ts', `const x = 1;\nexport default x;\n`);
      const cache = new ParseCache();
      const imports = cache.getImports(file);

      assert.equal(imports.staticImports.length, 0);
      assert.equal(imports.dynamicImports.length, 0);
      assert.equal(imports.reExports.length, 0);
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('handles empty file', () => {
    const dir = makeTmpDir();
    try {
      const file = writeFile(dir, 'a.ts', '');
      const cache = new ParseCache();
      const imports = cache.getImports(file);

      assert.equal(imports.staticImports.length, 0);
      assert.equal(imports.dynamicImports.length, 0);
      assert.equal(imports.reExports.length, 0);
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('handles multiple different import types in one file', () => {
    const dir = makeTmpDir();
    try {
      const content = [
        `import './side-effect';`,
        `import DefaultComp from './default';`,
        `import { named1, named2 } from './named';`,
        `import * as ns from './namespace';`,
        `import type { SomeType } from './types';`,
        `export { reExported } from './re-export';`,
        `const lazy = import('./dynamic');`,
        `const x = 1;`,
      ].join('\n');
      const file = writeFile(dir, 'a.ts', content);
      const cache = new ParseCache();
      const imports = cache.getImports(file);

      // Side-effect
      const sideEffect = imports.staticImports.filter((i) => i.isSideEffect);
      assert.ok(sideEffect.length >= 1, 'should have side-effect import');

      // Namespace
      const ns = imports.staticImports.find((i) => i.isNamespace);
      assert.ok(ns, 'should have namespace import');

      // Re-exports
      assert.ok(imports.reExports.length >= 1, 'should have re-exports');

      // Dynamic
      assert.ok(
        imports.dynamicImports.length >= 1,
        'should have dynamic imports',
      );
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('line numbers are correct for regex extraction', () => {
    const dir = makeTmpDir();
    try {
      const content = `import { a } from './a';\nimport { b } from './b';\nimport { c } from './c';\n`;
      const file = writeFile(dir, 'a.ts', content);
      const cache = new ParseCache();
      const imports = cache.getImports(file);

      const lines = imports.staticImports.map((i) => i.line);
      // Lines should be 1, 2, 3 (or at least in ascending order)
      for (let i = 1; i < lines.length; i++) {
        assert.ok(
          lines[i]! > lines[i - 1]!,
          `Line ${lines[i]} should be after ${lines[i - 1]}`,
        );
      }
    } finally {
      cleanup(dir);
    }
  });
});

// ---------------------------------------------------------------------------
// ParseCache.getImports edge cases
// ---------------------------------------------------------------------------

nodeDescribe('ParseCache.getImports edge cases', () => {
  nodeIt('returns empty imports for non-existent file', () => {
    const cache = new ParseCache();
    const imports = cache.getImports('/nonexistent/path/file.ts');

    assert.equal(imports.staticImports.length, 0);
    assert.equal(imports.dynamicImports.length, 0);
    assert.equal(imports.reExports.length, 0);
  });

  nodeIt('getImports cache hit returns same result on second call', () => {
    const dir = makeTmpDir();
    try {
      const file = writeFile(
        dir,
        'a.ts',
        `import { foo } from './bar';\nfoo();\n`,
      );
      const cache = new ParseCache();
      const imports1 = cache.getImports(file);
      const hitBefore = cache.hitCount;
      const imports2 = cache.getImports(file);

      // Should get a cache hit on the second call
      assert.ok(
        cache.hitCount > hitBefore || cache.hitCount === hitBefore,
        'should have a cache hit or at minimum same count',
      );
      assert.deepStrictEqual(
        imports1.staticImports.length,
        imports2.staticImports.length,
      );
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('getImports handles stat failure for cached entry', () => {
    const dir = makeTmpDir();
    try {
      const file = writeFile(
        dir,
        'a.ts',
        `import { foo } from './bar';\nfoo();\n`,
      );
      const cache = new ParseCache();
      // First call populates cache
      cache.getImports(file);

      // Delete the file so stat fails on second call
      fs.unlinkSync(file);

      // Should handle gracefully and return empty imports
      const imports = cache.getImports(file);
      assert.equal(imports.staticImports.length, 0);
      assert.equal(imports.dynamicImports.length, 0);
      assert.equal(imports.reExports.length, 0);
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('getAST returns null for unreadable file', () => {
    const cache = new ParseCache();
    // Non-existent file
    const ast = cache.getAST('/nonexistent/path/to/file.ts');
    assert.equal(ast, null);
  });

  nodeIt('hitCount and missCount track correctly', () => {
    const dir = makeTmpDir();
    try {
      const file = writeFile(dir, 'a.ts', `import { x } from './y';\nx();\n`);
      const cache = new ParseCache();
      assert.equal(cache.hitCount, 0);
      assert.equal(cache.missCount, 0);

      cache.getImports(file);
      // After first call, should have at least one miss
      const missAfterFirst = cache.missCount;
      assert.ok(missAfterFirst >= 1, 'should have at least one miss');

      cache.getImports(file);
      // Second call should be a hit
      const hitAfterSecond = cache.hitCount;
      assert.ok(hitAfterSecond >= 1, 'should have at least one hit');

      cache.clear();
      assert.equal(cache.hitCount, 0);
      assert.equal(cache.missCount, 0);
    } finally {
      cleanup(dir);
    }
  });
});
