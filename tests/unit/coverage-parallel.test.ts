/**
 * Tests for coverage parallel processing (Feature #170).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  processV8CoverageBatched,
  processV8CoverageBatchedAsync,
} from '../../src/coverage/index.js';
import { mergeConfig } from '../../src/coverage/config.js';

// Helper types matching V8 coverage structures
interface V8CoverageRange {
  startOffset: number;
  endOffset: number;
  count: number;
}

interface V8FunctionCoverage {
  functionName: string;
  ranges: V8CoverageRange[];
  isBlockCoverage: boolean;
}

interface V8ScriptCoverage {
  scriptId: string;
  url: string;
  functions: V8FunctionCoverage[];
}

const cwd = process.cwd();

function makeScript(name: string, fnName: string): V8ScriptCoverage {
  // Use paths under cwd/src/ so they pass the include filter
  return {
    scriptId: '1',
    url: `file://${cwd}/src/${name}`,
    functions: [
      {
        functionName: fnName,
        ranges: [{ startOffset: 0, endOffset: 100, count: 1 }],
        isBlockCoverage: false,
      },
    ],
  };
}

describe('Coverage parallel processing (Feature #170)', () => {
  it('async results match sync for same input', async () => {
    const scripts: V8ScriptCoverage[] = [
      makeScript('parallel-a.ts', 'funcA'),
      makeScript('parallel-b.ts', 'funcB'),
    ];
    const config = mergeConfig({
      include: ['**/*.ts'],
      exclude: [],
    });

    const syncResult = processV8CoverageBatched(scripts, config);
    const asyncResult = await processV8CoverageBatchedAsync(scripts, config);

    assert.strictEqual(syncResult.size, asyncResult.size);
    for (const [key, syncFc] of syncResult) {
      const asyncFc = asyncResult.get(key);
      assert.ok(asyncFc, `Missing key in async result: ${key}`);
      assert.strictEqual(syncFc.path, asyncFc.path);
      assert.deepStrictEqual(
        Object.keys(syncFc.fnMap),
        Object.keys(asyncFc.fnMap),
      );
    }
  });

  it('concurrency=1 gives same results as sync version', async () => {
    const scripts: V8ScriptCoverage[] = [makeScript('parallel-c.ts', 'funcC')];
    const config = mergeConfig({
      include: ['**/*.ts'],
      exclude: [],
      processingConcurrency: 1,
    });

    const syncResult = processV8CoverageBatched(scripts, config);
    const asyncResult = await processV8CoverageBatchedAsync(scripts, config);

    assert.strictEqual(syncResult.size, asyncResult.size);
    for (const [key] of syncResult) {
      assert.ok(asyncResult.has(key));
    }
  });

  it('concurrency=4 processes batches', async () => {
    const scripts: V8ScriptCoverage[] = [];
    for (let i = 0; i < 8; i++) {
      scripts.push(makeScript(`parallel-file${i}.ts`, `func${i}`));
    }
    const config = mergeConfig({
      include: ['**/*.ts'],
      exclude: [],
      processingConcurrency: 4,
    });

    const result = await processV8CoverageBatchedAsync(scripts, config);
    // All 8 scripts should be processed (they have valid file:// URLs and match include)
    assert.strictEqual(result.size, 8);
    for (let i = 0; i < 8; i++) {
      assert.ok(result.has(`${cwd}/src/parallel-file${i}.ts`));
    }
  });

  it('empty input returns empty map', async () => {
    const config = mergeConfig({
      include: ['**/*.ts'],
      exclude: [],
    });

    const result = await processV8CoverageBatchedAsync([], config);
    assert.strictEqual(result.size, 0);
  });

  it('filters out non-file:// URLs', async () => {
    const scripts: V8ScriptCoverage[] = [
      {
        scriptId: '1',
        url: 'https://example.com/script.js',
        functions: [
          {
            functionName: 'remoteFunc',
            ranges: [{ startOffset: 0, endOffset: 100, count: 1 }],
            isBlockCoverage: false,
          },
        ],
      },
      makeScript('parallel-local.ts', 'localFunc'),
    ];
    const config = mergeConfig({
      include: ['**/*.ts'],
      exclude: [],
      processingConcurrency: 2,
    });

    const result = await processV8CoverageBatchedAsync(scripts, config);
    assert.strictEqual(result.size, 1);
    assert.ok(result.has(`${cwd}/src/parallel-local.ts`));
  });

  it('processV8CoverageBatchedAsync is exported as a function', () => {
    assert.strictEqual(typeof processV8CoverageBatchedAsync, 'function');
  });
});
