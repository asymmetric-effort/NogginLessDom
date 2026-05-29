import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseStyleSheet,
  computeSpecificity,
  INHERITED_PROPERTIES,
} from '../../src/dom/css-cascade.js';
import { Element } from '../../src/dom/index.js';
import { Window } from '../../src/dom/window.js';

describe('parseStyleSheet', () => {
  it('should parse a simple stylesheet', () => {
    const rules = parseStyleSheet('div { color: red; }');
    assert.equal(rules.length, 1);
    assert.equal(rules[0]!.selector, 'div');
    assert.equal(rules[0]!.properties.get('color'), 'red');
  });
  it('should parse multiple rules', () => {
    const rules = parseStyleSheet('div { color: red; } p { font-size: 16px; }');
    assert.equal(rules.length, 2);
    assert.equal(rules[0]!.properties.get('color'), 'red');
    assert.equal(rules[1]!.properties.get('font-size'), '16px');
  });
  it('should parse comma-separated selectors into separate rules', () => {
    const rules = parseStyleSheet('h1, h2, h3 { font-weight: bold; }');
    assert.equal(rules.length, 3);
    for (const rule of rules) {
      assert.equal(rule.properties.get('font-weight'), 'bold');
    }
  });
  it('should ignore CSS comments', () => {
    const rules = parseStyleSheet('/* comment */ div { color: red; }');
    assert.equal(rules.length, 1);
    assert.equal(rules[0]!.properties.get('color'), 'red');
  });
  it('should ignore @rules', () => {
    const rules = parseStyleSheet(
      '@media screen { div { color: red; } } p { font-size: 14px; }',
    );
    assert.equal(rules.length, 1);
    assert.equal(rules[0]!.selector, 'p');
  });
  it('should skip @import rules without braces', () => {
    const rules = parseStyleSheet(
      '@import url("style.css"); div { color: red; }',
    );
    assert.equal(rules.length, 1);
  });
  it('should skip @rule that reaches end of string', () => {
    assert.equal(parseStyleSheet('@charset "UTF-8"').length, 0);
  });
  it('should handle selectors with parens and brackets', () => {
    const rules = parseStyleSheet('a[href], :not(.foo) { color: red; }');
    assert.equal(rules.length, 2);
    assert.equal(rules[0]!.selector, 'a[href]');
    assert.equal(rules[1]!.selector, ':not(.foo)');
  });
  it('should handle empty stylesheet', () => {
    assert.equal(parseStyleSheet('').length, 0);
  });
  it('should handle whitespace-only stylesheet', () => {
    assert.equal(parseStyleSheet('   ').length, 0);
  });
});

describe('computeSpecificity', () => {
  it('element (0,0,1)', () => {
    assert.deepEqual(computeSpecificity('div'), [0, 0, 1]);
  });
  it('class (0,1,0)', () => {
    assert.deepEqual(computeSpecificity('.foo'), [0, 1, 0]);
  });
  it('id (1,0,0)', () => {
    assert.deepEqual(computeSpecificity('#bar'), [1, 0, 0]);
  });
  it('id > class > element ordering', () => {
    assert.ok(computeSpecificity('#bar')[0] > computeSpecificity('.foo')[0]);
    assert.ok(computeSpecificity('.foo')[1] > computeSpecificity('div')[1]);
  });
  it('compound specificity', () => {
    assert.deepEqual(computeSpecificity('div.foo'), [0, 1, 1]);
    assert.deepEqual(computeSpecificity('div#bar.foo'), [1, 1, 1]);
  });
  it('attribute selectors as class-level', () => {
    assert.deepEqual(computeSpecificity('[type="text"]'), [0, 1, 0]);
  });
  it('pseudo-classes as class-level', () => {
    assert.deepEqual(computeSpecificity(':first-child'), [0, 1, 0]);
  });
  it('pseudo-elements as element-level', () => {
    assert.deepEqual(computeSpecificity('::before'), [0, 0, 1]);
  });
  it('universal selector zero specificity', () => {
    assert.deepEqual(computeSpecificity('*'), [0, 0, 0]);
  });
  it('descendant selectors', () => {
    assert.deepEqual(computeSpecificity('div p'), [0, 0, 2]);
  });
  it(':not() inner selector specificity', () => {
    assert.deepEqual(computeSpecificity(':not(.foo)'), [0, 1, 0]);
    assert.deepEqual(computeSpecificity('div:not(#bar)'), [1, 0, 1]);
  });
});

