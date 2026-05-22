import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CoverageMap,
  createCoverageMap,
  type FileCoverage,
  type Range,
} from '../../src/coverage/coverage-map.js';
import {
  startTestCoverage,
  stopTestCoverage,
  getTestCoverage,
  getAllTestCoverage,
  serializeCoverageMap,
  deserializeCoverageMap,
  mergeCoverageMaps,
} from '../../src/coverage/index.js';
import { v8ToIstanbul } from '../../src/coverage/v8-to-istanbul.js';
import type { V8FunctionCoverage } from '../../src/coverage/v8-provider.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRange(sl: number, sc: number, el: number, ec: number): Range {
  return {
    start: { line: sl, column: sc },
    end: { line: el, column: ec },
  };
}

function makeSimpleFileCoverage(
  path: string,
  counts?: {
    s?: Record<string, number>;
    f?: Record<string, number>;
    b?: Record<string, number[]>;
  },
): FileCoverage {
  return {
    path,
    statementMap: {
      '0': makeRange(1, 0, 1, 20),
      '1': makeRange(2, 0, 2, 20),
    },
    fnMap: {
      '0': {
        name: 'testFn',
        decl: makeRange(1, 0, 1, 10),
        loc: makeRange(1, 0, 2, 1),
        line: 1,
      },
    },
    branchMap: {
      '0': {
        type: 'if',
        locations: [makeRange(2, 0, 2, 10), makeRange(2, 10, 2, 20)],
        line: 2,
      },
    },
    s: counts?.s ?? { '0': 1, '1': 0 },
    f: counts?.f ?? { '0': 1 },
    b: counts?.b ?? { '0': [1, 0] },
  };
}

// ---------------------------------------------------------------------------
// Issue #52: Per-test coverage tracking
// ---------------------------------------------------------------------------

describe('Per-test coverage tracking (Issue #52)', () => {
  it('should start and stop test coverage without error', () => {
    const map = createCoverageMap();
    map.addFileCoverage(makeSimpleFileCoverage('/src/a.ts'));

    startTestCoverage('test-1', map);
    const result = stopTestCoverage('test-1', map);

    assert.ok(result instanceof CoverageMap);
  });

  it('should compute delta coverage between start and stop', () => {
    // Snapshot at start: s['0']=1, s['1']=0
    const startMap = createCoverageMap();
    startMap.addFileCoverage(
      makeSimpleFileCoverage('/src/a.ts', {
        s: { '0': 1, '1': 0 },
        f: { '0': 1 },
        b: { '0': [1, 0] },
      }),
    );

    startTestCoverage('test-delta', startMap);

    // Snapshot at stop: s['0']=3, s['1']=2 — delta should be s['0']=2, s['1']=2
    const stopMap = createCoverageMap();
    stopMap.addFileCoverage(
      makeSimpleFileCoverage('/src/a.ts', {
        s: { '0': 3, '1': 2 },
        f: { '0': 4 },
        b: { '0': [3, 1] },
      }),
    );

    const delta = stopTestCoverage('test-delta', stopMap);
    assert.ok(delta instanceof CoverageMap);

    const fc = delta.fileCoverageFor('/src/a.ts');
    assert.equal(fc.s['0'], 2);
    assert.equal(fc.s['1'], 2);
    assert.equal(fc.f['0'], 3);
    assert.deepEqual(fc.b['0'], [2, 1]);
  });

  it('should store and retrieve per-test coverage via getTestCoverage', () => {
    const map = createCoverageMap();
    map.addFileCoverage(makeSimpleFileCoverage('/src/b.ts'));

    startTestCoverage('test-get', map);

    const stopMap = createCoverageMap();
    stopMap.addFileCoverage(
      makeSimpleFileCoverage('/src/b.ts', {
        s: { '0': 5, '1': 3 },
        f: { '0': 5 },
        b: { '0': [5, 3] },
      }),
    );

    stopTestCoverage('test-get', stopMap);

    const retrieved = getTestCoverage('test-get');
    assert.ok(retrieved !== undefined);
    assert.ok(retrieved instanceof CoverageMap);
    assert.ok(retrieved.files().includes('/src/b.ts'));
  });

  it('should return undefined for unknown test name', () => {
    const result = getTestCoverage('nonexistent-test-xyz');
    assert.equal(result, undefined);
  });

  it('should return all test coverage via getAllTestCoverage', () => {
    // Start/stop a couple of tests
    const map1 = createCoverageMap();
    map1.addFileCoverage(makeSimpleFileCoverage('/src/c.ts'));
    startTestCoverage('test-all-1', map1);
    stopTestCoverage('test-all-1', map1);

    const map2 = createCoverageMap();
    map2.addFileCoverage(makeSimpleFileCoverage('/src/d.ts'));
    startTestCoverage('test-all-2', map2);
    stopTestCoverage('test-all-2', map2);

    const all = getAllTestCoverage();
    assert.ok(all instanceof Map);
    assert.ok(all.has('test-all-1'));
    assert.ok(all.has('test-all-2'));
  });

  it('should throw when stopping a test that was not started', () => {
    const map = createCoverageMap();
    assert.throws(
      () => stopTestCoverage('never-started', map),
      /No coverage snapshot found for test: never-started/,
    );
  });
});

