import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Document, Element } from '../../src/dom/index.js';
import { NodeList, HTMLCollection } from '../../src/dom/collections.js';

describe('NodeList', () => {
  it('should have correct length', () => {
    const el1 = new Element('div');
    const el2 = new Element('span');
    const nl = new NodeList([el1, el2]);
    assert.strictEqual(nl.length, 2);
  });

  it('should support index access', () => {
    const el1 = new Element('div');
    const el2 = new Element('span');
    const nl = new NodeList([el1, el2]);
    assert.strictEqual(nl[0], el1);
    assert.strictEqual(nl[1], el2);
    assert.strictEqual(nl[2], undefined);
  });

  it('should support item(index)', () => {
    const el1 = new Element('div');
    const nl = new NodeList([el1]);
    assert.strictEqual(nl.item(0), el1);
    assert.strictEqual(nl.item(5), null);
  });

  it('should support forEach', () => {
    const el1 = new Element('div');
    const el2 = new Element('span');
    const nl = new NodeList([el1, el2]);
    const collected: Element[] = [];
    nl.forEach((node, index) => {
      collected.push(node as Element);
      assert.strictEqual(typeof index, 'number');
    });
    assert.deepStrictEqual(collected, [el1, el2]);
  });

  it('should support for..of via Symbol.iterator', () => {
    const el1 = new Element('div');
    const el2 = new Element('span');
    const nl = new NodeList([el1, el2]);
    const collected: Element[] = [];
    for (const node of nl) {
      collected.push(node as Element);
    }
    assert.deepStrictEqual(collected, [el1, el2]);
  });

  it('should support entries()', () => {
    const el1 = new Element('div');
    const nl = new NodeList([el1]);
    const entries = [...nl.entries()];
    assert.deepStrictEqual(entries, [[0, el1]]);
  });

  it('should support keys()', () => {
    const el1 = new Element('div');
    const el2 = new Element('span');
    const nl = new NodeList([el1, el2]);
    const keys = [...nl.keys()];
    assert.deepStrictEqual(keys, [0, 1]);
  });

  it('should support values()', () => {
    const el1 = new Element('div');
    const el2 = new Element('span');
    const nl = new NodeList([el1, el2]);
    const values = [...nl.values()];
    assert.deepStrictEqual(values, [el1, el2]);
  });

  it('should be empty when no elements', () => {
    const nl = new NodeList([]);
    assert.strictEqual(nl.length, 0);
    assert.strictEqual(nl.item(0), null);
  });
});

describe('HTMLCollection', () => {
  it('should have correct length', () => {
    const el1 = new Element('div');
    const el2 = new Element('span');
    const hc = new HTMLCollection([el1, el2]);
    assert.strictEqual(hc.length, 2);
  });

  it('should support index access', () => {
    const el1 = new Element('div');
    const hc = new HTMLCollection([el1]);
    assert.strictEqual(hc[0], el1);
    assert.strictEqual(hc[1], undefined);
  });

  it('should support item(index)', () => {
    const el1 = new Element('div');
    const hc = new HTMLCollection([el1]);
    assert.strictEqual(hc.item(0), el1);
    assert.strictEqual(hc.item(5), null);
  });

  it('should support namedItem by id', () => {
    const el1 = new Element('div');
    el1.setAttribute('id', 'myDiv');
    const el2 = new Element('span');
    const hc = new HTMLCollection([el1, el2]);
    assert.strictEqual(hc.namedItem('myDiv'), el1);
  });

  it('should support namedItem by name attribute', () => {
    const el1 = new Element('input');
    el1.setAttribute('name', 'username');
    const hc = new HTMLCollection([el1]);
    assert.strictEqual(hc.namedItem('username'), el1);
  });

  it('should return null from namedItem when not found', () => {
    const hc = new HTMLCollection([]);
    assert.strictEqual(hc.namedItem('nope'), null);
  });

  it('should support for..of via Symbol.iterator', () => {
    const el1 = new Element('div');
    const el2 = new Element('span');
    const hc = new HTMLCollection([el1, el2]);
    const collected: Element[] = [];
    for (const el of hc) {
      collected.push(el);
    }
    assert.deepStrictEqual(collected, [el1, el2]);
  });
});

describe('querySelectorAll returns NodeList', () => {
  it('should return a NodeList from Element.querySelectorAll', () => {
    const doc = new Document();
    const body = doc.createElement('body');
    doc.appendChild(body);
    const d1 = doc.createElement('div');
    const d2 = doc.createElement('div');
    body.appendChild(d1);
    body.appendChild(d2);
    const result = body.querySelectorAll('div');
    assert.ok(result instanceof NodeList);
    assert.strictEqual(result.length, 2);
  });

  it('should return a NodeList from Document.querySelectorAll', () => {
    const doc = new Document();
    const body = doc.createElement('body');
    doc.appendChild(body);
    const d1 = doc.createElement('div');
    body.appendChild(d1);
    const result = doc.querySelectorAll('div');
    assert.ok(result instanceof NodeList);
    assert.strictEqual(result.length, 1);
  });
});

describe('getElementsByTagName returns HTMLCollection', () => {
  it('should return HTMLCollection from Element.getElementsByTagName', () => {
    const doc = new Document();
    const body = doc.createElement('body');
    doc.appendChild(body);
    const d1 = doc.createElement('div');
    body.appendChild(d1);
    const result = body.getElementsByTagName('div');
    assert.ok(result instanceof HTMLCollection);
    assert.strictEqual(result.length, 1);
  });

  it('should return HTMLCollection from Document.getElementsByTagName', () => {
    const doc = new Document();
    const body = doc.createElement('body');
    doc.appendChild(body);
    const d1 = doc.createElement('span');
    body.appendChild(d1);
    const result = doc.getElementsByTagName('span');
    assert.ok(result instanceof HTMLCollection);
    assert.strictEqual(result.length, 1);
  });
});

describe('getElementsByClassName returns HTMLCollection', () => {
  it('should return HTMLCollection from Element.getElementsByClassName', () => {
    const doc = new Document();
    const body = doc.createElement('body');
    doc.appendChild(body);
    const d1 = doc.createElement('div');
    d1.setAttribute('class', 'foo');
    body.appendChild(d1);
    const result = body.getElementsByClassName('foo');
    assert.ok(result instanceof HTMLCollection);
    assert.strictEqual(result.length, 1);
  });
});
