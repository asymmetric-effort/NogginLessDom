import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createWindow, Response, Request } from '../../src/dom/window.js';

describe('Window Web APIs', () => {
  describe('fetch', () => {
    it('should use default fetch handler when not configured', async () => {
      const win = createWindow();
      // Default handler makes real HTTP requests; invalid URL throws TypeError
      await assert.rejects(
        () => win.fetch('not-a-valid-url'),
        (err: Error) => {
          assert.ok(err instanceof TypeError);
          return true;
        },
      );
    });

    it('should use configured handler via configureFetch', async () => {
      const win = createWindow();
      win.configureFetch((_url: string, _options?: RequestInit) => {
        return new Response(JSON.stringify({ data: 'test' }), { status: 200 });
      });
      const res = await win.fetch('https://example.com');
      assert.strictEqual(res.status, 200);
      const body = (await res.json()) as { data: string };
      assert.strictEqual(body.data, 'test');
    });

    it('should pass url and options to configured handler', async () => {
      const win = createWindow();
      let capturedUrl = '';
      let capturedMethod = '';
      win.configureFetch((url: string, options?: RequestInit) => {
        capturedUrl = url;
        capturedMethod = options?.method ?? 'GET';
        return new Response('ok', { status: 201 });
      });
      await win.fetch('https://api.test/data', { method: 'POST' });
      assert.strictEqual(capturedUrl, 'https://api.test/data');
      assert.strictEqual(capturedMethod, 'POST');
    });
  });

  describe('Response', () => {
    it('should set status and ok for 2xx', () => {
      const res = new Response('body', { status: 200 });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.ok, true);
      assert.strictEqual(res.statusText, '');
    });

    it('should set ok to false for non-2xx', () => {
      const res = new Response('not found', {
        status: 404,
        statusText: 'Not Found',
      });
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.ok, false);
      assert.strictEqual(res.statusText, 'Not Found');
    });

    it('should default to status 200 when no init provided', () => {
      const res = new Response('body');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.ok, true);
    });

    it('should parse json body', async () => {
      const res = new Response(JSON.stringify({ key: 'value' }), {
        status: 200,
      });
      const data = (await res.json()) as { key: string };
      assert.strictEqual(data.key, 'value');
    });

    it('should return text body', async () => {
      const res = new Response('hello world', { status: 200 });
      const text = await res.text();
      assert.strictEqual(text, 'hello world');
    });

    it('should return empty string for null body', async () => {
      const res = new Response(null);
      const text = await res.text();
      assert.strictEqual(text, '');
    });

    it('should clone response', async () => {
      const res = new Response('data', {
        status: 201,
        statusText: 'Created',
        headers: { 'X-Custom': 'val' },
      });
      const cloned = res.clone();
      assert.strictEqual(cloned.status, 201);
      assert.strictEqual(cloned.statusText, 'Created');
      assert.strictEqual(cloned.headers.get('X-Custom'), 'val');
      const text = await cloned.text();
      assert.strictEqual(text, 'data');
    });

    it('should store headers from init', () => {
      const res = new Response('body', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
      assert.strictEqual(res.headers.get('Content-Type'), 'application/json');
    });
  });

  describe('Request', () => {
    it('should construct with url', () => {
      const req = new Request('https://example.com/api');
      assert.strictEqual(req.url, 'https://example.com/api');
      assert.strictEqual(req.method, 'GET');
      assert.strictEqual(req.body, null);
    });

    it('should accept init options', () => {
      const req = new Request('https://example.com/api', {
        method: 'POST',
        headers: { Authorization: 'Bearer token' },
        body: '{"key":"value"}',
      });
      assert.strictEqual(req.method, 'POST');
      assert.strictEqual(req.headers.get('Authorization'), 'Bearer token');
      assert.strictEqual(req.body, '{"key":"value"}');
    });
  });

  describe('URL', () => {
    it('should construct and expose properties', () => {
      const win = createWindow();
      const UrlCtor = win.URL as typeof import('node:url').URL;
      const url = new UrlCtor('https://example.com:8080/path?q=1#hash');
      assert.strictEqual(url.hostname, 'example.com');
      assert.strictEqual(url.port, '8080');
      assert.strictEqual(url.pathname, '/path');
      assert.strictEqual(url.hash, '#hash');
    });

    it('should have searchParams accessible', () => {
      const win = createWindow();
      const UrlCtor = win.URL as typeof import('node:url').URL;
      const url = new UrlCtor('https://example.com?foo=bar&baz=qux');
      assert.strictEqual(url.searchParams.get('foo'), 'bar');
      assert.strictEqual(url.searchParams.get('baz'), 'qux');
    });
  });

  describe('URLSearchParams', () => {
    it('should support get/set/has/delete/toString', () => {
      const win = createWindow();
      const USP =
        win.URLSearchParams as typeof import('node:url').URLSearchParams;
      const params = new USP('a=1&b=2');
      assert.strictEqual(params.get('a'), '1');
      assert.strictEqual(params.has('b'), true);
      params.set('c', '3');
      assert.strictEqual(params.get('c'), '3');
      params.delete('a');
      assert.strictEqual(params.has('a'), false);
      assert.strictEqual(params.toString(), 'b=2&c=3');
    });
  });

  describe('performance', () => {
    it('should have now() that returns a number', () => {
      const win = createWindow();
      const result = win.performance.now();
      assert.strictEqual(typeof result, 'number');
      assert.ok(result > 0);
    });

    it('should have mark and measure as no-ops', () => {
      const win = createWindow();
      // Should not throw
      win.performance.mark('start');
      win.performance.measure('test', 'start');
    });

    it('should return empty arrays from getEntries methods', () => {
      const win = createWindow();
      assert.deepStrictEqual(win.performance.getEntries(), []);
      assert.deepStrictEqual(win.performance.getEntriesByName('test'), []);
      assert.deepStrictEqual(win.performance.getEntriesByType('mark'), []);
    });
  });

  describe('console', () => {
    it('should exist on window and have standard methods', () => {
      const win = createWindow();
      assert.ok(win.console);
      assert.strictEqual(typeof win.console.log, 'function');
      assert.strictEqual(typeof win.console.error, 'function');
      assert.strictEqual(typeof win.console.warn, 'function');
    });
  });

  describe('screen', () => {
    it('should have default dimensions', () => {
      const win = createWindow();
      assert.strictEqual(win.screen.width, 1920);
      assert.strictEqual(win.screen.height, 1080);
      assert.strictEqual(win.screen.availWidth, 1920);
      assert.strictEqual(win.screen.availHeight, 1080);
      assert.strictEqual(win.screen.colorDepth, 24);
      assert.strictEqual(win.screen.pixelDepth, 24);
    });

    it('should accept custom screen dimensions', () => {
      const win = createWindow({ screenWidth: 1440, screenHeight: 900 });
      assert.strictEqual(win.screen.width, 1440);
      assert.strictEqual(win.screen.height, 900);
      assert.strictEqual(win.screen.availWidth, 1440);
      assert.strictEqual(win.screen.availHeight, 900);
    });
  });

  describe('devicePixelRatio', () => {
    it('should default to 1', () => {
      const win = createWindow();
      assert.strictEqual(win.devicePixelRatio, 1);
    });

    it('should accept custom value', () => {
      const win = createWindow({ devicePixelRatio: 2 });
      assert.strictEqual(win.devicePixelRatio, 2);
    });
  });

  describe('scroll properties', () => {
    it('should have scroll properties initialized to 0', () => {
      const win = createWindow();
      assert.strictEqual(win.scrollX, 0);
      assert.strictEqual(win.scrollY, 0);
      assert.strictEqual(win.pageXOffset, 0);
      assert.strictEqual(win.pageYOffset, 0);
    });
  });
});
