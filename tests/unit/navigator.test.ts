import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  Navigator,
  Clipboard,
  Permissions,
  Window,
  createWindow,
} from '../../src/dom/window.js';

describe('Navigator', () => {
  describe('properties', () => {
    it('should have userAgent', () => {
      const nav = new Navigator();
      assert.strictEqual(nav.userAgent, 'NogginLessDom/1.0');
    });

    it('should have language', () => {
      const nav = new Navigator();
      assert.strictEqual(nav.language, 'en-US');
    });

    it('should have languages array', () => {
      const nav = new Navigator();
      assert.deepStrictEqual(nav.languages, ['en-US', 'en']);
    });

    it('should have onLine true by default', () => {
      const nav = new Navigator();
      assert.strictEqual(nav.onLine, true);
    });

    it('should have cookieEnabled true by default', () => {
      const nav = new Navigator();
      assert.strictEqual(nav.cookieEnabled, true);
    });

    it('should have platform set to Linux', () => {
      const nav = new Navigator();
      assert.strictEqual(nav.platform, 'Linux');
    });

    it('should have empty vendor', () => {
      const nav = new Navigator();
      assert.strictEqual(nav.vendor, '');
    });

    it('should have hardwareConcurrency as a number', () => {
      const nav = new Navigator();
      assert.strictEqual(typeof nav.hardwareConcurrency, 'number');
      assert.strictEqual(nav.hardwareConcurrency, 4);
    });

    it('should have maxTouchPoints', () => {
      const nav = new Navigator();
      assert.strictEqual(nav.maxTouchPoints, 0);
    });
  });

  describe('clipboard', () => {
    it('should be an instance of Clipboard', () => {
      const nav = new Navigator();
      assert.ok(nav.clipboard instanceof Clipboard);
    });

    it('should support writeText/readText roundtrip', async () => {
      const nav = new Navigator();
      await nav.clipboard.writeText('hello clipboard');
      const text = await nav.clipboard.readText();
      assert.strictEqual(text, 'hello clipboard');
    });

    it('should return empty string before any write', async () => {
      const nav = new Navigator();
      const text = await nav.clipboard.readText();
      assert.strictEqual(text, '');
    });

    it('should support read returning empty array', async () => {
      const clipboard = new Clipboard();
      const items = await clipboard.read();
      assert.deepStrictEqual(items, []);
    });

    it('should support write (no-op)', async () => {
      const clipboard = new Clipboard();
      await assert.doesNotReject(() => clipboard.write([]));
    });
  });

  describe('permissions', () => {
    it('should be an instance of Permissions', () => {
      const nav = new Navigator();
      assert.ok(nav.permissions instanceof Permissions);
    });

    it('should query and return granted', async () => {
      const nav = new Navigator();
      const result = await nav.permissions.query({ name: 'notifications' });
      assert.strictEqual(result.state, 'granted');
    });

    it('should return granted for any permission name', async () => {
      const nav = new Navigator();
      const result = await nav.permissions.query({ name: 'geolocation' });
      assert.strictEqual(result.state, 'granted');
    });
  });

  describe('sendBeacon', () => {
    it('should return true', () => {
      const nav = new Navigator();
      assert.strictEqual(nav.sendBeacon('https://example.com/log'), true);
    });

    it('should return true with data', () => {
      const nav = new Navigator();
      assert.strictEqual(
        nav.sendBeacon('https://example.com/log', 'payload'),
        true,
      );
    });
  });

  describe('vibrate', () => {
    it('should return true with a number', () => {
      const nav = new Navigator();
      assert.strictEqual(nav.vibrate(100), true);
    });

    it('should return true with an array', () => {
      const nav = new Navigator();
      assert.strictEqual(nav.vibrate([100, 50, 100]), true);
    });
  });

  describe('Window integration', () => {
    it('should expose navigator as Navigator instance', () => {
      const win = new Window();
      assert.ok(win.navigator instanceof Navigator);
    });

    it('should expose navigator on createWindow', () => {
      const win = createWindow();
      assert.ok(win.navigator instanceof Navigator);
      assert.strictEqual(win.navigator.userAgent, 'NogginLessDom/1.0');
    });

    it('should allow modifying navigator.onLine', () => {
      const win = new Window();
      win.navigator.onLine = false;
      assert.strictEqual(win.navigator.onLine, false);
    });
  });
});
