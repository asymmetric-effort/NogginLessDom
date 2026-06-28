/**
 * Tests for AST-based Istanbul instrumentation (Issue #198).
 *
 * Verifies that instrumentWithAST correctly instruments source code
 * with statement, function, and branch counters using steamroller's parser.
 */
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  instrumentWithAST,
  loadSteamroller,
  resetSteamrollerCache,
  isSteamrollerAvailable,
  walkAST,
  type IstanbulCoverageMetadata,
} from '../../src/coverage/istanbul-provider.js';
import { createCoverageMap } from '../../src/coverage/coverage-map.js';
import type { FileCoverage } from '../../src/coverage/coverage-map.js';
import { getReporterFactory } from '../../src/coverage/reporters/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setupCoverage(
  filePath: string,
  metadata: IstanbulCoverageMetadata,
): void {
  const g = globalThis as Record<string, unknown>;
  const coverageObj = (g['__coverage__'] ?? {}) as Record<string, unknown>;
  coverageObj[filePath] = {
    s: { ...metadata.s },
    f: { ...metadata.f },
    b: Object.fromEntries(
      Object.entries(metadata.b).map(([k, v]) => [k, [...v]]),
    ),
  };
  g['__coverage__'] = coverageObj;
}

function getCoverage(filePath: string): {
  s: Record<string, number>;
  f: Record<string, number>;
  b: Record<string, number[]>;
} {
  const g = globalThis as Record<string, unknown>;
  const coverageObj = g['__coverage__'] as Record<
    string,
    Record<string, unknown>
  >;
  return coverageObj[filePath] as {
    s: Record<string, number>;
    f: Record<string, number>;
    b: Record<string, number[]>;
  };
}

