import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Window, createWindow } from '../../src/dom/window.js';

describe('Window global APIs', () => {
  describe('URL', () => {
    it('should expose URL on window', () => {
      const win = new Window();
      assert.ok(win.URL);
      assert.strictEqual(typeof win.URL, 'function');
    });

    it('should be constructable via window.URL', () => {
      const win = new Window();
      const url = new win.URL('https://example.com/path?key=value#hash');
      assert.strictEqual(url.hostname, 'example.com');
      assert.strictEqual(url.pathname, '/path');
      assert.strictEqual(url.search, '?key=value');
      assert.strictEqual(url.hash, '#hash');
      assert.strictEqual(url.protocol, 'https:');
    });

    it('should parse relative URLs with a base', () => {
      const win = new Window();
      const url = new win.URL('/relative', 'https://example.com');
      assert.strictEqual(url.href, 'https://example.com/relative');
    });

    it('should allow modifying URL components', () => {
      const win = new Window();
      const url = new win.URL('https://example.com');
      url.pathname = '/new-path';
      url.search = '?q=test';
      assert.ok(url.href.includes('/new-path'));
      assert.ok(url.href.includes('?q=test'));
    });
  });

  describe('URLSearchParams', () => {
    it('should expose URLSearchParams on window', () => {
      const win = new Window();
      assert.ok(win.URLSearchParams);
      assert.strictEqual(typeof win.URLSearchParams, 'function');
    });

    it('should be constructable and work correctly', () => {
      const win = new Window();
      const params = new win.URLSearchParams('foo=bar&baz=qux');
      assert.strictEqual(params.get('foo'), 'bar');
      assert.strictEqual(params.get('baz'), 'qux');
    });

    it('should support iteration', () => {
      const win = new Window();
      const params = new win.URLSearchParams('a=1&b=2&c=3');
      const keys: string[] = [];
      for (const [key] of params) {
        keys.push(key);
      }
      assert.deepStrictEqual(keys, ['a', 'b', 'c']);
    });

    it('should support append and delete', () => {
      const win = new Window();
      const params = new win.URLSearchParams();
      params.append('key', 'value1');
      params.append('key', 'value2');
      assert.deepStrictEqual(params.getAll('key'), ['value1', 'value2']);
      params.delete('key');
      assert.strictEqual(params.get('key'), null);
    });
  });

  describe('TextEncoder', () => {
    it('should expose TextEncoder on window', () => {
      const win = new Window();
      assert.ok(win.TextEncoder);
    });

    it('should encode strings', () => {
      const win = new Window();
      const encoder = new win.TextEncoder();
      const encoded = encoder.encode('hello');
      assert.ok(encoded instanceof Uint8Array);
      assert.strictEqual(encoded.length, 5);
    });
  });

  describe('TextDecoder', () => {
    it('should expose TextDecoder on window', () => {
      const win = new Window();
      assert.ok(win.TextDecoder);
    });

    it('should decode buffers', () => {
      const win = new Window();
      const encoder = new win.TextEncoder();
      const decoder = new win.TextDecoder();
      const encoded = encoder.encode('hello world');
      const decoded = decoder.decode(encoded);
      assert.strictEqual(decoded, 'hello world');
    });
  });

  describe('createWindow factory', () => {
    it('should have all global APIs available', () => {
      const win = createWindow();
      assert.ok(win.URL);
      assert.ok(win.URLSearchParams);
      assert.ok(win.TextEncoder);
      assert.ok(win.TextDecoder);
    });

    it('should have URL that works with URLSearchParams', () => {
      const win = createWindow();
      const url = new win.URL('https://example.com?a=1&b=2');
      const params = new win.URLSearchParams(url.search);
      assert.strictEqual(params.get('a'), '1');
      assert.strictEqual(params.get('b'), '2');
    });
  });
});
