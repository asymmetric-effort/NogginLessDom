import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseStyleSheet,
  computeSpecificity,
} from '../../src/dom/css-cascade.js';
import { createWindow } from '../../src/dom/window.js';

describe('CSS Pseudo-element styles', () => {
  it('should parse div::before { content: "hello"; } correctly', () => {
    const rules = parseStyleSheet('div::before { content: "hello"; }');
    assert.equal(rules.length, 1);
    assert.equal(rules[0]!.selector, 'div');
    assert.equal(rules[0]!.pseudo, '::before');
    assert.equal(rules[0]!.properties.get('content'), '"hello"');
  });

  it('should return content property via getComputedStyle(div, "::before")', () => {
    const win = createWindow();
    const doc = win.document;
    const style = doc.createElement('style');
    style.textContent = 'div::before { content: "hello"; }';
    doc.querySelector('head')!.appendChild(style);

    const div = doc.createElement('div');
    doc.querySelector('body')!.appendChild(div);

    const computed = win.getComputedStyle(div, '::before');
    assert.equal(computed.getPropertyValue('content'), '"hello"');
  });

  it('should getComputedStyle(div, "::after") work', () => {
    const win = createWindow();
    const doc = win.document;
    const style = doc.createElement('style');
    style.textContent = 'div::after { content: "world"; display: block; }';
    doc.querySelector('head')!.appendChild(style);

    const div = doc.createElement('div');
    doc.querySelector('body')!.appendChild(div);

    const computed = win.getComputedStyle(div, '::after');
    assert.equal(computed.getPropertyValue('content'), '"world"');
    assert.equal(computed.getPropertyValue('display'), 'block');
  });

  it('should getComputedStyle(div, null) return normal styles (no pseudo)', () => {
    const win = createWindow();
    const doc = win.document;
    const style = doc.createElement('style');
    style.textContent =
      'div { color: red; } div::before { content: "prefix"; }';
    doc.querySelector('head')!.appendChild(style);

    const div = doc.createElement('div');
    doc.querySelector('body')!.appendChild(div);

    const computed = win.getComputedStyle(div, null);
    assert.equal(computed.getPropertyValue('color'), 'red');
    assert.equal(computed.getPropertyValue('content'), '');
  });

  it('should pseudo rules not apply to normal getComputedStyle', () => {
    const win = createWindow();
    const doc = win.document;
    const style = doc.createElement('style');
    style.textContent = 'div::before { content: "before-text"; color: blue; }';
    doc.querySelector('head')!.appendChild(style);

    const div = doc.createElement('div');
    doc.querySelector('body')!.appendChild(div);

    const computed = win.getComputedStyle(div);
    // content from ::before should NOT appear in normal computed style
    assert.equal(computed.getPropertyValue('content'), '');
    // color from ::before should NOT appear
    assert.notEqual(computed.getPropertyValue('color'), 'blue');
  });

  it('should ::before count as one element-level specificity unit', () => {
    // div::before should have specificity [0, 0, 2] (1 element + 1 pseudo-element)
    const spec = computeSpecificity('div::before');
    assert.deepEqual(spec, [0, 0, 2]);
  });

  it('should parse ::after pseudo-element in selectors', () => {
    const rules = parseStyleSheet('.box::after { content: "end"; }');
    assert.equal(rules.length, 1);
    assert.equal(rules[0]!.selector, '.box');
    assert.equal(rules[0]!.pseudo, '::after');
  });

  it('should handle multiple rules with and without pseudo-elements', () => {
    const rules = parseStyleSheet(
      'div { color: red; } div::before { content: "hi"; } div::after { content: "bye"; }',
    );
    assert.equal(rules.length, 3);
    assert.equal(rules[0]!.pseudo, undefined);
    assert.equal(rules[1]!.pseudo, '::before');
    assert.equal(rules[2]!.pseudo, '::after');
  });

  it('should not set default display for pseudo-element computed styles', () => {
    const win = createWindow();
    const doc = win.document;
    const style = doc.createElement('style');
    style.textContent = 'div::before { content: "x"; }';
    doc.querySelector('head')!.appendChild(style);

    const div = doc.createElement('div');
    doc.querySelector('body')!.appendChild(div);

    const computed = win.getComputedStyle(div, '::before');
    // Should not get the default 'block' display that div normally gets
    assert.equal(computed.getPropertyValue('display'), '');
  });
});
