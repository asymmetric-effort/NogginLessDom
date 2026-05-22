import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  findIgnoreRanges,
  applyIgnoreRanges,
  type IgnoreRange,
} from '../../src/coverage/ignore.js';
import type { FileCoverage } from '../../src/coverage/reporters/types.js';

describe('findIgnoreRanges', () => {
  describe('v8 ignore directives', () => {
    it('should parse v8 ignore next', () => {
      const source = `line1
/* v8 ignore next */
line3
line4`;
      const ranges = findIgnoreRanges(source);
      assert.equal(ranges.length, 1);
      assert.equal(ranges[0]!.startLine, 3);
      assert.equal(ranges[0]!.endLine, 3);
      assert.equal(ranges[0]!.type, 'line');
    });

    it('should parse v8 ignore start/stop', () => {
      const source = `line1
/* v8 ignore start */
line3
line4
/* v8 ignore stop */
line6`;
      const ranges = findIgnoreRanges(source);
      assert.equal(ranges.length, 1);
      assert.equal(ranges[0]!.startLine, 2);
      assert.equal(ranges[0]!.endLine, 5);
      assert.equal(ranges[0]!.type, 'block');
    });
  });

  describe('istanbul ignore directives', () => {
    it('should parse istanbul ignore next', () => {
      const source = `line1
/* istanbul ignore next */
line3`;
      const ranges = findIgnoreRanges(source);
      assert.equal(ranges.length, 1);
      assert.equal(ranges[0]!.startLine, 3);
      assert.equal(ranges[0]!.endLine, 3);
      assert.equal(ranges[0]!.type, 'line');
    });

    it('should parse istanbul ignore if', () => {
      const source = `line1
/* istanbul ignore if */
line3`;
      const ranges = findIgnoreRanges(source);
      assert.equal(ranges.length, 1);
      assert.equal(ranges[0]!.startLine, 3);
      assert.equal(ranges[0]!.endLine, 3);
      assert.equal(ranges[0]!.type, 'ignore_if');
    });

    it('should parse istanbul ignore else', () => {
      const source = `line1
/* istanbul ignore else */
line3`;
      const ranges = findIgnoreRanges(source);
      assert.equal(ranges.length, 1);
      assert.equal(ranges[0]!.startLine, 3);
      assert.equal(ranges[0]!.endLine, 3);
      assert.equal(ranges[0]!.type, 'ignore_else');
    });

    it('should parse istanbul ignore file', () => {
      const source = `/* istanbul ignore file */
line2
line3`;
      const ranges = findIgnoreRanges(source);
      assert.equal(ranges.length, 1);
      assert.equal(ranges[0]!.type, 'file');
    });
  });

  describe('c8 ignore directives', () => {
    it('should parse c8 ignore next', () => {
      const source = `line1
/* c8 ignore next */
line3`;
      const ranges = findIgnoreRanges(source);
      assert.equal(ranges.length, 1);
      assert.equal(ranges[0]!.startLine, 3);
      assert.equal(ranges[0]!.endLine, 3);
      assert.equal(ranges[0]!.type, 'line');
    });

    it('should parse c8 ignore start/stop', () => {
      const source = `line1
/* c8 ignore start */
line3
line4
/* c8 ignore stop */
line6`;
      const ranges = findIgnoreRanges(source);
      assert.equal(ranges.length, 1);
      assert.equal(ranges[0]!.startLine, 2);
      assert.equal(ranges[0]!.endLine, 5);
      assert.equal(ranges[0]!.type, 'block');
    });
  });

  describe('istanbul ignore class', () => {
    it('should ignore an entire class', () => {
      const source = `line1
/* istanbul ignore class */
class Foo {
  bar() {}
}
line6`;
      const ranges = findIgnoreRanges(source);
      assert.equal(ranges.length, 1);
      assert.equal(ranges[0]!.startLine, 3);
      assert.equal(ranges[0]!.endLine, 5);
      assert.equal(ranges[0]!.type, 'class');
    });

    it('should parse reason on class directive', () => {
      const source = `line1
/* istanbul ignore class -- legacy code */
class Foo {
  bar() {}
}
line6`;
      const ranges = findIgnoreRanges(source);
      assert.equal(ranges.length, 1);
      assert.equal(ranges[0]!.type, 'class');
      assert.equal(ranges[0]!.reason, 'legacy code');
    });
  });

  describe('reason strings', () => {
    it('should parse reason from istanbul ignore next', () => {
      const source = `line1
/* istanbul ignore next -- reason text */
line3`;
      const ranges = findIgnoreRanges(source);
      assert.equal(ranges.length, 1);
      assert.equal(ranges[0]!.reason, 'reason text');
    });

    it('should parse reason from v8 ignore next', () => {
      const source = `line1
/* v8 ignore next -- hard to test */
line3`;
      const ranges = findIgnoreRanges(source);
      assert.equal(ranges.length, 1);
      assert.equal(ranges[0]!.reason, 'hard to test');
    });

    it('should have no reason when none provided', () => {
      const source = `line1
/* istanbul ignore next */
line3`;
      const ranges = findIgnoreRanges(source);
      assert.equal(ranges.length, 1);
      assert.equal(ranges[0]!.reason, undefined);
    });
  });

  describe('v8 ignore next N', () => {
    it('should ignore next N lines', () => {
      const source = `line1
/* v8 ignore next 3 */
line3
line4
line5
line6`;
      const ranges = findIgnoreRanges(source);
      assert.equal(ranges.length, 1);
      assert.equal(ranges[0]!.startLine, 3);
      assert.equal(ranges[0]!.endLine, 5);
      assert.equal(ranges[0]!.type, 'line');
    });

    it('should parse reason on v8 ignore next N', () => {
      const source = `line1
/* v8 ignore next 2 -- platform specific */
line3
line4
line5`;
      const ranges = findIgnoreRanges(source);
      assert.equal(ranges.length, 1);
      assert.equal(ranges[0]!.startLine, 3);
      assert.equal(ranges[0]!.endLine, 4);
      assert.equal(ranges[0]!.reason, 'platform specific');
    });

    it('should clamp to end of file', () => {
      const source = `line1
/* v8 ignore next 10 */
line3`;
      const ranges = findIgnoreRanges(source);
      assert.equal(ranges.length, 1);
      assert.equal(ranges[0]!.startLine, 3);
      assert.equal(ranges[0]!.endLine, 3);
    });
  });

  describe('multiple directives', () => {
    it('should handle multiple ignore next directives', () => {
      const source = `line1
/* v8 ignore next */
line3
line4
/* c8 ignore next */
line6`;
      const ranges = findIgnoreRanges(source);
      assert.equal(ranges.length, 2);
      assert.equal(ranges[0]!.startLine, 3);
      assert.equal(ranges[1]!.startLine, 6);
    });

    it('should handle unclosed start block gracefully', () => {
      const source = `line1
/* v8 ignore start */
line3
line4`;
      const ranges = findIgnoreRanges(source);
      // Unclosed block should extend to end of file
      assert.equal(ranges.length, 1);
      assert.equal(ranges[0]!.startLine, 2);
      assert.equal(ranges[0]!.endLine, 4);
      assert.equal(ranges[0]!.type, 'block');
    });
  });
});

