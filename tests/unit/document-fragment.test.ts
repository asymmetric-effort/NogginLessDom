import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  Document,
  DocumentFragment,
  Node,
  Element,
} from '../../src/dom/index.js';

describe('DocumentFragment', () => {
  it('should be exported from dom/index', () => {
    assert.ok(DocumentFragment);
  });

  it('should extend Node', () => {
    const frag = new DocumentFragment();
    assert.ok(frag instanceof Node);
    assert.ok(frag instanceof DocumentFragment);
  });

  it('should have nodeType 11', () => {
    const frag = new DocumentFragment();
    assert.strictEqual(frag.nodeType, 11);
  });

  it('should have nodeName "#document-fragment"', () => {
    const frag = new DocumentFragment();
    assert.strictEqual(frag.nodeName, '#document-fragment');
  });

  describe('appendChild / removeChild', () => {
    it('should append children', () => {
      const frag = new DocumentFragment();
      const el = new Element('DIV');
      frag.appendChild(el);
      assert.strictEqual(frag.childNodes.length, 1);
      assert.strictEqual(frag.childNodes[0], el);
    });

    it('should remove children', () => {
      const frag = new DocumentFragment();
      const el = new Element('DIV');
      frag.appendChild(el);
      frag.removeChild(el);
      assert.strictEqual(frag.childNodes.length, 0);
    });
  });

  describe('querySelector', () => {
    it('should find elements by tag name', () => {
      const frag = new DocumentFragment();
      const div = new Element('DIV');
      const span = new Element('SPAN');
      div.appendChild(span);
      frag.appendChild(div);
      const found = frag.querySelector('span');
      assert.strictEqual(found, span);
    });

    it('should return null when no match', () => {
      const frag = new DocumentFragment();
      const div = new Element('DIV');
      frag.appendChild(div);
      const found = frag.querySelector('span');
      assert.strictEqual(found, null);
    });

    it('should find elements by id', () => {
      const frag = new DocumentFragment();
      const div = new Element('DIV');
      div.id = 'test-id';
      frag.appendChild(div);
      const found = frag.querySelector('#test-id');
      assert.strictEqual(found, div);
    });

    it('should find elements by class', () => {
      const frag = new DocumentFragment();
      const div = new Element('DIV');
      div.className = 'my-class';
      frag.appendChild(div);
      const found = frag.querySelector('.my-class');
      assert.strictEqual(found, div);
    });
  });

  describe('querySelectorAll', () => {
    it('should find all matching elements', () => {
      const frag = new DocumentFragment();
      const div1 = new Element('DIV');
      const div2 = new Element('DIV');
      const span = new Element('SPAN');
      frag.appendChild(div1);
      frag.appendChild(div2);
      frag.appendChild(span);
      const found = frag.querySelectorAll('div');
      assert.strictEqual(found.length, 2);
    });

    it('should return empty NodeList when no match', () => {
      const frag = new DocumentFragment();
      const div = new Element('DIV');
      frag.appendChild(div);
      const found = frag.querySelectorAll('span');
      assert.strictEqual(found.length, 0);
    });
  });

  describe('Document.createDocumentFragment', () => {
    it('should return a DocumentFragment instance', () => {
      const doc = new Document();
      const frag = doc.createDocumentFragment();
      assert.ok(frag instanceof DocumentFragment);
      assert.strictEqual(frag.nodeType, 11);
      assert.strictEqual(frag.nodeName, '#document-fragment');
    });

    it('should support querySelector on created fragment', () => {
      const doc = new Document();
      const frag = doc.createDocumentFragment();
      const div = new Element('DIV');
      div.className = 'test';
      frag.appendChild(div);
      const found = frag.querySelector('div');
      assert.strictEqual(found, div);
    });
  });

  it('should be exported from src/index.ts', async () => {
    const mainExports = await import('../../src/index.js');
    assert.ok(mainExports.DocumentFragment);
  });
});
