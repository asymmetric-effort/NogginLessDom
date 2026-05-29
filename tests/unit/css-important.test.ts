import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseStyleSheet,
  expandShorthand,
  collectApplicableStyles,
} from '../../src/dom/css-cascade.js';
import { Element } from '../../src/dom/index.js';
import { Window } from '../../src/dom/window.js';

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

describe('CSS !important handling', () => {
  it('!important overrides higher specificity', () => {
    const win = createWindowWithStyles(
      '#special { color: green; } div { color: red !important; }',
    );
    const div = win.document.createElement('div');
    div.setAttribute('id', 'special');
    win.document.querySelector('body')!.appendChild(div);
    assert.equal(win.getComputedStyle(div).getPropertyValue('color'), 'red');
  });

  it('!important vs !important uses specificity', () => {
    const win = createWindowWithStyles(
      '#special { color: green !important; } div { color: red !important; }',
    );
    const div = win.document.createElement('div');
    div.setAttribute('id', 'special');
    win.document.querySelector('body')!.appendChild(div);
    assert.equal(win.getComputedStyle(div).getPropertyValue('color'), 'green');
  });

  it('inline !important wins over stylesheet !important', () => {
    const win = createWindowWithStyles('#special { color: green !important; }');
    const div = win.document.createElement('div');
    div.setAttribute('id', 'special');
    div.style.setProperty('color', 'blue', 'important');
    win.document.querySelector('body')!.appendChild(div);
    assert.equal(win.getComputedStyle(div).getPropertyValue('color'), 'blue');
  });

  it('stylesheet !important beats inline non-important', () => {
    const win = createWindowWithStyles('div { color: red !important; }');
    const div = win.document.createElement('div');
    div.style.setProperty('color', 'blue');
    win.document.querySelector('body')!.appendChild(div);
    assert.equal(win.getComputedStyle(div).getPropertyValue('color'), 'red');
  });

  it('non-important cannot override !important in cascade', () => {
    const rules = parseStyleSheet(
      '.low { color: red !important; } #high { color: blue; }',
    );
    assert.ok(rules[0]!.importantProperties?.has('color'));
    assert.equal(rules[1]!.importantProperties, undefined);
    const el = new Element('div');
    el.setAttribute('id', 'high');
    el.setAttribute('class', 'low');
    const result = collectApplicableStyles(el, rules);
    assert.equal(result.get('color'), 'red');
  });

  it('parseStyleSheet stores importantProperties', () => {
    const rules = parseStyleSheet(
      'div { color: red !important; font-size: 14px; }',
    );
    assert.equal(rules.length, 1);
    assert.equal(rules[0]!.properties.get('color'), 'red');
    assert.ok(rules[0]!.importantProperties?.has('color'));
    assert.equal(rules[0]!.importantProperties?.has('font-size'), false);
  });

  it('non-important property has no importantProperties set', () => {
    const rules = parseStyleSheet('div { color: red; }');
    assert.equal(rules[0]!.importantProperties, undefined);
  });
});

