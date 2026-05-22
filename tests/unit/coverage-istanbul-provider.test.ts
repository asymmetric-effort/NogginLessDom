import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  instrumentSource,
  IstanbulCoverageProvider,
} from '../../src/coverage/istanbul-provider.js';
import type { FileCoverage } from '../../src/coverage/coverage-map.js';

describe('Istanbul Provider', () => {
  describe('instrumentSource', () => {
    it('should add counters to source code', () => {
      const source = 'const x = 1;\nconst y = 2;\n';
      const result = instrumentSource(source, '/test/file.ts');
      // The instrumented code should contain __coverage__ references
      assert.ok(result.code.includes('__coverage__'));
      // Should still contain original code essence
      assert.ok(result.code.includes('const x = 1'));
      assert.ok(result.code.includes('const y = 2'));
    });

    it('should return valid FileCoverage with statement map', () => {
      const source = 'const x = 1;\nconst y = 2;\n';
      const result = instrumentSource(source, '/test/file.ts');
      const fc = result.coverageData;

      assert.equal(fc.path, '/test/file.ts');
      assert.ok(Object.keys(fc.statementMap).length > 0);
      assert.ok(Object.keys(fc.s).length > 0);
      // All statement counts should start at 0
      for (const key of Object.keys(fc.s)) {
        assert.equal(fc.s[key], 0);
      }
    });

    it('should detect function declarations', () => {
      const source = 'function greet(name) {\n  return "hello " + name;\n}\n';
      const result = instrumentSource(source, '/test/fn.ts');
      const fc = result.coverageData;

      assert.ok(
        Object.keys(fc.fnMap).length > 0,
        'Should have function mappings',
      );
      const fnKeys = Object.keys(fc.f);
      assert.ok(fnKeys.length > 0, 'Should have function counters');
      // Function counts start at 0
      for (const key of fnKeys) {
        assert.equal(fc.f[key], 0);
      }
    });

    it('should detect arrow functions', () => {
      const source =
        'const greet = (name) => {\n  return "hello " + name;\n};\n';
      const result = instrumentSource(source, '/test/arrow.ts');
      const fc = result.coverageData;

      assert.ok(
        Object.keys(fc.fnMap).length > 0,
        'Should have function mappings for arrow functions',
      );
    });

    it('should detect if/else branches', () => {
      const source =
        'if (x > 0) {\n  console.log("pos");\n} else {\n  console.log("neg");\n}\n';
      const result = instrumentSource(source, '/test/branch.ts');
      const fc = result.coverageData;

      assert.ok(
        Object.keys(fc.branchMap).length > 0,
        'Should have branch mappings',
      );
      const branchKeys = Object.keys(fc.b);
      assert.ok(branchKeys.length > 0, 'Should have branch counters');
      // Each if/else branch should have 2 locations
      for (const key of branchKeys) {
        const counts = fc.b[key];
        assert.ok(counts !== undefined);
        assert.ok(
          counts.length >= 2,
          'if/else should have at least 2 branch paths',
        );
      }
    });

    it('should detect if without else', () => {
      const source = 'if (x > 0) {\n  console.log("pos");\n}\n';
      const result = instrumentSource(source, '/test/if-only.ts');
      const fc = result.coverageData;

      assert.ok(
        Object.keys(fc.branchMap).length > 0,
        'Should have branch mappings for if-only',
      );
    });

    it('should instrument code that references the correct file path in __coverage__', () => {
      const source = 'const x = 1;\n';
      const result = instrumentSource(source, '/my/special/file.ts');
      assert.ok(result.code.includes('/my/special/file.ts'));
    });

    it('should handle empty source', () => {
      const result = instrumentSource('', '/test/empty.ts');
      assert.equal(result.coverageData.path, '/test/empty.ts');
      assert.equal(Object.keys(result.coverageData.s).length, 0);
    });
  });

  describe('IstanbulCoverageProvider lifecycle', () => {
    let provider: IstanbulCoverageProvider;

    beforeEach(() => {
      provider = new IstanbulCoverageProvider();
    });

    afterEach(async () => {
      // Cleanup in case test didn't stop
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
      await provider.stop();
    });

    it('should return V8-compatible coverage from take()', async () => {
      await provider.start();
      const g = globalThis as Record<string, unknown>;
      // Simulate coverage data
      const coverageObj = g['__coverage__'] as Record<string, FileCoverage>;
      coverageObj['/test/file.ts'] = {
        path: '/test/file.ts',
        statementMap: {
          '0': { start: { line: 1, column: 0 }, end: { line: 1, column: 15 } },
        },
        fnMap: {},
        branchMap: {},
        s: { '0': 5 },
        f: {},
        b: {},
      };

      const result = await provider.take();
      assert.ok(Array.isArray(result));
      assert.ok(result.length > 0);
      // Should convert to V8ScriptCoverage format
      const script = result[0]!;
      assert.ok(script.url.includes('/test/file.ts'));
      assert.ok(Array.isArray(script.functions));
      await provider.stop();
    });

    it('should cleanup __coverage__ on stop', async () => {
      await provider.start();
      const g = globalThis as Record<string, unknown>;
      assert.ok('__coverage__' in g);
      await provider.stop();
      assert.equal(g['__coverage__'], undefined);
    });

    it('should return coverage data and cleanup on stop()', async () => {
      await provider.start();
      const g = globalThis as Record<string, unknown>;
      const coverageObj = g['__coverage__'] as Record<string, FileCoverage>;
      coverageObj['/test/stop.ts'] = {
        path: '/test/stop.ts',
        statementMap: {
          '0': { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
        },
        fnMap: {},
        branchMap: {},
        s: { '0': 3 },
        f: {},
        b: {},
      };

      const result = await provider.stop();
      assert.ok(Array.isArray(result));
      assert.ok(result.length > 0);
      assert.equal(g['__coverage__'], undefined);
    });

    it('should return empty array from take() when no coverage data exists', async () => {
      await provider.start();
      const result = await provider.take();
      assert.ok(Array.isArray(result));
      assert.equal(result.length, 0);
      await provider.stop();
    });
  });

  describe('Config provider selection', () => {
    it('should accept istanbul as provider in CoverageConfig', async () => {
      // Just verify the config type accepts istanbul
      const { mergeConfig } = await import('../../src/coverage/config.js');
      const resolved = mergeConfig({ provider: 'istanbul' });
      assert.equal(resolved.provider, 'istanbul');
    });

    it('should default to v8 provider', async () => {
      const { mergeConfig } = await import('../../src/coverage/config.js');
      const resolved = mergeConfig({});
      assert.equal(resolved.provider, 'v8');
    });
  });
});