describe('applyIgnoreRanges', () => {
  function makeFileCoverage(): FileCoverage {
    return {
      path: '/test/file.ts',
      statementMap: {
        '0': { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
        '1': { start: { line: 3, column: 0 }, end: { line: 3, column: 10 } },
        '2': { start: { line: 5, column: 0 }, end: { line: 5, column: 10 } },
      },
      fnMap: {
        '0': {
          name: 'foo',
          decl: { start: { line: 1, column: 0 }, end: { line: 1, column: 5 } },
          loc: { start: { line: 1, column: 0 }, end: { line: 2, column: 1 } },
          line: 1,
        },
        '1': {
          name: 'bar',
          decl: { start: { line: 3, column: 0 }, end: { line: 3, column: 5 } },
          loc: { start: { line: 3, column: 0 }, end: { line: 4, column: 1 } },
          line: 3,
        },
      },
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
      s: { '0': 1, '1': 1, '2': 0 },
      f: { '0': 1, '1': 0 },
      b: { '0': [1, 0] },
    };
  }

  it('should zero out statement counts in ignored ranges', () => {
    const fc = makeFileCoverage();
    const ranges: IgnoreRange[] = [{ startLine: 3, endLine: 3, type: 'line' }];
    const result = applyIgnoreRanges(fc, ranges);
    assert.equal(result.s['0'], 1); // line 1, not ignored
    assert.equal(result.s['1'], 0); // line 3, ignored - zeroed
    assert.equal(result.s['2'], 0); // line 5, not in range
  });

  it('should zero out function counts in ignored ranges', () => {
    const fc = makeFileCoverage();
    const ranges: IgnoreRange[] = [{ startLine: 3, endLine: 4, type: 'block' }];
    const result = applyIgnoreRanges(fc, ranges);
    assert.equal(result.f['0'], 1); // line 1, not ignored
    assert.equal(result.f['1'], 0); // line 3, ignored
  });

  it('should zero out branch counts in ignored ranges', () => {
    const fc = makeFileCoverage();
    const ranges: IgnoreRange[] = [{ startLine: 3, endLine: 3, type: 'line' }];
    const result = applyIgnoreRanges(fc, ranges);
    // Branch on line 3: first location (line 3) zeroed, second location (line 5) kept
    assert.equal(result.b['0']![0], 0);
    assert.equal(result.b['0']![1], 0); // was already 0
  });

  it('should handle file-level ignore by zeroing everything', () => {
    const fc = makeFileCoverage();
    const ranges: IgnoreRange[] = [{ startLine: 1, endLine: 5, type: 'file' }];
    const result = applyIgnoreRanges(fc, ranges);
    assert.equal(result.s['0'], 0);
    assert.equal(result.s['1'], 0);
    assert.equal(result.s['2'], 0);
    assert.equal(result.f['0'], 0);
    assert.equal(result.f['1'], 0);
  });

  it('should not mutate the original FileCoverage', () => {
    const fc = makeFileCoverage();
    const ranges: IgnoreRange[] = [{ startLine: 1, endLine: 5, type: 'file' }];
    applyIgnoreRanges(fc, ranges);
    assert.equal(fc.s['0'], 1); // original unchanged
    assert.equal(fc.f['0'], 1);
  });

  it('should return unchanged coverage when no ranges', () => {
    const fc = makeFileCoverage();
    const result = applyIgnoreRanges(fc, []);
    assert.deepEqual(result.s, fc.s);
    assert.deepEqual(result.f, fc.f);
  });
});