function cleanupCoverage(): void {
  const g = globalThis as Record<string, unknown>;
  delete g['__coverage__'];
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AST-based Istanbul instrumentation (Issue #198)', () => {
  beforeEach(async () => {
    await loadSteamroller();
  });

  afterEach(() => {
    cleanupCoverage();
  });

  describe('instrumentWithAST', () => {
    it('should instrument code that executes without errors', async () => {
      const source = 'const x = 1;\nconst y = x + 2;\n';
      const filePath = '/test/ast-basic.ts';
      const { code, metadata } = instrumentWithAST(source, filePath);

      setupCoverage(filePath, metadata);
      const fn = new Function(code);
      assert.doesNotThrow(() => fn());
    });

    it('should increment statement counters when statements execute', async () => {
      const source = 'const x = 1;\nconst y = 2;\nconst z = x + y;\n';
      const filePath = '/test/ast-stmts.ts';
      const { code, metadata } = instrumentWithAST(source, filePath);

      assert.ok(Object.keys(metadata.statementMap).length >= 3);

      setupCoverage(filePath, metadata);
      const fn = new Function(code);
      fn();

      const cov = getCoverage(filePath);
      for (const key of Object.keys(cov.s)) {
        assert.ok(cov.s[key]! > 0, `Statement ${key} should have been hit`);
      }
    });

    it('should increment function counters when functions are called', async () => {
      const source =
        'function add(a, b) { return a + b; }\nconst r = add(1, 2);\n';
      const filePath = '/test/ast-fns.ts';
      const { code, metadata } = instrumentWithAST(source, filePath);

      assert.ok(Object.keys(metadata.fnMap).length >= 1);
      assert.equal(metadata.fnMap['0']!.name, 'add');

      setupCoverage(filePath, metadata);
      const fn = new Function(code);
      fn();

      const cov = getCoverage(filePath);
      assert.ok(cov.f['0']! > 0, 'Function counter should have been hit');
    });

    it('should track if/else branch counters (both paths)', async () => {
      const source = [
        'function check(x) {',
        '  if (x > 0) {',
        '    return "positive";',
        '  } else {',
        '    return "non-positive";',
        '  }',
        '}',
        'check(5);',
        'check(-3);',
      ].join('\n');
      const filePath = '/test/ast-branches.ts';
      const { code, metadata } = instrumentWithAST(source, filePath);

      // Should have at least one branch for the if/else
      const branchKeys = Object.keys(metadata.branchMap);
      assert.ok(branchKeys.length >= 1, 'Should have at least 1 branch');

      // Find the 'if' branch
      const ifBranch = branchKeys.find(
        (k) => metadata.branchMap[k]!.type === 'if',
      );
      assert.ok(ifBranch !== undefined, 'Should have an if branch');

      setupCoverage(filePath, metadata);
      const fn = new Function(code);
      fn();

      const cov = getCoverage(filePath);
      const branchCounts = cov.b[ifBranch!]!;
      assert.ok(branchCounts[0]! > 0, 'Consequent branch should be hit');
      assert.ok(branchCounts[1]! > 0, 'Alternate branch should be hit');
    });

    it('should track ternary branch counters (both paths)', async () => {
      const source = [
        'function ternary(x) {',
        '  return x > 0 ? "yes" : "no";',
        '}',
        'ternary(1);',
        'ternary(-1);',
      ].join('\n');
      const filePath = '/test/ast-ternary.ts';
      const { code, metadata } = instrumentWithAST(source, filePath);

      const branchKeys = Object.keys(metadata.branchMap);
      const condBranch = branchKeys.find(
        (k) => metadata.branchMap[k]!.type === 'cond-expr',
      );
      assert.ok(condBranch !== undefined, 'Should have a cond-expr branch');

      setupCoverage(filePath, metadata);
      const fn = new Function(code);
      fn();

      const cov = getCoverage(filePath);
      const branchCounts = cov.b[condBranch!]!;
      assert.ok(branchCounts[0]! > 0, 'Ternary consequent should be hit');
      assert.ok(branchCounts[1]! > 0, 'Ternary alternate should be hit');
    });

    it('should produce coverage metadata with correct format', async () => {
      const source =
        'function greet(name) {\n  if (name) {\n    return "hi " + name;\n  } else {\n    return "hi";\n  }\n}\ngreet("world");';
      const filePath = '/test/ast-format.ts';
      const { metadata } = instrumentWithAST(source, filePath);

      // Verify metadata shape
      assert.equal(metadata.path, filePath);
      assert.equal(typeof metadata.statementMap, 'object');
      assert.equal(typeof metadata.fnMap, 'object');
      assert.equal(typeof metadata.branchMap, 'object');
      assert.equal(typeof metadata.s, 'object');
      assert.equal(typeof metadata.f, 'object');
      assert.equal(typeof metadata.b, 'object');

      // Verify statementMap entries have Range shape
      for (const key of Object.keys(metadata.statementMap)) {
        const range = metadata.statementMap[key]!;
        assert.equal(typeof range.start.line, 'number');
        assert.equal(typeof range.start.column, 'number');
        assert.equal(typeof range.end.line, 'number');
        assert.equal(typeof range.end.column, 'number');
        assert.ok(range.start.line >= 1);
      }

      // Verify fnMap entries have FunctionMapping shape
      for (const key of Object.keys(metadata.fnMap)) {
        const fn = metadata.fnMap[key]!;
        assert.equal(typeof fn.name, 'string');
        assert.ok(fn.decl);
        assert.ok(fn.loc);
        assert.equal(typeof fn.line, 'number');
      }

      // Verify branchMap entries have BranchMapping shape
      for (const key of Object.keys(metadata.branchMap)) {
        const br = metadata.branchMap[key]!;
        assert.equal(typeof br.type, 'string');
        assert.ok(Array.isArray(br.locations));
        assert.equal(typeof br.line, 'number');
      }

      // Verify counters initialized to 0
      for (const key of Object.keys(metadata.s)) {
        assert.equal(metadata.s[key], 0);
      }
      for (const key of Object.keys(metadata.f)) {
        assert.equal(metadata.f[key], 0);
      }
      for (const key of Object.keys(metadata.b)) {
        for (const c of metadata.b[key]!) {
          assert.equal(c, 0);
        }
      }
    });

    it('should track switch/case branches', async () => {
      const source = [
        'function classify(x) {',
        '  switch(x) {',
        '    case 1:',
        '      return "one";',
        '    case 2:',
        '      return "two";',
        '    default:',
        '      return "other";',
        '  }',
        '}',
        'classify(1);',
        'classify(2);',
        'classify(99);',
      ].join('\n');
      const filePath = '/test/ast-switch.ts';
      const { code, metadata } = instrumentWithAST(source, filePath);

      const branchKeys = Object.keys(metadata.branchMap);
      const switchBranch = branchKeys.find(
        (k) => metadata.branchMap[k]!.type === 'switch',
      );
      assert.ok(switchBranch !== undefined, 'Should have a switch branch');
      assert.equal(metadata.branchMap[switchBranch!]!.locations.length, 3);

      setupCoverage(filePath, metadata);
      const fn = new Function(code);
      fn();

      const cov = getCoverage(filePath);
      const branchCounts = cov.b[switchBranch!]!;
      assert.ok(branchCounts[0]! > 0, 'Case 1 should be hit');
      assert.ok(branchCounts[1]! > 0, 'Case 2 should be hit');
      assert.ok(branchCounts[2]! > 0, 'Default should be hit');
    });

    it('should track logical expression branches', async () => {
      const source = [
        'const a = true;',
        'const b = false;',
        'const r1 = a && "yes";',
        'const r2 = b || "fallback";',
      ].join('\n');
      const filePath = '/test/ast-logical.ts';
      const { code, metadata } = instrumentWithAST(source, filePath);

      const branchKeys = Object.keys(metadata.branchMap);
      const binaryBranches = branchKeys.filter(
        (k) => metadata.branchMap[k]!.type === 'binary-expr',
      );
      assert.ok(
        binaryBranches.length >= 2,
        'Should have at least 2 logical branches',
      );

      setupCoverage(filePath, metadata);
      const fn = new Function(code);
      fn();

      const cov = getCoverage(filePath);
      // At least one of the right-side branches should have been hit
      let rightSideHits = 0;
      for (const bk of binaryBranches) {
        rightSideHits += cov.b[bk]![1]!;
      }
      assert.ok(rightSideHits > 0, 'Some right-side branches should be hit');
    });

    it('should handle arrow function expressions', async () => {
      const source =
        'const double = (x) => { return x * 2; }\nconst r = double(5);\n';
      const filePath = '/test/ast-arrow.ts';
      const { code, metadata } = instrumentWithAST(source, filePath);

      assert.ok(Object.keys(metadata.fnMap).length >= 1);

      setupCoverage(filePath, metadata);
      const fn = new Function(code);
      fn();

      const cov = getCoverage(filePath);
      assert.ok(cov.f['0']! > 0, 'Arrow function counter should be hit');
    });

    it('should handle arrow function expression body', async () => {
      const source = 'const double = (x) => x * 2;\nconst r = double(5);\n';
      const filePath = '/test/ast-arrow-expr.ts';
      const { code, metadata } = instrumentWithAST(source, filePath);

      assert.ok(Object.keys(metadata.fnMap).length >= 1);

      setupCoverage(filePath, metadata);
      const fn = new Function(code);
      fn();

      const cov = getCoverage(filePath);
      assert.ok(cov.f['0']! > 0, 'Arrow function counter should be hit');
    });

    it('should handle if without else', async () => {
      const source = [
        'function maybe(x) {',
        '  if (x > 0) {',
        '    return x;',
        '  }',
        '  return 0;',
        '}',
        'maybe(5);',
        'maybe(-1);',
      ].join('\n');
      const filePath = '/test/ast-if-noelse.ts';
      const { code, metadata } = instrumentWithAST(source, filePath);

      setupCoverage(filePath, metadata);
      const fn = new Function(code);
      fn();

      const cov = getCoverage(filePath);
      const ifKey = Object.keys(metadata.branchMap).find(
        (k) => metadata.branchMap[k]!.type === 'if',
      );
      assert.ok(ifKey !== undefined);
      assert.ok(cov.b[ifKey!]![0]! > 0, 'If-true branch should be hit');
    });

    it('should handle nullish coalescing operator', async () => {
      const source = 'const a = null;\nconst b = a ?? "default";\n';
      const filePath = '/test/ast-nullish.ts';
      const { code, metadata } = instrumentWithAST(source, filePath);

      const binaryBranches = Object.keys(metadata.branchMap).filter(
        (k) => metadata.branchMap[k]!.type === 'binary-expr',
      );
      assert.ok(binaryBranches.length >= 1, 'Should detect ?? as binary-expr');

      setupCoverage(filePath, metadata);
      const fn = new Function(code);
      fn();

      const cov = getCoverage(filePath);
      assert.ok(
        cov.b[binaryBranches[0]!]![1]! > 0,
        'Right side of ?? should be hit when left is null',
      );
    });
  });

  describe('walkAST', () => {
    it('should visit all nodes in an AST', async () => {
      const { parseAst } =
        await import('@asymmetric-effort/steamroller/parseAst');
      const ast = parseAst('const x = 1;');
      const types: string[] = [];
      walkAST(ast as unknown as Record<string, unknown>, (node) => {
        types.push(String(node['type']));
      });
      assert.ok(types.includes('Program'));
      assert.ok(types.includes('VariableDeclaration'));
      assert.ok(types.includes('VariableDeclarator'));
      assert.ok(types.includes('Identifier'));
      assert.ok(types.includes('Literal'));
    });

    it('should handle null/undefined nodes gracefully', () => {
      const visited: string[] = [];
      walkAST(null as unknown as Record<string, unknown>, (node) => {
        visited.push(String(node['type']));
      });
      assert.equal(visited.length, 0);

      walkAST(undefined as unknown as Record<string, unknown>, (node) => {
        visited.push(String(node['type']));
      });
      assert.equal(visited.length, 0);
    });

    it('should pass parent node to visitor', async () => {
      const { parseAst } =
        await import('@asymmetric-effort/steamroller/parseAst');
      const ast = parseAst('const x = 1;');
      const parentTypes: (string | undefined)[] = [];
      walkAST(ast as unknown as Record<string, unknown>, (node, parent) => {
        if (String(node['type']) === 'Identifier') {
          parentTypes.push(parent ? String(parent['type']) : undefined);
        }
      });
      assert.ok(parentTypes.length > 0);
      assert.ok(parentTypes.includes('VariableDeclarator'));
    });
  });

  describe('Reporter integration with AST-instrumented data', () => {
    const REPORTERS = [
      'text',
      'json',
      'json-summary',
      'lcov',
      'cobertura',
      'clover',
      'text-summary',
      'lcovonly',
      'teamcity',
      'html',
      'html-spa',
      'none',
    ];

    for (const reporterName of REPORTERS) {
      it(`${reporterName} reporter works with AST-instrumented data`, async () => {
        const source = 'function hello() { return "world"; }\nhello();\n';
        const filePath = `/test/ast-reporter-${reporterName}.ts`;
        const { code, metadata } = instrumentWithAST(source, filePath);

        setupCoverage(filePath, metadata);
        const fn = new Function(code);
        fn();

        // Build a FileCoverage from the metadata + executed counters
        const cov = getCoverage(filePath);
        const fc: FileCoverage = {
          path: filePath,
          statementMap: metadata.statementMap,
          fnMap: metadata.fnMap,
          branchMap: metadata.branchMap,
          s: cov.s,
          f: cov.f,
          b: cov.b,
        };

        const map = createCoverageMap();
        map.addFileCoverage(fc);

        const factory = getReporterFactory(reporterName);
        assert.ok(factory, `Reporter factory for ${reporterName} should exist`);

        // Create reporter and verify onEnd doesn't throw
        const tmpDir = `/tmp/ast-reporter-test-${reporterName}-${Date.now()}`;
        const reporter = factory({ reportsDirectory: tmpDir });
        const summary = {
          lines: { total: 2, covered: 2, skipped: 0, pct: 100 },
          statements: { total: 2, covered: 2, skipped: 0, pct: 100 },
          functions: { total: 1, covered: 1, skipped: 0, pct: 100 },
          branches: { total: 0, covered: 0, skipped: 0, pct: 100 },
        };

        assert.doesNotThrow(() => {
          reporter.onEnd(map, summary);
        });
      });
    }
  });

  describe('Fallback behavior', () => {
    it('should detect steamroller availability', async () => {
      assert.equal(isSteamrollerAvailable(), true);
    });

    it('should throw when steamroller not loaded', () => {
      resetSteamrollerCache();
      assert.throws(
        () => instrumentWithAST('const x = 1;', '/test/fallback.ts'),
        /steamroller modules not loaded/,
      );
    });

    it('should re-load after reset', async () => {
      resetSteamrollerCache();
      assert.equal(isSteamrollerAvailable(), false);
      const loaded = await loadSteamroller();
      assert.equal(loaded, true);
      assert.equal(isSteamrollerAvailable(), true);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty source', async () => {
      const { code, metadata } = instrumentWithAST('', '/test/empty.ts');
      assert.equal(code, '');
      assert.equal(Object.keys(metadata.statementMap).length, 0);
      assert.equal(Object.keys(metadata.fnMap).length, 0);
      assert.equal(Object.keys(metadata.branchMap).length, 0);
    });

    it('should handle source with only comments', async () => {
      const source = '// this is a comment\n';
      const { code } = instrumentWithAST(source, '/test/comments.ts');
      assert.ok(code.includes('// this is a comment'));
    });

    it('should handle nested functions', async () => {
      const source = [
        'function outer() {',
        '  function inner() {',
        '    return 1;',
        '  }',
        '  return inner();',
        '}',
        'outer();',
      ].join('\n');
      const filePath = '/test/nested.ts';
      const { code, metadata } = instrumentWithAST(source, filePath);

      assert.ok(
        Object.keys(metadata.fnMap).length >= 2,
        'Should detect both outer and inner functions',
      );

      setupCoverage(filePath, metadata);
      const fn = new Function(code);
      fn();

      const cov = getCoverage(filePath);
      assert.ok(cov.f['0']! > 0);
      assert.ok(cov.f['1']! > 0);
    });

    it('should handle for loops', async () => {
      const source = [
        'let sum = 0;',
        'for (let i = 0; i < 3; i++) {',
        '  sum += i;',
        '}',
      ].join('\n');
      const filePath = '/test/for-loop.ts';
      const { code, metadata } = instrumentWithAST(source, filePath);

      setupCoverage(filePath, metadata);
      const fn = new Function(code);
      fn();

      const cov = getCoverage(filePath);
      // All statements should have been hit
      for (const key of Object.keys(cov.s)) {
        assert.ok(cov.s[key]! > 0, `Statement ${key} should be hit`);
      }
    });

    it('should handle while loops', async () => {
      const source = ['let x = 3;', 'while (x > 0) {', '  x--;', '}'].join(
        '\n',
      );
      const filePath = '/test/while-loop.ts';
      const { code, metadata } = instrumentWithAST(source, filePath);

      setupCoverage(filePath, metadata);
      const fn = new Function(code);
      fn();

      const cov = getCoverage(filePath);
      for (const key of Object.keys(cov.s)) {
        assert.ok(cov.s[key]! > 0, `Statement ${key} should be hit`);
      }
    });

    it('should handle throw statements', async () => {
      const source = [
        'function throwIfNeg(x) {',
        '  if (x < 0) {',
        '    throw new Error("negative");',
        '  }',
        '  return x;',
        '}',
        'throwIfNeg(5);',
      ].join('\n');
      const filePath = '/test/throw.ts';
      const { code, metadata } = instrumentWithAST(source, filePath);

      setupCoverage(filePath, metadata);
      const fn = new Function(code);
      fn();

      const cov = getCoverage(filePath);
      // The throw statement should NOT have been hit (x=5 > 0)
      assert.ok(Object.keys(cov.s).length >= 3);
    });

    it('should handle function expressions', async () => {
      const source =
        'const greet = function(name) { return "hi " + name; };\ngreet("world");\n';
      const filePath = '/test/func-expr.ts';
      const { code, metadata } = instrumentWithAST(source, filePath);

      assert.ok(Object.keys(metadata.fnMap).length >= 1);

      setupCoverage(filePath, metadata);
      const fn = new Function(code);
      fn();

      const cov = getCoverage(filePath);
      assert.ok(cov.f['0']! > 0, 'Function expression counter should be hit');
    });
  });
});
