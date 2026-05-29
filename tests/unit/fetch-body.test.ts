import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Response, Request } from '../../src/dom/window.js';
import { Blob } from '../../src/dom/blob.js';

describe('Blob', () => {
  it('should construct with string parts', async () => {
    const blob = new Blob(['hello', ' world']);
    assert.strictEqual(blob.size, 11);
    const text = await blob.text();
    assert.strictEqual(text, 'hello world');
  });
  it('should construct with ArrayBuffer parts', async () => {
    const encoder = new TextEncoder();
    const buf = encoder.encode('abc').buffer;
    const blob = new Blob([buf]);
    assert.strictEqual(blob.size, 3);
    const text = await blob.text();
    assert.strictEqual(text, 'abc');
  });
  it('should construct with Uint8Array parts', async () => {
    const data = new Uint8Array([72, 105]);
    const blob = new Blob([data]);
    assert.strictEqual(blob.size, 2);
    const text = await blob.text();
    assert.strictEqual(text, 'Hi');
  });
  it('should construct with mixed parts including Blob', async () => {
    const inner = new Blob(['inner']);
    const blob = new Blob(['prefix-', inner, '-suffix']);
    const text = await blob.text();
    assert.strictEqual(text, 'prefix-inner-suffix');
  });
  it('should store type from options', () => {
    const blob = new Blob(['data'], { type: 'text/plain' });
    assert.strictEqual(blob.type, 'text/plain');
  });
  it('should default type to empty string', () => {
    const blob = new Blob(['data']);
    assert.strictEqual(blob.type, '');
  });
  it('should return size and type properties', () => {
    const blob = new Blob(['test'], { type: 'application/json' });
    assert.strictEqual(blob.size, 4);
    assert.strictEqual(blob.type, 'application/json');
  });
  it('should handle empty construction', () => {
    const blob = new Blob();
    assert.strictEqual(blob.size, 0);
    assert.strictEqual(blob.type, '');
  });
  it('should handle empty array construction', () => {
    const blob = new Blob([]);
    assert.strictEqual(blob.size, 0);
  });
  it('should return text content via text()', async () => {
    const blob = new Blob(['hello']);
    const text = await blob.text();
    assert.strictEqual(text, 'hello');
  });
  it('should return ArrayBuffer via arrayBuffer()', async () => {
    const blob = new Blob(['abc']);
    const buffer = await blob.arrayBuffer();
    assert.ok(buffer instanceof ArrayBuffer);
    assert.strictEqual(buffer.byteLength, 3);
    const decoded = new TextDecoder().decode(buffer);
    assert.strictEqual(decoded, 'abc');
  });
  it('should slice to create a subset blob', async () => {
    const blob = new Blob(['hello world']);
    const sliced = blob.slice(0, 5);
    assert.strictEqual(sliced.size, 5);
    const text = await sliced.text();
    assert.strictEqual(text, 'hello');
  });
  it('should slice with start only', async () => {
    const blob = new Blob(['hello']);
    const sliced = blob.slice(3);
    const text = await sliced.text();
    assert.strictEqual(text, 'lo');
  });
  it('should slice with contentType', () => {
    const blob = new Blob(['data'], { type: 'text/plain' });
    const sliced = blob.slice(0, 2, 'text/html');
    assert.strictEqual(sliced.type, 'text/html');
  });
  it('should slice defaults contentType to empty string', () => {
    const blob = new Blob(['data'], { type: 'text/plain' });
    const sliced = blob.slice(0, 2);
    assert.strictEqual(sliced.type, '');
  });
});
describe('Response body methods', () => {
  it('should return blob with correct size and type', async () => {
    const res = new Response('hello', {
      status: 200,
      headers: { 'content-type': 'text/plain' },
    });
    const blob = await res.blob();
    assert.strictEqual(blob.size, 5);
    assert.strictEqual(blob.type, 'text/plain');
    const text = await blob.text();
    assert.strictEqual(text, 'hello');
  });
  it('should return arrayBuffer with UTF-8 content', async () => {
    const res = new Response('test');
    const buffer = await res.arrayBuffer();
    assert.ok(buffer instanceof ArrayBuffer);
    const decoded = new TextDecoder().decode(buffer);
    assert.strictEqual(decoded, 'test');
  });
  it('should parse URL-encoded body into FormData', async () => {
    const res = new Response('name=Alice&age=30');
    const fd = await res.formData();
    assert.strictEqual(fd.get('name'), 'Alice');
    assert.strictEqual(fd.get('age'), '30');
  });
  it('should have bodyUsed start as false', () => {
    const res = new Response('data');
    assert.strictEqual(res.bodyUsed, false);
  });
  it('should set bodyUsed to true after text()', async () => {
    const res = new Response('data');
    await res.text();
    assert.strictEqual(res.bodyUsed, true);
  });
  it('should set bodyUsed to true after json()', async () => {
    const res = new Response(JSON.stringify({ a: 1 }));
    await res.json();
    assert.strictEqual(res.bodyUsed, true);
  });
  it('should set bodyUsed to true after blob()', async () => {
    const res = new Response('data');
    await res.blob();
    assert.strictEqual(res.bodyUsed, true);
  });
  it('should set bodyUsed to true after arrayBuffer()', async () => {
    const res = new Response('data');
    await res.arrayBuffer();
    assert.strictEqual(res.bodyUsed, true);
  });
  it('should set bodyUsed to true after formData()', async () => {
    const res = new Response('k=v');
    await res.formData();
    assert.strictEqual(res.bodyUsed, true);
  });
  it('should throw TypeError on double consumption', async () => {
    const res = new Response('data');
    await res.text();
    await assert.rejects(() => res.text(), TypeError);
  });
  it('should throw TypeError when calling json after text', async () => {
    const res = new Response(JSON.stringify({ a: 1 }));
    await res.text();
    await assert.rejects(() => res.json(), TypeError);
  });
  it('should throw TypeError when calling blob after arrayBuffer', async () => {
    const res = new Response('data');
    await res.arrayBuffer();
    await assert.rejects(() => res.blob(), TypeError);
  });
  it('should allow re-consumption on clone', async () => {
    const res = new Response('data');
    const cloned = res.clone();
    const t1 = await res.text();
    const t2 = await cloned.text();
    assert.strictEqual(t1, 'data');
    assert.strictEqual(t2, 'data');
  });
  it('clone should not share bodyUsed state', async () => {
    const res = new Response('data');
    const cloned = res.clone();
    await res.text();
    assert.strictEqual(res.bodyUsed, true);
    assert.strictEqual(cloned.bodyUsed, false);
  });
  it('should still parse json correctly', async () => {
    const res = new Response(JSON.stringify({ key: 'value' }));
    const data = (await res.json()) as { key: string };
    assert.strictEqual(data.key, 'value');
  });
  it('should still return text correctly', async () => {
    const res = new Response('hello world');
    const text = await res.text();
    assert.strictEqual(text, 'hello world');
  });
});
describe('Request body methods', () => {
  it('should have bodyUsed start as false', () => {
    const req = new Request('https://example.com', { body: 'data' });
    assert.strictEqual(req.bodyUsed, false);
  });
  it('should return text from body', async () => {
    const req = new Request('https://example.com', { body: 'hello' });
    const text = await req.text();
    assert.strictEqual(text, 'hello');
    assert.strictEqual(req.bodyUsed, true);
  });
  it('should return json from body', async () => {
    const req = new Request('https://example.com', {
      body: JSON.stringify({ a: 1 }),
    });
    const data = (await req.json()) as { a: number };
    assert.strictEqual(data.a, 1);
  });
  it('should return blob from body', async () => {
    const req = new Request('https://example.com', {
      body: 'data',
      headers: { 'content-type': 'text/plain' },
    });
    const blob = await req.blob();
    assert.strictEqual(blob.size, 4);
    assert.strictEqual(blob.type, 'text/plain');
  });
  it('should return arrayBuffer from body', async () => {
    const req = new Request('https://example.com', { body: 'abc' });
    const buffer = await req.arrayBuffer();
    assert.ok(buffer instanceof ArrayBuffer);
    assert.strictEqual(buffer.byteLength, 3);
  });
  it('should return formData from body', async () => {
    const req = new Request('https://example.com', { body: 'x=1&y=2' });
    const fd = await req.formData();
    assert.strictEqual(fd.get('x'), '1');
    assert.strictEqual(fd.get('y'), '2');
  });
  it('should throw TypeError on double consumption', async () => {
    const req = new Request('https://example.com', { body: 'data' });
    await req.text();
    await assert.rejects(() => req.text(), TypeError);
  });
  it('should handle null body', async () => {
    const req = new Request('https://example.com');
    const text = await req.text();
    assert.strictEqual(text, '');
  });
  it('should clone request and allow re-consumption', async () => {
    const req = new Request('https://example.com', {
      method: 'POST',
      body: 'data',
      headers: { 'X-Custom': 'val' },
    });
    const cloned = req.clone();
    const t1 = await req.text();
    const t2 = await cloned.text();
    assert.strictEqual(t1, 'data');
    assert.strictEqual(t2, 'data');
    assert.strictEqual(cloned.method, 'POST');
    assert.strictEqual(cloned.url, 'https://example.com');
    assert.strictEqual(cloned.headers.get('X-Custom'), 'val');
  });
});
