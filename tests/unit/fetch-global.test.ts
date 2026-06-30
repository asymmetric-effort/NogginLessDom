import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import * as http from 'node:http';
import {
  fetch,
  configureFetch,
  Response,
  Request,
} from '../../src/dom/window.js';

describe('Standalone fetch()', () => {
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
    // Reset to default handler after each test
    configureFetch(null);
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
      res.end('standalone hello');
    });

    const response = await fetch(`${baseUrl}/test`);
    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.ok, true);
    const text = await response.text();
    assert.strictEqual(text, 'standalone hello');
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
        res.end(JSON.stringify({ created: true }));
      });
    });

    const response = await fetch(`${baseUrl}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item: 'data' }),
    });

    assert.strictEqual(response.status, 201);
    assert.strictEqual(receivedMethod, 'POST');
    assert.strictEqual(receivedBody, '{"item":"data"}');
    const json = (await response.json()) as { created: boolean };
    assert.strictEqual(json.created, true);
  });

  it('should send custom headers', async () => {
    let receivedHeaders: http.IncomingHttpHeaders = {};
    await startServer((req, res) => {
      receivedHeaders = req.headers;
      res.writeHead(200);
      res.end('ok');
    });

    await fetch(`${baseUrl}/headers`, {
      headers: {
        'X-Custom': 'value',
        Authorization: 'Bearer abc',
      },
    });

    assert.strictEqual(receivedHeaders['x-custom'], 'value');
    assert.strictEqual(receivedHeaders['authorization'], 'Bearer abc');
  });

  it('should throw TypeError on network error', async () => {
    await assert.rejects(
      () => fetch('http://127.0.0.1:1/nonexistent'),
      (err: Error) => {
        assert.ok(err instanceof TypeError);
        assert.ok(err.message.includes('Network request failed'));
        return true;
      },
    );
  });

  it('should throw TypeError on invalid URL', async () => {
    await assert.rejects(
      () => fetch('not-a-valid-url'),
      (err: Error) => {
        assert.ok(err instanceof TypeError);
        assert.ok(err.message.includes('Failed to parse URL'));
        return true;
      },
    );
  });

  it('should allow configureFetch to override the global handler', async () => {
    configureFetch((_url, _options) => {
      return new Response('mocked global', { status: 200 });
    });

    const response = await fetch('https://example.com/mocked');
    const text = await response.text();
    assert.strictEqual(text, 'mocked global');
    assert.strictEqual(response.status, 200);
  });

  it('should reset to default handler when configureFetch receives null', async () => {
    configureFetch((_url, _options) => {
      return new Response('mocked', { status: 200 });
    });

    // Verify mock is active
    const mockRes = await fetch('https://example.com');
    assert.strictEqual(await mockRes.text(), 'mocked');

    // Reset to default
    configureFetch(null);

    // Default handler should now be active — verify with a real server
    await startServer((_req, res) => {
      res.writeHead(200);
      res.end('real response');
    });

    const realRes = await fetch(`${baseUrl}/real`);
    assert.strictEqual(await realRes.text(), 'real response');
  });

  it('should support async custom handlers', async () => {
    configureFetch(async (_url, _options) => {
      return new Response('async mocked', { status: 202 });
    });

    const response = await fetch('https://example.com/async');
    assert.strictEqual(response.status, 202);
    assert.strictEqual(await response.text(), 'async mocked');
  });

  it('should work with Request objects indirectly', async () => {
    await startServer((_req, res) => {
      res.writeHead(200);
      res.end('request test');
    });

    const req = new Request(`${baseUrl}/req`, { method: 'GET' });
    const response = await fetch(req.url, {
      method: req.method,
    });
    assert.strictEqual(await response.text(), 'request test');
  });

  it('should handle JSON responses', async () => {
    await startServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ key: 'value', count: 5 }));
    });

    const response = await fetch(`${baseUrl}/json`);
    const data = (await response.json()) as { key: string; count: number };
    assert.strictEqual(data.key, 'value');
    assert.strictEqual(data.count, 5);
  });

  it('should handle non-ok status codes', async () => {
    await startServer((_req, res) => {
      res.writeHead(404, 'Not Found');
      res.end('not found');
    });

    const response = await fetch(`${baseUrl}/missing`);
    assert.strictEqual(response.status, 404);
    assert.strictEqual(response.ok, false);
    assert.strictEqual(response.statusText, 'Not Found');
  });
});
