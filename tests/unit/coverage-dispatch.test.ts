import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

import { reportCoverage } from '../../src/coverage/index.js';
import {
  CoverageMap,
  createCoverageMap,
} from '../../src/coverage/coverage-map.js';
import type { FileCoverage } from '../../src/coverage/coverage-map.js';

function makeDummyFileCoverage(filePath: string): FileCoverage {
  return {
    path: filePath,
    statementMap: {
      '0': { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
    },
    fnMap: {
      '0': {
        name: 'foo',
        decl: { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
        loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
        line: 1,
      },
    },
    branchMap: {},
    s: { '0': 1 },
    f: { '0': 1 },
    b: {},
  };
}

function makeCoverageMap(): CoverageMap {
  const map = createCoverageMap();
  map.addFileCoverage(makeDummyFileCoverage('/tmp/test-file.ts'));
  return map;
}

const TEST_REPORTS_DIR = join(
  process.cwd(),
  'tmp-coverage-dispatch-test-' + process.pid,
);

describe('Coverage dispatch (reportCoverage)', () => {
  beforeEach(() => {
    // Clean up any leftover test directories
    rmSync(TEST_REPORTS_DIR, { recursive: true, force: true });
  });

  afterEach(() => {
    rmSync(TEST_REPORTS_DIR, { recursive: true, force: true });
  });

  it("reportCoverage with 'text' reporter doesn't throw", async () => {
    const map = makeCoverageMap();
    await assert.doesNotReject(reportCoverage(map, { reporter: ['text'] }));
  });

  it("reportCoverage with 'json' reporter creates file", async () => {
    const map = makeCoverageMap();
    await reportCoverage(map, {
      reporter: ['json'],
      reportsDirectory: TEST_REPORTS_DIR,
    });
    const outputFile = join(TEST_REPORTS_DIR, 'coverage-final.json');
    assert.ok(existsSync(outputFile), 'Expected coverage-final.json to exist');
  });

  it('reportCoverage with multiple reporters runs all', async () => {
    const map = makeCoverageMap();
    await reportCoverage(map, {
      reporter: ['text', 'json'],
      reportsDirectory: TEST_REPORTS_DIR,
    });
    // json reporter should have written the file
    const outputFile = join(TEST_REPORTS_DIR, 'coverage-final.json');
    assert.ok(
      existsSync(outputFile),
      'Expected coverage-final.json from json reporter',
    );
    // text reporter runs without error (already verified by no exception)
  });

  it("reportCoverage with 'none' reporter does nothing", async () => {
    const map = makeCoverageMap();
    await reportCoverage(map, {
      reporter: ['none'],
      reportsDirectory: TEST_REPORTS_DIR,
    });
    // none reporter should not create any files
    assert.ok(
      !existsSync(TEST_REPORTS_DIR),
      'Expected no reports directory to be created for none reporter',
    );
  });
});
