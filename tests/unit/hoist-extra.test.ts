import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  hoistWithRegex,
  _resetSteamrollerCache,
  hoistWithAST,
  hoistMocks,
} from '../../src/hoist/index.js';

describe('hoist – extra coverage', () => {
  // Cover _resetSteamrollerCache (line 111)
  it('_resetSteamrollerCache resets cache without errors', () => {
    _resetSteamrollerCache();
    // After resetting, hoistWithAST should try to load steamroller again
    // (and fail, returning null in this environment)
    const result = hoistWithAST('const x = 1;');
    // Either returns null or a result, depending on environment
    assert.ok(result === null || typeof result === 'object');
  });

  // Cover lines 300-301, 305-306: escaped characters in findCallEnd
  it('handles escaped characters inside mock call strings', () => {
    const source = [
      "import { foo } from './foo.js';",
      '',
      "mock.module('./bar', () => ({ path: 'C:\\\\Users\\\\test' }));",
    ].join('\n');
    const result = hoistWithRegex(source);
    assert.ok(result.hoisted);
    assert.ok(
      result.code.indexOf('mock.module') < result.code.indexOf('import'),
    );
  });

  // Cover line 313: template backtick closing in findCallEnd
  it('handles template literals inside mock calls', () => {
    const source = [
      "import { foo } from './foo.js';",
      '',
      'mock.module(`./bar`, () => ({ key: `value` }));',
    ].join('\n');
    const result = hoistWithRegex(source);
    assert.ok(result.hoisted);
  });

  // Cover lines 323-324: template literal ${...} in findCallEnd
  it('handles template literal expressions with ${} in mock calls', () => {
    const source = [
      "import { foo } from './foo.js';",
      '',
      'const name = "bar";',
      'mock.module(`./module`, () => ({ key: `hello ${name} world` }));',
    ].join('\n');
    const result = hoistWithRegex(source);
    assert.ok(result.hoisted);
  });

  // Cover lines 337-338: template expression closing } when templateDepth > 0
  it('handles closing } of template expression in findCallEnd', () => {
    const source = [
      "import { foo } from './foo.js';",
      '',
      'mock.module(`./mod`, () => ({ val: `${1 + 2}` }));',
    ].join('\n');
    const result = hoistWithRegex(source);
    assert.ok(result.hoisted);
  });

  // Cover lines 351-352: trailing semicolon with whitespace
  it('handles mock call with trailing whitespace before semicolon', () => {
    const source =
      "import { foo } from './foo.js';\n\nmock.module('./bar', () => ({}))  ;  \n";
    const result = hoistWithRegex(source);
    assert.ok(result.hoisted);
  });

  // Cover lines 379-380, 383-384: escaped chars in braceDepthAt
  it('handles escaped characters in braceDepthAt via nested braces with escapes', () => {
    // Put the mock call inside a context where brace depth > 0 so it is NOT hoisted
    // The escape chars in string literals before it test the escape handling
    const source = [
      "import { foo } from './foo.js';",
      "const s = 'escaped\\\\brace\\{';",
      "if (true) { mock.module('./bar', () => ({})); }",
    ].join('\n');
    const result = hoistWithRegex(source);
    // Mock is inside braces, so it should NOT be hoisted
    assert.strictEqual(result.hoisted, false);
  });

  // Cover line 432: no imports at all
  it('returns unmodified code when no import declarations exist', () => {
    const source = "const x = 1;\nmock.module('./bar', () => ({}));\n";
    const result = hoistWithRegex(source);
    assert.strictEqual(result.hoisted, false);
    assert.strictEqual(result.code, source);
  });

  // Cover line 472: no mock spans found after first import
  it('returns unmodified code when mock calls are all before imports', () => {
    const source = [
      "mock.module('./bar', () => ({}));",
      "import { foo } from './foo.js';",
    ].join('\n');
    const result = hoistWithRegex(source);
    // The mock is already before the import, so no hoisting needed
    assert.strictEqual(result.hoisted, false);
  });

  // Cover lines 494-496: newFirstImportOffset loop
  it('correctly calculates new first import offset after removal', () => {
    const source = [
      '// Some comment at the top',
      '',
      "import { a } from './a.js';",
      "import { b } from './b.js';",
      '',
      "mock.module('./c', () => ({ c: 1 }));",
      '',
      "mock.module('./d', () => ({ d: 2 }));",
    ].join('\n');
    const result = hoistWithRegex(source);
    assert.ok(result.hoisted);
    // Both mock calls should appear before imports
    const mockIdx1 = result.code.indexOf("mock.module('./c'");
    const mockIdx2 = result.code.indexOf("mock.module('./d'");
    const importIdx = result.code.indexOf('import { a }');
    assert.ok(mockIdx1 < importIdx);
    assert.ok(mockIdx2 < importIdx);
  });

  // Cover hoistMocks fallback path (steamroller unavailable)
  it('hoistMocks falls through to regex when AST fails', () => {
    _resetSteamrollerCache();
    const source = [
      "import { foo } from './foo.js';",
      '',
      "mock.module('./bar', () => ({}));",
    ].join('\n');
    const result = hoistMocks(source, 'test.ts');
    assert.ok(result.hoisted);
  });

  // Cover findCallEnd with unbalanced parens (returns source.length)
  it('handles unbalanced parentheses in mock call', () => {
    const source = [
      "import { foo } from './foo.js';",
      '',
      "mock.module('./bar', () => ({",
    ].join('\n');
    const result = hoistWithRegex(source);
    // Even with unbalanced parens, it should still attempt hoisting
    assert.ok(result.hoisted);
  });

  // Cover string literals in braceDepthAt
  it('ignores braces inside string literals for brace depth', () => {
    const source = [
      "import { foo } from './foo.js';",
      "const s = '{ not a brace }';",
      "mock.module('./bar', () => ({}));",
    ].join('\n');
    const result = hoistWithRegex(source);
    assert.ok(result.hoisted);
  });

  // Cover double-quoted strings in findCallEnd
  it('handles double-quoted strings in mock calls', () => {
    const source = [
      "import { foo } from './foo.js';",
      '',
      'mock.module("./bar", () => ({ key: "value with ) paren" }));',
    ].join('\n');
    const result = hoistWithRegex(source);
    assert.ok(result.hoisted);
  });

  // Cover single-quoted strings in findCallEnd
  it('handles single-quoted strings with parens in mock calls', () => {
    const source = [
      "import { foo } from './foo.js';",
      '',
      "mock.module('./bar', () => ({ key: 'value with ) paren' }));",
    ].join('\n');
    const result = hoistWithRegex(source);
    assert.ok(result.hoisted);
  });
});
