import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseStyleSheet,
  resolveVariables,
} from '../../src/dom/css-cascade.js';
import { createWindow } from '../../src/dom/window.js';

describe('CSS Custom Properties (Variables)', () => {
  it('should parse --color: red as a custom property', () => {
    const rules = parseStyleSheet(':root { --color: red; }');
    assert.equal(rules.length, 1);
    assert.equal(rules[0]!.properties.get('--color'), 'red');
  });

  it('should resolve var(--color) to the custom property value', () => {
    const variableMap = new Map<string, string>();
    variableMap.set('--color', 'red');
    const result = resolveVariables('var(--color)', variableMap);
    assert.equal(result, 'red');
  });

  it('should use fallback when variable is missing: var(--missing, blue)', () => {
    const variableMap = new Map<string, string>();
    const result = resolveVariables('var(--missing, blue)', variableMap);
    assert.equal(result, 'blue');
  });

  it('should variables inherit from parent elements', () => {
    const win = createWindow();
    const doc = win.document;
    const style = doc.createElement('style');
    style.textContent =
      '.parent { --text-color: green; } .child { color: var(--text-color); }';
    doc.querySelector('head')!.appendChild(style);

    const parent = doc.createElement('div');
    parent.className = 'parent';
    const child = doc.createElement('div');
    child.className = 'child';
    parent.appendChild(child);
    doc.querySelector('body')!.appendChild(parent);

    const computed = win.getComputedStyle(child);
    assert.equal(computed.getPropertyValue('color'), 'green');
  });

  it('should inline style variables work', () => {
    const win = createWindow();
    const doc = win.document;
    const style = doc.createElement('style');
    style.textContent = '.box { color: var(--my-color); }';
    doc.querySelector('head')!.appendChild(style);

    const el = doc.createElement('div');
    el.className = 'box';
    el.style.setProperty('--my-color', 'purple');
    doc.querySelector('body')!.appendChild(el);

    const computed = win.getComputedStyle(el);
    assert.equal(computed.getPropertyValue('color'), 'purple');
  });

  it('should resolve variables in stylesheet rules in getComputedStyle', () => {
    const win = createWindow();
    const doc = win.document;
    const style = doc.createElement('style');
    style.textContent = '.themed { --bg: navy; background-color: var(--bg); }';
    doc.querySelector('head')!.appendChild(style);

    const el = doc.createElement('div');
    el.className = 'themed';
    doc.querySelector('body')!.appendChild(el);

    const computed = win.getComputedStyle(el);
    assert.equal(computed.getPropertyValue('background-color'), 'navy');
  });

  it('should resolve nested var() references (one level)', () => {
    const variableMap = new Map<string, string>();
    variableMap.set('--primary', 'blue');
    variableMap.set('--fallback-color', 'var(--primary)');
    // First resolve --fallback-color, then the inner var(--primary)
    const result = resolveVariables('var(--fallback-color)', variableMap);
    assert.equal(result, 'blue');
  });

  it('should setProperty/getPropertyValue work for custom properties', () => {
    const win = createWindow();
    const doc = win.document;
    const el = doc.createElement('div');
    doc.querySelector('body')!.appendChild(el);

    el.style.setProperty('--my-var', 'test-value');
    assert.equal(el.style.getPropertyValue('--my-var'), 'test-value');
  });

  it('should leave unresolvable var() references as-is', () => {
    const variableMap = new Map<string, string>();
    const result = resolveVariables('var(--unknown)', variableMap);
    assert.equal(result, 'var(--unknown)');
  });

  it('should resolve var() in a property value with surrounding text', () => {
    const variableMap = new Map<string, string>();
    variableMap.set('--size', '10px');
    const result = resolveVariables('0 0 var(--size) var(--size)', variableMap);
    assert.equal(result, '0 0 10px 10px');
  });

  it('should use fallback with existing variable preferring the value', () => {
    const variableMap = new Map<string, string>();
    variableMap.set('--color', 'red');
    const result = resolveVariables('var(--color, blue)', variableMap);
    assert.equal(result, 'red');
  });
});
