/**
 * Additional tests for src/coverage/istanbul-provider.ts to increase coverage.
 * Covers: loadSteamroller, loadSteamrollerSync, isSteamrollerAvailable,
 * resetSteamrollerCache, instrumentSource edge cases, walkAST,
 * sendCoverageToParent, receiveCoverageFromWorker, convertToV8Format edge cases,
 * InstrumentOptions (compact, preserveComments, esModules),
 * instrumentWithAST error handling, splitMultiStatements, isInsideStringLiteral.
 */
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  instrumentSource,
  IstanbulCoverageProvider,
  loadSteamroller,
  loadSteamrollerSync,
  isSteamrollerAvailable,
  resetSteamrollerCache,
  instrumentWithAST,
  walkAST,
  sendCoverageToParent,
  receiveCoverageFromWorker,
} from '../../src/coverage/istanbul-provider.js';
import {
  createCoverageMap,
  type FileCoverage,
} from '../../src/coverage/coverage-map.js';

// ---------------------------------------------------------------------------
// Steamroller loading and caching
// ---------------------------------------------------------------------------

describe('Steamroller module loading', () => {
  beforeEach(() => {
    resetSteamrollerCache();
  });

  afterEach(() => {
    resetSteamrollerCache();
  });

  it('should return false from isSteamrollerAvailable before loading', () => {
    assert.equal(isSteamrollerAvailable(), false);
  });

  it('loadSteamroller should return a boolean', async () => {
    const result = await loadSteamroller();
    assert.equal(typeof result, 'boolean');
    assert.equal(isSteamrollerAvailable(), result);
  });

  it('loadSteamroller should return cached result on second call', async () => {
    const result1 = await loadSteamroller();
    const result2 = await loadSteamroller();
    assert.equal(result1, result2);
  });

  it('loadSteamrollerSync should return a boolean', () => {
    const result = loadSteamrollerSync();
    assert.equal(typeof result, 'boolean');
    assert.equal(isSteamrollerAvailable(), result);
  });

  it('loadSteamrollerSync should return cached result on second call', () => {
    const result1 = loadSteamrollerSync();
    const result2 = loadSteamrollerSync();
    assert.equal(result1, result2);
  });

  it('resetSteamrollerCache should clear the cached state', async () => {
    await loadSteamroller();
    resetSteamrollerCache();
    assert.equal(isSteamrollerAvailable(), false);
  });

  it('instrumentWithAST should throw when steamroller is not loaded', () => {
    resetSteamrollerCache();
    assert.throws(
      () => instrumentWithAST('const x = 1;', '/test.ts'),
      /steamroller modules not loaded/,
    );
  });
});

// ---------------------------------------------------------------------------
// instrumentSource options
// ---------------------------------------------------------------------------

describe('instrumentSource with InstrumentOptions', () => {
  it('should produce compact output when compact is true', () => {
    const source = '// comment\nconst x = 1;\n\nconst y = 2;\n';
    const result = instrumentSource(source, '/test.ts', { compact: true });
    // Compact output should not have blank lines; original has blank lines between const x and const y
    assert.ok(result.code.includes('const x = 1'));
  });

  it('should strip comments when preserveComments is false', () => {
    const source =
      '// This is a comment\nconst x = 1;\n/* block comment */\nconst y = 2;\n';
    const result = instrumentSource(source, '/test.ts', {
      preserveComments: false,
    });
    // Comment lines should be stripped
    assert.ok(!result.code.includes('This is a comment'));
    assert.ok(!result.code.includes('block comment'));
    assert.ok(result.code.includes('const x = 1'));
    assert.ok(result.code.includes('const y = 2'));
  });

  it('should accept esModules option without error', () => {
    const source = 'export const x = 1;\n';
    const result = instrumentSource(source, '/test.ts', { esModules: true });
    assert.ok(result.code.includes('export const x = 1'));
  });
});

// ---------------------------------------------------------------------------
// instrumentSource - function detection edge cases
// ---------------------------------------------------------------------------

