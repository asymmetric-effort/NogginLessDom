import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createWindow } from '../../src/dom/window.js';
import { HTMLLinkElement } from '../../src/dom/html-elements.js';

describe('External stylesheet loading', () => {
  describe('configureStylesheetLoader', () => {
    it('should accept a sync loader', () => {
      const win = createWindow();
      win.configureStylesheetLoader((_href: string) => '.a { color: red; }');
      assert.ok(win._getStylesheetLoader() !== undefined);
    });

    it('should accept an async loader', () => {
      const win = createWindow();
      win.configureStylesheetLoader(
        async (_href: string) => '.a { color: red; }',
      );
      assert.ok(win._getStylesheetLoader() !== undefined);
    });

    it('should receive the href value', async () => {
      const win = createWindow();
      let receivedHref = '';
      win.configureStylesheetLoader((href: string) => {
        receivedHref = href;
        return '.a { color: red; }';
      });
      await win._loadStylesheet('/styles/main.css');
      assert.equal(receivedHref, '/styles/main.css');
    });
  });

  describe('Loaded styles apply via getComputedStyle', () => {
    it('should apply loaded stylesheet rules', async () => {
      const win = createWindow();
      win.configureStylesheetLoader((_href: string) => {
        return '.test-class { color: blue; }';
      });

      await win._loadStylesheet('/test.css');

      const el = win.document.createElement('div');
      el.className = 'test-class';
      win.document.body!.appendChild(el);

      const computed = win.getComputedStyle(el);
      assert.equal(computed.getPropertyValue('color'), 'blue');
    });

    it('should handle multiple external stylesheets', async () => {
      const win = createWindow();
      const sheets: Record<string, string> = {
        '/a.css': '.a { color: red; }',
        '/b.css': '.b { font-size: 20px; }',
      };
      win.configureStylesheetLoader((href: string) => sheets[href] ?? '');

      await win._loadStylesheet('/a.css');
      await win._loadStylesheet('/b.css');

      const elA = win.document.createElement('div');
      elA.className = 'a';
      win.document.body!.appendChild(elA);

      const elB = win.document.createElement('div');
      elB.className = 'b';
      win.document.body!.appendChild(elB);

      assert.equal(win.getComputedStyle(elA).getPropertyValue('color'), 'red');
      assert.equal(
        win.getComputedStyle(elB).getPropertyValue('font-size'),
        '20px',
      );
    });
  });

  describe('No loader configured = no error', () => {
    it('should silently ignore _loadStylesheet when no loader configured', async () => {
      const win = createWindow();
      // Should not throw
      await win._loadStylesheet('/test.css');
      assert.equal(win._loadedStylesheets.size, 0);
    });

    it('should not fail getComputedStyle without loaded stylesheets', () => {
      const win = createWindow();
      const el = win.document.createElement('div');
      win.document.body!.appendChild(el);
      // Should not throw
      const computed = win.getComputedStyle(el);
      assert.ok(computed);
    });
  });

  describe('Async loader works', () => {
    it('should work with an async loader', async () => {
      const win = createWindow();
      win.configureStylesheetLoader(async (_href: string) => {
        return '.async-class { margin: 10px; }';
      });

      await win._loadStylesheet('/async.css');

      const el = win.document.createElement('div');
      el.className = 'async-class';
      win.document.body!.appendChild(el);

      const computed = win.getComputedStyle(el);
      assert.equal(computed.getPropertyValue('margin-top'), '10px');
    });
  });

  describe('HTMLLinkElement', () => {
    it('should exist in HTML_ELEMENT_MAP', () => {
      const win = createWindow();
      const link = win.document.createElement('link');
      assert.ok(link instanceof HTMLLinkElement);
    });

    it('should have rel and href properties', () => {
      const link = new HTMLLinkElement();
      link.rel = 'stylesheet';
      link.type = 'text/css';
      assert.equal(link.rel, 'stylesheet');
      assert.equal(link.type, 'text/css');
    });

    it('should trigger stylesheet loading when href is set', async () => {
      const win = createWindow();
      let loadedHref = '';
      win.configureStylesheetLoader((href: string) => {
        loadedHref = href;
        return '.link-test { color: green; }';
      });

      const link = win.document.createElement('link') as HTMLLinkElement;
      link.rel = 'stylesheet';
      link.ownerDocument = win.document;
      link.href = '/link-test.css';

      // Allow async loader to complete
      await new Promise((resolve) => setTimeout(resolve, 10));
      assert.equal(loadedHref, '/link-test.css');
    });

    it('should not trigger loading when rel is not stylesheet', () => {
      const win = createWindow();
      let loadCalled = false;
      win.configureStylesheetLoader((_href: string) => {
        loadCalled = true;
        return '';
      });

      const link = win.document.createElement('link') as HTMLLinkElement;
      link.rel = 'icon';
      link.ownerDocument = win.document;
      link.href = '/favicon.ico';

      assert.equal(loadCalled, false);
    });

    it('should not throw if no ownerDocument', () => {
      const link = new HTMLLinkElement();
      link.rel = 'stylesheet';
      // Should not throw
      link.href = '/test.css';
    });

    it('should not throw if no defaultView', async () => {
      const link = new HTMLLinkElement();
      link.rel = 'stylesheet';
      const { Document: Doc } = await import('../../src/dom/index.js');
      const doc = new Doc();
      link.ownerDocument = doc;
      // Should not throw
      link.href = '/test.css';
    });

    it('should not load same stylesheet twice', async () => {
      const win = createWindow();
      let loadCount = 0;
      win.configureStylesheetLoader((_href: string) => {
        loadCount++;
        return '.a { color: red; }';
      });

      await win._loadStylesheet('/same.css');
      await win._loadStylesheet('/same.css');
      assert.equal(loadCount, 1);
    });
  });
});
