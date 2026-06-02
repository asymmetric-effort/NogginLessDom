/**
 * Tests for Istanbul coverage provider — lifecycle, data format, reporter integration.
 */
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  instrumentSource,
  IstanbulCoverageProvider,
} from '../../src/coverage/istanbul-provider.js';
import type { FileCoverage } from '../../src/coverage/coverage-map.js';
import {
  createCoverageMap,
  computeSummary,
} from '../../src/coverage/coverage-map.js';

describe('Istanbul Coverage Provider — complete tests', () => {
  describe('Provider instantiation', () => {
    it('should instantiate without errors', () => {
      const provider = new IstanbulCoverageProvider();
      assert.ok(provider);
    });

    it('should be a class with start/take/stop methods', () => {
      const provider = new IstanbulCoverageProvider();
      assert.equal(typeof provider.start, 'function');
      assert.equal(typeof provider.take, 'function');
      assert.equal(typeof provider.stop, 'function');
    });
  });

  describe('startCoverage/takeCoverage lifecycle', () => {
    let provider: IstanbulCoverageProvider;

    beforeEach(() => {
      provider = new IstanbulCoverageProvider();
    });

    afterEach(async () => {
      try {
        await provider.stop();
      } catch {
        // ignore
      }
    });

    it('should initialize __coverage__ on start', async () => {
      await provider.start();
      const g = globalThis as Record<string, unknown>;
      assert.ok('__coverage__' in g);
      assert.equal(typeof g['__coverage__'], 'object');
    });

    it('should return empty V8ScriptCoverage array when no code has run', async () => {
      await provider.start();
      const result = await provider.take();
      assert.ok(Array.isArray(result));
      assert.equal(result.length, 0);
    });

    it('should return valid coverage data after instrumented code executes', async () => {
      await provider.start();

      const source = 'const x = 1;\nconst y = 2;\n';
      const filePath = '/test/provider-lifecycle.ts';
      const result = instrumentSource(source, filePath);

      const g = globalThis as Record<string, unknown>;
      const coverageObj = g['__coverage__'] as Record<string, FileCoverage>;
      coverageObj[filePath] = result.coverageData;

      // Execute instrumented code
      const fn = new Function(result.code);
      fn();

      const scripts = await provider.take();
      assert.ok(scripts.length > 0);

      const script = scripts[0]!;
      assert.ok(script.url.includes(filePath));
      assert.ok(script.scriptId !== undefined);
      assert.ok(Array.isArray(script.functions));
      assert.ok(script.functions.length > 0);
    });

    it('should stop and cleanup __coverage__', async () => {
      await provider.start();
      const g = globalThis as Record<string, unknown>;
      assert.ok('__coverage__' in g);

      const result = await provider.stop();
      assert.ok(Array.isArray(result));
      assert.equal(g['__coverage__'], undefined);
    });

    it('should return coverage data on stop', async () => {
      await provider.start();

      const g = globalThis as Record<string, unknown>;
      const coverageObj = g['__coverage__'] as Record<string, FileCoverage>;
      coverageObj['/test/stop-data.ts'] = {
        path: '/test/stop-data.ts',
        statementMap: {
          '0': { start: { line: 1, column: 0 }, end: { line: 1, column: 15 } },
        },
        fnMap: {},
        branchMap: {},
        s: { '0': 7 },
        f: {},
        b: {},
      };

      const scripts = await provider.stop();
      assert.ok(scripts.length > 0);
      assert.ok(scripts[0]!.url.includes('/test/stop-data.ts'));
    });
  });

  describe('Coverage data has correct Istanbul format', () => {
    it('should have all Istanbul fields in coverage data', () => {
      const source = [
        'function add(a, b) {',
        '  if (a > 0) {',
        '    return a + b;',
        '  } else {',
        '    return b;',
        '  }',
        '}',
      ].join('\n');
      const result = instrumentSource(source, '/test/format.ts');
      const fc = result.coverageData;

      // Check all Istanbul format fields
      assert.equal(fc.path, '/test/format.ts');
      assert.equal(typeof fc.statementMap, 'object');
      assert.equal(typeof fc.fnMap, 'object');
      assert.equal(typeof fc.branchMap, 'object');
      assert.equal(typeof fc.s, 'object');
      assert.equal(typeof fc.f, 'object');
      assert.equal(typeof fc.b, 'object');
    });

    it('should have proper Range objects in statementMap', () => {
      const source = 'const x = 1;\n';
      const result = instrumentSource(source, '/test/ranges.ts');
      const fc = result.coverageData;

      for (const key of Object.keys(fc.statementMap)) {
        const range = fc.statementMap[key]!;
        assert.ok(range.start);
        assert.ok(range.end);
        assert.equal(typeof range.start.line, 'number');
        assert.equal(typeof range.start.column, 'number');
        assert.equal(typeof range.end.line, 'number');
        assert.equal(typeof range.end.column, 'number');
      }
    });

    it('should have proper FunctionMapping objects in fnMap', () => {
      const source = 'function hello() {\n  return 1;\n}\n';
      const result = instrumentSource(source, '/test/fnmap.ts');
      const fc = result.coverageData;

      const fnKeys = Object.keys(fc.fnMap);
      assert.ok(fnKeys.length > 0);
      for (const key of fnKeys) {
        const fnMapping = fc.fnMap[key]!;
        assert.equal(typeof fnMapping.name, 'string');
        assert.ok(fnMapping.decl);
        assert.ok(fnMapping.loc);
        assert.equal(typeof fnMapping.line, 'number');
      }
    });

    it('should have proper BranchMapping objects in branchMap', () => {
      const source = 'if (true) {\n  1;\n} else {\n  2;\n}\n';
      const result = instrumentSource(source, '/test/branchmap.ts');
      const fc = result.coverageData;

      const branchKeys = Object.keys(fc.branchMap);
      assert.ok(branchKeys.length > 0);
      for (const key of branchKeys) {
        const bm = fc.branchMap[key]!;
        assert.equal(typeof bm.type, 'string');
        assert.ok(Array.isArray(bm.locations));
        assert.ok(bm.locations.length >= 2);
        assert.equal(typeof bm.line, 'number');
      }
    });

    it('should have matching keys between maps and counters', () => {
      const source =
        'function f() {\n  if (true) { return 1; }\n  return 0;\n}\n';
      const result = instrumentSource(source, '/test/keys.ts');
      const fc = result.coverageData;

      // Every key in statementMap should have a corresponding key in s
      for (const key of Object.keys(fc.statementMap)) {
        assert.ok(key in fc.s, `Statement key ${key} should be in s`);
      }

      // Every key in fnMap should have a corresponding key in f
      for (const key of Object.keys(fc.fnMap)) {
        assert.ok(key in fc.f, `Function key ${key} should be in f`);
      }

      // Every key in branchMap should have a corresponding key in b
      for (const key of Object.keys(fc.branchMap)) {
        assert.ok(key in fc.b, `Branch key ${key} should be in b`);
      }
    });

    it('should initialize all counters to 0', () => {
      const source = 'function f() {\n  return 1;\n}\n';
      const result = instrumentSource(source, '/test/init.ts');
      const fc = result.coverageData;

      for (const key of Object.keys(fc.s)) {
        assert.equal(fc.s[key], 0);
      }
      for (const key of Object.keys(fc.f)) {
        assert.equal(fc.f[key], 0);
      }
      for (const key of Object.keys(fc.b)) {
        for (const count of fc.b[key]!) {
          assert.equal(count, 0);
        }
      }
    });
  });

  describe('Integration with text reporter format', () => {
    it('should produce valid CoverageSummary from Istanbul data', () => {
      const source = [
        'function greet(name) {',
        '  if (name) {',
        '    return "Hello " + name;',
        '  } else {',
        '    return "Hello stranger";',
        '  }',
        '}',
      ].join('\n');
      const filePath = '/test/reporter-integration.ts';
      const result = instrumentSource(source, filePath);

      // Simulate execution
      const g = globalThis as Record<string, unknown>;
      const savedCoverage = g['__coverage__'];
      g['__coverage__'] = {};
      const coverageObj = g['__coverage__'] as Record<string, FileCoverage>;
      coverageObj[filePath] = result.coverageData;

      const fn = new Function(result.code);
      fn();

      // Compute summary
      const fc = coverageObj[filePath]!;
      const summary = computeSummary(fc);

      assert.ok(summary.statements);
      assert.ok(summary.functions);
      assert.ok(summary.branches);
      assert.ok(summary.lines);

      assert.equal(typeof summary.statements.total, 'number');
      assert.equal(typeof summary.statements.covered, 'number');
      assert.equal(typeof summary.statements.pct, 'number');

      // Clean up
      if (savedCoverage !== undefined) {
        g['__coverage__'] = savedCoverage;
      } else {
        delete g['__coverage__'];
      }
    });

    it('should work with CoverageMap addFileCoverage', () => {
      const source = 'const x = 1;\nconst y = 2;\n';
      const result = instrumentSource(source, '/test/map.ts');

      const map = createCoverageMap();
      map.addFileCoverage(result.coverageData);

      const files = map.files();
      assert.ok(files.includes('/test/map.ts'));

      const fc = map.fileCoverageFor('/test/map.ts');
      assert.equal(fc.path, '/test/map.ts');
    });

    it('should produce source map for reporter integration', () => {
      const source = 'const x = 1;\nconst y = 2;\n';
      const result = instrumentSource(source, '/test/srcmap.ts');

      assert.ok(result.sourceMap);
      assert.equal(result.sourceMap.version, 3);
      assert.ok(result.sourceMap.sources.includes('/test/srcmap.ts'));
      assert.equal(typeof result.sourceMap.mappings, 'string');
      assert.ok(Array.isArray(result.sourceMap.names));
    });
  });

  describe('V8 format conversion', () => {
    it('should convert function coverage to V8 format', async () => {
      const provider = new IstanbulCoverageProvider();
      await provider.start();

      const g = globalThis as Record<string, unknown>;
      const coverageObj = g['__coverage__'] as Record<string, FileCoverage>;
      const filePath = '/test/v8-functions.ts';
      coverageObj[filePath] = {
        path: filePath,
        statementMap: {},
        fnMap: {
          '0': {
            name: 'myFunc',
            decl: {
              start: { line: 1, column: 0 },
              end: { line: 1, column: 20 },
            },
            loc: {
              start: { line: 1, column: 0 },
              end: { line: 3, column: 1 },
            },
            line: 1,
          },
        },
        branchMap: {},
        s: {},
        f: { '0': 5 },
        b: {},
      };

      const scripts = await provider.take();
      assert.ok(scripts.length > 0);

      const script = scripts[0]!;
      const funcCov = script.functions.find((f) => f.functionName === 'myFunc');
      assert.ok(funcCov, 'Should have function coverage for myFunc');
      assert.ok(funcCov.ranges.length > 0);
      assert.equal(funcCov.ranges[0]!.count, 5);

      await provider.stop();
    });

    it('should convert branch coverage to V8 format', async () => {
      const provider = new IstanbulCoverageProvider();
      await provider.start();

      const g = globalThis as Record<string, unknown>;
      const coverageObj = g['__coverage__'] as Record<string, FileCoverage>;
      const filePath = '/test/v8-branches.ts';
      coverageObj[filePath] = {
        path: filePath,
        statementMap: {},
        fnMap: {},
        branchMap: {
          '0': {
            type: 'if',
            locations: [
              { start: { line: 2, column: 0 }, end: { line: 2, column: 10 } },
              { start: { line: 4, column: 0 }, end: { line: 4, column: 10 } },
            ],
            line: 2,
          },
        },
        s: {},
        f: {},
        b: { '0': [3, 1] },
      };

      const scripts = await provider.take();
      const script = scripts[0]!;
      const branchFn = script.functions.find(
        (f) => f.functionName === '(branch_0)',
      );
      assert.ok(branchFn, 'Should have branch coverage entry');
      assert.equal(branchFn.ranges.length, 2);
      assert.equal(branchFn.ranges[0]!.count, 3);
      assert.equal(branchFn.ranges[1]!.count, 1);

      await provider.stop();
    });
  });
});