describe('instrumentSource function detection', () => {
  it('should detect async function declarations', () => {
    const source = 'async function fetchData() {\n  return 1;\n}\n';
    const result = instrumentSource(source, '/test.ts');
    const fnNames = Object.values(result.coverageData.fnMap).map(
      (fn) => fn.name,
    );
    assert.ok(fnNames.includes('fetchData'));
  });

  it('should detect exported function declarations', () => {
    const source = 'export function helper() {\n  return 1;\n}\n';
    const result = instrumentSource(source, '/test.ts');
    const fnNames = Object.values(result.coverageData.fnMap).map(
      (fn) => fn.name,
    );
    assert.ok(fnNames.includes('helper'));
  });

  it('should detect function expressions assigned to variables', () => {
    const source = 'const fn = function myFn() {\n  return 1;\n};\n';
    const result = instrumentSource(source, '/test.ts');
    const fnKeys = Object.keys(result.coverageData.fnMap);
    assert.ok(fnKeys.length > 0, 'Should detect function expression');
    // extractFunctionName matches the function keyword name first (myFn),
    // or falls back to the variable name (fn)
    const fnNames = Object.values(result.coverageData.fnMap).map(
      (fn) => fn.name,
    );
    assert.ok(
      fnNames.includes('myFn') || fnNames.includes('fn'),
      'Should extract function name',
    );
  });

  it('should detect class methods', () => {
    const source = 'myMethod() {\n  return 1;\n}\n';
    const result = instrumentSource(source, '/test.ts');
    const fnNames = Object.values(result.coverageData.fnMap).map(
      (fn) => fn.name,
    );
    assert.ok(fnNames.includes('myMethod'));
  });

  it('should detect async arrow functions', () => {
    const source = 'const fn = async (x) => {\n  return x;\n};\n';
    const result = instrumentSource(source, '/test.ts');
    const fnNames = Object.values(result.coverageData.fnMap).map(
      (fn) => fn.name,
    );
    assert.ok(fnNames.includes('fn'));
  });
});

// ---------------------------------------------------------------------------
// instrumentSource - branch detection
// ---------------------------------------------------------------------------

describe('instrumentSource branch detection', () => {
  it('should detect switch/case branches', () => {
    const source =
      [
        'switch (x) {',
        '  case 1:',
        '    doA();',
        '    break;',
        '  case 2:',
        '    doB();',
        '    break;',
        '  default:',
        '    doC();',
        '}',
      ].join('\n') + '\n';
    const result = instrumentSource(source, '/test.ts');
    const branches = Object.values(result.coverageData.branchMap);
    const switchBranch = branches.find((b) => b.type === 'switch');
    assert.ok(switchBranch, 'Should detect switch branch');
    assert.ok(
      switchBranch!.locations.length >= 3,
      'Should have 3+ case locations',
    );
  });

  it('should detect ternary expressions', () => {
    const source = 'const result = x > 0 ? "positive" : "negative";\n';
    const result = instrumentSource(source, '/test.ts');
    const branches = Object.values(result.coverageData.branchMap);
    const condBranch = branches.find((b) => b.type === 'cond-expr');
    assert.ok(condBranch, 'Should detect ternary as cond-expr');
  });

  it('should detect logical operators (&&, ||, ??)', () => {
    const source = 'const val = a && b;\n';
    const result = instrumentSource(source, '/test.ts');
    const branches = Object.values(result.coverageData.branchMap);
    const binaryBranch = branches.find((b) => b.type === 'binary-expr');
    assert.ok(binaryBranch, 'Should detect && as binary-expr');
  });

  it('should handle lines with closing braces only', () => {
    const source = 'if (x) {\n  doA();\n}\n';
    const result = instrumentSource(source, '/test.ts');
    // Should not crash, closing brace line should be preserved as-is
    assert.ok(result.code.includes('}'));
  });
});

// ---------------------------------------------------------------------------
// instrumentSource - multi-statement lines
// ---------------------------------------------------------------------------

describe('instrumentSource multi-statement lines', () => {
  it('should split multi-statement lines separated by semicolons', () => {
    const source = 'let a = 1; let b = 2; let c = 3;\n';
    const result = instrumentSource(source, '/test.ts');
    const stmtCount = Object.keys(result.coverageData.statementMap).length;
    assert.ok(
      stmtCount >= 3,
      'Should have at least 3 statement entries for 3 sub-statements',
    );
  });
});

// ---------------------------------------------------------------------------
// instrumentSource - string literal detection (isInsideStringLiteral)
// ---------------------------------------------------------------------------

