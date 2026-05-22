/**
 * Tests for DOM bugs batch 1: #84, #85, #86, #88, #89
 */
import { describe, it, expect } from 'bun:test';
import { Document, Element } from '../../src/dom/index.js';
import { createWindow } from '../../src/dom/window.js';
import {
  HTMLInputElement,
  HTMLSelectElement,
  HTMLButtonElement,
  HTMLTextAreaElement,
} from '../../src/dom/html-elements.js';

describe('#84: appendChild moves node if already has parent', () => {
  it('should remove child from old parent before appending to new parent', () => {
    const doc = new Document();
    const parent1 = doc.createElement('div');
    const parent2 = doc.createElement('div');
    const child = doc.createElement('span');

    parent1.appendChild(child);
    expect(child.parentNode).toBe(parent1);
    expect(parent1.childNodes.length).toBe(1);

    parent2.appendChild(child);
    expect(child.parentNode).toBe(parent2);
    expect(parent2.childNodes.length).toBe(1);
    expect(parent1.childNodes.length).toBe(0);
  });

  it('should not duplicate when appending to the same parent', () => {
    const doc = new Document();
    const parent = doc.createElement('div');
    const child = doc.createElement('span');

    parent.appendChild(child);
    parent.appendChild(child);
    expect(parent.childNodes.length).toBe(1);
    expect(child.parentNode).toBe(parent);
  });
});

describe('#85: className and id setters reflect to getAttribute', () => {
  it('id setter reflects to getAttribute', () => {
    const doc = new Document();
    const el = doc.createElement('div');
    el.id = 'foo';
    expect(el.getAttribute('id')).toBe('foo');
  });

  it('className setter reflects to getAttribute', () => {
    const doc = new Document();
    const el = doc.createElement('div');
    el.className = 'bar baz';
    expect(el.getAttribute('class')).toBe('bar baz');
  });

  it('setAttribute id reflects to .id', () => {
    const doc = new Document();
    const el = doc.createElement('div');
    el.setAttribute('id', 'test');
    expect(el.id).toBe('test');
  });

  it('setAttribute class reflects to .className', () => {
    const doc = new Document();
    const el = doc.createElement('div');
    el.setAttribute('class', 'test-class');
    expect(el.className).toBe('test-class');
  });
});

describe('#86: createWindow document has body', () => {
  it('should have document.body after createWindow', () => {
    const win = createWindow();
    expect(win.document.body).not.toBeNull();
    expect(win.document.body!.tagName).toBe('BODY');
  });

  it('should have document.documentElement after createWindow', () => {
    const win = createWindow();
    expect(win.document.documentElement).not.toBeNull();
    expect(win.document.documentElement!.tagName).toBe('HTML');
  });

  it('should have document.head after createWindow', () => {
    const win = createWindow();
    expect(win.document.head).not.toBeNull();
    expect(win.document.head!.tagName).toBe('HEAD');
  });

  it('should have correct structure: html > head + body', () => {
    const win = createWindow();
    const html = win.document.documentElement!;
    expect(html.childNodes.length).toBe(2);
    expect((html.childNodes[0] as Element).tagName).toBe('HEAD');
    expect((html.childNodes[1] as Element).tagName).toBe('BODY');
  });
});

describe('#88: boolean property setters reflect to attributes', () => {
  it('input.disabled = true sets attribute', () => {
    const input = new HTMLInputElement();
    input.disabled = true;
    expect(input.hasAttribute('disabled')).toBe(true);
    expect(input.getAttribute('disabled')).toBe('');
  });

  it('input.disabled = false removes attribute', () => {
    const input = new HTMLInputElement();
    input.disabled = true;
    input.disabled = false;
    expect(input.hasAttribute('disabled')).toBe(false);
  });

  it('input.checked = true sets attribute', () => {
    const input = new HTMLInputElement();
    input.checked = true;
    expect(input.hasAttribute('checked')).toBe(true);
    expect(input.getAttribute('checked')).toBe('');
  });

  it('input.checked = false removes attribute', () => {
    const input = new HTMLInputElement();
    input.checked = true;
    input.checked = false;
    expect(input.hasAttribute('checked')).toBe(false);
  });

  it('input.readOnly = true sets attribute', () => {
    const input = new HTMLInputElement();
    input.readOnly = true;
    expect(input.hasAttribute('readonly')).toBe(true);
  });

  it('input.required = true sets attribute', () => {
    const input = new HTMLInputElement();
    input.required = true;
    expect(input.hasAttribute('required')).toBe(true);
  });

  it('select.disabled reflects to attributes', () => {
    const sel = new HTMLSelectElement();
    sel.disabled = true;
    expect(sel.hasAttribute('disabled')).toBe(true);
    sel.disabled = false;
    expect(sel.hasAttribute('disabled')).toBe(false);
  });

  it('select.multiple reflects to attributes', () => {
    const sel = new HTMLSelectElement();
    sel.multiple = true;
    expect(sel.hasAttribute('multiple')).toBe(true);
    sel.multiple = false;
    expect(sel.hasAttribute('multiple')).toBe(false);
  });

  it('select.required reflects to attributes', () => {
    const sel = new HTMLSelectElement();
    sel.required = true;
    expect(sel.hasAttribute('required')).toBe(true);
    sel.required = false;
    expect(sel.hasAttribute('required')).toBe(false);
  });

  it('button.disabled reflects to attributes', () => {
    const btn = new HTMLButtonElement();
    btn.disabled = true;
    expect(btn.hasAttribute('disabled')).toBe(true);
    btn.disabled = false;
    expect(btn.hasAttribute('disabled')).toBe(false);
  });

  it('textarea.disabled reflects to attributes', () => {
    const ta = new HTMLTextAreaElement();
    ta.disabled = true;
    expect(ta.hasAttribute('disabled')).toBe(true);
    ta.disabled = false;
    expect(ta.hasAttribute('disabled')).toBe(false);
  });

  it('textarea.readOnly reflects to attributes', () => {
    const ta = new HTMLTextAreaElement();
    ta.readOnly = true;
    expect(ta.hasAttribute('readonly')).toBe(true);
    ta.readOnly = false;
    expect(ta.hasAttribute('readonly')).toBe(false);
  });

  it('textarea.required reflects to attributes', () => {
    const ta = new HTMLTextAreaElement();
    ta.required = true;
    expect(ta.hasAttribute('required')).toBe(true);
    ta.required = false;
    expect(ta.hasAttribute('required')).toBe(false);
  });
});

describe('#89: Node.isConnected', () => {
  it('returns true when node is in a document tree', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    doc.appendChild(div);
    expect(div.isConnected).toBe(true);
  });

  it('returns false when node is detached', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    expect(div.isConnected).toBe(false);
  });

  it('returns true for deeply nested node in document', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    const span = doc.createElement('span');
    doc.appendChild(div);
    div.appendChild(span);
    expect(span.isConnected).toBe(true);
  });

  it('returns false after removal from document', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    doc.appendChild(div);
    expect(div.isConnected).toBe(true);
    doc.removeChild(div);
    expect(div.isConnected).toBe(false);
  });

  it('returns true for document itself', () => {
    const doc = new Document();
    expect(doc.isConnected).toBe(true);
  });
});
