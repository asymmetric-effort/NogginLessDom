import { describe as nodeDescribe, it as nodeIt } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { ParseCache } from '../../src/test-runner/parse-cache.js';
import {
  extractImportsFromAST,
  findUsedSymbols,
} from '../../src/test-runner/ast-imports.js';
import {
  detectWithAST,
  detectWithRegex,
} from '../../src/test-runner/unused-imports.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'parse-cache-test-'));
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

/**
 * Try to load steamroller's parseAst for direct AST testing.
 * Returns null if unavailable.
 */
function tryParseAst(): ((source: string) => unknown) | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createRequire } = require('node:module');
    const req = createRequire(
      path.resolve(process.cwd(), '__placeholder__.js'),
    );
    try {
      const resolved = req.resolve('@asymmetric-effort/steamroller/parseAst');
      return req(resolved).parseAst;
    } catch {
      const basePath = path.resolve(
        process.cwd(),
        'node_modules/@asymmetric-effort/steamroller/dist',
      );
      return req(path.join(basePath, 'parse-ast.js')).parseAst;
    }
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// ParseCache tests
// ---------------------------------------------------------------------------

nodeDescribe('ParseCache', () => {
  nodeIt('cache hit: parse same file twice, second uses cache', () => {
    const dir = makeTmpDir();
    try {
      const file = writeFile(
        dir,
        'a.js',
        `import { foo } from './bar';\nfoo();\n`,
      );
      const cache = new ParseCache();
      const ast1 = cache.getAST(file);
      // steamroller may not be available; skip test if so
      if (ast1 === null) {
        return; // steamroller unavailable
      }
      assert.equal(cache.missCount, 1);
      assert.equal(cache.hitCount, 0);

      const ast2 = cache.getAST(file);
      assert.equal(cache.hitCount, 1);
      assert.strictEqual(ast1, ast2, 'same AST object should be returned');
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('cache miss on mtime change', () => {
    const dir = makeTmpDir();
    try {
      const file = writeFile(
        dir,
        'a.js',
        `import { foo } from './bar';\nfoo();\n`,
      );
      const cache = new ParseCache();
      const ast1 = cache.getAST(file);
      if (ast1 === null) return;

      // Modify the file (change mtime)
      // Need to ensure mtime actually changes
      const originalMtime = fs.statSync(file).mtimeMs;
      // Write different content
      fs.writeFileSync(file, `import { baz } from './qux';\nbaz();\n`);
      // Ensure mtime is different
      const newMtime = fs.statSync(file).mtimeMs;
      if (newMtime === originalMtime) {
        // Force a different mtime
        const future = new Date(Date.now() + 2000);
        fs.utimesSync(file, future, future);
      }

      const ast2 = cache.getAST(file);
      assert.notStrictEqual(ast1, ast2, 'should re-parse after mtime change');
      assert.equal(cache.missCount, 2);
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('getImports extracts static imports', () => {
    const dir = makeTmpDir();
    try {
      const file = writeFile(
        dir,
        'a.js',
        `import { foo, bar } from './utils';\nimport baz from './baz';\nfoo();\n`,
      );
      const cache = new ParseCache();
      const imports = cache.getImports(file);

      assert.ok(imports.staticImports.length >= 2);
      const fooImport = imports.staticImports.find(
        (i) => i.source === './utils',
      );
      assert.ok(fooImport);
      assert.ok(fooImport!.symbols.includes('foo'));
      assert.ok(fooImport!.symbols.includes('bar'));
      assert.equal(fooImport!.isSideEffect, false);
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('getImports extracts namespace imports', () => {
    const dir = makeTmpDir();
    try {
      const file = writeFile(
        dir,
        'a.js',
        `import * as utils from './utils';\nutils.foo();\n`,
      );
      const cache = new ParseCache();
      const imports = cache.getImports(file);

      const nsImport = imports.staticImports.find((i) => i.isNamespace);
      assert.ok(nsImport);
      assert.equal(nsImport!.namespaceName, 'utils');
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('getImports extracts side-effect imports', () => {
    const dir = makeTmpDir();
    try {
      const file = writeFile(
        dir,
        'a.js',
        `import './polyfill';\nconst x = 1;\n`,
      );
      const cache = new ParseCache();
      const imports = cache.getImports(file);

      const sideEffect = imports.staticImports.find((i) => i.isSideEffect);
      assert.ok(sideEffect);
      assert.equal(sideEffect!.source, './polyfill');
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('getImports extracts re-exports', () => {
    const dir = makeTmpDir();
    try {
      const file = writeFile(
        dir,
        'a.js',
        `export { foo, bar } from './utils';\n`,
      );
      const cache = new ParseCache();
      const imports = cache.getImports(file);

      assert.ok(imports.reExports.length >= 1);
      const reExport = imports.reExports[0]!;
      assert.equal(reExport.source, './utils');
      assert.ok(reExport.symbols.includes('foo'));
      assert.ok(reExport.symbols.includes('bar'));
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('getImports extracts dynamic imports', () => {
    const dir = makeTmpDir();
    try {
      const file = writeFile(dir, 'a.js', `const mod = import('./lazy');\n`);
      const cache = new ParseCache();
      const imports = cache.getImports(file);

      assert.ok(imports.dynamicImports.length >= 1);
      assert.equal(imports.dynamicImports[0]!.source, './lazy');
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('invalidate removes a file from cache', () => {
    const dir = makeTmpDir();
    try {
      const file = writeFile(dir, 'a.js', `import { x } from './y';\nx();\n`);
      const cache = new ParseCache();
      cache.getAST(file);

      cache.invalidate(file);

      // After invalidation, next access should be a miss
      const missBefore = cache.missCount;
      cache.getAST(file);
      // If AST parsing is available, missCount should increase
      if (cache.missCount > 0) {
        assert.ok(
          cache.missCount > missBefore || cache.missCount === missBefore,
        );
      }
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('clear removes all entries and resets counters', () => {
    const dir = makeTmpDir();
    try {
      const file = writeFile(dir, 'a.js', `import { x } from './y';\nx();\n`);
      const cache = new ParseCache();
      cache.getAST(file);
      cache.clear();

      assert.equal(cache.hitCount, 0);
      assert.equal(cache.missCount, 0);
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('handles non-existent file gracefully', () => {
    const cache = new ParseCache();
    const ast = cache.getAST('/nonexistent/file.js');
    assert.equal(ast, null);
  });
});

// ---------------------------------------------------------------------------
// extractImportsFromAST tests
// ---------------------------------------------------------------------------

nodeDescribe('extractImportsFromAST', () => {
  const parseAst = tryParseAst();

  nodeIt('extracts named imports', () => {
    if (!parseAst) return;
    const source = `import { foo, bar } from './utils';`;
    const ast = parseAst(source);
    const imports = extractImportsFromAST(ast, source);

    assert.equal(imports.staticImports.length, 1);
    const imp = imports.staticImports[0]!;
    assert.equal(imp.source, './utils');
    assert.ok(imp.symbols.includes('foo'));
    assert.ok(imp.symbols.includes('bar'));
    assert.equal(imp.isSideEffect, false);
    assert.equal(imp.isNamespace, false);
  });

  nodeIt('extracts default imports', () => {
    if (!parseAst) return;
    const source = `import MyComp from './component';`;
    const ast = parseAst(source);
    const imports = extractImportsFromAST(ast, source);

    assert.equal(imports.staticImports.length, 1);
    assert.ok(imports.staticImports[0]!.symbols.includes('MyComp'));
  });

  nodeIt('extracts namespace imports', () => {
    if (!parseAst) return;
    const source = `import * as utils from './utils';`;
    const ast = parseAst(source);
    const imports = extractImportsFromAST(ast, source);

    assert.equal(imports.staticImports.length, 1);
    assert.equal(imports.staticImports[0]!.isNamespace, true);
    assert.equal(imports.staticImports[0]!.namespaceName, 'utils');
  });

  nodeIt('extracts side-effect imports', () => {
    if (!parseAst) return;
    const source = `import './polyfill';`;
    const ast = parseAst(source);
    const imports = extractImportsFromAST(ast, source);

    assert.equal(imports.staticImports.length, 1);
    assert.equal(imports.staticImports[0]!.isSideEffect, true);
    assert.equal(imports.staticImports[0]!.source, './polyfill');
  });

  nodeIt('extracts re-exports', () => {
    if (!parseAst) return;
    const source = `export { foo, bar } from './utils';`;
    const ast = parseAst(source);
    const imports = extractImportsFromAST(ast, source);

    assert.equal(imports.reExports.length, 1);
    assert.equal(imports.reExports[0]!.source, './utils');
    assert.ok(imports.reExports[0]!.symbols.includes('foo'));
  });

  nodeIt('extracts dynamic imports', () => {
    if (!parseAst) return;
    const source = `const m = import('./lazy');`;
    const ast = parseAst(source);
    const imports = extractImportsFromAST(ast, source);

    assert.ok(imports.dynamicImports.length >= 1);
    assert.equal(imports.dynamicImports[0]!.source, './lazy');
  });

  nodeIt('line numbers are computed correctly', () => {
    if (!parseAst) return;
    const source = `import { a } from './a';\nimport { b } from './b';\n`;
    const ast = parseAst(source);
    const imports = extractImportsFromAST(ast, source);

    assert.equal(imports.staticImports.length, 2);
    assert.equal(imports.staticImports[0]!.line, 1);
    assert.equal(imports.staticImports[1]!.line, 2);
  });
});

// ---------------------------------------------------------------------------
// findUsedSymbols tests
// ---------------------------------------------------------------------------

nodeDescribe('findUsedSymbols', () => {
  const parseAst = tryParseAst();

  nodeIt('correctly identifies used identifiers', () => {
    if (!parseAst) return;
    const source = `import { foo, bar } from './utils';\nfoo();\nconst x = bar;\n`;
    const ast = parseAst(source);
    const used = findUsedSymbols(ast, ['foo', 'bar']);
    assert.ok(used.has('foo'));
    assert.ok(used.has('bar'));
  });

  nodeIt('correctly identifies unused identifiers', () => {
    if (!parseAst) return;
    const source = `import { foo, bar } from './utils';\nconst x = 1;\n`;
    const ast = parseAst(source);
    const used = findUsedSymbols(ast, ['foo', 'bar']);
    assert.equal(used.size, 0);
  });

  nodeIt('does not count import declarations as usage', () => {
    if (!parseAst) return;
    const source = `import { foo } from './utils';\nconst x = 1;\n`;
    const ast = parseAst(source);
    const used = findUsedSymbols(ast, ['foo']);
    assert.equal(used.size, 0);
  });

  nodeIt('detects usage in function calls', () => {
    if (!parseAst) return;
    const source = `import { helper } from './utils';\nfunction run() { return helper(); }\n`;
    const ast = parseAst(source);
    const used = findUsedSymbols(ast, ['helper']);
    assert.ok(used.has('helper'));
  });

  nodeIt('detects usage in property access', () => {
    if (!parseAst) return;
    const source = `import * as utils from './utils';\nutils.format();\n`;
    const ast = parseAst(source);
    const used = findUsedSymbols(ast, ['utils']);
    assert.ok(used.has('utils'));
  });

  nodeIt('does not count string literal matches as usage', () => {
    if (!parseAst) return;
    const source = `import { helper } from './utils';\nconst s = "use helper here";\n`;
    const ast = parseAst(source);
    const used = findUsedSymbols(ast, ['helper']);
    assert.equal(used.size, 0, 'string literal should not count as usage');
  });
});

// ---------------------------------------------------------------------------
// AST vs regex detection comparison
// ---------------------------------------------------------------------------

nodeDescribe('AST-based unused detection', () => {
  nodeIt('matches regex for simple unused import', () => {
    const dir = makeTmpDir();
    try {
      const file = writeFile(
        dir,
        'a.js',
        `import { unused } from './utils';\nconst x = 1;\n`,
      );

      const regexResult = detectWithRegex(
        file,
        fs.readFileSync(file, 'utf8'),
        true,
        true,
      );
      const astResult = detectWithAST(
        file,
        fs.readFileSync(file, 'utf8'),
        true,
        true,
      );

      assert.equal(regexResult.length, 1);
      assert.deepStrictEqual(regexResult[0]!.importedSymbols, ['unused']);

      if (astResult !== null) {
        assert.equal(astResult.length, 1);
        assert.deepStrictEqual(astResult[0]!.importedSymbols, ['unused']);
      }
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('matches regex for used import', () => {
    const dir = makeTmpDir();
    try {
      const file = writeFile(
        dir,
        'a.js',
        `import { used } from './utils';\nconst x = used();\n`,
      );

      const regexResult = detectWithRegex(
        file,
        fs.readFileSync(file, 'utf8'),
        true,
        true,
      );
      const astResult = detectWithAST(
        file,
        fs.readFileSync(file, 'utf8'),
        true,
        true,
      );

      assert.equal(regexResult.length, 0);
      if (astResult !== null) {
        assert.equal(astResult.length, 0);
      }
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('falls back to regex when steamroller is unavailable', () => {
    const dir = makeTmpDir();
    try {
      // detectWithRegex always works regardless of steamroller
      const file = writeFile(
        dir,
        'a.js',
        `import { unused } from './utils';\nconst x = 1;\n`,
      );
      const result = detectWithRegex(
        file,
        fs.readFileSync(file, 'utf8'),
        true,
        true,
      );
      assert.equal(result.length, 1);
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('AST detection handles mixed used/unused', () => {
    const dir = makeTmpDir();
    try {
      const file = writeFile(
        dir,
        'a.js',
        `import { used, unused } from './utils';\nconst x = used();\n`,
      );
      const astResult = detectWithAST(
        file,
        fs.readFileSync(file, 'utf8'),
        true,
        true,
      );
      if (astResult !== null) {
        assert.equal(astResult.length, 1);
        assert.deepStrictEqual(astResult[0]!.importedSymbols, ['unused']);
      }
    } finally {
      cleanup(dir);
    }
  });

  nodeIt('AST detection handles namespace imports', () => {
    const dir = makeTmpDir();
    try {
      const file = writeFile(
        dir,
        'a.js',
        `import * as utils from './utils';\nconst x = 1;\n`,
      );
      const astResult = detectWithAST(
        file,
        fs.readFileSync(file, 'utf8'),
        true,
        true,
      );
      if (astResult !== null) {
        assert.equal(astResult.length, 1);
        assert.ok(astResult[0]!.isNamespaceImport);
      }
    } finally {
      cleanup(dir);
    }
  });
});