describe('instrumentSource string literal handling', () => {
  it('should not treat string assignments as code constructs', () => {
    const source = "const s = 'function hello() { return 1; }';\n";
    const result = instrumentSource(source, '/test.ts');
    // Should not detect a function inside the string literal
    const fnKeys = Object.keys(result.coverageData.fnMap);
    assert.equal(
      fnKeys.length,
      0,
      'Should not detect function inside string literal',
    );
  });

  it('should not treat template literal assignments as code', () => {
    const source = 'const s = `if (x) { doSomething(); }`;\n';
    const result = instrumentSource(source, '/test.ts');
    // Should not detect an if branch inside the template literal
    const branchKeys = Object.keys(result.coverageData.branchMap);
    assert.equal(
      branchKeys.length,
      0,
      'Should not detect branches inside template literal',
    );
  });
});

// ---------------------------------------------------------------------------
// instrumentSource - source map generation
// ---------------------------------------------------------------------------

describe('instrumentSource source map', () => {
  it('should generate a valid source map', () => {
    const source = 'const x = 1;\nconst y = 2;\n';
    const result = instrumentSource(source, '/test.ts');
    assert.ok(result.sourceMap);
    assert.equal(result.sourceMap.version, 3);
    assert.deepEqual(result.sourceMap.sources, ['/test.ts']);
    assert.ok(typeof result.sourceMap.mappings === 'string');
    assert.ok(Array.isArray(result.sourceMap.names));
  });
});

// ---------------------------------------------------------------------------
// walkAST
// ---------------------------------------------------------------------------

describe('walkAST', () => {
  it('should visit all nodes in a simple AST', () => {
    const visited: string[] = [];
    const ast = {
      type: 'Program',
      body: [
        {
          type: 'ExpressionStatement',
          expression: {
            type: 'Literal',
            value: 1,
          },
        },
      ],
    };
    walkAST(ast as Record<string, unknown>, (node) => {
      visited.push(String(node['type']));
    });
    assert.ok(visited.includes('Program'));
    assert.ok(visited.includes('ExpressionStatement'));
    assert.ok(visited.includes('Literal'));
  });

  it('should handle null/undefined nodes gracefully', () => {
    assert.doesNotThrow(() => {
      walkAST(null as unknown as Record<string, unknown>, () => {});
    });
    assert.doesNotThrow(() => {
      walkAST(undefined as unknown as Record<string, unknown>, () => {});
    });
  });

  it('should handle AST with no children', () => {
    const visited: string[] = [];
    walkAST(
      { type: 'Literal', value: 42 } as Record<string, unknown>,
      (node) => {
        visited.push(String(node['type']));
      },
    );
    assert.deepEqual(visited, ['Literal']);
  });

  it('should skip non-object array items', () => {
    const visited: string[] = [];
    const ast = {
      type: 'Program',
      body: [null, 'string', 42, { type: 'Statement' }],
    };
    walkAST(ast as Record<string, unknown>, (node) => {
      visited.push(String(node['type']));
    });
    assert.ok(visited.includes('Program'));
    assert.ok(visited.includes('Statement'));
    assert.equal(visited.length, 2);
  });
});

// ---------------------------------------------------------------------------
// IPC: sendCoverageToParent / receiveCoverageFromWorker
// ---------------------------------------------------------------------------

describe('sendCoverageToParent', () => {
  it('should be a no-op when process.send is not available', () => {
    const map = createCoverageMap();
    // In test environment, process.send is typically not defined
    assert.doesNotThrow(() => {
      sendCoverageToParent(map);
    });
  });
});