// ---------------------------------------------------------------------------
// Issue #59: AST-based remapping / branch detection
// ---------------------------------------------------------------------------

describe('AST-based branch detection from nested V8 ranges (Issue #59)', () => {
  it('should detect if-branch pattern from nested ranges with different counts', () => {
    // Simulate:
    //   function foo() {       // line 1, offset 0..60
    //     if (cond) {          // line 2, offset 18..40 (count differs)
    //       doA();             // line 3
    //     } else {             // line 4, offset 40..58
    //       doB();             // line 5
    //     }
    //   }
    const source = [
      'function foo() {', // 0..16, \n at 16
      '  if (cond) {', // 17..30, \n at 30
      '    doA();', // 31..41, \n at 41
      '  } else {', // 42..52, \n at 52
      '    doB();', // 53..63, \n at 63
      '  }', // 64..67, \n at 67
      '}', // 68
    ].join('\n');

    const v8Coverage: V8FunctionCoverage[] = [
      {
        functionName: 'foo',
        ranges: [
          { startOffset: 0, endOffset: 69, count: 10 }, // outer function
          { startOffset: 17, endOffset: 41, count: 7 }, // if-true branch
          { startOffset: 42, endOffset: 67, count: 3 }, // if-false branch
        ],
        isBlockCoverage: true,
      },
    ];

    const result = v8ToIstanbul('/branch.ts', source, v8Coverage);

    // Should have a branch entry
    assert.ok(Object.keys(result.branchMap).length > 0);
    const branchKey = Object.keys(result.branchMap)[0]!;
    const branch = result.branchMap[branchKey]!;

    // Branch should have type 'if' since we have two inner ranges with different counts
    assert.equal(branch.type, 'if');
    assert.equal(branch.locations.length, 2);

    // Branch counts should reflect the inner ranges
    const counts = result.b[branchKey]!;
    assert.equal(counts[0], 7);
    assert.equal(counts[1], 3);
  });

  it('should detect cond-expr pattern from short single-line nested ranges', () => {
    // Simulate: const x = cond ? a : b;
    // Short ranges on same line suggest ternary/conditional expression
    const source = 'const x = cond ? valA : valB;\n';

    const v8Coverage: V8FunctionCoverage[] = [
      {
        functionName: '',
        ranges: [
          { startOffset: 0, endOffset: 29, count: 10 }, // outer
          { startOffset: 17, endOffset: 21, count: 7 }, // valA (short, same line)
          { startOffset: 24, endOffset: 28, count: 3 }, // valB (short, same line)
        ],
        isBlockCoverage: true,
      },
    ];

    const result = v8ToIstanbul('/cond.ts', source, v8Coverage);
    const branchKey = Object.keys(result.branchMap)[0]!;
    const branch = result.branchMap[branchKey]!;

    assert.equal(branch.type, 'cond-expr');
    assert.equal(branch.locations.length, 2);
  });

  it('should detect binary-expr pattern from single inner range', () => {
    // Simulate: const x = a || b;
    // Single inner range with lower count suggests short-circuit
    const source = 'const x = aVal || bVal;\n';

    const v8Coverage: V8FunctionCoverage[] = [
      {
        functionName: '',
        ranges: [
          { startOffset: 0, endOffset: 23, count: 10 }, // outer
          { startOffset: 18, endOffset: 22, count: 3 }, // right-hand side (short-circuited)
        ],
        isBlockCoverage: true,
      },
    ];

    const result = v8ToIstanbul('/binary.ts', source, v8Coverage);
    const branchKey = Object.keys(result.branchMap)[0]!;
    const branch = result.branchMap[branchKey]!;

    assert.equal(branch.type, 'binary-expr');
    assert.equal(branch.locations.length, 1);
  });

  it('should differentiate statement vs branch ranges properly', () => {
    const source = [
      'function bar() {', // line 1
      '  const a = 1;', // line 2
      '  if (a) {', // line 3
      '    return a;', // line 4
      '  }', // line 5
      '}', // line 6
    ].join('\n');

    const v8Coverage: V8FunctionCoverage[] = [
      {
        functionName: 'bar',
        ranges: [
          { startOffset: 0, endOffset: 67, count: 5 }, // function body
          { startOffset: 31, endOffset: 62, count: 3 }, // if block (multi-line)
        ],
        isBlockCoverage: true,
      },
    ];

    const result = v8ToIstanbul('/stmtbranch.ts', source, v8Coverage);

    // The inner block range should appear both as a statement and in a branch
    const stmtKeys = Object.keys(result.statementMap);
    assert.ok(
      stmtKeys.length >= 2,
      'should have at least 2 statements (fn + block)',
    );

    const branchKeys = Object.keys(result.branchMap);
    assert.ok(branchKeys.length >= 1, 'should have at least 1 branch');

    // The branch should have type based on range structure
    const branch = result.branchMap[branchKeys[0]!]!;
    assert.ok(
      ['if', 'binary-expr', 'cond-expr'].includes(branch.type),
      `branch type should be one of if/cond-expr/binary-expr, got: ${branch.type}`,
    );
  });
});

