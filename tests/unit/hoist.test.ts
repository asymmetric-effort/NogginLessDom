import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hoistMocks } from '../../src/hoist/index.js';

describe('hoistMocks', () => {
  it('hoists mock.module() above import declarations', () => {
    const input = [
      "import { describe, it } from 'node:test';",
      "import { fn, mock } from '@asymmetric-effort/nogginlessdom';",
      '',
      "mock.module('./db', () => ({ query: fn() }));",
      '',
      "describe('test', () => {});",
    ].join('\n');

    const result = hoistMocks(input);
    assert.equal(result.hoisted, true);

    const lines = result.code.split('\n');
    const mockIdx = lines.findIndex((l) => l.includes("mock.module('./db'"));
    const importIdx = lines.findIndex((l) => l.startsWith('import'));
    assert.ok(
      mockIdx < importIdx,
      `mock (line ${mockIdx}) should be before first import (line ${importIdx})`,
    );
  });

  it('hoists vi.mock() above imports', () => {
    const input = [
      "import { test } from 'node:test';",
      "import { vi } from '@asymmetric-effort/nogginlessdom';",
      '',
      "vi.mock('./api');",
    ].join('\n');

    const result = hoistMocks(input);
    assert.equal(result.hoisted, true);

    const lines = result.code.split('\n');
    const mockLine = lines.findIndex((l) => l.includes('vi.mock'));
    const importLine = lines.findIndex((l) => l.startsWith('import'));
    assert.ok(mockLine < importLine);
  });

  it('hoists mock.modulePartial() above imports', () => {
    const input = [
      "import { describe } from 'node:test';",
      "import { mock } from '@asymmetric-effort/nogginlessdom';",
      '',
      "mock.modulePartial('./service', () => ({ save: () => true }));",
    ].join('\n');

    const result = hoistMocks(input);
    assert.equal(result.hoisted, true);

    const lines = result.code.split('\n');
    const mockLine = lines.findIndex((l) => l.includes('mock.modulePartial'));
    const importLine = lines.findIndex((l) => l.startsWith('import'));
    assert.ok(mockLine < importLine);
  });

  it('hoists vi.hoisted() above imports', () => {
    const input = [
      "import { describe } from 'node:test';",
      "import { vi } from '@asymmetric-effort/nogginlessdom';",
      '',
      'const mocked = vi.hoisted(() => ({ x: 1 }));',
    ].join('\n');

    const result = hoistMocks(input);
    assert.equal(result.hoisted, true);

    const lines = result.code.split('\n');
    const hoistedLine = lines.findIndex((l) => l.includes('vi.hoisted'));
    const importLine = lines.findIndex((l) => l.startsWith('import'));
    assert.ok(hoistedLine < importLine);
  });

  it('does not modify code when mocks are already above imports', () => {
    const input = [
      "mock.module('./db', () => ({ query: () => [] }));",
      "import { describe } from 'node:test';",
      "import { mock } from '@asymmetric-effort/nogginlessdom';",
      '',
      "describe('test', () => {});",
    ].join('\n');

    const result = hoistMocks(input);
    assert.equal(result.hoisted, false);
    assert.equal(result.code, input);
  });

  it('does not modify code with no mock calls', () => {
    const input = [
      "import { describe, it } from 'node:test';",
      "import assert from 'node:assert';",
      '',
      "describe('suite', () => {",
      "  it('works', () => { assert.ok(true); });",
      '});',
    ].join('\n');

    const result = hoistMocks(input);
    assert.equal(result.hoisted, false);
    assert.equal(result.code, input);
  });

  it('does not hoist mock calls inside describe/it blocks (brace depth > 0)', () => {
    const input = [
      "import { describe, it } from 'node:test';",
      "import { mock, fn } from '@asymmetric-effort/nogginlessdom';",
      '',
      "describe('suite', () => {",
      "  mock.module('./db', () => ({ query: fn() }));",
      "  it('works', () => {});",
      '});',
    ].join('\n');

    const result = hoistMocks(input);
    assert.equal(result.hoisted, false);
    assert.equal(result.code, input);
  });

  it('handles multi-line mock.module() calls with factory functions', () => {
    const input = [
      "import { describe } from 'node:test';",
      "import { fn, mock } from '@asymmetric-effort/nogginlessdom';",
      '',
      "mock.module('./db', () => ({",
      '  query: fn(),',
      '  insert: fn(),',
      '}));',
      '',
      "describe('test', () => {});",
    ].join('\n');

    const result = hoistMocks(input);
    assert.equal(result.hoisted, true);

    // The mock block should appear before imports
    const code = result.code;
    const mockPos = code.indexOf("mock.module('./db'");
    const importPos = code.indexOf('import ');
    assert.ok(mockPos < importPos, 'multi-line mock should be before imports');
    // Make sure the full multi-line content is preserved
    assert.ok(code.includes('query: fn()'));
    assert.ok(code.includes('insert: fn()'));
  });

  it('preserves import order', () => {
    const input = [
      "import { describe } from 'node:test';",
      "import assert from 'node:assert';",
      "import { fn, mock } from '@asymmetric-effort/nogginlessdom';",
      '',
      "mock.module('./x', () => ({}));",
    ].join('\n');

    const result = hoistMocks(input);
    assert.equal(result.hoisted, true);

    const lines = result.code.split('\n');
    const importLines = lines.filter((l) => l.startsWith('import'));
    assert.equal(importLines[0], "import { describe } from 'node:test';");
    assert.equal(importLines[1], "import assert from 'node:assert';");
    assert.equal(
      importLines[2],
      "import { fn, mock } from '@asymmetric-effort/nogginlessdom';",
    );
  });

  it('preserves non-mock non-import code order', () => {
    const input = [
      "import { describe, it } from 'node:test';",
      "import { fn, mock } from '@asymmetric-effort/nogginlessdom';",
      '',
      "mock.module('./db', () => ({ query: fn() }));",
      '',
      'const x = 1;',
      'const y = 2;',
      '',
      "describe('test', () => {});",
    ].join('\n');

    const result = hoistMocks(input);
    assert.equal(result.hoisted, true);

    const code = result.code;
    const xPos = code.indexOf('const x = 1');
    const yPos = code.indexOf('const y = 2');
    assert.ok(xPos < yPos, 'non-mock code order should be preserved');
  });

  it('handles mixed: some mocks above imports, some below', () => {
    const input = [
      "mock.module('./already-above', () => ({}));",
      "import { describe } from 'node:test';",
      "import { fn, mock } from '@asymmetric-effort/nogginlessdom';",
      '',
      "mock.module('./below', () => ({ x: fn() }));",
    ].join('\n');

    const result = hoistMocks(input);
    assert.equal(result.hoisted, true);

    const code = result.code;
    // The already-above mock should stay where it was
    const alreadyPos = code.indexOf("mock.module('./already-above'");
    // The below mock should now be above imports
    const belowPos = code.indexOf("mock.module('./below'");
    const importPos = code.indexOf('import ');

    assert.ok(alreadyPos < importPos, 'pre-existing mock stays above');
    assert.ok(belowPos < importPos, 'moved mock is now above imports');
  });

  it('handles TypeScript import type declarations', () => {
    const input = [
      "import type { User } from './types';",
      "import { fn, mock } from '@asymmetric-effort/nogginlessdom';",
      '',
      "mock.module('./db', () => ({ getUser: fn() }));",
    ].join('\n');

    const result = hoistMocks(input);
    assert.equal(result.hoisted, true);

    const lines = result.code.split('\n');
    const mockLine = lines.findIndex((l) => l.includes("mock.module('./db'"));
    const typeImportLine = lines.findIndex((l) => l.includes('import type'));
    assert.ok(mockLine < typeImportLine);
  });

  it('handles side-effect imports', () => {
    const input = [
      "import './setup';",
      "import { fn, mock } from '@asymmetric-effort/nogginlessdom';",
      '',
      "mock.module('./db', () => ({ query: fn() }));",
    ].join('\n');

    const result = hoistMocks(input);
    assert.equal(result.hoisted, true);

    const code = result.code;
    const mockPos = code.indexOf("mock.module('./db'");
    const sideEffectPos = code.indexOf("import './setup'");
    assert.ok(mockPos < sideEffectPos);
  });

  it('returns hoisted: true when transform applied, false otherwise', () => {
    const needsHoist = [
      "import { fn, mock } from '@asymmetric-effort/nogginlessdom';",
      "mock.module('./x', () => ({}));",
    ].join('\n');

    const noHoist = 'const x = 1;\nconst y = 2;\n';

    assert.equal(hoistMocks(needsHoist).hoisted, true);
    assert.equal(hoistMocks(noHoist).hoisted, false);
  });

  it('hoists multiple mock calls', () => {
    const input = [
      "import { describe, it } from 'node:test';",
      "import { fn, mock } from '@asymmetric-effort/nogginlessdom';",
      '',
      "mock.module('./db', () => ({ query: fn() }));",
      "mock.module('./cache', () => ({ get: fn(), set: fn() }));",
      '',
      "describe('users', () => {});",
    ].join('\n');

    const result = hoistMocks(input);
    assert.equal(result.hoisted, true);

    const code = result.code;
    const dbPos = code.indexOf("mock.module('./db'");
    const cachePos = code.indexOf("mock.module('./cache'");
    const importPos = code.indexOf('import ');

    assert.ok(dbPos < importPos, 'first mock should be above imports');
    assert.ok(cachePos < importPos, 'second mock should be above imports');
  });

  it('matches the expected output from the spec example', () => {
    const input = [
      "import { describe, it } from 'node:test';",
      "import { getUsers } from './user-service';",
      "import { fn, mock } from '@asymmetric-effort/nogginlessdom';",
      '',
      "mock.module('./db', () => ({ query: fn() }));",
      "mock.module('./cache', () => ({ get: fn(), set: fn() }));",
      '',
      "describe('users', () => { });",
    ].join('\n');

    const expected = [
      "mock.module('./db', () => ({ query: fn() }));",
      "mock.module('./cache', () => ({ get: fn(), set: fn() }));",
      "import { describe, it } from 'node:test';",
      "import { getUsers } from './user-service';",
      "import { fn, mock } from '@asymmetric-effort/nogginlessdom';",
      '',
      "describe('users', () => { });",
    ].join('\n');

    const result = hoistMocks(input);
    assert.equal(result.hoisted, true);
    assert.equal(result.code, expected);
  });

  it('handles source with no imports at all', () => {
    const input = [
      'const x = 1;',
      "mock.module('./db', () => ({}));",
      'const y = 2;',
    ].join('\n');

    const result = hoistMocks(input);
    assert.equal(result.hoisted, false);
    assert.equal(result.code, input);
  });

  it('handles mock call with string containing parentheses', () => {
    const input = [
      "import { fn, mock } from '@asymmetric-effort/nogginlessdom';",
      '',
      "mock.module('./db', () => ({ msg: 'hello (world)' }));",
    ].join('\n');

    const result = hoistMocks(input);
    assert.equal(result.hoisted, true);
    assert.ok(result.code.includes("msg: 'hello (world)'"));
  });

  it('handles empty source', () => {
    const result = hoistMocks('');
    assert.equal(result.hoisted, false);
    assert.equal(result.code, '');
  });

  it('accepts an optional filename parameter', () => {
    const input = [
      "import { fn, mock } from '@asymmetric-effort/nogginlessdom';",
      "mock.module('./x', () => ({}));",
    ].join('\n');

    const result = hoistMocks(input, 'test.ts');
    assert.equal(result.hoisted, true);
  });

  it('does not hoist mock calls that are only partially matched', () => {
    const input = [
      "import { describe } from 'node:test';",
      '',
      "const result = somemodule('./x');",
      "notmock.module('./y', () => ({}));",
    ].join('\n');

    const result = hoistMocks(input);
    assert.equal(result.hoisted, false);
    assert.equal(result.code, input);
  });

  it('handles mock calls with template literals', () => {
    const input = [
      "import { fn, mock } from '@asymmetric-effort/nogginlessdom';",
      '',
      'mock.module(`./db`, () => ({ query: fn() }));',
    ].join('\n');

    const result = hoistMocks(input);
    assert.equal(result.hoisted, true);
    assert.ok(result.code.includes('mock.module(`./db`'));
  });

  it('handles comments between imports and mocks', () => {
    const input = [
      "import { describe } from 'node:test';",
      "import { fn, mock } from '@asymmetric-effort/nogginlessdom';",
      '',
      '// Setup mocks',
      "mock.module('./db', () => ({ query: fn() }));",
    ].join('\n');

    const result = hoistMocks(input);
    assert.equal(result.hoisted, true);

    const code = result.code;
    const mockPos = code.indexOf("mock.module('./db'");
    const importPos = code.indexOf('import ');
    assert.ok(mockPos < importPos);
    // The comment should remain in its position relative to remaining code
    assert.ok(code.includes('// Setup mocks'));
  });

  it('handles vi.mock with no factory argument', () => {
    const input = [
      "import { vi } from '@asymmetric-effort/nogginlessdom';",
      '',
      "vi.mock('./db');",
    ].join('\n');

    const result = hoistMocks(input);
    assert.equal(result.hoisted, true);

    const code = result.code;
    const mockPos = code.indexOf("vi.mock('./db')");
    const importPos = code.indexOf('import ');
    assert.ok(mockPos < importPos);
  });

  it('preserves trailing content after last mock', () => {
    const input = [
      "import { fn, mock } from '@asymmetric-effort/nogginlessdom';",
      '',
      "mock.module('./db', () => ({ query: fn() }));",
      '',
      'const setup = true;',
      '// end of file',
    ].join('\n');

    const result = hoistMocks(input);
    assert.equal(result.hoisted, true);
    assert.ok(result.code.includes('const setup = true;'));
    assert.ok(result.code.includes('// end of file'));
  });

  it('handles escaped characters inside string arguments', () => {
    const input = [
      "import { fn, mock } from '@asymmetric-effort/nogginlessdom';",
      '',
      "mock.module('./db', () => ({ path: 'C:\\\\Users\\\\test' }));",
    ].join('\n');

    const result = hoistMocks(input);
    assert.equal(result.hoisted, true);
    assert.ok(result.code.includes("'C:\\\\Users\\\\test'"));
  });

  it('handles template literal with expressions in mock factory', () => {
    const input = [
      "import { fn, mock } from '@asymmetric-effort/nogginlessdom';",
      '',
      'mock.module(`./db`, () => ({ url: `http://${host}:${port}` }));',
    ].join('\n');

    const result = hoistMocks(input);
    assert.equal(result.hoisted, true);
    assert.ok(result.code.includes('`http://${host}:${port}`'));
  });

  it('handles mock call with trailing whitespace before semicolon', () => {
    const input = [
      "import { fn, mock } from '@asymmetric-effort/nogginlessdom';",
      '',
      "mock.module('./db', () => ({ query: fn() })) ;",
    ].join('\n');

    const result = hoistMocks(input);
    assert.equal(result.hoisted, true);
    const mockPos = result.code.indexOf("mock.module('./db'");
    const importPos = result.code.indexOf('import ');
    assert.ok(mockPos < importPos);
  });

  it('handles unbalanced parentheses gracefully', () => {
    const input = [
      "import { fn, mock } from '@asymmetric-effort/nogginlessdom';",
      '',
      "mock.module('./db', () => ({",
    ].join('\n');

    const result = hoistMocks(input);
    // It should still hoist even if parens are unbalanced (fallback to end of source)
    assert.equal(result.hoisted, true);
  });

  it('handles escaped quotes inside strings in braceDepthAt context', () => {
    // This tests that braceDepthAt correctly handles escaped characters
    // The mock is after a line with escaped backslash in a string literal containing braces
    const input = [
      "import { fn, mock } from '@asymmetric-effort/nogginlessdom';",
      "const x = 'test\\\\';",
      "mock.module('./db', () => ({ query: fn() }));",
    ].join('\n');

    const result = hoistMocks(input);
    assert.equal(result.hoisted, true);
  });

  it('handles mock with let and var assignments', () => {
    const input = [
      "import { vi } from '@asymmetric-effort/nogginlessdom';",
      '',
      'let mocked = vi.hoisted(() => ({ x: 1 }));',
    ].join('\n');

    const result = hoistMocks(input);
    assert.equal(result.hoisted, true);

    const lines = result.code.split('\n');
    const hoistedLine = lines.findIndex((l) => l.includes('vi.hoisted'));
    const importLine = lines.findIndex((l) => l.startsWith('import'));
    assert.ok(hoistedLine < importLine);
  });
});
