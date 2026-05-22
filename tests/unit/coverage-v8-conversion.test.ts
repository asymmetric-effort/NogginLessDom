import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  offsetToLocation,
  v8ToIstanbul,
} from '../../src/coverage/v8-to-istanbul.js';
import type { V8FunctionCoverage } from '../../src/coverage/v8-provider.js';

describe('offsetToLocation', () => {
  it('should return line 1 column 0 for offset 0', () => {
    const loc = offsetToLocation('hello\nworld', 0);
    assert.deepStrictEqual(loc, { line: 1, column: 0 });
  });

  it('should track line breaks correctly', () => {
    const source = 'line1\nline2\nline3';
    // offset 6 = first char of line2 (column is 0-based)
    const loc = offsetToLocation(source, 6);
    assert.deepStrictEqual(loc, { line: 2, column: 0 });
  });

  it('should return correct column within a line', () => {
    const source = 'abcdef\nghijkl';
    // offset 3 = 'd' on line 1
    const loc = offsetToLocation(source, 3);
    assert.deepStrictEqual(loc, { line: 1, column: 3 });
  });

  it('should handle offset at newline character', () => {
    const source = 'abc\ndef';
    // offset 3 = the '\n' itself
    const loc = offsetToLocation(source, 3);
    assert.deepStrictEqual(loc, { line: 1, column: 3 });
  });

  it('should handle offset past end of source', () => {
    const source = 'ab';
    const loc = offsetToLocation(source, 100);
    assert.deepStrictEqual(loc, { line: 1, column: 2 });
  });

  it('should handle multiple line breaks', () => {
    const source = 'a\nb\nc\nd';
    // offset 4 = 'c' (line 3, col 0)
    // a(0) \n(1) b(2) \n(3) c(4)
    const loc = offsetToLocation(source, 4);
    assert.deepStrictEqual(loc, { line: 3, column: 0 });
  });
});

describe('v8ToIstanbul produces correct line numbers', () => {
  it('should map function coverage with correct line numbers from source content', () => {
    const source = 'function hello() {\n  return 1;\n}\n';
    // "function hello() {" is at offset 0..18, line 1
    // "  return 1;" is at offset 19..30, line 2
    // "}" is at offset 31..32, line 3
    const v8Coverage: V8FunctionCoverage[] = [
      {
        functionName: 'hello',
        ranges: [{ startOffset: 0, endOffset: 32, count: 1 }],
        isBlockCoverage: false,
      },
    ];

    const result = v8ToIstanbul('/test.ts', source, v8Coverage);

    // Function mapping should have correct lines
    assert.equal(result.fnMap['0']!.name, 'hello');
    assert.equal(result.fnMap['0']!.loc.start.line, 1);
    assert.equal(result.fnMap['0']!.loc.start.column, 0);
    assert.equal(result.fnMap['0']!.loc.end.line, 3);
    assert.equal(result.fnMap['0']!.line, 1);
  });

  it('should produce correct locations for multi-line functions', () => {
    const source = [
      'const x = 1;', // line 1, offset 0-11, len 12, \n at 12
      'function foo() {', // line 2, offset 13-28, len 16, \n at 29
      '  if (true) {', // line 3, offset 30-42, len 13, \n at 43
      '    return 1;', // line 4, offset 44-56, len 13, \n at 57
      '  }', // line 5, offset 58-60, len 3, \n at 61
      '}', // line 6, offset 62
    ].join('\n');

    const v8Coverage: V8FunctionCoverage[] = [
      {
        functionName: 'foo',
        ranges: [
          { startOffset: 13, endOffset: 63, count: 5 }, // entire function
          { startOffset: 30, endOffset: 61, count: 3 }, // if block
        ],
        isBlockCoverage: true,
      },
    ];

    const result = v8ToIstanbul('/multi.ts', source, v8Coverage);

    // Function should start at line 2
    assert.equal(result.fnMap['0']!.loc.start.line, 2);
    assert.equal(result.fnMap['0']!.loc.end.line, 6);
    assert.equal(result.fnMap['0']!.line, 2);

    // Branch (if block) should start at line 3
    assert.ok(result.branchMap['0']);
    assert.equal(result.branchMap['0']!.locations[0]!.start.line, 3);
    assert.equal(result.branchMap['0']!.line, 3);
  });

  it('should handle anonymous functions', () => {
    const source = 'const fn = () => {\n  return 42;\n};\n';
    const v8Coverage: V8FunctionCoverage[] = [
      {
        functionName: '',
        ranges: [{ startOffset: 0, endOffset: 33, count: 1 }],
        isBlockCoverage: false,
      },
    ];

    const result = v8ToIstanbul('/anon.ts', source, v8Coverage);
    assert.equal(result.fnMap['0']!.name, '(anonymous)');
  });

  it('should skip functions with no ranges', () => {
    const source = 'hello world';
    const v8Coverage: V8FunctionCoverage[] = [
      {
        functionName: 'empty',
        ranges: [],
        isBlockCoverage: false,
      },
    ];

    const result = v8ToIstanbul('/empty.ts', source, v8Coverage);
    assert.equal(Object.keys(result.fnMap).length, 0);
    assert.equal(Object.keys(result.statementMap).length, 0);
  });
});
