import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Document } from '../../src/dom/index.js';

describe('TextNode doubling bug (issue #11)', () => {
  it('should not double text when a TextNode is appended via appendChild', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    const text = doc.createTextNode('hello');
    div.appendChild(text);
    assert.strictEqual(div.innerHTML, 'hello');
  });

  it('should not double text with multiple text nodes', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    div.appendChild(doc.createTextNode('hello'));
    div.appendChild(doc.createTextNode(' world'));
    assert.strictEqual(div.innerHTML, 'hello world');
  });

  it('should serialize a single TextNode child correctly in outerHTML', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    div.appendChild(doc.createTextNode('hello'));
    assert.strictEqual(div.outerHTML, '<div>hello</div>');
  });

  it('should have correct childNodes count after appending a TextNode', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    const text = doc.createTextNode('hello');
    div.appendChild(text);
    assert.strictEqual(div.childNodes.length, 1);
    assert.strictEqual(div.childNodes[0], text);
  });

  it('should return correct textContent after appending a TextNode', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    div.appendChild(doc.createTextNode('hello'));
    assert.strictEqual(div.textContent, 'hello');
  });

  it('should handle TextNode inside nested elements without doubling', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    const span = doc.createElement('span');
    span.appendChild(doc.createTextNode('nested'));
    div.appendChild(span);
    assert.strictEqual(div.innerHTML, '<span>nested</span>');
  });
});
