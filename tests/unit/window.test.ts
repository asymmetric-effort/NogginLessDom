import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Document, Event } from '../../src/dom/index.js';
import { Window, createWindow } from '../../src/dom/window.js';

describe('Window Environment', () => {
  describe('createWindow factory', () => {
    it('should return a Window instance', () => {
      const win = createWindow();
      assert.ok(win instanceof Window);
    });

    it('should have a document', () => {
      const win = createWindow();
      assert.ok(win.document instanceof Document);
    });

    it('should accept options for innerWidth/innerHeight', () => {
      const win = createWindow({ innerWidth: 800, innerHeight: 600 });
      assert.strictEqual(win.innerWidth, 800);
      assert.strictEqual(win.innerHeight, 600);
    });
  });

  describe('Window defaults', () => {
    it('should have default innerWidth and innerHeight', () => {
      const win = createWindow();
      assert.strictEqual(win.innerWidth, 1024);
      assert.strictEqual(win.innerHeight, 768);
    });
  });

  describe('Window.location', () => {
    it('should have default location properties', () => {
      const win = createWindow();
      const loc = win.location;
      assert.strictEqual(loc.href, 'about:blank');
      assert.strictEqual(loc.hash, '');
      assert.strictEqual(loc.pathname, '/');
      assert.strictEqual(loc.search, '');
      assert.strictEqual(loc.origin, '');
      assert.strictEqual(loc.protocol, '');
      assert.strictEqual(loc.host, '');
      assert.strictEqual(loc.hostname, '');
      assert.strictEqual(loc.port, '');
    });

    it('should have assign, replace, reload methods', () => {
      const win = createWindow();
      assert.strictEqual(typeof win.location.assign, 'function');
      assert.strictEqual(typeof win.location.replace, 'function');
      assert.strictEqual(typeof win.location.reload, 'function');
    });

    it('should update href on assign', () => {
      const win = createWindow();
      win.location.assign('https://example.com');
      assert.strictEqual(win.location.href, 'https://example.com');
    });

    it('should update href on replace', () => {
      const win = createWindow();
      win.location.replace('https://example.com/page');
      assert.strictEqual(win.location.href, 'https://example.com/page');
    });
  });

  describe('Window.history', () => {
    it('should have default history properties', () => {
      const win = createWindow();
      assert.strictEqual(win.history.length, 1);
      assert.strictEqual(win.history.state, null);
    });

    it('should support pushState', () => {
      const win = createWindow();
      win.history.pushState({ page: 1 }, '', '/page1');
      assert.strictEqual(win.history.length, 2);
      assert.deepStrictEqual(win.history.state, { page: 1 });
    });

    it('should support replaceState', () => {
      const win = createWindow();
      win.history.replaceState({ page: 2 }, '', '/page2');
      assert.strictEqual(win.history.length, 1);
      assert.deepStrictEqual(win.history.state, { page: 2 });
    });

    it('should have back, forward, go methods', () => {
      const win = createWindow();
      assert.strictEqual(typeof win.history.back, 'function');
      assert.strictEqual(typeof win.history.forward, 'function');
      assert.strictEqual(typeof win.history.go, 'function');
    });

    it('should navigate back and forward', () => {
      const win = createWindow();
      win.history.pushState({ page: 1 }, '', '/page1');
      win.history.pushState({ page: 2 }, '', '/page2');
      assert.strictEqual(win.history.length, 3);
      assert.deepStrictEqual(win.history.state, { page: 2 });

      win.history.back();
      assert.deepStrictEqual(win.history.state, { page: 1 });

      win.history.forward();
      assert.deepStrictEqual(win.history.state, { page: 2 });
    });

    it('should handle go()', () => {
      const win = createWindow();
      win.history.pushState({ page: 1 }, '', '/page1');
      win.history.pushState({ page: 2 }, '', '/page2');
      win.history.go(-2);
      assert.strictEqual(win.history.state, null);
    });
  });

  describe('Window.navigator', () => {
    it('should have navigator properties', () => {
      const win = createWindow();
      assert.strictEqual(typeof win.navigator.userAgent, 'string');
      assert.strictEqual(typeof win.navigator.language, 'string');
      assert.ok(Array.isArray(win.navigator.languages));
      assert.strictEqual(typeof win.navigator.platform, 'string');
      assert.strictEqual(win.navigator.onLine, true);
    });
  });

  describe('Window.localStorage', () => {
    it('should start empty', () => {
      const win = createWindow();
      assert.strictEqual(win.localStorage.length, 0);
    });

    it('should setItem and getItem', () => {
      const win = createWindow();
      win.localStorage.setItem('key', 'value');
      assert.strictEqual(win.localStorage.getItem('key'), 'value');
    });

    it('should return null for missing key', () => {
      const win = createWindow();
      assert.strictEqual(win.localStorage.getItem('missing'), null);
    });

    it('should removeItem', () => {
      const win = createWindow();
      win.localStorage.setItem('key', 'value');
      win.localStorage.removeItem('key');
      assert.strictEqual(win.localStorage.getItem('key'), null);
    });

    it('should clear all items', () => {
      const win = createWindow();
      win.localStorage.setItem('a', '1');
      win.localStorage.setItem('b', '2');
      win.localStorage.clear();
      assert.strictEqual(win.localStorage.length, 0);
    });

    it('should report length', () => {
      const win = createWindow();
      win.localStorage.setItem('a', '1');
      win.localStorage.setItem('b', '2');
      assert.strictEqual(win.localStorage.length, 2);
    });

    it('should support key() by index', () => {
      const win = createWindow();
      win.localStorage.setItem('a', '1');
      win.localStorage.setItem('b', '2');
      const key0 = win.localStorage.key(0);
      const key1 = win.localStorage.key(1);
      assert.ok(key0 === 'a' || key0 === 'b');
      assert.ok(key1 === 'a' || key1 === 'b');
      assert.notStrictEqual(key0, key1);
    });

    it('should return null for out-of-range key()', () => {
      const win = createWindow();
      assert.strictEqual(win.localStorage.key(0), null);
    });
  });

  describe('Window.sessionStorage', () => {
    it('should work independently from localStorage', () => {
      const win = createWindow();
      win.localStorage.setItem('key', 'local');
      win.sessionStorage.setItem('key', 'session');
      assert.strictEqual(win.localStorage.getItem('key'), 'local');
      assert.strictEqual(win.sessionStorage.getItem('key'), 'session');
    });
  });

  describe('Window.getComputedStyle', () => {
    it('should return an object', () => {
      const win = createWindow();
      const el = win.document.createElement('div');
      const style = win.getComputedStyle(el);
      assert.strictEqual(typeof style, 'object');
    });
  });

  describe('Window event handling', () => {
    it('should addEventListener and dispatchEvent', () => {
      const win = createWindow();
      let called = false;
      win.addEventListener('custom', () => {
        called = true;
      });
      win.dispatchEvent(new Event('custom'));
      assert.strictEqual(called, true);
    });

    it('should removeEventListener', () => {
      const win = createWindow();
      let count = 0;
      const handler = () => {
        count++;
      };
      win.addEventListener('test', handler);
      win.dispatchEvent(new Event('test'));
      assert.strictEqual(count, 1);
      win.removeEventListener('test', handler);
      win.dispatchEvent(new Event('test'));
      assert.strictEqual(count, 1);
    });
  });
});
