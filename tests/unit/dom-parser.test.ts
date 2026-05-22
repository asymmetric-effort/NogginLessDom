import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DOMParser, XMLSerializer } from '../../src/dom/dom-parser.js';
import { Document, Element, TextNode } from '../../src/dom/index.js';

describe('DOMParser', () => {
  it('should parse simple HTML to Document', () => {
    const parser = new DOMParser();
    const doc = parser.parseFromString('<div>Hello</div>', 'text/html');
    assert.ok(doc instanceof Document);
  });

  it('should produce correct children from parsed HTML', () => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(
      '<div><span>Hello</span></div>',
      'text/html',
    );
    assert.strictEqual(doc.childNodes.length, 1);
    const div = doc.childNodes[0] as Element;
    assert.strictEqual(div.tagName, 'DIV');
    assert.strictEqual(div.childNodes.length, 1);
    const span = div.childNodes[0] as Element;
    assert.strictEqual(span.tagName, 'SPAN');
    assert.strictEqual(span.textContent, 'Hello');
  });

  it('should throw for unknown mime type', () => {
    const parser = new DOMParser();
    assert.throws(() => {
      parser.parseFromString('<div></div>', 'text/plain' as SupportedMIMEType);
    });
  });

  it('should parse text/xml mime type', () => {
    const parser = new DOMParser();
    const doc = parser.parseFromString('<root><item/></root>', 'text/xml');
    assert.ok(doc instanceof Document);
    assert.strictEqual(doc.childNodes.length, 1);
  });

  it('should parse application/xml mime type', () => {
    const parser = new DOMParser();
    const doc = parser.parseFromString('<root></root>', 'application/xml');
    assert.ok(doc instanceof Document);
  });
});

describe('XMLSerializer', () => {
  it('should serialize element to HTML string', () => {
    const serializer = new XMLSerializer();
    const el = new Element('div');
    el.setAttribute('id', 'test');
    el.appendChild(new TextNode('hi'));
    const result = serializer.serializeToString(el);
    assert.strictEqual(result, '<div id="test">hi</div>');
  });

  it('should serialize document to HTML', () => {
    const parser = new DOMParser();
    const doc = parser.parseFromString('<div>Hello</div>', 'text/html');
    const serializer = new XMLSerializer();
    const result = serializer.serializeToString(doc);
    assert.strictEqual(result, '<div>Hello</div>');
  });
});

describe('Round-trip', () => {
  it('should parse then serialize back to equivalent HTML', () => {
    const html = '<div><span>Hello</span><br></div>';
    const parser = new DOMParser();
    const serializer = new XMLSerializer();
    const doc = parser.parseFromString(html, 'text/html');
    const result = serializer.serializeToString(doc);
    assert.strictEqual(result, html);
  });
});

type SupportedMIMEType = 'text/html' | 'text/xml' | 'application/xml';
