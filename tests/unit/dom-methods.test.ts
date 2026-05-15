import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Document, Element, TextNode, Node } from '../../src/dom/index.js';

describe('DOM Methods', () => {
  // === Node: firstChild, lastChild ===
  describe('Node.firstChild', () => {
    it('should return null for empty node', () => {
      const node = new Node(1, 'DIV');
      assert.strictEqual(node.firstChild, null);
    });

    it('should return the first child', () => {
      const parent = new Node(1, 'DIV');
      const a = new Node(1, 'A');
      const b = new Node(1, 'B');
      parent.appendChild(a);
      parent.appendChild(b);
      assert.strictEqual(parent.firstChild, a);
    });
  });

  describe('Node.lastChild', () => {
    it('should return null for empty node', () => {
      const node = new Node(1, 'DIV');
      assert.strictEqual(node.lastChild, null);
    });

    it('should return the last child', () => {
      const parent = new Node(1, 'DIV');
      const a = new Node(1, 'A');
      const b = new Node(1, 'B');
      parent.appendChild(a);
      parent.appendChild(b);
      assert.strictEqual(parent.lastChild, b);
    });
  });

  // === Node: nextSibling, previousSibling ===
  describe('Node.nextSibling', () => {
    it('should return null when no parent', () => {
      const node = new Node(1, 'DIV');
      assert.strictEqual(node.nextSibling, null);
    });

    it('should return null for last child', () => {
      const parent = new Node(1, 'DIV');
      const a = new Node(1, 'A');
      parent.appendChild(a);
      assert.strictEqual(a.nextSibling, null);
    });

    it('should return the next sibling', () => {
      const parent = new Node(1, 'DIV');
      const a = new Node(1, 'A');
      const b = new Node(1, 'B');
      const c = new Node(1, 'C');
      parent.appendChild(a);
      parent.appendChild(b);
      parent.appendChild(c);
      assert.strictEqual(a.nextSibling, b);
      assert.strictEqual(b.nextSibling, c);
      assert.strictEqual(c.nextSibling, null);
    });
  });

  describe('Node.previousSibling', () => {
    it('should return null when no parent', () => {
      const node = new Node(1, 'DIV');
      assert.strictEqual(node.previousSibling, null);
    });

    it('should return null for first child', () => {
      const parent = new Node(1, 'DIV');
      const a = new Node(1, 'A');
      parent.appendChild(a);
      assert.strictEqual(a.previousSibling, null);
    });

    it('should return the previous sibling', () => {
      const parent = new Node(1, 'DIV');
      const a = new Node(1, 'A');
      const b = new Node(1, 'B');
      const c = new Node(1, 'C');
      parent.appendChild(a);
      parent.appendChild(b);
      parent.appendChild(c);
      assert.strictEqual(c.previousSibling, b);
      assert.strictEqual(b.previousSibling, a);
      assert.strictEqual(a.previousSibling, null);
    });
  });

  // === Node: hasChildNodes ===
  describe('Node.hasChildNodes', () => {
    it('should return false for empty node', () => {
      const node = new Node(1, 'DIV');
      assert.strictEqual(node.hasChildNodes(), false);
    });

    it('should return true when has children', () => {
      const parent = new Node(1, 'DIV');
      parent.appendChild(new Node(1, 'SPAN'));
      assert.strictEqual(parent.hasChildNodes(), true);
    });
  });

  // === Node: contains ===
  describe('Node.contains', () => {
    it('should return true for self', () => {
      const node = new Node(1, 'DIV');
      assert.strictEqual(node.contains(node), true);
    });

    it('should return true for direct child', () => {
      const parent = new Node(1, 'DIV');
      const child = new Node(1, 'SPAN');
      parent.appendChild(child);
      assert.strictEqual(parent.contains(child), true);
    });

    it('should return true for deeply nested descendant', () => {
      const root = new Node(1, 'DIV');
      const mid = new Node(1, 'SECTION');
      const leaf = new Node(1, 'P');
      root.appendChild(mid);
      mid.appendChild(leaf);
      assert.strictEqual(root.contains(leaf), true);
    });

    it('should return false for non-descendant', () => {
      const a = new Node(1, 'DIV');
      const b = new Node(1, 'SPAN');
      assert.strictEqual(a.contains(b), false);
    });

    it('should return false for parent', () => {
      const parent = new Node(1, 'DIV');
      const child = new Node(1, 'SPAN');
      parent.appendChild(child);
      assert.strictEqual(child.contains(parent), false);
    });
  });

  // === Node: insertBefore ===
  describe('Node.insertBefore', () => {
    it('should insert before a reference child', () => {
      const parent = new Node(1, 'DIV');
      const a = new Node(1, 'A');
      const b = new Node(1, 'B');
      parent.appendChild(b);
      parent.insertBefore(a, b);
      assert.strictEqual(parent.childNodes.length, 2);
      assert.strictEqual(parent.childNodes[0], a);
      assert.strictEqual(parent.childNodes[1], b);
      assert.strictEqual(a.parentNode, parent);
    });

    it('should append when referenceChild is null', () => {
      const parent = new Node(1, 'DIV');
      const a = new Node(1, 'A');
      const b = new Node(1, 'B');
      parent.appendChild(a);
      parent.insertBefore(b, null);
      assert.strictEqual(parent.childNodes.length, 2);
      assert.strictEqual(parent.childNodes[1], b);
    });

    it('should throw when referenceChild is not a child', () => {
      const parent = new Node(1, 'DIV');
      const a = new Node(1, 'A');
      const notChild = new Node(1, 'X');
      assert.throws(() => parent.insertBefore(a, notChild), /not found/i);
    });

    it('should insert in the middle', () => {
      const parent = new Node(1, 'DIV');
      const a = new Node(1, 'A');
      const b = new Node(1, 'B');
      const c = new Node(1, 'C');
      parent.appendChild(a);
      parent.appendChild(c);
      parent.insertBefore(b, c);
      assert.strictEqual(parent.childNodes[0], a);
      assert.strictEqual(parent.childNodes[1], b);
      assert.strictEqual(parent.childNodes[2], c);
    });
  });

  // === Node: replaceChild ===
  describe('Node.replaceChild', () => {
    it('should replace an existing child', () => {
      const parent = new Node(1, 'DIV');
      const old = new Node(1, 'OLD');
      const replacement = new Node(1, 'NEW');
      parent.appendChild(old);
      const returned = parent.replaceChild(replacement, old);
      assert.strictEqual(returned, old);
      assert.strictEqual(parent.childNodes.length, 1);
      assert.strictEqual(parent.childNodes[0], replacement);
      assert.strictEqual(replacement.parentNode, parent);
      assert.strictEqual(old.parentNode, null);
    });

    it('should throw when oldChild is not a child', () => {
      const parent = new Node(1, 'DIV');
      const notChild = new Node(1, 'X');
      const replacement = new Node(1, 'Y');
      assert.throws(
        () => parent.replaceChild(replacement, notChild),
        /not found/i,
      );
    });

    it('should preserve position among siblings', () => {
      const parent = new Node(1, 'DIV');
      const a = new Node(1, 'A');
      const b = new Node(1, 'B');
      const c = new Node(1, 'C');
      const newB = new Node(1, 'NEWB');
      parent.appendChild(a);
      parent.appendChild(b);
      parent.appendChild(c);
      parent.replaceChild(newB, b);
      assert.strictEqual(parent.childNodes[0], a);
      assert.strictEqual(parent.childNodes[1], newB);
      assert.strictEqual(parent.childNodes[2], c);
    });
  });

  // === Node: cloneNode ===
  describe('Node.cloneNode', () => {
    it('should shallow clone a basic Node', () => {
      const node = new Node(1, 'DIV');
      node.appendChild(new Node(1, 'SPAN'));
      const clone = node.cloneNode(false);
      assert.strictEqual(clone.nodeType, 1);
      assert.strictEqual(clone.nodeName, 'DIV');
      assert.strictEqual(clone.childNodes.length, 0);
      assert.strictEqual(clone.parentNode, null);
      assert.notStrictEqual(clone, node);
    });

    it('should deep clone a Node with children', () => {
      const parent = new Node(1, 'DIV');
      const child = new Node(1, 'SPAN');
      parent.appendChild(child);
      const clone = parent.cloneNode(true);
      assert.strictEqual(clone.childNodes.length, 1);
      assert.strictEqual(clone.childNodes[0].nodeName, 'SPAN');
      assert.notStrictEqual(clone.childNodes[0], child);
      assert.strictEqual(clone.childNodes[0].parentNode, clone);
      assert.strictEqual(clone.parentNode, null);
    });

    it('should clone a TextNode', () => {
      const text = new TextNode('hello');
      const clone = text.cloneNode();
      assert.ok(clone instanceof TextNode);
      assert.strictEqual((clone as TextNode).data, 'hello');
      assert.notStrictEqual(clone, text);
    });

    it('should clone an Element with attributes, id, className', () => {
      const el = new Element('div');
      el.setAttribute('id', 'myId');
      el.setAttribute('class', 'foo bar');
      el.setAttribute('data-x', '42');
      const clone = el.cloneNode(false) as Element;
      assert.ok(clone instanceof Element);
      assert.strictEqual(clone.tagName, 'DIV');
      assert.strictEqual(clone.id, 'myId');
      assert.strictEqual(clone.className, 'foo bar');
      assert.strictEqual(clone.getAttribute('data-x'), '42');
      assert.strictEqual(clone.childNodes.length, 0);
    });

    it('should deep clone an Element with children', () => {
      const parent = new Element('ul');
      const li1 = new Element('li');
      li1.textContent = 'one';
      const li2 = new Element('li');
      li2.textContent = 'two';
      parent.appendChild(li1);
      parent.appendChild(li2);
      const clone = parent.cloneNode(true) as Element;
      assert.strictEqual(clone.childNodes.length, 2);
      assert.strictEqual(clone.childNodes[0].textContent, 'one');
      assert.strictEqual(clone.childNodes[1].textContent, 'two');
      assert.notStrictEqual(clone.childNodes[0], li1);
      assert.notStrictEqual(clone.childNodes[1], li2);
    });

    it('should default to shallow clone', () => {
      const parent = new Node(1, 'DIV');
      parent.appendChild(new Node(1, 'SPAN'));
      const clone = parent.cloneNode();
      assert.strictEqual(clone.childNodes.length, 0);
    });
  });

  // === Element: getElementsByTagName ===
  describe('Element.getElementsByTagName', () => {
    it('should find elements by tag name (case-insensitive)', () => {
      const root = new Element('div');
      const span1 = new Element('span');
      const span2 = new Element('span');
      const p = new Element('p');
      root.appendChild(span1);
      root.appendChild(p);
      p.appendChild(span2);
      const result = root.getElementsByTagName('span');
      assert.strictEqual(result.length, 2);
      assert.strictEqual(result.item(0), span1);
      assert.strictEqual(result.item(1), span2);
    });

    it('should be case-insensitive', () => {
      const root = new Element('div');
      const span = new Element('SPAN');
      root.appendChild(span);
      assert.strictEqual(root.getElementsByTagName('span').length, 1);
      assert.strictEqual(root.getElementsByTagName('SPAN').length, 1);
    });

    it('should support wildcard *', () => {
      const root = new Element('div');
      const span = new Element('span');
      const p = new Element('p');
      root.appendChild(span);
      root.appendChild(p);
      const result = root.getElementsByTagName('*');
      assert.strictEqual(result.length, 2);
    });

    it('should return empty array when no match', () => {
      const root = new Element('div');
      assert.strictEqual(root.getElementsByTagName('span').length, 0);
    });

    it('should not include the element itself', () => {
      const div = new Element('div');
      const result = div.getElementsByTagName('div');
      assert.strictEqual(result.length, 0);
    });
  });

  // === Element: getElementsByClassName ===
  describe('Element.getElementsByClassName', () => {
    it('should find elements by single class name', () => {
      const root = new Element('div');
      const a = new Element('span');
      a.className = 'foo';
      const b = new Element('p');
      b.className = 'bar';
      root.appendChild(a);
      root.appendChild(b);
      const result = root.getElementsByClassName('foo');
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0], a);
    });

    it('should find elements with multiple space-separated classes', () => {
      const root = new Element('div');
      const a = new Element('span');
      a.className = 'foo bar baz';
      const b = new Element('p');
      b.className = 'foo';
      root.appendChild(a);
      root.appendChild(b);
      // searching for "foo bar" means element must have both
      const result = root.getElementsByClassName('foo bar');
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0], a);
    });

    it('should return empty array when no match', () => {
      const root = new Element('div');
      assert.strictEqual(root.getElementsByClassName('nope').length, 0);
    });

    it('should search nested descendants', () => {
      const root = new Element('div');
      const mid = new Element('section');
      const leaf = new Element('span');
      leaf.className = 'target';
      root.appendChild(mid);
      mid.appendChild(leaf);
      const result = root.getElementsByClassName('target');
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0], leaf);
    });
  });

  // === Document methods ===
  describe('Document.getElementsByTagName', () => {
    it('should search the whole document', () => {
      const doc = new Document();
      const html = doc.createElement('html');
      const body = doc.createElement('body');
      const div = doc.createElement('div');
      doc.appendChild(html);
      html.appendChild(body);
      body.appendChild(div);
      const result = doc.getElementsByTagName('div');
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0], div);
    });
  });

  describe('Document.getElementsByClassName', () => {
    it('should search the whole document', () => {
      const doc = new Document();
      const html = doc.createElement('html');
      const body = doc.createElement('body');
      const div = doc.createElement('div');
      div.className = 'myclass';
      doc.appendChild(html);
      html.appendChild(body);
      body.appendChild(div);
      const result = doc.getElementsByClassName('myclass');
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0], div);
    });
  });

  describe('Document.createDocumentFragment', () => {
    it('should return a Node with nodeType 11', () => {
      const doc = new Document();
      const frag = doc.createDocumentFragment();
      assert.strictEqual(frag.nodeType, 11);
    });

    it('should be able to hold children', () => {
      const doc = new Document();
      const frag = doc.createDocumentFragment();
      const div = doc.createElement('div');
      frag.appendChild(div);
      assert.strictEqual(frag.childNodes.length, 1);
    });
  });

  describe('Document.body', () => {
    it('should return null when no body', () => {
      const doc = new Document();
      assert.strictEqual(doc.body, null);
    });

    it('should find the body element', () => {
      const doc = new Document();
      const html = doc.createElement('html');
      const body = doc.createElement('body');
      doc.appendChild(html);
      html.appendChild(body);
      assert.strictEqual(doc.body, body);
    });
  });

  describe('Document.documentElement', () => {
    it('should return null when no html element', () => {
      const doc = new Document();
      assert.strictEqual(doc.documentElement, null);
    });

    it('should find the html element', () => {
      const doc = new Document();
      const html = doc.createElement('html');
      doc.appendChild(html);
      assert.strictEqual(doc.documentElement, html);
    });
  });
});
