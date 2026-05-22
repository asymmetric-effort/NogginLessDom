import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Document } from '../../src/dom/index.js';
import { createWindow } from '../../src/dom/window.js';

describe('Document properties (issue #28)', () => {
  describe('readyState', () => {
    it('should default to "complete"', () => {
      const doc = new Document();
      assert.strictEqual(doc.readyState, 'complete');
    });

    it('should be writable', () => {
      const doc = new Document();
      doc.readyState = 'loading';
      assert.strictEqual(doc.readyState, 'loading');
    });
  });

  describe('visibilityState', () => {
    it('should default to "visible"', () => {
      const doc = new Document();
      assert.strictEqual(doc.visibilityState, 'visible');
    });

    it('should be writable', () => {
      const doc = new Document();
      doc.visibilityState = 'hidden';
      assert.strictEqual(doc.visibilityState, 'hidden');
    });
  });

  describe('hidden', () => {
    it('should return false when visibilityState is "visible"', () => {
      const doc = new Document();
      assert.strictEqual(doc.hidden, false);
    });

    it('should return true when visibilityState is "hidden"', () => {
      const doc = new Document();
      doc.visibilityState = 'hidden';
      assert.strictEqual(doc.hidden, true);
    });
  });

  describe('activeElement', () => {
    it('should default to null', () => {
      const doc = new Document();
      assert.strictEqual(doc.activeElement, null);
    });

    it('should track focused element via focus()', () => {
      const doc = new Document();
      const input = doc.createElement('input');
      const body = doc.createElement('body');
      doc.appendChild(body);
      body.appendChild(input);
      input.focus();
      assert.strictEqual(doc.activeElement, input);
    });

    it('should clear on blur()', () => {
      const doc = new Document();
      const input = doc.createElement('input');
      const body = doc.createElement('body');
      doc.appendChild(body);
      body.appendChild(input);
      input.focus();
      assert.strictEqual(doc.activeElement, input);
      input.blur();
      assert.strictEqual(doc.activeElement, null);
    });
  });

  describe('contentType', () => {
    it('should default to "text/html"', () => {
      const doc = new Document();
      assert.strictEqual(doc.contentType, 'text/html');
    });
  });

  describe('characterSet / charset / inputEncoding', () => {
    it('should default to "UTF-8"', () => {
      const doc = new Document();
      assert.strictEqual(doc.characterSet, 'UTF-8');
    });

    it('charset should alias characterSet', () => {
      const doc = new Document();
      assert.strictEqual(doc.charset, 'UTF-8');
      assert.strictEqual(doc.charset, doc.characterSet);
    });

    it('inputEncoding should alias characterSet', () => {
      const doc = new Document();
      assert.strictEqual(doc.inputEncoding, 'UTF-8');
      assert.strictEqual(doc.inputEncoding, doc.characterSet);
    });
  });

  describe('URL / documentURI', () => {
    it('should default to "about:blank"', () => {
      const doc = new Document();
      assert.strictEqual(doc.URL, 'about:blank');
    });

    it('documentURI should alias URL', () => {
      const doc = new Document();
      assert.strictEqual(doc.documentURI, 'about:blank');
      assert.strictEqual(doc.documentURI, doc.URL);
    });
  });

  describe('domain', () => {
    it('should default to empty string', () => {
      const doc = new Document();
      assert.strictEqual(doc.domain, '');
    });
  });

  describe('referrer', () => {
    it('should default to empty string', () => {
      const doc = new Document();
      assert.strictEqual(doc.referrer, '');
    });
  });

  describe('lastModified', () => {
    it('should return a date string', () => {
      const doc = new Document();
      const lastMod = doc.lastModified;
      assert.strictEqual(typeof lastMod, 'string');
      assert.ok(lastMod.length > 0);
    });
  });

  describe('defaultView', () => {
    it('should default to null', () => {
      const doc = new Document();
      assert.strictEqual(doc.defaultView, null);
    });

    it('should be set by createWindow()', () => {
      const win = createWindow();
      assert.strictEqual(win.document.defaultView, win);
    });
  });
});