// ---------------------------------------------------------------------------
// Issue #68: Multi-process coverage merging
// ---------------------------------------------------------------------------

describe('Multi-process coverage merging (Issue #68)', () => {
  describe('serializeCoverageMap / deserializeCoverageMap roundtrip', () => {
    it('should serialize and deserialize a coverage map preserving all data', () => {
      const map = createCoverageMap();
      map.addFileCoverage(makeSimpleFileCoverage('/src/a.ts'));
      map.addFileCoverage(
        makeSimpleFileCoverage('/src/b.ts', {
          s: { '0': 10, '1': 5 },
          f: { '0': 10 },
          b: { '0': [10, 5] },
        }),
      );

      const json = serializeCoverageMap(map);
      assert.equal(typeof json, 'string');

      const deserialized = deserializeCoverageMap(json);
      assert.ok(deserialized instanceof CoverageMap);

      // Files should match
      const origFiles = map.files().sort();
      const deserFiles = deserialized.files().sort();
      assert.deepEqual(deserFiles, origFiles);

      // Coverage data should match
      for (const file of origFiles) {
        const origFc = map.fileCoverageFor(file);
        const deserFc = deserialized.fileCoverageFor(file);
        assert.deepEqual(deserFc.s, origFc.s);
        assert.deepEqual(deserFc.f, origFc.f);
        assert.deepEqual(deserFc.b, origFc.b);
        assert.deepEqual(deserFc.statementMap, origFc.statementMap);
        assert.deepEqual(deserFc.fnMap, origFc.fnMap);
        assert.deepEqual(deserFc.branchMap, origFc.branchMap);
      }
    });

    it('should handle empty coverage map', () => {
      const map = createCoverageMap();
      const json = serializeCoverageMap(map);
      const deserialized = deserializeCoverageMap(json);
      assert.deepEqual(deserialized.files(), []);
    });

    it('should produce valid JSON', () => {
      const map = createCoverageMap();
      map.addFileCoverage(makeSimpleFileCoverage('/src/x.ts'));
      const json = serializeCoverageMap(map);
      assert.doesNotThrow(() => JSON.parse(json));
    });
  });

  describe('mergeCoverageMaps', () => {
    it('should merge multiple coverage maps with disjoint files', () => {
      const map1 = createCoverageMap();
      map1.addFileCoverage(makeSimpleFileCoverage('/src/a.ts'));

      const map2 = createCoverageMap();
      map2.addFileCoverage(makeSimpleFileCoverage('/src/b.ts'));

      const map3 = createCoverageMap();
      map3.addFileCoverage(makeSimpleFileCoverage('/src/c.ts'));

      const merged = mergeCoverageMaps([map1, map2, map3]);
      assert.ok(merged instanceof CoverageMap);

      const files = merged.files().sort();
      assert.deepEqual(files, ['/src/a.ts', '/src/b.ts', '/src/c.ts']);
    });

    it('should merge coverage maps with overlapping files by summing counts', () => {
      const map1 = createCoverageMap();
      map1.addFileCoverage(
        makeSimpleFileCoverage('/src/a.ts', {
          s: { '0': 1, '1': 2 },
          f: { '0': 1 },
          b: { '0': [1, 0] },
        }),
      );

      const map2 = createCoverageMap();
      map2.addFileCoverage(
        makeSimpleFileCoverage('/src/a.ts', {
          s: { '0': 3, '1': 0 },
          f: { '0': 4 },
          b: { '0': [2, 1] },
        }),
      );

      const merged = mergeCoverageMaps([map1, map2]);
      const fc = merged.fileCoverageFor('/src/a.ts');

      assert.equal(fc.s['0'], 4);
      assert.equal(fc.s['1'], 2);
      assert.equal(fc.f['0'], 5);
      assert.deepEqual(fc.b['0'], [3, 1]);
    });

    it('should handle empty array of maps', () => {
      const merged = mergeCoverageMaps([]);
      assert.ok(merged instanceof CoverageMap);
      assert.deepEqual(merged.files(), []);
    });

    it('should handle single map in array', () => {
      const map = createCoverageMap();
      map.addFileCoverage(makeSimpleFileCoverage('/src/only.ts'));

      const merged = mergeCoverageMaps([map]);
      assert.deepEqual(merged.files(), ['/src/only.ts']);
    });
  });
});
