import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Element } from '../../src/dom/index.js';
import { CSSStyleDeclaration } from '../../src/dom/style.js';

describe('CSSStyleDeclaration', () => {
  it('should be accessible via element.style', () => {
    const el = new Element('div');
    assert.ok(el.style instanceof CSSStyleDeclaration);
  });

  it('should set and get properties via camelCase', () => {
    const el = new Element('div');
    el.style.backgroundColor = 'red';
    assert.strictEqual(el.style.backgroundColor, 'red');
  });

  it('should set and get properties via setProperty/getPropertyValue', () => {
    const el = new Element('div');
    el.style.setProperty('background-color', 'blue');
    assert.strictEqual(el.style.getPropertyValue('background-color'), 'blue');
  });

  it('should map camelCase to kebab-case', () => {
    const el = new Element('div');
    el.style.fontSize = '14px';
    assert.strictEqual(el.style.getPropertyValue('font-size'), '14px');
  });

  it('should map kebab-case to camelCase', () => {
    const el = new Element('div');
    el.style.setProperty('font-size', '16px');
    assert.strictEqual(el.style.fontSize, '16px');
  });

  it('should remove property', () => {
    const el = new Element('div');
    el.style.color = 'red';
    const old = el.style.removeProperty('color');
    assert.strictEqual(old, 'red');
    assert.strictEqual(el.style.color, '');
  });

  it('should return empty string for unset property', () => {
    const el = new Element('div');
    assert.strictEqual(el.style.getPropertyValue('color'), '');
    assert.strictEqual(el.style.color, '');
  });

  it('should have correct length', () => {
    const el = new Element('div');
    assert.strictEqual(el.style.length, 0);
    el.style.color = 'red';
    assert.strictEqual(el.style.length, 1);
    el.style.fontSize = '14px';
    assert.strictEqual(el.style.length, 2);
  });

  it('should support item(index)', () => {
    const el = new Element('div');
    el.style.color = 'red';
    el.style.fontSize = '14px';
    // item returns kebab-case property name
    const props = [el.style.item(0), el.style.item(1)].sort();
    assert.ok(props.includes('color'));
    assert.ok(props.includes('font-size'));
    assert.strictEqual(el.style.item(2), '');
  });

  it('should get and set cssText', () => {
    const el = new Element('div');
    el.style.cssText = 'color: red; font-size: 14px';
    assert.strictEqual(el.style.getPropertyValue('color'), 'red');
    assert.strictEqual(el.style.getPropertyValue('font-size'), '14px');
  });

  it('should produce cssText from individual properties', () => {
    const el = new Element('div');
    el.style.color = 'red';
    el.style.fontSize = '14px';
    const css = el.style.cssText;
    assert.ok(css.includes('color: red'));
    assert.ok(css.includes('font-size: 14px'));
  });

  it('should clear all properties when cssText is set', () => {
    const el = new Element('div');
    el.style.color = 'red';
    el.style.cssText = 'font-size: 14px';
    assert.strictEqual(el.style.color, '');
    assert.strictEqual(el.style.fontSize, '14px');
  });

  it('should handle setProperty with priority', () => {
    const el = new Element('div');
    el.style.setProperty('color', 'red', 'important');
    assert.strictEqual(el.style.getPropertyValue('color'), 'red');
    // Priority is stored but we just need it not to crash
  });

  it('should handle removeProperty returning old value', () => {
    const el = new Element('div');
    el.style.setProperty('color', 'blue');
    const old = el.style.removeProperty('color');
    assert.strictEqual(old, 'blue');
    assert.strictEqual(el.style.length, 0);
  });

  it('should return empty string from removeProperty for unset prop', () => {
    const el = new Element('div');
    const old = el.style.removeProperty('color');
    assert.strictEqual(old, '');
  });

  it('should handle setting property to empty string (removes it)', () => {
    const el = new Element('div');
    el.style.color = 'red';
    el.style.color = '';
    assert.strictEqual(el.style.length, 0);
    assert.strictEqual(el.style.getPropertyValue('color'), '');
  });
});
