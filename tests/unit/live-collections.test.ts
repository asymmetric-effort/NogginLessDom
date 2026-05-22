import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Document, Element } from '../../src/dom/index.js';
import { HTMLCollection } from '../../src/dom/collections.js';

describe('Live HTMLCollection', () => {
  describe('getElementsByTagName returns live collection', () => {
    it('should update when a matching element is added', () => {
      const doc = new Document();
      const body = doc.createElement('body');
      doc.appendChild(body);
      const d1 = doc.createElement('div');
      body.appendChild(d1);

      const divs = body.getElementsByTagName('div');
      assert.strictEqual(divs.length, 1);

      const d2 = doc.createElement('div');
      body.appendChild(d2);
      assert.strictEqual(divs.length, 2);
      assert.strictEqual(divs.item(1), d2);
    });

    it('should update when a matching element is removed', () => {
      const doc = new Document();
      const body = doc.createElement('body');
      doc.appendChild(body);
      const d1 = doc.createElement('div');
      const d2 = doc.createElement('div');
      body.appendChild(d1);
      body.appendChild(d2);

      const divs = body.getElementsByTagName('div');
      assert.strictEqual(divs.length, 2);

      body.removeChild(d1);
      assert.strictEqual(divs.length, 1);
      assert.strictEqual(divs.item(0), d2);
    });

    it('should reflect deeply nested additions', () => {
      const doc = new Document();
      const body = doc.createElement('body');
      doc.appendChild(body);
      const wrapper = doc.createElement('section');
      body.appendChild(wrapper);

      const divs = body.getElementsByTagName('div');
      assert.strictEqual(divs.length, 0);

      const d1 = doc.createElement('div');
      wrapper.appendChild(d1);
      assert.strictEqual(divs.length, 1);
      assert.strictEqual(divs.item(0), d1);
    });

    it('should support iteration after DOM changes', () => {
      const doc = new Document();
      const body = doc.createElement('body');
      doc.appendChild(body);

      const divs = body.getElementsByTagName('div');

      const d1 = doc.createElement('div');
      const d2 = doc.createElement('div');
      body.appendChild(d1);
      body.appendChild(d2);

      const collected: Element[] = [];
      for (const el of divs) {
        collected.push(el);
      }
      assert.deepStrictEqual(collected, [d1, d2]);
    });

    it('should support index access after DOM changes', () => {
      const doc = new Document();
      const body = doc.createElement('body');
      doc.appendChild(body);

      const divs = body.getElementsByTagName('div');
      assert.strictEqual(divs[0], undefined);

      const d1 = doc.createElement('div');
      body.appendChild(d1);
      assert.strictEqual(divs.item(0), d1);
    });
  });

  describe('getElementsByClassName returns live collection', () => {
    it('should update when a matching element is added', () => {
      const doc = new Document();
      const body = doc.createElement('body');
      doc.appendChild(body);
      const d1 = doc.createElement('div');
      d1.setAttribute('class', 'active');
      body.appendChild(d1);

      const actives = body.getElementsByClassName('active');
      assert.strictEqual(actives.length, 1);

      const d2 = doc.createElement('span');
      d2.setAttribute('class', 'active');
      body.appendChild(d2);
      assert.strictEqual(actives.length, 2);
    });

    it('should update when a matching element is removed', () => {
      const doc = new Document();
      const body = doc.createElement('body');
      doc.appendChild(body);
      const d1 = doc.createElement('div');
      d1.setAttribute('class', 'foo');
      body.appendChild(d1);

      const foos = body.getElementsByClassName('foo');
      assert.strictEqual(foos.length, 1);

      body.removeChild(d1);
      assert.strictEqual(foos.length, 0);
    });
  });

  describe('Document.getElementsByTagName returns live collection', () => {
    it('should update when elements are added to document', () => {
      const doc = new Document();
      const body = doc.createElement('body');
      doc.appendChild(body);

      const divs = doc.getElementsByTagName('div');
      assert.strictEqual(divs.length, 0);

      const d1 = doc.createElement('div');
      body.appendChild(d1);
      assert.strictEqual(divs.length, 1);

      const d2 = doc.createElement('div');
      body.appendChild(d2);
      assert.strictEqual(divs.length, 2);
    });
  });

  describe('Document.getElementsByClassName returns live collection', () => {
    it('should update when elements are added to document', () => {
      const doc = new Document();
      const body = doc.createElement('body');
      doc.appendChild(body);

      const items = doc.getElementsByClassName('item');
      assert.strictEqual(items.length, 0);

      const d1 = doc.createElement('div');
      d1.setAttribute('class', 'item');
      body.appendChild(d1);
      assert.strictEqual(items.length, 1);
    });
  });

  describe('namedItem on live collection', () => {
    it('should reflect newly added named elements', () => {
      const doc = new Document();
      const body = doc.createElement('body');
      doc.appendChild(body);

      const divs = body.getElementsByTagName('div');
      assert.strictEqual(divs.namedItem('myDiv'), null);

      const d1 = doc.createElement('div');
      d1.setAttribute('id', 'myDiv');
      body.appendChild(d1);
      assert.strictEqual(divs.namedItem('myDiv'), d1);
    });
  });

  describe('backward compatibility', () => {
    it('should still work when constructed with a static array', () => {
      const el1 = new Element('div');
      const el2 = new Element('span');
      const hc = new HTMLCollection([el1, el2]);
      assert.strictEqual(hc.length, 2);
      assert.strictEqual(hc.item(0), el1);
      assert.strictEqual(hc.item(1), el2);
    });
  });
});