describe('getComputedStyle with CSS cascade', () => {
  function createWindowWithStyles(cssText: string): Window {
    const win = new Window();
    const doc = win.document;
    const html = doc.createElement('html');
    doc.appendChild(html);
    const head = doc.createElement('head');
    html.appendChild(head);
    const style = doc.createElement('style');
    style.textContent = cssText;
    head.appendChild(style);
    const body = doc.createElement('body');
    html.appendChild(body);
    return win;
  }
  it('element selector matching', () => {
    const win = createWindowWithStyles('div { color: red; }');
    const div = win.document.createElement('div');
    win.document.querySelector('body')!.appendChild(div);
    assert.equal(win.getComputedStyle(div).getPropertyValue('color'), 'red');
  });
  it('class selector matching', () => {
    const win = createWindowWithStyles('.highlight { background: yellow; }');
    const span = win.document.createElement('span');
    span.setAttribute('class', 'highlight');
    win.document.querySelector('body')!.appendChild(span);
    assert.equal(
      win.getComputedStyle(span).getPropertyValue('background'),
      'yellow',
    );
  });
  it('ID selector matching', () => {
    const win = createWindowWithStyles('#main { margin: 20px; }');
    const div = win.document.createElement('div');
    div.setAttribute('id', 'main');
    win.document.querySelector('body')!.appendChild(div);
    assert.equal(win.getComputedStyle(div).getPropertyValue('margin'), '20px');
  });
  it('inline styles override stylesheet rules', () => {
    const win = createWindowWithStyles('div { color: red; }');
    const div = win.document.createElement('div');
    div.style.setProperty('color', 'blue');
    win.document.querySelector('body')!.appendChild(div);
    assert.equal(win.getComputedStyle(div).getPropertyValue('color'), 'blue');
  });
  it('higher specificity wins', () => {
    const win = createWindowWithStyles(
      'div { color: red; } #special { color: green; } .cls { color: blue; }',
    );
    const div = win.document.createElement('div');
    div.setAttribute('id', 'special');
    div.setAttribute('class', 'cls');
    win.document.querySelector('body')!.appendChild(div);
    assert.equal(win.getComputedStyle(div).getPropertyValue('color'), 'green');
  });
  it('source order breaks ties (later wins)', () => {
    const win = createWindowWithStyles(
      '.a { color: red; } .b { color: blue; }',
    );
    const div = win.document.createElement('div');
    div.setAttribute('class', 'a b');
    win.document.querySelector('body')!.appendChild(div);
    assert.equal(win.getComputedStyle(div).getPropertyValue('color'), 'blue');
  });
  it('inherited property (color) propagates from parent to child', () => {
    const win = createWindowWithStyles('div { color: red; }');
    const body = win.document.querySelector('body')!;
    const div = win.document.createElement('div');
    body.appendChild(div);
    const span = win.document.createElement('span');
    div.appendChild(span);
    assert.equal(
      win.getComputedStyle(span as Element).getPropertyValue('color'),
      'red',
    );
  });
  it('non-inherited property (margin) does NOT propagate', () => {
    const win = createWindowWithStyles('div { margin: 20px; }');
    const body = win.document.querySelector('body')!;
    const div = win.document.createElement('div');
    body.appendChild(div);
    const span = win.document.createElement('span');
    div.appendChild(span);
    assert.equal(
      win.getComputedStyle(span as Element).getPropertyValue('margin'),
      '',
    );
  });
  it('multiple <style> elements combine', () => {
    const win = new Window();
    const doc = win.document;
    const html = doc.createElement('html');
    doc.appendChild(html);
    const head = doc.createElement('head');
    html.appendChild(head);
    const s1 = doc.createElement('style');
    s1.textContent = 'div { color: red; }';
    head.appendChild(s1);
    const s2 = doc.createElement('style');
    s2.textContent = 'div { font-size: 20px; }';
    head.appendChild(s2);
    const body = doc.createElement('body');
    html.appendChild(body);
    const div = doc.createElement('div');
    body.appendChild(div);
    const c = win.getComputedStyle(div);
    assert.equal(c.getPropertyValue('color'), 'red');
    assert.equal(c.getPropertyValue('font-size'), '20px');
  });
  it('backward compatibility: no <style> = same as before', () => {
    const win = new Window();
    const div = win.document.createElement('div');
    div.style.setProperty('color', 'blue');
    win.document.appendChild(div);
    const c = win.getComputedStyle(div);
    assert.equal(c.getPropertyValue('color'), 'blue');
    assert.equal(c.getPropertyValue('display'), 'block');
  });
  it('inherit font-family through multiple levels', () => {
    const win = createWindowWithStyles(
      '.root { font-family: Arial, sans-serif; }',
    );
    const body = win.document.querySelector('body')!;
    const outer = win.document.createElement('div');
    outer.setAttribute('class', 'root');
    body.appendChild(outer);
    const inner = win.document.createElement('div');
    outer.appendChild(inner);
    const span = win.document.createElement('span');
    inner.appendChild(span);
    assert.equal(
      win.getComputedStyle(span as Element).getPropertyValue('font-family'),
      'Arial, sans-serif',
    );
  });
  it('child explicit property overrides inheritance', () => {
    const win = createWindowWithStyles(
      '.parent { color: red; } .child { color: blue; }',
    );
    const body = win.document.querySelector('body')!;
    const parent = win.document.createElement('div');
    parent.setAttribute('class', 'parent');
    body.appendChild(parent);
    const child = win.document.createElement('span');
    child.setAttribute('class', 'child');
    parent.appendChild(child);
    assert.equal(
      win.getComputedStyle(child as Element).getPropertyValue('color'),
      'blue',
    );
  });
});

describe('INHERITED_PROPERTIES', () => {
  it('should contain expected properties', () => {
    assert.ok(INHERITED_PROPERTIES.has('color'));
    assert.ok(INHERITED_PROPERTIES.has('font-family'));
    assert.ok(INHERITED_PROPERTIES.has('font-size'));
  });
  it('should not contain non-inherited properties', () => {
    assert.ok(!INHERITED_PROPERTIES.has('margin'));
    assert.ok(!INHERITED_PROPERTIES.has('display'));
  });
});
