import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

import {
  createTextSummaryReporter,
  createLcovOnlyReporter,
  createTeamcityReporter,
  createHtmlReporter,
  createNoneReporter,
  getReporterFactory,
  TextSummaryReporter,
  TeamcityReporter,
} from '../../src/coverage/reporters/index.js';

import type { ReporterOptions } from '../../src/coverage/reporters/index.js';

import type {
  CoverageMap,
  CoverageSummary,
  FileCoverage,
} from '../../src/coverage/reporters/types.js';

function makeOptions(overrides?: Partial<ReporterOptions>): ReporterOptions {
  return {
    reportsDirectory: '/tmp/test-coverage-extra',
    ...overrides,
  };
}

function makeSummary(): CoverageSummary {
  return {
    lines: { total: 14, covered: 12, skipped: 0, pct: 85.71 },
    statements: { total: 14, covered: 12, skipped: 0, pct: 85.71 },
    functions: { total: 6, covered: 5, skipped: 0, pct: 83.33 },
    branches: { total: 3, covered: 2, skipped: 0, pct: 66.67 },
  };
}

function makeMockCoverageMap(): CoverageMap {
  const fileCoverage: FileCoverage = {
    path: '/test/file.ts',
    statementMap: {
      '0': { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
      '1': { start: { line: 2, column: 0 }, end: { line: 2, column: 10 } },
    },
    fnMap: {
      '0': {
        name: 'foo',
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
          { start: { line: 3, column: 0 }, end: { line: 3, column: 10 } },
        ],
        line: 2,
      },
    },
    s: { '0': 5, '1': 0 },
    f: { '0': 5 },
    b: { '0': [3, 0] },
  };
  const summary = makeSummary();
  return {
    files: () => ['/test/file.ts'],
    fileCoverageFor: (_path: string) => fileCoverage,
    toSummary: () => summary,
    fileSummaryFor: (_path: string) => summary,
  };
}

describe('coverage-reporters-extra: text-summary', () => {
  it('produces the expected one-line format', () => {
    const reporter = createTextSummaryReporter(makeOptions());
    const map = makeMockCoverageMap();
    const summary = makeSummary();

    // Capture stdout
    let output = '';
    const origWrite = process.stdout.write;
    process.stdout.write = (chunk: string | Uint8Array): boolean => {
      output += String(chunk);
      return true;
    };
    try {
      reporter.onEnd(map, summary);
    } finally {
      process.stdout.write = origWrite;
    }

    assert.ok(output.includes('Statements: 85.71%'));
    assert.ok(output.includes('(12/14)'));
    assert.ok(output.includes('Branches: 66.67%'));
    assert.ok(output.includes('(2/3)'));
    assert.ok(output.includes('Functions: 83.33%'));
    assert.ok(output.includes('(5/6)'));
    assert.ok(output.includes('Lines: 85.71%'));
    assert.ok(output.includes('|'));
  });

  it('format returns the summary string', () => {
    const reporter = new TextSummaryReporter(makeOptions());
    const result = reporter.format(makeMockCoverageMap(), makeSummary());
    assert.match(
      result,
      /Statements: \d+\.\d+% \(\d+\/\d+\) \| Branches: \d+\.\d+% \(\d+\/\d+\) \| Functions: \d+\.\d+% \(\d+\/\d+\) \| Lines: \d+\.\d+% \(\d+\/\d+\)/,
    );
  });
});

describe('coverage-reporters-extra: teamcity', () => {
  it('produces teamcity service message format', () => {
    const reporter = createTeamcityReporter(makeOptions());
    const map = makeMockCoverageMap();
    const summary = makeSummary();

    let output = '';
    const origWrite = process.stdout.write;
    process.stdout.write = (chunk: string | Uint8Array): boolean => {
      output += String(chunk);
      return true;
    };
    try {
      reporter.onEnd(map, summary);
    } finally {
      process.stdout.write = origWrite;
    }

    assert.ok(
      output.includes(
        "##teamcity[buildStatisticValue key='CodeCoverageAbsLCovered' value='12']",
      ),
    );
    assert.ok(
      output.includes(
        "##teamcity[buildStatisticValue key='CodeCoverageAbsLTotal' value='14']",
      ),
    );
    assert.ok(
      output.includes(
        "##teamcity[buildStatisticValue key='CodeCoverageAbsBCovered' value='2']",
      ),
    );
    assert.ok(
      output.includes(
        "##teamcity[buildStatisticValue key='CodeCoverageAbsBTotal' value='3']",
      ),
    );
    assert.ok(
      output.includes(
        "##teamcity[buildStatisticValue key='CodeCoverageAbsMCovered' value='5']",
      ),
    );
    assert.ok(
      output.includes(
        "##teamcity[buildStatisticValue key='CodeCoverageAbsMTotal' value='6']",
      ),
    );
    assert.ok(
      output.includes(
        "##teamcity[buildStatisticValue key='CodeCoverageAbsSCovered' value='12']",
      ),
    );
    assert.ok(
      output.includes(
        "##teamcity[buildStatisticValue key='CodeCoverageAbsSTotal' value='14']",
      ),
    );
  });

  it('format returns the teamcity output string', () => {
    const reporter = new TeamcityReporter(makeOptions());
    const result = reporter.format(makeMockCoverageMap(), makeSummary());
    const lines = result.trim().split('\n');
    assert.strictEqual(lines.length, 8);
    for (const line of lines) {
      assert.ok(line.startsWith('##teamcity['));
    }
  });
});