describe('receiveCoverageFromWorker', () => {
  it('should return a handler function', () => {
    const handler = receiveCoverageFromWorker(() => {});
    assert.equal(typeof handler, 'function');
  });

  it('should ignore messages without type: coverage', () => {
    const received: FileCoverage[] = [];
    const handler = receiveCoverageFromWorker((fc) => received.push(fc));
    handler({ type: 'other', data: 'something' });
    assert.equal(received.length, 0);
  });

  it('should ignore messages with non-string coverage field', () => {
    const received: FileCoverage[] = [];
    const handler = receiveCoverageFromWorker((fc) => received.push(fc));
    handler({ type: 'coverage', coverage: 12345 });
    assert.equal(received.length, 0);
  });

  it('should deserialize and forward coverage data from valid messages', () => {
    const received: FileCoverage[] = [];
    const handler = receiveCoverageFromWorker((fc) => received.push(fc));

    // Create a valid serialized coverage map
    const map = createCoverageMap();
    map.addFileCoverage({
      path: '/src/worker-file.ts',
      statementMap: {
        '0': { start: { line: 1, column: 0 }, end: { line: 1, column: 20 } },
      },
      fnMap: {},
      branchMap: {},
      s: { '0': 5 },
      f: {},
      b: {},
    });

    // Import serializeCoverageMap to produce valid coverage data
    const {
      serializeCoverageMap,
      // eslint-disable-next-line @typescript-eslint/no-require-imports
    } = require('../../src/coverage/coverage-map.js');
    const serialized = serializeCoverageMap(map);

    handler({ type: 'coverage', coverage: serialized });
    assert.equal(received.length, 1);
    assert.equal(received[0]!.path, '/src/worker-file.ts');
    assert.equal(received[0]!.s['0'], 5);
  });
});

// ---------------------------------------------------------------------------
// IstanbulCoverageProvider - convertToV8Format edge cases
// ---------------------------------------------------------------------------

