import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Document } from '../../src/dom/index.js';
import { Comment } from '../../src/dom/index.js';

describe('Comment', () => {
  it('should have nodeType 8', () => {
    const c = new Comment('hello');
    assert.strictEqual(c.nodeType, 8);
  });

  it('should have nodeName #comment', () => {
    const c = new Comment('hello');
    assert.strictEqual(c.nodeName, '#comment');
  });

  it('should have data property', () => {
    const c = new Comment('some comment');
    assert.strictEqual(c.data, 'some comment');
  });

  it('should have textContent equal to data', () => {
    const c = new Comment('text');
    assert.strictEqual(c.textContent, 'text');
  });

  it('should be cloneable', () => {
    const c = new Comment('original');
    const clone = c.cloneNode();
    assert.ok(clone instanceof Comment);
    assert.strictEqual((clone as Comment).data, 'original');
    assert.notStrictEqual(clone, c);
  });
});

describe('Document.createComment', () => {
  it('should create a Comment node', () => {
    const doc = new Document();
    const comment = doc.createComment('test comment');
    assert.ok(comment instanceof Comment);
    assert.strictEqual(comment.data, 'test comment');
    assert.strictEqual(comment.nodeType, 8);
  });
});

describe('Document.createDocumentFragment', () => {
  it('should create a document fragment', () => {
    const doc = new Document();
    const frag = doc.createDocumentFragment();
    assert.strictEqual(frag.nodeType, 11);
    assert.strictEqual(frag.nodeName, '#document-fragment');
  });

  it('should support appending children', () => {
    const doc = new Document();
    const frag = doc.createDocumentFragment();
    const el = doc.createElement('div');
    frag.appendChild(el);
    assert.strictEqual(frag.childNodes.length, 1);
  });
});

describe('Document.createEvent', () => {
  it('should create a basic Event', () => {
    const doc = new Document();
    const ev = doc.createEvent('Event');
    assert.ok(ev !== null && ev !== undefined);
    assert.strictEqual(ev.type, '');
  });

  it('should create a CustomEvent', () => {
    const doc = new Document();
    const ev = doc.createEvent('CustomEvent');
    assert.ok(ev !== null && ev !== undefined);
  });
});

describe('Document.head', () => {
  it('should return the head element', () => {
    const doc = new Document();
    const html = doc.createElement('html');
    const head = doc.createElement('head');
    const body = doc.createElement('body');
    doc.appendChild(html);
    html.appendChild(head);
    html.appendChild(body);
    assert.strictEqual(doc.head, head);
  });

  it('should return null when no head exists', () => {
    const doc = new Document();
    assert.strictEqual(doc.head, null);
  });
});

describe('Document.title', () => {
  it('should get title from title element', () => {
    const doc = new Document();
    const html = doc.createElement('html');
    const head = doc.createElement('head');
    const title = doc.createElement('title');
    doc.appendChild(html);
    html.appendChild(head);
    head.appendChild(title);
    title.textContent = 'My Page';
    assert.strictEqual(doc.title, 'My Page');
  });

  it('should return empty string when no title element', () => {
    const doc = new Document();
    assert.strictEqual(doc.title, '');
  });

  it('should set title creating title element if needed', () => {
    const doc = new Document();
    const html = doc.createElement('html');
    const head = doc.createElement('head');
    doc.appendChild(html);
    html.appendChild(head);
    doc.title = 'New Title';
    assert.strictEqual(doc.title, 'New Title');
  });

  it('should update existing title element', () => {
    const doc = new Document();
    const html = doc.createElement('html');
    const head = doc.createElement('head');
    const title = doc.createElement('title');
    doc.appendChild(html);
    html.appendChild(head);
    head.appendChild(title);
    title.textContent = 'Old Title';
    doc.title = 'New Title';
    assert.strictEqual(doc.title, 'New Title');
  });
});
