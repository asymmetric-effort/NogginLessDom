import { describe, it, expect } from '../../src/index.js';
import { Document, Element, Event, TextNode } from '../../src/dom/index.js';

describe('Document.adoptNode', () => {
  it('removes node from current parent and returns it', () => {
    const doc = new Document();
    const parent = new Element('div');
    const child = new Element('span');
    parent.appendChild(child);
    doc.appendChild(parent);

    const adopted = doc.adoptNode(child);
    expect(adopted).toBe(child);
    expect(child.parentNode).toBe(null);
    expect(parent.childNodes.length).toBe(0);
  });

  it('returns node when it has no parent', () => {
    const doc = new Document();
    const el = new Element('div');
    const adopted = doc.adoptNode(el);
    expect(adopted).toBe(el);
  });

  it('works with text nodes', () => {
    const doc = new Document();
    const parent = new Element('div');
    const text = new TextNode('hello');
    parent.appendChild(text);

    const adopted = doc.adoptNode(text);
    expect(adopted).toBe(text);
    expect(text.parentNode).toBe(null);
    expect(parent.childNodes.length).toBe(0);
  });
});

describe('Document.importNode', () => {
  it('returns a shallow clone by default', () => {
    const doc = new Document();
    const el = new Element('div');
    el.setAttribute('id', 'test');
    const child = new Element('span');
    el.appendChild(child);

    const imported = doc.importNode(el) as Element;
    expect(imported).not.toBe(el);
    expect(imported.tagName).toBe('DIV');
    expect(imported.getAttribute('id')).toBe('test');
    expect(imported.childNodes.length).toBe(0); // shallow
  });

  it('returns a deep clone when deep=true', () => {
    const doc = new Document();
    const el = new Element('div');
    el.setAttribute('class', 'container');
    const child = new Element('span');
    child.setAttribute('class', 'inner');
    el.appendChild(child);

    const imported = doc.importNode(el, true) as Element;
    expect(imported).not.toBe(el);
    expect(imported.childNodes.length).toBe(1);
    const importedChild = imported.childNodes[0] as Element;
    expect(importedChild.tagName).toBe('SPAN');
    expect(importedChild.getAttribute('class')).toBe('inner');
    expect(importedChild).not.toBe(child);
  });

  it('works with text nodes', () => {
    const doc = new Document();
    const text = new TextNode('hello');
    const imported = doc.importNode(text) as TextNode;
    expect(imported).not.toBe(text);
    expect(imported.data).toBe('hello');
  });
});

describe('Document.createEvent', () => {
  it('returns an Event instance', () => {
    const doc = new Document();
    const event = doc.createEvent('MouseEvent');
    expect(event).toBeInstanceOf(Event);
  });

  it('returns event with empty type', () => {
    const doc = new Document();
    const event = doc.createEvent('Event');
    expect(event.type).toBe('');
  });

  it('works with any string argument', () => {
    const doc = new Document();
    const event = doc.createEvent('CustomEvent');
    expect(event).toBeInstanceOf(Event);
  });
});