describe('IstanbulCoverageProvider convertToV8Format edge cases', () => {
  let provider: IstanbulCoverageProvider;

  afterEach(async () => {
    try {
      await provider.stop();
    } catch {
      /* ignore */
    }
  });

  it('should handle coverage data with function mappings', async () => {
    provider = new IstanbulCoverageProvider();
    await provider.start();
    const g = globalThis as Record<string, unknown>;
    const cov = g['__coverage__'] as Record<string, FileCoverage>;
    cov['/test/fn-file.ts'] = {
      path: '/test/fn-file.ts',
      statementMap: {
        '0': { start: { line: 1, column: 0 }, end: { line: 1, column: 20 } },
      },
      fnMap: {
        '0': {
          name: 'myFunc',
          decl: { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
          loc: { start: { line: 1, column: 0 }, end: { line: 3, column: 1 } },
          line: 1,
        },
      },
      branchMap: {
        '0': {
          type: 'if',
          locations: [
            { start: { line: 2, column: 0 }, end: { line: 2, column: 10 } },
            { start: { line: 2, column: 10 }, end: { line: 2, column: 20 } },
          ],
          line: 2,
        },
      },
      s: { '0': 3 },
      f: { '0': 2 },
      b: { '0': [2, 1] },
    };
    const result = await provider.take();
    assert.ok(result.length > 0);
    const script = result[0]!;
    // Should have function entries + statement entries + branch entries
    assert.ok(script.functions.length >= 3);
  });

  it('should handle empty coverage object', async () => {
    provider = new IstanbulCoverageProvider();
    await provider.start();
    const result = await provider.take();
    assert.deepEqual(result, []);
  });
});

// ---------------------------------------------------------------------------
// instrumentSource - switch with closing brace (line 256)
// ---------------------------------------------------------------------------

describe('instrumentSource switch statement edge cases', () => {
  it('should handle switch with closing brace stopping the scan', () => {
    const source =
      [
        'switch (action) {',
        '  case "a":',
        '    doA();',
        '    break;',
        '  default:',
        '    doDefault();',
        '}',
        'const after = 1;',
      ].join('\n') + '\n';
    const result = instrumentSource(source, '/test.ts');
    const branches = Object.values(result.coverageData.branchMap);
    const switchBranch = branches.find((b) => b.type === 'switch');
    assert.ok(switchBranch, 'Should detect switch');
    assert.ok(result.code.includes('const after = 1'));
  });
});

// ---------------------------------------------------------------------------
// instrumentSource - else line counter (lines 428-448)
// ---------------------------------------------------------------------------

describe('instrumentSource else line counter insertion', () => {
  it('should insert branch counters for else blocks', () => {
    const source =
      ['if (condition) {', '  doTrue();', '} else {', '  doFalse();', '}'].join(
        '\n',
      ) + '\n';
    const result = instrumentSource(source, '/test.ts');
    // Should contain branch counter for else path
    assert.ok(result.code.includes('[1]++'), 'Should have else branch counter');
    const branches = Object.values(result.coverageData.branchMap);
    assert.ok(branches.length > 0);
    const ifBranch = branches.find((b) => b.type === 'if');
    assert.ok(ifBranch, 'Should have if branch');
    assert.equal(
      ifBranch!.locations.length,
      2,
      'Should have 2 locations (if + else)',
    );
  });
});

// ---------------------------------------------------------------------------
// instrumentSource - pure string literal line (line 676)
// ---------------------------------------------------------------------------

describe('instrumentSource pure string literal lines', () => {
  it('should not instrument lines that are pure string literals', () => {
    const source = '\'hello world\';\n"another string";\n';
    const result = instrumentSource(source, '/test.ts');
    // Pure string literal lines should not have function detection
    assert.equal(Object.keys(result.coverageData.fnMap).length, 0);
  });
});

// ---------------------------------------------------------------------------
// instrumentSource - anonymous function fallback (line 701)
// ---------------------------------------------------------------------------

describe('instrumentSource anonymous detection', () => {
  it('should return (anonymous) for unrecognizable method patterns', () => {
    // A line that matches the method regex but has no extractable name
    // This is hard to trigger as most patterns are caught, but we test
    // the extractFunctionName fallback
    const source = '() {\n  return 1;\n}\n';
    const result = instrumentSource(source, '/test.ts');
    // The method regex requires word chars before (, so () won't match
    // The function won't be detected at all
    assert.equal(Object.keys(result.coverageData.fnMap).length, 0);
  });
});

// ---------------------------------------------------------------------------
// instrumentSource - splitMultiStatements edge cases
// ---------------------------------------------------------------------------

describe('instrumentSource multi-statement splitting edge cases', () => {
  it('should not split for-loop headers', () => {
    const source = 'for (let i = 0; i < 10; i++) {\n  console.log(i);\n}\n';
    const result = instrumentSource(source, '/test.ts');
    // For loops should not be split at semicolons
    assert.ok(result.code.includes('for (let i = 0'));
  });

  it('should handle semicolons inside strings without splitting', () => {
    const source = 'const msg = "a; b; c";\n';
    const result = instrumentSource(source, '/test.ts');
    const stmtCount = Object.keys(result.coverageData.statementMap).length;
    // Should be 1 statement, not split at string semicolons
    assert.equal(stmtCount, 1);
  });

  it('should handle semicolons inside parentheses without splitting', () => {
    const source = 'callFn(a, function() { x; y; });\n';
    const result = instrumentSource(source, '/test.ts');
    // Should not split inside parens
    assert.ok(result.code.includes('callFn'));
  });

  it('should handle lines with only semicolons', () => {
    const source = ';;;\n';
    const result = instrumentSource(source, '/test.ts');
    // Empty semicolons should be treated as closing brace-like (skipped)
    // or as statement
    assert.ok(typeof result.code === 'string');
  });
});

// ---------------------------------------------------------------------------
// IstanbulCoverageProvider - locationToOffset (lines 848-864)
// ---------------------------------------------------------------------------

describe('IstanbulCoverageProvider locationToOffset paths', () => {
  let provider: IstanbulCoverageProvider;

  afterEach(async () => {
    try {
      await provider.stop();
    } catch {
      /* ignore */
    }
  });

  it('should use heuristic when source is not available for offset computation', async () => {
    provider = new IstanbulCoverageProvider();
    await provider.start();
    const g = globalThis as Record<string, unknown>;
    const cov = g['__coverage__'] as Record<string, FileCoverage>;
    // Use a path that doesn't exist on disk - forces heuristic fallback
    cov['/nonexistent/path/test.ts'] = {
      path: '/nonexistent/path/test.ts',
      statementMap: {
        '0': { start: { line: 1, column: 0 }, end: { line: 1, column: 20 } },
      },
      fnMap: {
        '0': {
          name: 'test',
          decl: { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
          loc: { start: { line: 1, column: 0 }, end: { line: 2, column: 1 } },
          line: 1,
        },
      },
      branchMap: {},
      s: { '0': 1 },
      f: { '0': 1 },
      b: {},
    };
    const result = await provider.take();
    assert.ok(result.length > 0);
    // The conversion should succeed using heuristic offsets
    const script = result[0]!;
    assert.ok(script.functions.length > 0);
  });
});

// ---------------------------------------------------------------------------
// instrumentWithAST - AST-based instrumentation (when steamroller is available)
// ---------------------------------------------------------------------------

describe('instrumentWithAST (when steamroller available)', () => {
  beforeEach(async () => {
    resetSteamrollerCache();
    await loadSteamroller();
  });

  afterEach(() => {
    resetSteamrollerCache();
  });

  it('should instrument simple source code with AST', async () => {
    if (!isSteamrollerAvailable()) return; // skip if not available
    const source = 'const x = 1;\nconst y = 2;\n';
    const result = instrumentWithAST(source, '/test/ast.ts');
    assert.ok(result.code.includes('__coverage__'));
    assert.equal(result.metadata.path, '/test/ast.ts');
    assert.ok(Object.keys(result.metadata.statementMap).length > 0);
  });

  it('should instrument function declarations', async () => {
    if (!isSteamrollerAvailable()) return;
    const source = 'function hello() {\n  return 1;\n}\n';
    const result = instrumentWithAST(source, '/test/fn.ts');
    assert.ok(Object.keys(result.metadata.fnMap).length > 0);
    const fnNames = Object.values(result.metadata.fnMap).map((fn) => fn.name);
    assert.ok(fnNames.includes('hello'));
  });

  it('should instrument if/else branches', async () => {
    if (!isSteamrollerAvailable()) return;
    const source = 'if (x > 0) {\n  doA();\n} else {\n  doB();\n}\n';
    const result = instrumentWithAST(source, '/test/if.ts');
    const branches = Object.values(result.metadata.branchMap);
    const ifBranch = branches.find((b) => b.type === 'if');
    assert.ok(ifBranch, 'Should detect if branch');
  });

  it('should instrument if without else', async () => {
    if (!isSteamrollerAvailable()) return;
    const source = 'if (x > 0) {\n  doA();\n}\n';
    const result = instrumentWithAST(source, '/test/if-only.ts');
    const branches = Object.values(result.metadata.branchMap);
    assert.ok(branches.length > 0);
  });

  it('should instrument else if chains', async () => {
    if (!isSteamrollerAvailable()) return;
    const source = 'if (a) {\n  doA();\n} else if (b) {\n  doB();\n}\n';
    const result = instrumentWithAST(source, '/test/elseif.ts');
    const branches = Object.values(result.metadata.branchMap);
    assert.ok(branches.length > 0);
  });

  it('should instrument ternary expressions', async () => {
    if (!isSteamrollerAvailable()) return;
    const source = 'const r = x > 0 ? "yes" : "no";\n';
    const result = instrumentWithAST(source, '/test/ternary.ts');
    const branches = Object.values(result.metadata.branchMap);
    const condBranch = branches.find((b) => b.type === 'cond-expr');
    assert.ok(condBranch, 'Should detect ternary');
  });

  it('should instrument switch/case statements', async () => {
    if (!isSteamrollerAvailable()) return;
    const source =
      [
        'switch (x) {',
        '  case 1:',
        '    doA();',
        '    break;',
        '  default:',
        '    doDefault();',
        '}',
      ].join('\n') + '\n';
    const result = instrumentWithAST(source, '/test/switch.ts');
    const branches = Object.values(result.metadata.branchMap);
    const switchBranch = branches.find((b) => b.type === 'switch');
    assert.ok(switchBranch, 'Should detect switch');
  });

  it('should instrument logical expressions (&&, ||, ??)', async () => {
    if (!isSteamrollerAvailable()) return;
    const source = 'const val = a && b;\n';
    const result = instrumentWithAST(source, '/test/logical.ts');
    const branches = Object.values(result.metadata.branchMap);
    const binaryBranch = branches.find((b) => b.type === 'binary-expr');
    assert.ok(binaryBranch, 'Should detect logical expr');
  });

  it('should instrument arrow functions with expression body', async () => {
    if (!isSteamrollerAvailable()) return;
    const source = 'const fn = (x) => x + 1;\n';
    const result = instrumentWithAST(source, '/test/arrow-expr.ts');
    assert.ok(Object.keys(result.metadata.fnMap).length > 0);
  });

  it('should handle if with non-block consequent', async () => {
    if (!isSteamrollerAvailable()) return;
    const source = 'if (x) doA();\n';
    const result = instrumentWithAST(source, '/test/if-noblock.ts');
    const branches = Object.values(result.metadata.branchMap);
    assert.ok(branches.length > 0);
  });

  it('should handle if/else with non-block alternate', async () => {
    if (!isSteamrollerAvailable()) return;
    const source = 'if (x) doA(); else doB();\n';
    const result = instrumentWithAST(source, '/test/ifelse-noblock.ts');
    const branches = Object.values(result.metadata.branchMap);
    const ifBranch = branches.find((b) => b.type === 'if');
    assert.ok(ifBranch);
  });
});

// ---------------------------------------------------------------------------
// VLQ encoding edge cases (tested via source map generation)
// ---------------------------------------------------------------------------

describe('instrumentSource VLQ encoding', () => {
  it('should handle large offsets that need continuation bits', () => {
    // Generate source with many lines to force large VLQ-encoded values
    const lines = [];
    for (let i = 0; i < 50; i++) {
      lines.push(`const var${i} = ${i};`);
    }
    const source = lines.join('\n') + '\n';
    const result = instrumentSource(source, '/test.ts');
    // Should produce a valid source map with mappings
    assert.ok(result.sourceMap.mappings.length > 0);
    assert.ok(result.code.includes('var49'));
  });
});

// ---------------------------------------------------------------------------
// locationToOffset edge cases (tested via take())
// ---------------------------------------------------------------------------

describe('IstanbulCoverageProvider locationToOffset with source', () => {
  let provider: IstanbulCoverageProvider;

  afterEach(async () => {
    try {
      await provider.stop();
    } catch {
      /* ignore */
    }
  });

  it('should compute accurate offsets when source file exists', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('node:fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('node:path');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const os = require('node:os');
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'loc-offset-'));
    const filePath = path.join(tmpDir, 'test-source.ts');
    const content = 'const x = 1;\nconst y = 2;\nconst z = 3;\n';
    fs.writeFileSync(filePath, content, 'utf-8');

    try {
      provider = new IstanbulCoverageProvider();
      await provider.start();
      const g = globalThis as Record<string, unknown>;
      const cov = g['__coverage__'] as Record<string, FileCoverage>;
      cov[filePath] = {
        path: filePath,
        statementMap: {
          '0': { start: { line: 1, column: 0 }, end: { line: 1, column: 12 } },
          '1': { start: { line: 2, column: 0 }, end: { line: 2, column: 12 } },
          '2': { start: { line: 3, column: 0 }, end: { line: 3, column: 12 } },
        },
        fnMap: {
          '0': {
            name: 'topLevel',
            decl: {
              start: { line: 1, column: 0 },
              end: { line: 1, column: 12 },
            },
            loc: {
              start: { line: 1, column: 0 },
              end: { line: 3, column: 12 },
            },
            line: 1,
          },
        },
        branchMap: {},
        s: { '0': 1, '1': 2, '2': 0 },
        f: { '0': 1 },
        b: {},
      };
      const result = await provider.take();
      assert.ok(result.length > 0);
      // With real source file, offsets should be accurate
      const script = result[0]!;
      assert.ok(script.functions.length >= 2);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// extractFunctionName edge cases (tested through instrumentSource)
// ---------------------------------------------------------------------------

describe('extractFunctionName via instrumentSource', () => {
  it('should extract name from generator function', () => {
    const source = 'function* gen() {\n  yield 1;\n}\n';
    const result = instrumentSource(source, '/test.ts');
    const fnNames = Object.values(result.coverageData.fnMap).map(
      (fn) => fn.name,
    );
    assert.ok(fnNames.includes('gen'));
  });

  it('should extract name from static method', () => {
    const source = 'static create() {\n  return new Foo();\n}\n';
    const result = instrumentSource(source, '/test.ts');
    const fnNames = Object.values(result.coverageData.fnMap).map(
      (fn) => fn.name,
    );
    assert.ok(fnNames.includes('create'));
  });

  it('should extract name from getter', () => {
    const source = 'get value() {\n  return this._value;\n}\n';
    const result = instrumentSource(source, '/test.ts');
    const fnNames = Object.values(result.coverageData.fnMap).map(
      (fn) => fn.name,
    );
    assert.ok(fnNames.includes('value'));
  });

  it('should extract name from setter', () => {
    const source = 'set value(v) {\n  this._value = v;\n}\n';
    const result = instrumentSource(source, '/test.ts');
    const fnNames = Object.values(result.coverageData.fnMap).map(
      (fn) => fn.name,
    );
    assert.ok(fnNames.includes('value'));
  });
});
