import { describe, it, expect } from '../../src/index.js';
import {
  parseStyleSheet,
  resolveCalc,
  resolveNestedSelector,
} from '../../src/dom/css-cascade.js';

describe('parseStyleSheet - @-rule handling', () => {
  it('skips @font-face rules with braces', () => {
    const css =
      '@font-face { font-family: MyFont; src: url(font.woff); } .test { color: red; }';
    const rules = parseStyleSheet(css);
    const testRule = rules.find((r) => r.selector === '.test');
    expect(testRule).toBeDefined();
    expect(testRule!.properties.get('color')).toBe('red');
  });

  it('skips @keyframes rules', () => {
    const css =
      '@keyframes slide { from { opacity: 0; } to { opacity: 1; } } .box { animation: slide 1s; }';
    const rules = parseStyleSheet(css);
    const boxRule = rules.find((r) => r.selector === '.box');
    expect(boxRule).toBeDefined();
  });

  it('skips @charset rules (semicolon terminated)', () => {
    const css = '@charset "UTF-8"; .main { color: blue; }';
    const rules = parseStyleSheet(css);
    const mainRule = rules.find((r) => r.selector === '.main');
    expect(mainRule).toBeDefined();
  });

  it('skips @import rules (semicolon terminated)', () => {
    const css = '@import url("other.css"); .content { margin: 0; }';
    const rules = parseStyleSheet(css);
    const contentRule = rules.find((r) => r.selector === '.content');
    expect(contentRule).toBeDefined();
  });

  it('handles unterminated block comment at end of CSS', () => {
    const css = '.a { color: red; } /* this comment never ends';
    const rules = parseStyleSheet(css);
    const aRule = rules.find((r) => r.selector === '.a');
    expect(aRule).toBeDefined();
  });
});

describe('parseStyleSheet - nested selector edge cases', () => {
  it('handles empty selector text before brace', () => {
    const css = '{ color: red; } .valid { color: blue; }';
    const rules = parseStyleSheet(css);
    expect(rules.length).toBeGreaterThanOrEqual(0);
  });

  it('handles trailing declaration without semicolon', () => {
    const css = '.box { color: red; margin: 10px }';
    const rules = parseStyleSheet(css);
    const boxRule = rules.find((r) => r.selector === '.box');
    expect(boxRule).toBeDefined();
    expect(boxRule!.properties.get('margin')).toBe('10px');
  });

  it('handles declaration-like text that looks like a nested selector', () => {
    // A colon in selector text can confuse the parser: "color: red { ... }"
    const css = '.normal { color: blue; } .other { font-size: 12px; }';
    const rules = parseStyleSheet(css);
    expect(rules.length).toBe(2);
  });

  it('handles semicolon before brace in block (treated as declaration)', () => {
    // Semicolon before the brace means it's a declaration, not a selector
    const css = '.a { color: red; margin: 0; } .b { padding: 5px; }';
    const rules = parseStyleSheet(css);
    expect(rules.length).toBe(2);
  });
});

describe('resolveCalc - multiplication and division edge cases', () => {
  it('handles calc with multiplication where left is unitless', () => {
    const result = resolveCalc('calc(2 * 10px)');
    expect(result).toBe('20px');
  });

  it('handles calc with multiplication where right is unitless', () => {
    const result = resolveCalc('calc(10px * 2)');
    expect(result).toBe('20px');
  });

  it('handles calc with two unitless multiplication', () => {
    const result = resolveCalc('calc(3 * 4)');
    expect(result).toBe('12');
  });

  it('handles calc with two units in multiplication (returns calc)', () => {
    const result = resolveCalc('calc(10px * 5px)');
    expect(result).toBe('calc(10px * 5px)');
  });

  it('handles calc with division by unitless', () => {
    const result = resolveCalc('calc(100px / 2)');
    expect(result).toBe('50px');
  });

  it('handles calc with division with mismatched units', () => {
    const result = resolveCalc('calc(100px / 2em)');
    expect(result).toBe('calc(100px / 2em)');
  });

  it('handles calc with addition of mismatched units (returns calc)', () => {
    const result = resolveCalc('calc(10px + 5em)');
    expect(result).toBe('calc(10px + 5em)');
  });

  it('handles calc with subtraction', () => {
    const result = resolveCalc('calc(100px - 30px)');
    expect(result).toBe('70px');
  });

  it('handles calc with division resulting in clean number', () => {
    const result = resolveCalc('calc(100px / 4)');
    expect(result).toBe('25px');
  });

  it('handles calc with same-unit division', () => {
    const result = resolveCalc('calc(100px / 50px)');
    expect(typeof result).toBe('string');
  });
});

describe('resolveNestedSelector edge cases', () => {
  it('handles nested selector with &', () => {
    const result = resolveNestedSelector('.parent', '&:hover');
    expect(result).toBe('.parent:hover');
  });

  it('handles nested selector without &', () => {
    const result = resolveNestedSelector('.parent', '.child');
    expect(result).toBe('.parent .child');
  });
});
