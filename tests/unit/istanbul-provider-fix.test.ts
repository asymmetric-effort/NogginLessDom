import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  instrumentSource,
  IstanbulCoverageProvider,
} from '../../src/coverage/istanbul-provider.js';
import {
  findIgnoreRanges,
  applyIgnoreRanges,
} from '../../src/coverage/ignore.js';
import type { FileCoverage } from '../../src/coverage/coverage-map.js';

describe('Istanbul Provider Fixes', () => {
  describe('instrumentSource handles arrow functions', () => {
    it('should detect simple arrow functions', () => {
      const source = 'const fn = () => {\n  return 1;\n};\n';
      const result = instrumentSource(source, '/test/arrow.ts');
      const fc = result.coverageData;

      const fnKeys = Object.keys(fc.fnMap);
      assert.ok(fnKeys.length > 0, 'Should detect arrow function');
      assert.equal(fc.fnMap[fnKeys[0]!]!.name, 'fn');
    });

    it('should detect arrow functions with single param (no parens)', () => {
      const source = 'const double = x => {\n  return x * 2;\n};\n';
      const result = instrumentSource(source, '/test/arrow-single.ts');
      const fc = result.coverageData;

      const fnKeys = Object.keys(fc.fnMap);
      assert.ok(fnKeys.length > 0, 'Should detect single-param arrow function');
      assert.equal(fc.fnMap[fnKeys[0]!]!.name, 'double');
    });

    it('should detect async arrow functions', () => {
      const source =
        'const fetchData = async () => {\n  return await fetch("/api");\n};\n';
      const result = instrumentSource(source, '/test/async-arrow.ts');
      const fc = result.coverageData;

      const fnKeys = Object.keys(fc.fnMap);
      assert.ok(fnKeys.length > 0, 'Should detect async arrow function');
      assert.equal(fc.fnMap[fnKeys[0]!]!.name, 'fetchData');
    });

    it('should detect exported arrow functions', () => {
      const source =
        'export const handler = (req) => {\n  return req.body;\n};\n';
      const result = instrumentSource(source, '/test/export-arrow.ts');
      const fc = result.coverageData;

      const fnKeys = Object.keys(fc.fnMap);
      assert.ok(fnKeys.length > 0, 'Should detect exported arrow function');
      assert.equal(fc.fnMap[fnKeys[0]!]!.name, 'handler');
    });
  });

  describe('instrumentSource handles async functions', () => {
    it('should detect async function declarations', () => {
      const source =
        'async function fetchUser() {\n  return await db.find();\n}\n';
      const result = instrumentSource(source, '/test/async-fn.ts');
      const fc = result.coverageData;

      const fnKeys = Object.keys(fc.fnMap);
      assert.ok(fnKeys.length > 0, 'Should detect async function');
      assert.equal(fc.fnMap[fnKeys[0]!]!.name, 'fetchUser');
    });

    it('should detect exported async functions', () => {
      const source =
        'export async function save() {\n  return await db.save();\n}\n';
      const result = instrumentSource(source, '/test/export-async.ts');
      const fc = result.coverageData;

      const fnKeys = Object.keys(fc.fnMap);
      assert.ok(fnKeys.length > 0, 'Should detect exported async function');
      assert.equal(fc.fnMap[fnKeys[0]!]!.name, 'save');
    });
  });

  describe('instrumentSource handles class methods', () => {
    it('should detect class method declarations', () => {
      const source = 'class Foo {\n  method() {\n    return 42;\n  }\n}\n';
      const result = instrumentSource(source, '/test/class-method.ts');
      const fc = result.coverageData;

      const fnKeys = Object.keys(fc.fnMap);
      assert.ok(fnKeys.length > 0, 'Should detect class method');
      // Find a function named 'method'
      const methodFn = fnKeys.find((k) => fc.fnMap[k]!.name === 'method');
      assert.ok(methodFn !== undefined, 'Should have function named "method"');
    });

    it('should detect async class methods', () => {
      const source =
        'class Service {\n  async fetch() {\n    return await this.api();\n  }\n}\n';
      const result = instrumentSource(source, '/test/async-class-method.ts');
      const fc = result.coverageData;

      const fnKeys = Object.keys(fc.fnMap);
      const fetchFn = fnKeys.find((k) => fc.fnMap[k]!.name === 'fetch');
      assert.ok(fetchFn !== undefined, 'Should detect async class method');
    });

    it('should detect static class methods', () => {
      const source =
        'class Utils {\n  static create() {\n    return new Utils();\n  }\n}\n';
      const result = instrumentSource(source, '/test/static-method.ts');
      const fc = result.coverageData;

      const fnKeys = Object.keys(fc.fnMap);
      const createFn = fnKeys.find((k) => fc.fnMap[k]!.name === 'create');
      assert.ok(createFn !== undefined, 'Should detect static class method');
    });

    it('should detect getter and setter methods', () => {
      const source =
        'class Obj {\n  get value() {\n    return this._v;\n  }\n  set value(v) {\n    this._v = v;\n  }\n}\n';
      const result = instrumentSource(source, '/test/getter-setter.ts');
      const fc = result.coverageData;

      const fnKeys = Object.keys(fc.fnMap);
      assert.ok(fnKeys.length >= 2, 'Should detect both getter and setter');
    });
  });

  describe('instrumentSource does not match inside strings', () => {
    it('should not detect function keyword inside string literals', () => {
      const source = "const msg = 'function hello() { return 1; }';\n";
      const result = instrumentSource(source, '/test/string-fn.ts');
      const fc = result.coverageData;

      // Should have 0 function mappings since 'function' is inside a string
      assert.equal(
        Object.keys(fc.fnMap).length,
        0,
        'Should not detect function inside string literal',
      );
    });

    it('should not detect function keyword inside template literals', () => {
      const source = 'const msg = `function hello() { return 1; }`;\n';
      const result = instrumentSource(source, '/test/template-fn.ts');
      const fc = result.coverageData;

      assert.equal(
        Object.keys(fc.fnMap).length,
        0,
        'Should not detect function inside template literal',
      );
    });

    it('should not detect if keyword inside string literals', () => {
      const source = "const msg = 'if (x) { do something }';\n";
      const result = instrumentSource(source, '/test/string-if.ts');
      const fc = result.coverageData;

      assert.equal(
        Object.keys(fc.branchMap).length,
        0,
        'Should not detect if inside string literal',
      );
    });

    it('should not match class method patterns inside double-quoted strings', () => {
      const source = 'const s = "method() {";\n';
      const result = instrumentSource(source, '/test/string-method.ts');
      const fc = result.coverageData;

      assert.equal(
        Object.keys(fc.fnMap).length,
        0,
        'Should not detect method inside double-quoted string',
      );
    });
  });

  describe('ignore if skips only if branch', () => {
    it('should create an ignore_if range type for istanbul ignore if', () => {
      const source = `line1
/* istanbul ignore if */
if (x) {
  doA();
} else {
  doB();
}`;
      const ranges = findIgnoreRanges(source);
      const ifRange = ranges.find((r) => r.type === 'ignore_if');
      assert.ok(ifRange, 'Should produce an ignore_if range');
    });

    it('should zero only the if branch counts, not else', () => {
      const fc: FileCoverage = {
        path: '/test/if-else.ts',
        statementMap: {},
        fnMap: {},
        branchMap: {
          '0': {
            type: 'if',
            locations: [
              { start: { line: 3, column: 0 }, end: { line: 3, column: 10 } },
              { start: { line: 5, column: 0 }, end: { line: 5, column: 10 } },
            ],
            line: 3,
          },
        },
        s: {},
        f: {},
        b: { '0': [5, 3] },
      };

      const result = applyIgnoreRanges(fc, [
        { startLine: 3, endLine: 3, type: 'ignore_if' },
      ]);

      // if branch (index 0) should be zeroed
      assert.equal(result.b['0']![0], 0);
      // else branch (index 1) should be preserved
      assert.equal(result.b['0']![1], 3);
    });
  });

  describe('ignore else skips only else branch', () => {
    it('should create an ignore_else range type for istanbul ignore else', () => {
      const source = `line1
/* istanbul ignore else */
if (x) {
  doA();
} else {
  doB();
}`;
      const ranges = findIgnoreRanges(source);
      const elseRange = ranges.find((r) => r.type === 'ignore_else');
      assert.ok(elseRange, 'Should produce an ignore_else range');
    });

    it('should zero only the else branch counts, not if', () => {
      const fc: FileCoverage = {
        path: '/test/if-else.ts',
        statementMap: {},
        fnMap: {},
        branchMap: {
          '0': {
            type: 'if',
            locations: [
              { start: { line: 3, column: 0 }, end: { line: 3, column: 10 } },
              { start: { line: 5, column: 0 }, end: { line: 5, column: 10 } },
            ],
            line: 3,
          },
        },
        s: {},
        f: {},
        b: { '0': [5, 3] },
      };

      const result = applyIgnoreRanges(fc, [
        { startLine: 3, endLine: 3, type: 'ignore_else' },
      ]);

      // if branch (index 0) should be preserved
      assert.equal(result.b['0']![0], 5);
      // else branch (index 1) should be zeroed
      assert.equal(result.b['0']![1], 0);
    });
  });

  describe('Provider take() reads __coverage__', () => {
    let provider: IstanbulCoverageProvider;

    beforeEach(async () => {
      provider = new IstanbulCoverageProvider();
      await provider.start();
    });

    afterEach(async () => {
      try {
        await provider.stop();
      } catch {
        // ignore
      }
    });

    it('should track instrumented files for coverage collection', async () => {
      const g = globalThis as Record<string, unknown>;
      assert.ok('__coverage__' in g, '__coverage__ should exist after start()');
    });

    it('should read __coverage__ and convert to V8 format in take()', async () => {
      const g = globalThis as Record<string, unknown>;
      const coverageObj = g['__coverage__'] as Record<string, FileCoverage>;

      // Simulate instrumented file coverage data
      coverageObj['/test/instrumented.ts'] = {
        path: '/test/instrumented.ts',
        statementMap: {
          '0': { start: { line: 1, column: 0 }, end: { line: 1, column: 20 } },
          '1': { start: { line: 2, column: 0 }, end: { line: 2, column: 15 } },
        },
        fnMap: {
          '0': {
            name: 'greet',
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
        s: { '0': 3, '1': 3 },
        f: { '0': 3 },
        b: {},
      };

      const result = await provider.take();
      assert.ok(result.length > 0, 'Should return coverage data');

      const script = result[0]!;
      assert.ok(
        script.url.includes('/test/instrumented.ts'),
        'Script URL should reference file path',
      );
      assert.ok(
        script.functions.length > 0,
        'Should have function coverage entries',
      );

      // Check that function coverage has correct counts
      const fnCov = script.functions.find((fn) => fn.functionName === 'greet');
      assert.ok(fnCov, 'Should have greet function coverage');
      assert.equal(fnCov.ranges[0]!.count, 3, 'Function count should be 3');
    });

    it('should produce accurate data in convertToV8Format with branches', async () => {
      const g = globalThis as Record<string, unknown>;
      const coverageObj = g['__coverage__'] as Record<string, FileCoverage>;

      coverageObj['/test/branch.ts'] = {
        path: '/test/branch.ts',
        statementMap: {
          '0': { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
        },
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
        s: { '0': 1 },
        f: {},
        b: { '0': [7, 2] },
      };

      const result = await provider.take();
      const script = result.find((s) => s.url.includes('/test/branch.ts'));
      assert.ok(script, 'Should have branch script');

      // Find the branch function entry
      const branchFn = script.functions.find((fn) =>
        fn.functionName.includes('branch'),
      );
      assert.ok(branchFn, 'Should have branch coverage');
      assert.equal(branchFn.ranges.length, 2, 'Should have 2 branch ranges');
      assert.equal(branchFn.ranges[0]!.count, 7, 'If branch count');
      assert.equal(branchFn.ranges[1]!.count, 2, 'Else branch count');
    });

    it('should cleanup __coverage__ on stop()', async () => {
      const g = globalThis as Record<string, unknown>;
      await provider.stop();
      assert.equal(
        g['__coverage__'],
        undefined,
        '__coverage__ should be removed',
      );
    });
  });
});
