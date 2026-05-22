import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createWindow } from '../../src/dom/window.js';
import { CSSStyleDeclaration } from '../../src/dom/style.js';

describe('CSS API', () => {
  describe('CSS.supports(property, value)', () => {
    it('should return true for known CSS properties with valid values', () => {
      const win = createWindow();
      assert.strictEqual(win.CSS.supports('display', 'flex'), true);
    });

    it('should return true for other known properties', () => {
      const win = createWindow();
      assert.strictEqual(win.CSS.supports('color', 'red'), true);
      assert.strictEqual(win.CSS.supports('background', '#fff'), true);
      assert.strictEqual(win.CSS.supports('position', 'absolute'), true);
      assert.strictEqual(win.CSS.supports('grid', 'auto'), true);
      assert.strictEqual(win.CSS.supports('flex', '1'), true);
      assert.strictEqual(win.CSS.supports('margin', '0'), true);
      assert.strictEqual(win.CSS.supports('padding', '10px'), true);
      assert.strictEqual(win.CSS.supports('width', '100%'), true);
      assert.strictEqual(win.CSS.supports('height', '50vh'), true);
      assert.strictEqual(win.CSS.supports('font-size', '16px'), true);
    });

    it('should return false for invalid/unknown CSS properties', () => {
      const win = createWindow();
      assert.strictEqual(win.CSS.supports('invalid-prop', 'value'), false);
      assert.strictEqual(win.CSS.supports('not-a-property', 'flex'), false);
    });
  });

  describe('CSS.supports(conditionText)', () => {
    it('should parse basic @supports-style condition with parens', () => {
      const win = createWindow();
      assert.strictEqual(win.CSS.supports('(display: flex)'), true);
      assert.strictEqual(win.CSS.supports('(color: red)'), true);
    });

    it('should return false for unknown property in condition text', () => {
      const win = createWindow();
      assert.strictEqual(win.CSS.supports('(invalid-prop: value)'), false);
    });

    it('should handle condition text without parens as property: value', () => {
      const win = createWindow();
      assert.strictEqual(win.CSS.supports('display: flex'), true);
      assert.strictEqual(win.CSS.supports('invalid-prop: value'), false);
    });
  });

  describe('getComputedStyle', () => {
    it('should return a CSSStyleDeclaration instance', () => {
      const win = createWindow();
      const el = win.document.createElement('div');
      const computed = win.getComputedStyle(el);
      assert.ok(computed instanceof CSSStyleDeclaration);
    });

    it('should include the element inline styles', () => {
      const win = createWindow();
      const el = win.document.createElement('div');
      el.style.setProperty('color', 'red');
      el.style.setProperty('margin', '10px');
      const computed = win.getComputedStyle(el);
      assert.strictEqual(computed.getPropertyValue('color'), 'red');
      assert.strictEqual(computed.getPropertyValue('margin'), '10px');
    });

    it('should return default display "block" for div', () => {
      const win = createWindow();
      const el = win.document.createElement('div');
      const computed = win.getComputedStyle(el);
      assert.strictEqual(computed.getPropertyValue('display'), 'block');
    });

    it('should return default display "inline" for span', () => {
      const win = createWindow();
      const el = win.document.createElement('span');
      const computed = win.getComputedStyle(el);
      assert.strictEqual(computed.getPropertyValue('display'), 'inline');
    });

    it('should return default display for other common elements', () => {
      const win = createWindow();

      const p = win.document.createElement('p');
      assert.strictEqual(
        win.getComputedStyle(p).getPropertyValue('display'),
        'block',
      );

      const section = win.document.createElement('section');
      assert.strictEqual(
        win.getComputedStyle(section).getPropertyValue('display'),
        'block',
      );

      const a = win.document.createElement('a');
      assert.strictEqual(
        win.getComputedStyle(a).getPropertyValue('display'),
        'inline',
      );

      const table = win.document.createElement('table');
      assert.strictEqual(
        win.getComputedStyle(table).getPropertyValue('display'),
        'table',
      );

      const li = win.document.createElement('li');
      assert.strictEqual(
        win.getComputedStyle(li).getPropertyValue('display'),
        'list-item',
      );
    });

    it('should let inline styles override defaults', () => {
      const win = createWindow();
      const el = win.document.createElement('div');
      el.style.setProperty('display', 'flex');
      const computed = win.getComputedStyle(el);
      assert.strictEqual(computed.getPropertyValue('display'), 'flex');
    });
  });
});
