import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Document, Element } from '../../src/dom/index.js';
import {
  HTMLAnchorElement,
  HTMLButtonElement,
  HTMLInputElement,
  HTMLSelectElement,
  HTMLTextAreaElement,
  HTMLFormElement,
  HTMLImageElement,
  HTMLLabelElement,
  HTMLOptionElement,
} from '../../src/dom/html-elements.js';

describe('Typed HTML Elements', () => {
  describe('HTMLAnchorElement', () => {
    it('should have tagName A', () => {
      const a = new HTMLAnchorElement();
      assert.strictEqual(a.tagName, 'A');
    });

    it('should be an instance of Element', () => {
      const a = new HTMLAnchorElement();
      assert.ok(a instanceof Element);
    });

    it('should have default empty string properties', () => {
      const a = new HTMLAnchorElement();
      assert.strictEqual(a.href, '');
      assert.strictEqual(a.target, '');
      assert.strictEqual(a.rel, '');
      assert.strictEqual(a.download, '');
      assert.strictEqual(a.hash, '');
      assert.strictEqual(a.host, '');
      assert.strictEqual(a.hostname, '');
      assert.strictEqual(a.pathname, '');
      assert.strictEqual(a.port, '');
      assert.strictEqual(a.protocol, '');
      assert.strictEqual(a.search, '');
    });

    it('should have text as alias for textContent', () => {
      const a = new HTMLAnchorElement();
      a.textContent = 'Click me';
      assert.strictEqual(a.text, 'Click me');
      a.text = 'New text';
      assert.strictEqual(a.textContent, 'New text');
    });

    it('should set and get href', () => {
      const a = new HTMLAnchorElement();
      a.href = 'https://example.com/path?q=1#hash';
      assert.strictEqual(a.href, 'https://example.com/path?q=1#hash');
    });
  });

  describe('HTMLButtonElement', () => {
    it('should have tagName BUTTON', () => {
      const btn = new HTMLButtonElement();
      assert.strictEqual(btn.tagName, 'BUTTON');
    });

    it('should have correct defaults', () => {
      const btn = new HTMLButtonElement();
      assert.strictEqual(btn.disabled, false);
      assert.strictEqual(btn.type, 'submit');
      assert.strictEqual(btn.name, '');
      assert.strictEqual(btn.value, '');
      assert.strictEqual(btn.form, null);
    });

    it('should allow setting type', () => {
      const btn = new HTMLButtonElement();
      btn.type = 'button';
      assert.strictEqual(btn.type, 'button');
      btn.type = 'reset';
      assert.strictEqual(btn.type, 'reset');
    });

    it('should allow setting disabled', () => {
      const btn = new HTMLButtonElement();
      btn.disabled = true;
      assert.strictEqual(btn.disabled, true);
    });
  });

  describe('HTMLInputElement', () => {
    it('should have tagName INPUT', () => {
      const input = new HTMLInputElement();
      assert.strictEqual(input.tagName, 'INPUT');
    });

    it('should have correct defaults', () => {
      const input = new HTMLInputElement();
      assert.strictEqual(input.type, 'text');
      assert.strictEqual(input.value, '');
      assert.strictEqual(input.name, '');
      assert.strictEqual(input.disabled, false);
      assert.strictEqual(input.checked, false);
      assert.strictEqual(input.placeholder, '');
      assert.strictEqual(input.readOnly, false);
      assert.strictEqual(input.required, false);
      assert.strictEqual(input.min, '');
      assert.strictEqual(input.max, '');
      assert.strictEqual(input.step, '');
      assert.strictEqual(input.pattern, '');
      assert.strictEqual(input.defaultValue, '');
      assert.strictEqual(input.defaultChecked, false);
    });

    it('should allow setting type', () => {
      const input = new HTMLInputElement();
      input.type = 'password';
      assert.strictEqual(input.type, 'password');
      input.type = 'checkbox';
      assert.strictEqual(input.type, 'checkbox');
    });

    it('should dispatch focus event on focus()', () => {
      const input = new HTMLInputElement();
      let focused = false;
      input.addEventListener('focus', () => {
        focused = true;
      });
      input.focus();
      assert.strictEqual(focused, true);
    });

    it('should dispatch blur event on blur()', () => {
      const input = new HTMLInputElement();
      let blurred = false;
      input.addEventListener('blur', () => {
        blurred = true;
      });
      input.blur();
      assert.strictEqual(blurred, true);
    });

    it('should dispatch select event on select()', () => {
      const input = new HTMLInputElement();
      let selected = false;
      input.addEventListener('select', () => {
        selected = true;
      });
      input.select();
      assert.strictEqual(selected, true);
    });

    it('should dispatch click event on click()', () => {
      const input = new HTMLInputElement();
      let clicked = false;
      input.addEventListener('click', () => {
        clicked = true;
      });
      input.click();
      assert.strictEqual(clicked, true);
    });
  });

  describe('HTMLSelectElement', () => {
    it('should have tagName SELECT', () => {
      const select = new HTMLSelectElement();
      assert.strictEqual(select.tagName, 'SELECT');
    });

    it('should have correct defaults', () => {
      const select = new HTMLSelectElement();
      assert.strictEqual(select.name, '');
      assert.strictEqual(select.disabled, false);
      assert.strictEqual(select.multiple, false);
      assert.strictEqual(select.required, false);
      assert.strictEqual(select.selectedIndex, -1);
      assert.strictEqual(select.value, '');
    });

    it('should return options from child option elements', () => {
      const select = new HTMLSelectElement();
      const opt1 = new HTMLOptionElement();
      opt1.value = 'a';
      const opt2 = new HTMLOptionElement();
      opt2.value = 'b';
      select.appendChild(opt1);
      select.appendChild(opt2);
      assert.strictEqual(select.options.length, 2);
      assert.strictEqual(select.options[0], opt1);
      assert.strictEqual(select.options[1], opt2);
    });
  });

  describe('HTMLTextAreaElement', () => {
    it('should have tagName TEXTAREA', () => {
      const ta = new HTMLTextAreaElement();
      assert.strictEqual(ta.tagName, 'TEXTAREA');
    });

    it('should have correct defaults', () => {
      const ta = new HTMLTextAreaElement();
      assert.strictEqual(ta.value, '');
      assert.strictEqual(ta.name, '');
      assert.strictEqual(ta.disabled, false);
      assert.strictEqual(ta.readOnly, false);
      assert.strictEqual(ta.required, false);
      assert.strictEqual(ta.placeholder, '');
      assert.strictEqual(ta.rows, 2);
      assert.strictEqual(ta.cols, 20);
      assert.strictEqual(ta.defaultValue, '');
    });

    it('should allow setting value', () => {
      const ta = new HTMLTextAreaElement();
      ta.value = 'Hello World';
      assert.strictEqual(ta.value, 'Hello World');
    });
  });

  describe('HTMLFormElement', () => {
    it('should have tagName FORM', () => {
      const form = new HTMLFormElement();
      assert.strictEqual(form.tagName, 'FORM');
    });

    it('should have correct defaults', () => {
      const form = new HTMLFormElement();
      assert.strictEqual(form.action, '');
      assert.strictEqual(form.method, 'get');
      assert.strictEqual(form.enctype, 'application/x-www-form-urlencoded');
      assert.strictEqual(form.target, '');
      assert.strictEqual(form.name, '');
    });

    it('should return form control elements from elements getter', () => {
      const form = new HTMLFormElement();
      const input = new HTMLInputElement();
      const button = new HTMLButtonElement();
      const div = new Element('div');
      form.appendChild(input);
      form.appendChild(button);
      form.appendChild(div);
      const elements = form.elements;
      assert.strictEqual(elements.length, 2);
      assert.ok(elements.includes(input));
      assert.ok(elements.includes(button));
    });

    it('should dispatch submit event on submit()', () => {
      const form = new HTMLFormElement();
      let submitted = false;
      form.addEventListener('submit', () => {
        submitted = true;
      });
      form.submit();
      assert.strictEqual(submitted, true);
    });

    it('should dispatch reset event on reset()', () => {
      const form = new HTMLFormElement();
      let wasReset = false;
      form.addEventListener('reset', () => {
        wasReset = true;
      });
      form.reset();
      assert.strictEqual(wasReset, true);
    });
  });

  describe('HTMLImageElement', () => {
    it('should have tagName IMG', () => {
      const img = new HTMLImageElement();
      assert.strictEqual(img.tagName, 'IMG');
    });

    it('should have correct defaults', () => {
      const img = new HTMLImageElement();
      assert.strictEqual(img.src, '');
      assert.strictEqual(img.alt, '');
      assert.strictEqual(img.width, 0);
      assert.strictEqual(img.height, 0);
      assert.strictEqual(img.naturalWidth, 0);
      assert.strictEqual(img.naturalHeight, 0);
      assert.strictEqual(img.complete, false);
    });
  });

  describe('HTMLLabelElement', () => {
    it('should have tagName LABEL', () => {
      const label = new HTMLLabelElement();
      assert.strictEqual(label.tagName, 'LABEL');
    });

    it('should have correct defaults', () => {
      const label = new HTMLLabelElement();
      assert.strictEqual(label.htmlFor, '');
      assert.strictEqual(label.form, null);
      assert.strictEqual(label.control, null);
    });
  });

  describe('HTMLOptionElement', () => {
    it('should have tagName OPTION', () => {
      const opt = new HTMLOptionElement();
      assert.strictEqual(opt.tagName, 'OPTION');
    });

    it('should have correct defaults', () => {
      const opt = new HTMLOptionElement();
      assert.strictEqual(opt.value, '');
      assert.strictEqual(opt.text, '');
      assert.strictEqual(opt.selected, false);
      assert.strictEqual(opt.disabled, false);
      assert.strictEqual(opt.defaultSelected, false);
      assert.strictEqual(opt.index, 0);
      assert.strictEqual(opt.label, '');
    });

    it('should use textContent for text property', () => {
      const opt = new HTMLOptionElement();
      opt.textContent = 'Option 1';
      assert.strictEqual(opt.text, 'Option 1');
    });
  });

  describe('Document.createElement returns typed elements', () => {
    it('should return HTMLAnchorElement for "a"', () => {
      const doc = new Document();
      const el = doc.createElement('a');
      assert.ok(el instanceof HTMLAnchorElement);
    });

    it('should return HTMLButtonElement for "button"', () => {
      const doc = new Document();
      const el = doc.createElement('button');
      assert.ok(el instanceof HTMLButtonElement);
    });

    it('should return HTMLInputElement for "input"', () => {
      const doc = new Document();
      const el = doc.createElement('input');
      assert.ok(el instanceof HTMLInputElement);
    });

    it('should return HTMLSelectElement for "select"', () => {
      const doc = new Document();
      const el = doc.createElement('select');
      assert.ok(el instanceof HTMLSelectElement);
    });

    it('should return HTMLTextAreaElement for "textarea"', () => {
      const doc = new Document();
      const el = doc.createElement('textarea');
      assert.ok(el instanceof HTMLTextAreaElement);
    });

    it('should return HTMLFormElement for "form"', () => {
      const doc = new Document();
      const el = doc.createElement('form');
      assert.ok(el instanceof HTMLFormElement);
    });

    it('should return HTMLImageElement for "img"', () => {
      const doc = new Document();
      const el = doc.createElement('img');
      assert.ok(el instanceof HTMLImageElement);
    });

    it('should return HTMLLabelElement for "label"', () => {
      const doc = new Document();
      const el = doc.createElement('label');
      assert.ok(el instanceof HTMLLabelElement);
    });

    it('should return HTMLOptionElement for "option"', () => {
      const doc = new Document();
      const el = doc.createElement('option');
      assert.ok(el instanceof HTMLOptionElement);
    });

    it('should be case-insensitive', () => {
      const doc = new Document();
      assert.ok(doc.createElement('A') instanceof HTMLAnchorElement);
      assert.ok(doc.createElement('INPUT') instanceof HTMLInputElement);
      assert.ok(doc.createElement('Button') instanceof HTMLButtonElement);
    });

    it('should return plain Element for unknown tags', () => {
      const doc = new Document();
      const el = doc.createElement('div');
      assert.ok(el instanceof Element);
      assert.strictEqual(el.constructor, Element);
    });
  });

  describe('HTMLOptionElement.text', () => {
    it('should get and set text as alias for textContent', () => {
      const opt = new HTMLOptionElement();
      opt.text = 'Hello';
      assert.strictEqual(opt.text, 'Hello');
      assert.strictEqual(opt.textContent, 'Hello');
      opt.textContent = 'World';
      assert.strictEqual(opt.text, 'World');
    });
  });
});
