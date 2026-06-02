import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveCalc } from '../../src/dom/css-cascade.js';
import { createWindow } from '../../src/dom/window.js';

describe('CSS calc() expressions', () => {
  it('should resolve calc(100px - 20px) to 80px', () => {
    const result = resolveCalc('calc(100px - 20px)');
    assert.equal(result, '80px');
  });

  it('should keep calc(50% + 10px) as-is (mixed units)', () => {
    const result = resolveCalc('calc(50% + 10px)');
    assert.equal(result, 'calc(50% + 10px)');
  });

  it('should resolve calc(2 * 16px) to 32px', () => {
    const result = resolveCalc('calc(2 * 16px)');
    assert.equal(result, '32px');
  });

  it('should resolve calc(100px / 2) to 50px', () => {
    const result = resolveCalc('calc(100px / 2)');
    assert.equal(result, '50px');
  });

  it('should resolve nested calc expressions', () => {
    const result = resolveCalc('calc(calc(10px + 5px) * 2)');
    assert.equal(result, '30px');
  });

  it('should resolve calc in getComputedStyle', () => {
    const win = createWindow();
    const doc = win.document;
    const style = doc.createElement('style');
    style.textContent = '.box { width: calc(100px + 50px); }';
    doc.querySelector('head')!.appendChild(style);

    const el = doc.createElement('div');
    el.className = 'box';
    doc.querySelector('body')!.appendChild(el);

    const computed = win.getComputedStyle(el);
    assert.equal(computed.getPropertyValue('width'), '150px');
  });

  it('should resolve calc with variables (var resolved first, then calc)', () => {
    const win = createWindow();
    const doc = win.document;
    const style = doc.createElement('style');
    style.textContent =
      '.box { --size: 20px; width: calc(100px + var(--size)); }';
    doc.querySelector('head')!.appendChild(style);

    const el = doc.createElement('div');
    el.className = 'box';
    doc.querySelector('body')!.appendChild(el);

    const computed = win.getComputedStyle(el);
    assert.equal(computed.getPropertyValue('width'), '120px');
  });

  it('should resolve calc with subtraction in getComputedStyle', () => {
    const win = createWindow();
    const doc = win.document;
    const style = doc.createElement('style');
    style.textContent = '.box { height: calc(200px - 50px); }';
    doc.querySelector('head')!.appendChild(style);

    const el = doc.createElement('div');
    el.className = 'box';
    doc.querySelector('body')!.appendChild(el);

    const computed = win.getComputedStyle(el);
    assert.equal(computed.getPropertyValue('height'), '150px');
  });

  it('should leave non-calc expressions unchanged', () => {
    const result = resolveCalc('100px');
    assert.equal(result, '100px');
  });

  it('should handle calc with unitless numbers', () => {
    const result = resolveCalc('calc(10 + 5)');
    assert.equal(result, '15');
  });
});
