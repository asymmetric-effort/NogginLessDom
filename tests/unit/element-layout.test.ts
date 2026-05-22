import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Element } from '../../src/dom/index.js';

describe('Element layout properties', () => {
  // --- Defaults ---

  it('offset properties default to 0', () => {
    const el = new Element('div');
    assert.strictEqual(el.offsetLeft, 0);
    assert.strictEqual(el.offsetTop, 0);
    assert.strictEqual(el.offsetWidth, 0);
    assert.strictEqual(el.offsetHeight, 0);
  });

  it('client properties default to 0', () => {
    const el = new Element('div');
    assert.strictEqual(el.clientLeft, 0);
    assert.strictEqual(el.clientTop, 0);
    assert.strictEqual(el.clientWidth, 0);
    assert.strictEqual(el.clientHeight, 0);
  });

  it('scroll properties default to 0', () => {
    const el = new Element('div');
    assert.strictEqual(el.scrollLeft, 0);
    assert.strictEqual(el.scrollTop, 0);
    assert.strictEqual(el.scrollWidth, 0);
    assert.strictEqual(el.scrollHeight, 0);
  });

  // --- offsetParent ---

  it('offsetParent returns null when no parent', () => {
    const el = new Element('div');
    assert.strictEqual(el.offsetParent, null);
  });

  it('offsetParent returns parentElement', () => {
    const parent = new Element('div');
    const child = new Element('span');
    parent.appendChild(child);
    assert.strictEqual(child.offsetParent, parent);
  });

  // --- setLayoutMetrics ---

  it('setLayoutMetrics configures offset values', () => {
    const el = new Element('div');
    el.setLayoutMetrics({
      offsetWidth: 100,
      offsetHeight: 50,
      offsetLeft: 10,
      offsetTop: 20,
    });
    assert.strictEqual(el.offsetWidth, 100);
    assert.strictEqual(el.offsetHeight, 50);
    assert.strictEqual(el.offsetLeft, 10);
    assert.strictEqual(el.offsetTop, 20);
  });

  it('setLayoutMetrics configures client values', () => {
    const el = new Element('div');
    el.setLayoutMetrics({
      clientWidth: 200,
      clientHeight: 150,
      clientLeft: 5,
      clientTop: 3,
    });
    assert.strictEqual(el.clientWidth, 200);
    assert.strictEqual(el.clientHeight, 150);
    assert.strictEqual(el.clientLeft, 5);
    assert.strictEqual(el.clientTop, 3);
  });

  it('setLayoutMetrics configures scroll dimensions', () => {
    const el = new Element('div');
    el.setLayoutMetrics({
      scrollWidth: 500,
      scrollHeight: 1000,
    });
    assert.strictEqual(el.scrollWidth, 500);
    assert.strictEqual(el.scrollHeight, 1000);
  });

  it('setLayoutMetrics partial update preserves unset fields as 0', () => {
    const el = new Element('div');
    el.setLayoutMetrics({ offsetWidth: 42 });
    assert.strictEqual(el.offsetWidth, 42);
    assert.strictEqual(el.offsetHeight, 0);
    assert.strictEqual(el.clientWidth, 0);
  });

  // --- scrollLeft / scrollTop are settable ---

  it('scrollLeft is settable', () => {
    const el = new Element('div');
    el.scrollLeft = 100;
    assert.strictEqual(el.scrollLeft, 100);
  });

  it('scrollTop is settable', () => {
    const el = new Element('div');
    el.scrollTop = 200;
    assert.strictEqual(el.scrollTop, 200);
  });

  // --- scroll / scrollTo ---

  it('scroll(x, y) sets scrollLeft and scrollTop', () => {
    const el = new Element('div');
    el.scroll(10, 20);
    assert.strictEqual(el.scrollLeft, 10);
    assert.strictEqual(el.scrollTop, 20);
  });

  it('scrollTo(x, y) sets scrollLeft and scrollTop', () => {
    const el = new Element('div');
    el.scrollTo(30, 40);
    assert.strictEqual(el.scrollLeft, 30);
    assert.strictEqual(el.scrollTop, 40);
  });

  it('scroll with no args sets both to 0', () => {
    const el = new Element('div');
    el.scrollLeft = 50;
    el.scrollTop = 60;
    el.scroll();
    assert.strictEqual(el.scrollLeft, 0);
    assert.strictEqual(el.scrollTop, 0);
  });

  // --- scrollBy ---

  it('scrollBy adds to scroll position', () => {
    const el = new Element('div');
    el.scrollLeft = 10;
    el.scrollTop = 20;
    el.scrollBy(5, 10);
    assert.strictEqual(el.scrollLeft, 15);
    assert.strictEqual(el.scrollTop, 30);
  });

  it('scrollBy with no args does nothing', () => {
    const el = new Element('div');
    el.scrollLeft = 10;
    el.scrollTop = 20;
    el.scrollBy();
    assert.strictEqual(el.scrollLeft, 10);
    assert.strictEqual(el.scrollTop, 20);
  });

  // --- scrollIntoView ---

  it('scrollIntoView does not throw', () => {
    const el = new Element('div');
    assert.doesNotThrow(() => el.scrollIntoView());
    assert.doesNotThrow(() => el.scrollIntoView(true));
    assert.doesNotThrow(() => el.scrollIntoView({ behavior: 'smooth' }));
  });

  // --- getClientRects ---

  it('getClientRects returns array with one DOMRect entry', () => {
    const el = new Element('div');
    el.setBoundingClientRect({ x: 1, y: 2, width: 3, height: 4 });
    const rects = el.getClientRects();
    assert.strictEqual(rects.length, 1);
    const rect = rects[0]!;
    assert.strictEqual(rect.x, 1);
    assert.strictEqual(rect.y, 2);
    assert.strictEqual(rect.width, 3);
    assert.strictEqual(rect.height, 4);
    assert.strictEqual(rect.top, 2);
    assert.strictEqual(rect.right, 4);
    assert.strictEqual(rect.bottom, 6);
    assert.strictEqual(rect.left, 1);
  });
});
