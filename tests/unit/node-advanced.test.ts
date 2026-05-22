import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Document, Element, TextNode } from '../../src/dom/index.js';

describe('Node advanced', () => {
  describe('ownerDocument', () => {
    it('should be set when created by a Document', () => {
      const doc = new Document();
      const el = doc.createElement('div');
      assert.strictEqual(el.ownerDocument, doc);
    });

    it('should be null for Document itself', () => {
      const doc = new Document();
      assert.strictEqual(doc.ownerDocument, null);
    });

    it('should be set for text nodes created by Document', () => {
      const doc = new Document();
      const text = doc.createTextNode('hello');
      assert.strictEqual(text.ownerDocument, doc);
    });
  });

  describe('parentElement', () => {
    it('should return parent when parent is an Element', () => {
      const parent = new Element('div');
      const child = new Element('span');
      parent.appendChild(child);
      assert.strictEqual(child.parentElement, parent);
    });

    it('should return null when parent is a Document', () => {
      const doc = new Document();
      const el = new Element('div');
      doc.appendChild(el);
      assert.strictEqual(el.parentElement, null);
    });

    it('should return null when no parent', () => {
      const el = new Element('div');
      assert.strictEqual(el.parentElement, null);
    });
  });

  describe('normalize()', () => {
    it('should merge adjacent text nodes', () => {
      const el = new Element('div');
      el.appendChild(new TextNode('hello '));
      el.appendChild(new TextNode('world'));
      el.normalize();
      assert.strictEqual(el.childNodes.length, 1);
      assert.strictEqual(el.childNodes[0]!.textContent, 'hello world');
    });

    it('should remove empty text nodes', () => {
      const el = new Element('div');
      el.appendChild(new TextNode(''));
      el.appendChild(new Element('span'));
      el.appendChild(new TextNode(''));
      el.normalize();
      assert.strictEqual(el.childNodes.length, 1);
      assert.ok(el.childNodes[0] instanceof Element);
    });

    it('should handle mixed content', () => {
      const el = new Element('div');
      el.appendChild(new TextNode('a'));
      el.appendChild(new TextNode('b'));
      el.appendChild(new Element('span'));
      el.appendChild(new TextNode('c'));
      el.appendChild(new TextNode(''));
      el.appendChild(new TextNode('d'));
      el.normalize();
      assert.strictEqual(el.childNodes.length, 3);
      assert.strictEqual(el.childNodes[0]!.textContent, 'ab');
      assert.ok(el.childNodes[1] instanceof Element);
      assert.strictEqual(el.childNodes[2]!.textContent, 'cd');
    });
  });

  describe('nodeValue', () => {
    it('should return data for TextNode', () => {
      const text = new TextNode('hello');
      assert.strictEqual(text.nodeValue, 'hello');
    });

    it('should allow setting on TextNode', () => {
      const text = new TextNode('hello');
      text.nodeValue = 'world';
      assert.strictEqual(text.nodeValue, 'world');
      assert.strictEqual(text.data, 'world');
    });

    it('should return null for Element', () => {
      const el = new Element('div');
      assert.strictEqual(el.nodeValue, null);
    });

    it('should return null for Document', () => {
      const doc = new Document();
      assert.strictEqual(doc.nodeValue, null);
    });
  });

  describe('isEqualNode', () => {
    it('should return true for deeply equal trees', () => {
      const a = new Element('div');
      a.setAttribute('class', 'foo');
      a.appendChild(new TextNode('hello'));

      const b = new Element('div');
      b.setAttribute('class', 'foo');
      b.appendChild(new TextNode('hello'));

      assert.strictEqual(a.isEqualNode(b), true);
    });

    it('should return false for different attributes', () => {
      const a = new Element('div');
      a.setAttribute('class', 'foo');
      const b = new Element('div');
      b.setAttribute('class', 'bar');
      assert.strictEqual(a.isEqualNode(b), false);
    });

    it('should return false for different children', () => {
      const a = new Element('div');
      a.appendChild(new TextNode('hello'));
      const b = new Element('div');
      b.appendChild(new TextNode('world'));
      assert.strictEqual(a.isEqualNode(b), false);
    });

    it('should return false for different node types', () => {
      const a = new Element('div');
      const b = new TextNode('div');
      assert.strictEqual(a.isEqualNode(b), false);
    });

    it('should return false for null', () => {
      const a = new Element('div');
      assert.strictEqual(a.isEqualNode(null), false);
    });
  });

  describe('isSameNode', () => {
    it('should return true for same reference', () => {
      const el = new Element('div');
      assert.strictEqual(el.isSameNode(el), true);
    });

    it('should return false for different reference', () => {
      const a = new Element('div');
      const b = new Element('div');
      assert.strictEqual(a.isSameNode(b), false);
    });

    it('should return false for null', () => {
      const a = new Element('div');
      assert.strictEqual(a.isSameNode(null), false);
    });
  });

  describe('compareDocumentPosition', () => {
    it('should return 0 for same node', () => {
      const el = new Element('div');
      assert.strictEqual(el.compareDocumentPosition(el), 0);
    });

    it('should return CONTAINS | PRECEDING when other is descendant', () => {
      const parent = new Element('div');
      const child = new Element('span');
      parent.appendChild(child);
      // parent contains child, and parent precedes child
      const result = parent.compareDocumentPosition(child);
      assert.ok(result & 16); // CONTAINED_BY (child is contained by parent, from parent's perspective: parent CONTAINS child → other is CONTAINED_BY... wait)
      // Actually: compareDocumentPosition returns relationship of other relative to this
      // If this contains other: DOCUMENT_POSITION_CONTAINED_BY (16) | DOCUMENT_POSITION_FOLLOWING (4)
      assert.ok(result & 16); // CONTAINED_BY
      assert.ok(result & 4); // FOLLOWING
    });

    it('should return CONTAINS | PRECEDING when this is descendant', () => {
      const parent = new Element('div');
      const child = new Element('span');
      parent.appendChild(child);
      const result = child.compareDocumentPosition(parent);
      assert.ok(result & 8); // CONTAINS
      assert.ok(result & 2); // PRECEDING
    });

    it('should return PRECEDING or FOLLOWING for siblings', () => {
      const parent = new Element('div');
      const a = new Element('span');
      const b = new Element('em');
      parent.appendChild(a);
      parent.appendChild(b);
      const resultAB = a.compareDocumentPosition(b);
      assert.ok(resultAB & 4); // FOLLOWING
      const resultBA = b.compareDocumentPosition(a);
      assert.ok(resultBA & 2); // PRECEDING
    });

    it('should return DISCONNECTED for unrelated nodes', () => {
      const a = new Element('div');
      const b = new Element('span');
      const result = a.compareDocumentPosition(b);
      assert.ok(result & 1); // DISCONNECTED
    });
  });
});
