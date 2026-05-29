import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import * as http from 'node:http';
import { Window, createWindow, Response } from '../../src/dom/window.js';

describe('Default fetch handler', () => {
  let server: http.Server;
  let baseUrl: string;

  function startServer(
    handler: (req: http.IncomingMessage, res: http.ServerResponse) => void,
  ): Promise<string> {
    return new Promise((resolve) => {
      server = http.createServer(handler);
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as { port: number };
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve(baseUrl);
      });
    });
  }

  afterEach(() => {
    return new Promise<void>((resolve) => {
      if (server) {
        server.close(() => resolve());
      } else {
        resolve();
      }
    });
  });

  it('should make a GET request and return correct body', async () => {
    await startServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('hello world');
    });

    const win = new Window();
    const response = await win.fetch(`${baseUrl}/test`);
    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.ok, true);
    const text = await response.text();
    assert.strictEqual(text, 'hello world');
  });

  it('should make a POST request with body', async () => {
    let receivedBody = '';
    let receivedMethod = '';
    await startServer((req, res) => {
      receivedMethod = req.method ?? '';
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => {
        receivedBody = Buffer.concat(chunks).toString('utf-8');
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      });
    });

    const win = new Window();
    const response = await win.fetch(`${baseUrl}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'test' }),
    });

    assert.strictEqual(response.status, 201);
    assert.strictEqual(receivedMethod, 'POST');
    assert.strictEqual(receivedBody, '{"name":"test"}');
    const json = (await response.json()) as { ok: boolean };
    assert.strictEqual(json.ok, true);
  });

  it('should send custom headers', async () => {
    let receivedHeaders: http.IncomingHttpHeaders = {};
    await startServer((req, res) => {
      receivedHeaders = req.headers;
      res.writeHead(200);
      res.end('ok');
    });

    const win = new Window();
    await win.fetch(`${baseUrl}/headers`, {
      headers: {
        'X-Custom-Header': 'custom-value',
        Authorization: 'Bearer token123',
      },
    });

    assert.strictEqual(receivedHeaders['x-custom-header'], 'custom-value');
    assert.strictEqual(receivedHeaders['authorization'], 'Bearer token123');
  });

  it('should make response headers accessible', async () => {
    await startServer((_req, res) => {
      res.writeHead(200, {
        'X-Response-Header': 'response-value',
        'Content-Type': 'text/html',
      });
      res.end('<h1>hi</h1>');
    });

    const win = new Window();
    const response = await win.fetch(`${baseUrl}/resp-headers`);
    assert.strictEqual(
      response.headers.get('x-response-header'),
      'response-value',
    );
    assert.strictEqual(response.headers.get('content-type'), 'text/html');
  });

  it('should throw TypeError on network error', async () => {
    const win = new Window();
    await assert.rejects(
      () => win.fetch('http://127.0.0.1:1/nonexistent'),
      (err: Error) => {
        assert.ok(err instanceof TypeError);
        assert.ok(err.message.includes('Network request failed'));
        return true;
      },
    );
  });

  it('should throw TypeError on invalid URL', async () => {
    const win = new Window();
    await assert.rejects(
      () => win.fetch('not-a-valid-url'),
      (err: Error) => {
        assert.ok(err instanceof TypeError);
        assert.ok(err.message.includes('Failed to parse URL'));
        return true;
      },
    );
  });

  it('should allow configureFetch to override default handler', async () => {
    await startServer((_req, res) => {
      res.writeHead(200);
      res.end('real server');
    });

    const win = new Window();

    // First verify default handler works
    const realResponse = await win.fetch(`${baseUrl}/real`);
    const realText = await realResponse.text();
    assert.strictEqual(realText, 'real server');

    // Now override with configureFetch
    win.configureFetch((_url, _options) => {
      return new Response('mocked response', { status: 200 });
    });

    const mockResponse = await win.fetch(`${baseUrl}/mocked`);
    const mockText = await mockResponse.text();
    assert.strictEqual(mockText, 'mocked response');
  });

  it('should support Response.json() with real fetch', async () => {
    await startServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ key: 'value', num: 42 }));
    });

    const win = new Window();
    const response = await win.fetch(`${baseUrl}/json`);
    const data = (await response.json()) as { key: string; num: number };
    assert.strictEqual(data.key, 'value');
    assert.strictEqual(data.num, 42);
  });

  it('should support Response.text() with real fetch', async () => {
    await startServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('plain text content');
    });

    const win = new Window();
    const response = await win.fetch(`${baseUrl}/text`);
    const text = await response.text();
    assert.strictEqual(text, 'plain text content');
  });

  it('should support Response.blob() with real fetch', async () => {
    await startServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
      res.end('blob data');
    });

    const win = new Window();
    const response = await win.fetch(`${baseUrl}/blob`);
    const blob = await response.blob();
    assert.strictEqual(blob.size, 9);
    assert.strictEqual(blob.type, 'application/octet-stream');
  });

  it('should work with createWindow factory', async () => {
    await startServer((_req, res) => {
      res.writeHead(200);
      res.end('factory test');
    });

    const win = createWindow();
    const response = await win.fetch(`${baseUrl}/factory`);
    const text = await response.text();
    assert.strictEqual(text, 'factory test');
  });

  it('should expose Request, Response, Headers on Window', () => {
    const win = new Window();
    assert.ok(win.Request);
    assert.ok(win.Response);
    assert.ok(win.Headers);
    const req = new win.Request('http://example.com', { method: 'POST' });
    assert.strictEqual(req.method, 'POST');
    const res = new win.Response('body', { status: 201 });
    assert.strictEqual(res.status, 201);
  });

  it('should return correct statusText from server', async () => {
    await startServer((_req, res) => {
      res.writeHead(404, 'Not Found');
      res.end('not found');
    });

    const win = new Window();
    const response = await win.fetch(`${baseUrl}/missing`);
    assert.strictEqual(response.status, 404);
    assert.strictEqual(response.ok, false);
    assert.strictEqual(response.statusText, 'Not Found');
  });
});