describe('expandShorthand', () => {
  it('margin with 1 value', () => {
    const result = expandShorthand('margin', '10px');
    assert.equal(result.get('margin-top'), '10px');
    assert.equal(result.get('margin-right'), '10px');
    assert.equal(result.get('margin-bottom'), '10px');
    assert.equal(result.get('margin-left'), '10px');
  });
  it('margin with 2 values', () => {
    const result = expandShorthand('margin', '10px 20px');
    assert.equal(result.get('margin-top'), '10px');
    assert.equal(result.get('margin-right'), '20px');
    assert.equal(result.get('margin-bottom'), '10px');
    assert.equal(result.get('margin-left'), '20px');
  });
  it('margin with 3 values', () => {
    const result = expandShorthand('margin', '10px 20px 30px');
    assert.equal(result.get('margin-top'), '10px');
    assert.equal(result.get('margin-right'), '20px');
    assert.equal(result.get('margin-bottom'), '30px');
    assert.equal(result.get('margin-left'), '20px');
  });
  it('margin with 4 values', () => {
    const result = expandShorthand('margin', '10px 20px 30px 40px');
    assert.equal(result.get('margin-top'), '10px');
    assert.equal(result.get('margin-right'), '20px');
    assert.equal(result.get('margin-bottom'), '30px');
    assert.equal(result.get('margin-left'), '40px');
  });
  it('padding with 1 value', () => {
    const result = expandShorthand('padding', '5px');
    assert.equal(result.get('padding-top'), '5px');
    assert.equal(result.get('padding-right'), '5px');
    assert.equal(result.get('padding-bottom'), '5px');
    assert.equal(result.get('padding-left'), '5px');
  });
  it('padding with 2 values', () => {
    const result = expandShorthand('padding', '5px 10px');
    assert.equal(result.get('padding-top'), '5px');
    assert.equal(result.get('padding-right'), '10px');
    assert.equal(result.get('padding-bottom'), '5px');
    assert.equal(result.get('padding-left'), '10px');
  });
  it('border shorthand', () => {
    const result = expandShorthand('border', '1px solid black');
    assert.equal(result.get('border-width'), '1px');
    assert.equal(result.get('border-style'), 'solid');
    assert.equal(result.get('border-color'), 'black');
  });
  it('background shorthand', () => {
    const result = expandShorthand('background', 'red');
    assert.equal(result.get('background-color'), 'red');
  });
  it('font shorthand with weight, size/line-height, family', () => {
    const result = expandShorthand('font', 'bold 16px/1.5 Arial');
    assert.equal(result.get('font-weight'), 'bold');
    assert.equal(result.get('font-size'), '16px');
    assert.equal(result.get('line-height'), '1.5');
    assert.equal(result.get('font-family'), 'Arial');
  });
  it('font shorthand without weight', () => {
    const result = expandShorthand('font', '16px Arial');
    assert.equal(result.get('font-size'), '16px');
    assert.equal(result.get('font-family'), 'Arial');
    assert.equal(result.has('font-weight'), false);
  });
  it('unknown shorthand returns empty map', () => {
    const result = expandShorthand('color', 'red');
    assert.equal(result.size, 0);
  });
  it('shorthand expansion in parseStyleSheet', () => {
    const rules = parseStyleSheet('div { margin: 10px 20px; }');
    assert.equal(rules[0]!.properties.get('margin-top'), '10px');
    assert.equal(rules[0]!.properties.get('margin-right'), '20px');
    assert.equal(rules[0]!.properties.get('margin-bottom'), '10px');
    assert.equal(rules[0]!.properties.get('margin-left'), '20px');
  });
  it('shorthand with !important propagates to longhands', () => {
    const rules = parseStyleSheet('div { margin: 10px !important; }');
    assert.ok(rules[0]!.importantProperties?.has('margin-top'));
    assert.ok(rules[0]!.importantProperties?.has('margin-right'));
    assert.ok(rules[0]!.importantProperties?.has('margin-bottom'));
    assert.ok(rules[0]!.importantProperties?.has('margin-left'));
  });
  it('border shorthand in parseStyleSheet', () => {
    const rules = parseStyleSheet('div { border: 2px dashed blue; }');
    assert.equal(rules[0]!.properties.get('border-width'), '2px');
    assert.equal(rules[0]!.properties.get('border-style'), 'dashed');
    assert.equal(rules[0]!.properties.get('border-color'), 'blue');
  });
  it('font shorthand in parseStyleSheet', () => {
    const rules = parseStyleSheet('div { font: bold 16px/1.5 Arial; }');
    assert.equal(rules[0]!.properties.get('font-weight'), 'bold');
    assert.equal(rules[0]!.properties.get('font-size'), '16px');
    assert.equal(rules[0]!.properties.get('line-height'), '1.5');
    assert.equal(rules[0]!.properties.get('font-family'), 'Arial');
  });
  it('border with thin keyword for width', () => {
    const result = expandShorthand('border', 'thin solid red');
    assert.equal(result.get('border-width'), 'thin');
    assert.equal(result.get('border-style'), 'solid');
    assert.equal(result.get('border-color'), 'red');
  });
});
