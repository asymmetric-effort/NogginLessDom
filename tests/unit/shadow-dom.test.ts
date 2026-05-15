import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Document } from '../../src/dom/index.js';
import { ShadowRoot } from '../../src/dom/shadow.js';

describe('Shadow DOM', () => {
  describe('attachShadow', () => {
    it('should attach a shadow root in open mode', () => {
      const doc = new Document();
      const el = doc.createElement('div');
      const shadow = el.attachShadow({ mode: 'open' });
      assert.ok(shadow instanceof ShadowRoot);
      assert.strictEqual(shadow.mode, 'open');
    });

    it('should attach a shadow root in closed mode', () => {
      const doc = new Document();
      const el = doc.createElement('div');
      const shadow = el.attachShadow({ mode: 'closed' });
      assert.ok(shadow instanceof ShadowRoot);
      assert.strictEqual(shadow.mode, 'closed');
    });

    it('should throw if shadow is already attached', () => {
      const doc = new Document();
      const el = doc.createElement('div');
      el.attachShadow({ mode: 'open' });
      assert.throws(() => el.attachShadow({ mode: 'open' }));
    });

    it('should set host on ShadowRoot', () => {
      const doc = new Document();
      const el = doc.createElement('div');
      const shadow = el.attachShadow({ mode: 'open' });
      assert.strictEqual(shadow.host, el);
    });
  });

  describe('shadowRoot getter', () => {
    it('should return shadow root for open mode', () => {
      const doc = new Document();
      const el = doc.createElement('div');
      const shadow = el.attachShadow({ mode: 'open' });
      assert.strictEqual(el.shadowRoot, shadow);
    });

    it('should return null for closed mode', () => {
      const doc = new Document();
      const el = doc.createElement('div');
      el.attachShadow({ mode: 'closed' });
      assert.strictEqual(el.shadowRoot, null);
    });

    it('should return null if no shadow attached', () => {
      const doc = new Document();
      const el = doc.createElement('div');
      assert.strictEqual(el.shadowRoot, null);
    });
  });

  describe('ShadowRoot innerHTML', () => {
    it('should set and get innerHTML', () => {
      const doc = new Document();
      const el = doc.createElement('div');
      const shadow = el.attachShadow({ mode: 'open' });
      shadow.innerHTML = '<span>hello</span>';
      assert.strictEqual(shadow.innerHTML, '<span>hello</span>');
    });

    it('should clear children when innerHTML is set to empty', () => {
      const doc = new Document();
      const el = doc.createElement('div');
      const shadow = el.attachShadow({ mode: 'open' });
      shadow.innerHTML = '<p>test</p>';
      shadow.innerHTML = '';
      assert.strictEqual(shadow.childNodes.length, 0);
      assert.strictEqual(shadow.innerHTML, '');
    });
  });

  describe('ShadowRoot DOM methods', () => {
    it('should appendChild and removeChild', () => {
      const doc = new Document();
      const el = doc.createElement('div');
      const shadow = el.attachShadow({ mode: 'open' });
      const child = doc.createElement('span');
      shadow.appendChild(child);
      assert.strictEqual(shadow.childNodes.length, 1);
      assert.strictEqual(child.parentNode, shadow);
      shadow.removeChild(child);
      assert.strictEqual(shadow.childNodes.length, 0);
    });

    it('should getElementById', () => {
      const doc = new Document();
      const el = doc.createElement('div');
      const shadow = el.attachShadow({ mode: 'open' });
      const child = doc.createElement('span');
      child.id = 'inner';
      shadow.appendChild(child);
      assert.strictEqual(shadow.getElementById('inner'), child);
      assert.strictEqual(shadow.getElementById('nope'), null);
    });

    it('should querySelector inside shadow', () => {
      const doc = new Document();
      const el = doc.createElement('div');
      const shadow = el.attachShadow({ mode: 'open' });
      shadow.innerHTML = '<div class="a"><span id="b">hi</span></div>';
      const found = shadow.querySelector('#b');
      assert.ok(found);
      assert.strictEqual(found.tagName, 'SPAN');
    });

    it('should querySelectorAll inside shadow', () => {
      const doc = new Document();
      const el = doc.createElement('div');
      const shadow = el.attachShadow({ mode: 'open' });
      shadow.innerHTML = '<p>1</p><p>2</p><p>3</p>';
      const all = shadow.querySelectorAll('p');
      assert.strictEqual(all.length, 3);
    });
  });
});
