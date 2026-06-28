import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseStyleSheet,
  computeSpecificity,
  resolveNestedSelector,
} from '../../src/dom/css-cascade.js';

// ---------------------------------------------------------------------------
// CSS nesting
// ---------------------------------------------------------------------------

describe('CSS nesting support', () => {
  it('.parent { .child { color: red; } } flattens correctly', () => {
    const rules = parseStyleSheet('.parent { .child { color: red; } }');
    const childRule = rules.find((r) => r.selector.includes('.child'));
    assert.ok(childRule, 'should produce a rule for .child');
    assert.equal(childRule!.selector, '.parent .child');
    assert.equal(childRule!.properties.get('color'), 'red');
  });

  it('& .child resolves to parent selector', () => {
    const rules = parseStyleSheet('.parent { & .child { color: blue; } }');
    const childRule = rules.find((r) => r.selector.includes('.child'));
    assert.ok(childRule, 'should produce a rule for .child');
    assert.equal(childRule!.selector, '.parent .child');
    assert.equal(childRule!.properties.get('color'), 'blue');
  });

  it('& with suffix resolves correctly', () => {
    const rules = parseStyleSheet('.btn { &.active { color: green; } }');
    const activeRule = rules.find((r) => r.selector.includes('.active'));
    assert.ok(activeRule);
    assert.equal(activeRule!.selector, '.btn.active');
  });

  it('parent declarations and nested rules both emitted', () => {
    const rules = parseStyleSheet(
      '.parent { color: blue; .child { font-size: 14px; } }',
    );

    const parentRule = rules.find((r) => r.selector === '.parent');
    assert.ok(parentRule, 'should have parent rule');
    assert.equal(parentRule!.properties.get('color'), 'blue');

    const childRule = rules.find((r) => r.selector === '.parent .child');
    assert.ok(childRule, 'should have child rule');
    assert.equal(childRule!.properties.get('font-size'), '14px');
  });

  it('deeply nested rules flatten correctly', () => {
    const rules = parseStyleSheet('.a { .b { .c { color: red; } } }');
    const deepRule = rules.find((r) => r.selector === '.a .b .c');
    assert.ok(deepRule);
    assert.equal(deepRule!.properties.get('color'), 'red');
  });

  it('existing CSS tests still pass with nesting-aware parser', () => {
    // Simple rule
    const rules1 = parseStyleSheet('div { color: red; }');
    assert.equal(rules1.length, 1);
    assert.equal(rules1[0]!.selector, 'div');
    assert.equal(rules1[0]!.properties.get('color'), 'red');

    // Multiple rules
    const rules2 = parseStyleSheet(
      'div { color: red; } p { font-size: 16px; }',
    );
    assert.equal(rules2.length, 2);

    // Comma-separated selectors
    const rules3 = parseStyleSheet('h1, h2, h3 { font-weight: bold; }');
    assert.equal(rules3.length, 3);

    // Media query
    const rules4 = parseStyleSheet(
      '@media screen { div { color: red; } } p { font-size: 14px; }',
    );
    assert.equal(rules4.length, 2);
    assert.equal(rules4[0]!.mediaQuery, 'screen');
  });

  it('comma-separated nested selectors', () => {
    const rules = parseStyleSheet('.parent { .a, .b { color: red; } }');
    const ruleA = rules.find((r) => r.selector === '.parent .a');
    const ruleB = rules.find((r) => r.selector === '.parent .b');
    assert.ok(ruleA, 'should have .parent .a rule');
    assert.ok(ruleB, 'should have .parent .b rule');
  });
});

// ---------------------------------------------------------------------------
// resolveNestedSelector
// ---------------------------------------------------------------------------

describe('resolveNestedSelector', () => {
  it('prepends parent when no & present', () => {
    assert.equal(resolveNestedSelector('.parent', '.child'), '.parent .child');
  });

  it('replaces & with parent selector', () => {
    assert.equal(
      resolveNestedSelector('.parent', '& .child'),
      '.parent .child',
    );
  });

  it('handles & as suffix', () => {
    assert.equal(resolveNestedSelector('.btn', '&.active'), '.btn.active');
  });

  it('handles multiple & references', () => {
    assert.equal(resolveNestedSelector('.item', '& + &'), '.item + .item');
  });
});

// ---------------------------------------------------------------------------
// :is(), :where(), :has() specificity
// ---------------------------------------------------------------------------

describe('pseudo-class specificity', () => {
  it(':is(.a, .b) has specificity of most specific argument', () => {
    const spec = computeSpecificity(':is(.a, .b)');
    // :is() takes the specificity of its most specific argument
    // .a and .b both have specificity (0,1,0), so result is (0,1,0)
    assert.deepEqual(spec, [0, 1, 0]);
  });

  it(':is(#id, .class) takes highest specificity', () => {
    const spec = computeSpecificity(':is(#id, .class)');
    // #id has (1,0,0), .class has (0,1,0) -> takes (1,0,0)
    assert.deepEqual(spec, [1, 0, 0]);
  });

  it(':where() contributes zero specificity', () => {
    const spec = computeSpecificity(':where(.a, #b)');
    assert.deepEqual(spec, [0, 0, 0]);
  });

  it(':where() with element context has only element specificity', () => {
    const spec = computeSpecificity('div:where(.active)');
    // :where() is zero, div is (0,0,1)
    assert.deepEqual(spec, [0, 0, 1]);
  });

  it(':has(.child) contributes child specificity', () => {
    const spec = computeSpecificity(':has(.child)');
    assert.deepEqual(spec, [0, 1, 0]);
  });

  it(':has(> .child) recognized', () => {
    const spec = computeSpecificity('div:has(> .child)');
    // div = (0,0,1), :has(.child) = (0,1,0) -> (0,1,1)
    assert.deepEqual(spec, [0, 1, 1]);
  });

  it(':not() still works correctly', () => {
    assert.deepEqual(computeSpecificity(':not(.foo)'), [0, 1, 0]);
    assert.deepEqual(computeSpecificity('div:not(#bar)'), [1, 0, 1]);
  });

  it(':is() with descendant selector argument', () => {
    const spec = computeSpecificity(':is(div .active)');
    // div .active = (0,1,1)
    assert.deepEqual(spec, [0, 1, 1]);
  });

  it('combined :is() and :where() on same selector', () => {
    const spec = computeSpecificity(':is(.a):where(.b)');
    // :is(.a) = (0,1,0), :where(.b) = (0,0,0) -> (0,1,0)
    assert.deepEqual(spec, [0, 1, 0]);
  });
});