describe('coverage-reporters-extra: none', () => {
  it('does nothing on onEnd', () => {
    const reporter = createNoneReporter(makeOptions());
    assert.ok(reporter);
    assert.strictEqual(typeof reporter.onEnd, 'function');
    // Should not throw
    reporter.onEnd(makeMockCoverageMap(), makeSummary());
  });

  it('has no onStart or onFileProcessed', () => {
    const reporter = createNoneReporter(makeOptions());
    assert.strictEqual(reporter.onStart, undefined);
    assert.strictEqual(reporter.onFileProcessed, undefined);
  });
});

describe('coverage-reporters-extra: lcovonly', () => {
  const lcovDir = '/tmp/test-coverage-lcovonly';

  it('produces lcov.info file only', () => {
    // Clean up
    rmSync(lcovDir, { recursive: true, force: true });

    const reporter = createLcovOnlyReporter(
      makeOptions({ reportsDirectory: lcovDir }),
    );
    reporter.onEnd(makeMockCoverageMap(), makeSummary());

    const lcovPath = join(lcovDir, 'lcov.info');
    assert.ok(existsSync(lcovPath), 'lcov.info should exist');

    const content = readFileSync(lcovPath, 'utf-8');
    assert.ok(content.includes('SF:/test/file.ts'));
    assert.ok(content.includes('end_of_record'));

    // No HTML directory should be created
    assert.ok(
      !existsSync(join(lcovDir, 'html')),
      'should not create html directory',
    );

    // Clean up
    rmSync(lcovDir, { recursive: true, force: true });
  });
});

describe('coverage-reporters-extra: html', () => {
  const htmlDir = '/tmp/test-coverage-html';

  it('generates index.html with summary', () => {
    // Clean up
    rmSync(htmlDir, { recursive: true, force: true });

    const reporter = createHtmlReporter(
      makeOptions({ reportsDirectory: htmlDir }),
    );
    reporter.onEnd(makeMockCoverageMap(), makeSummary());

    const indexPath = join(htmlDir, 'html', 'index.html');
    assert.ok(existsSync(indexPath), 'index.html should exist');

    const content = readFileSync(indexPath, 'utf-8');
    assert.ok(content.includes('Coverage Report'));
    assert.ok(content.includes('Statements'));
    assert.ok(content.includes('Branches'));
    assert.ok(content.includes('Functions'));
    assert.ok(content.includes('Lines'));
    assert.ok(content.includes('/test/file.ts'));

    // Clean up
    rmSync(htmlDir, { recursive: true, force: true });
  });

  it('generates per-file HTML', () => {
    rmSync(htmlDir, { recursive: true, force: true });

    const reporter = createHtmlReporter(
      makeOptions({ reportsDirectory: htmlDir }),
    );
    reporter.onEnd(makeMockCoverageMap(), makeSummary());

    const filePath = join(htmlDir, 'html', 'file.ts.html');
    assert.ok(existsSync(filePath), 'file.ts.html should exist');

    const content = readFileSync(filePath, 'utf-8');
    assert.ok(content.includes('/test/file.ts'));
    assert.ok(content.includes('Back to summary'));

    rmSync(htmlDir, { recursive: true, force: true });
  });

  it('uses correct CSS classes for coverage levels', () => {
    rmSync(htmlDir, { recursive: true, force: true });

    const reporter = createHtmlReporter(
      makeOptions({ reportsDirectory: htmlDir }),
    );
    reporter.onEnd(makeMockCoverageMap(), makeSummary());

    const indexContent = readFileSync(
      join(htmlDir, 'html', 'index.html'),
      'utf-8',
    );
    // 85.71% statements should be "high"
    assert.ok(indexContent.includes('class="high"'));
    // 66.67% branches should be "medium"
    assert.ok(indexContent.includes('class="medium"'));

    rmSync(htmlDir, { recursive: true, force: true });
  });
});

describe('coverage-reporters-extra: factory registration', () => {
  it('text-summary is registered in factory', () => {
    const factory = getReporterFactory('text-summary');
    assert.strictEqual(typeof factory, 'function');
    const reporter = factory(makeOptions());
    assert.strictEqual(typeof reporter.onEnd, 'function');
  });

  it('lcovonly is registered in factory', () => {
    const factory = getReporterFactory('lcovonly');
    assert.strictEqual(typeof factory, 'function');
  });

  it('teamcity is registered in factory', () => {
    const factory = getReporterFactory('teamcity');
    assert.strictEqual(typeof factory, 'function');
  });

  it('html is registered in factory', () => {
    const factory = getReporterFactory('html');
    assert.strictEqual(typeof factory, 'function');
  });

  it('none is registered in factory', () => {
    const factory = getReporterFactory('none');
    assert.strictEqual(typeof factory, 'function');
  });
});
