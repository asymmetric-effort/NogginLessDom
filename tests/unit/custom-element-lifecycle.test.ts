import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Document, Element } from '../../src/dom/index.js';

describe('Custom Element Lifecycle Hooks', () => {
  describe('connectedCallback', () => {
    it('should fire connectedCallback on appendChild', () => {
      const doc = new Document();
      const body = doc.createElement('body');
      doc.appendChild(body);

      let connected = false;

      class MyEl extends Element {
        constructor() {
          super('my-el');
        }
        connectedCallback(): void {
          connected = true;
        }
      }

      doc.customElements.define('my-el', MyEl);
      const el = doc.createElement('my-el');
      body.appendChild(el);

      assert.strictEqual(connected, true);
    });

    it('should fire connectedCallback on insertBefore', () => {
      const doc = new Document();
      const body = doc.createElement('body');
      doc.appendChild(body);
      const ref = doc.createElement('div');
      body.appendChild(ref);

      let connected = false;

      class InsEl extends Element {
        constructor() {
          super('ins-el');
        }
        connectedCallback(): void {
          connected = true;
        }
      }

      doc.customElements.define('ins-el', InsEl);
      const el = doc.createElement('ins-el');
      body.insertBefore(el, ref);

      assert.strictEqual(connected, true);
    });

    it('should fire connectedCallback on insertBefore with null reference (falls through to appendChild)', () => {
      const doc = new Document();
      const body = doc.createElement('body');
      doc.appendChild(body);

      let connected = false;

      class NullRefEl extends Element {
        constructor() {
          super('null-ref-el');
        }
        connectedCallback(): void {
          connected = true;
        }
      }

      doc.customElements.define('null-ref-el', NullRefEl);
      const el = doc.createElement('null-ref-el');
      body.insertBefore(el, null);

      assert.strictEqual(connected, true);
    });
  });

  describe('disconnectedCallback', () => {
    it('should fire disconnectedCallback on removeChild', () => {
      const doc = new Document();
      const body = doc.createElement('body');
      doc.appendChild(body);

      let disconnected = false;

      class RemEl extends Element {
        constructor() {
          super('rem-el');
        }
        disconnectedCallback(): void {
          disconnected = true;
        }
      }

      doc.customElements.define('rem-el', RemEl);
      const el = doc.createElement('rem-el');
      body.appendChild(el);
      body.removeChild(el);

      assert.strictEqual(disconnected, true);
    });

    it('should fire disconnectedCallback on replaceChild for the old child', () => {
      const doc = new Document();
      const body = doc.createElement('body');
      doc.appendChild(body);

      let disconnected = false;

      class OldEl extends Element {
        constructor() {
          super('old-el');
        }
        disconnectedCallback(): void {
          disconnected = true;
        }
      }

      doc.customElements.define('old-el', OldEl);
      const oldEl = doc.createElement('old-el');
      body.appendChild(oldEl);

      const newEl = doc.createElement('div');
      body.replaceChild(newEl, oldEl);

      assert.strictEqual(disconnected, true);
    });

    it('should fire connectedCallback on replaceChild for the new child', () => {
      const doc = new Document();
      const body = doc.createElement('body');
      doc.appendChild(body);

      let connected = false;

      class NewEl extends Element {
        constructor() {
          super('new-el');
        }
        connectedCallback(): void {
          connected = true;
        }
      }

      doc.customElements.define('new-el', NewEl);
      const oldEl = doc.createElement('div');
      body.appendChild(oldEl);

      const newEl = doc.createElement('new-el');
      body.replaceChild(newEl, oldEl);

      assert.strictEqual(connected, true);
    });
  });

  describe('attributeChangedCallback', () => {
    it('should fire attributeChangedCallback for observed attributes on setAttribute', () => {
      const doc = new Document();
      const calls: Array<[string, string | null, string]> = [];

      class AttrEl extends Element {
        static observedAttributes = ['data-x', 'data-y'];
        constructor() {
          super('attr-el');
        }
        attributeChangedCallback(
          name: string,
          oldValue: string | null,
          newValue: string,
        ): void {
          calls.push([name, oldValue, newValue]);
        }
      }

      doc.customElements.define('attr-el', AttrEl);
      const el = doc.createElement('attr-el');

      el.setAttribute('data-x', 'hello');
      assert.strictEqual(calls.length, 1);
      assert.deepStrictEqual(calls[0], ['data-x', null, 'hello']);

      el.setAttribute('data-x', 'world');
      assert.strictEqual(calls.length, 2);
      assert.deepStrictEqual(calls[1], ['data-x', 'hello', 'world']);
    });

    it('should NOT fire attributeChangedCallback for non-observed attributes', () => {
      const doc = new Document();
      let called = false;

      class NoObsEl extends Element {
        static observedAttributes = ['data-x'];
        constructor() {
          super('no-obs-el');
        }
        attributeChangedCallback(
          _name: string,
          _oldValue: string | null,
          _newValue: string,
        ): void {
          called = true;
        }
      }

      doc.customElements.define('no-obs-el', NoObsEl);
      const el = doc.createElement('no-obs-el');

      el.setAttribute('data-z', 'nope');
      assert.strictEqual(called, false);
    });

    it('should fire attributeChangedCallback on removeAttribute with newValue as null', () => {
      const doc = new Document();
      const calls: Array<[string, string | null, string | null]> = [];

      class RemAttrEl extends Element {
        static observedAttributes = ['data-x'];
        constructor() {
          super('rem-attr-el');
        }
        attributeChangedCallback(
          name: string,
          oldValue: string | null,
          newValue: string | null,
        ): void {
          calls.push([name, oldValue, newValue]);
        }
      }

      doc.customElements.define('rem-attr-el', RemAttrEl);
      const el = doc.createElement('rem-attr-el');

      el.setAttribute('data-x', 'val');
      el.removeAttribute('data-x');

      assert.strictEqual(calls.length, 2);
      assert.deepStrictEqual(calls[1], ['data-x', 'val', null]);
    });

    it('should receive correct arguments: name, oldValue, newValue', () => {
      const doc = new Document();
      const calls: Array<[string, string | null, string | null]> = [];

      class ArgEl extends Element {
        static observedAttributes = ['title', 'lang'];
        constructor() {
          super('arg-el');
        }
        attributeChangedCallback(
          name: string,
          oldValue: string | null,
          newValue: string | null,
        ): void {
          calls.push([name, oldValue, newValue]);
        }
      }

      doc.customElements.define('arg-el', ArgEl);
      const el = doc.createElement('arg-el');

      el.setAttribute('title', 'first');
      el.setAttribute('lang', 'en');
      el.setAttribute('title', 'second');

      assert.strictEqual(calls.length, 3);
      assert.deepStrictEqual(calls[0], ['title', null, 'first']);
      assert.deepStrictEqual(calls[1], ['lang', null, 'en']);
      assert.deepStrictEqual(calls[2], ['title', 'first', 'second']);
    });

    it('should not fire if element has no observedAttributes static property', () => {
      const doc = new Document();
      let called = false;

      class NoStaticEl extends Element {
        constructor() {
          super('no-static-el');
        }
        attributeChangedCallback(
          _name: string,
          _oldValue: string | null,
          _newValue: string | null,
        ): void {
          called = true;
        }
      }

      doc.customElements.define('no-static-el', NoStaticEl);
      const el = doc.createElement('no-static-el');

      el.setAttribute('foo', 'bar');
      assert.strictEqual(called, false);
    });
  });
});
