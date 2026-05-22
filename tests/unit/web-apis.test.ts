import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FormData } from '../../src/dom/form-data.js';
import { Headers } from '../../src/dom/headers.js';
import {
  atob,
  btoa,
  NogginTextEncoder,
  NogginTextDecoder,
  NogginBlob,
  nogginStructuredClone,
  nogginQueueMicrotask,
} from '../../src/dom/web-apis.js';
import { createWindow } from '../../src/dom/window.js';

describe('FormData', () => {
  describe('append and get', () => {
    it('should append and retrieve a value', () => {
      const fd = new FormData();
      fd.append('key', 'value');
      assert.strictEqual(fd.get('key'), 'value');
    });

    it('should append multiple values for the same key', () => {
      const fd = new FormData();
      fd.append('key', 'a');
      fd.append('key', 'b');
      assert.strictEqual(fd.get('key'), 'a');
    });
  });

  describe('getAll', () => {
    it('should return all values for a key', () => {
      const fd = new FormData();
      fd.append('key', 'a');
      fd.append('key', 'b');
      fd.append('key', 'c');
      assert.deepStrictEqual(fd.getAll('key'), ['a', 'b', 'c']);
    });

    it('should return empty array for missing key', () => {
      const fd = new FormData();
      assert.deepStrictEqual(fd.getAll('nope'), []);
    });
  });

  describe('has', () => {
    it('should return true when key exists', () => {
      const fd = new FormData();
      fd.append('key', 'value');
      assert.strictEqual(fd.has('key'), true);
    });

    it('should return false when key does not exist', () => {
      const fd = new FormData();
      assert.strictEqual(fd.has('key'), false);
    });
  });

  describe('set', () => {
    it('should replace all values for a key', () => {
      const fd = new FormData();
      fd.append('key', 'a');
      fd.append('key', 'b');
      fd.set('key', 'c');
      assert.deepStrictEqual(fd.getAll('key'), ['c']);
      assert.strictEqual(fd.get('key'), 'c');
    });

    it('should create a new entry if key does not exist', () => {
      const fd = new FormData();
      fd.set('key', 'value');
      assert.strictEqual(fd.get('key'), 'value');
    });
  });

  describe('delete', () => {
    it('should remove all entries for a key', () => {
      const fd = new FormData();
      fd.append('key', 'a');
      fd.append('key', 'b');
      fd.delete('key');
      assert.strictEqual(fd.has('key'), false);
      assert.strictEqual(fd.get('key'), null);
    });
  });

  describe('entries', () => {
    it('should iterate over all entries', () => {
      const fd = new FormData();
      fd.append('a', '1');
      fd.append('b', '2');
      const result: Array<[string, string]> = [];
      for (const [key, value] of fd.entries()) {
        result.push([key, value as string]);
      }
      assert.deepStrictEqual(result, [
        ['a', '1'],
        ['b', '2'],
      ]);
    });
  });

  describe('keys and values', () => {
    it('should iterate over keys', () => {
      const fd = new FormData();
      fd.append('a', '1');
      fd.append('b', '2');
      assert.deepStrictEqual([...fd.keys()], ['a', 'b']);
    });

    it('should iterate over values', () => {
      const fd = new FormData();
      fd.append('a', '1');
      fd.append('b', '2');
      assert.deepStrictEqual([...fd.values()], ['1', '2']);
    });
  });

  describe('forEach', () => {
    it('should call callback for each entry', () => {
      const fd = new FormData();
      fd.append('a', '1');
      fd.append('b', '2');
      const collected: Array<[string, string]> = [];
      fd.forEach((value, key) => {
        collected.push([key, value as string]);
      });
      assert.deepStrictEqual(collected, [
        ['a', '1'],
        ['b', '2'],
      ]);
    });
  });

  describe('Symbol.iterator', () => {
    it('should be iterable', () => {
      const fd = new FormData();
      fd.append('x', 'y');
      const result: Array<[string, string]> = [];
      for (const [key, value] of fd) {
        result.push([key, value as string]);
      }
      assert.deepStrictEqual(result, [['x', 'y']]);
    });
  });
});

describe('Headers', () => {
  describe('append and get', () => {
    it('should append and retrieve a value', () => {
      const h = new Headers();
      h.append('Content-Type', 'text/html');
      assert.strictEqual(h.get('Content-Type'), 'text/html');
    });

    it('should append multiple values and join with comma', () => {
      const h = new Headers();
      h.append('Accept', 'text/html');
      h.append('Accept', 'application/json');
      assert.strictEqual(h.get('Accept'), 'text/html, application/json');
    });
  });

  describe('case-insensitive keys', () => {
    it('should treat keys as case-insensitive', () => {
      const h = new Headers();
      h.set('Content-Type', 'text/html');
      assert.strictEqual(h.get('content-type'), 'text/html');
      assert.strictEqual(h.get('CONTENT-TYPE'), 'text/html');
    });
  });

  describe('has', () => {
    it('should return true when header exists', () => {
      const h = new Headers();
      h.set('X-Custom', 'value');
      assert.strictEqual(h.has('x-custom'), true);
    });

    it('should return false when header does not exist', () => {
      const h = new Headers();
      assert.strictEqual(h.has('missing'), false);
    });
  });

  describe('set', () => {
    it('should replace existing values', () => {
      const h = new Headers();
      h.append('Accept', 'text/html');
      h.append('Accept', 'application/json');
      h.set('Accept', 'text/plain');
      assert.strictEqual(h.get('Accept'), 'text/plain');
    });
  });

  describe('delete', () => {
    it('should remove a header', () => {
      const h = new Headers();
      h.set('X-Remove', 'value');
      h.delete('X-Remove');
      assert.strictEqual(h.has('x-remove'), false);
      assert.strictEqual(h.get('x-remove'), null);
    });
  });

  describe('entries, keys, values', () => {
    it('should iterate entries in sorted order', () => {
      const h = new Headers();
      h.set('B-Header', 'two');
      h.set('A-Header', 'one');
      const entries: Array<[string, string]> = [...h.entries()];
      assert.deepStrictEqual(entries, [
        ['a-header', 'one'],
        ['b-header', 'two'],
      ]);
    });

    it('should iterate keys in sorted order', () => {
      const h = new Headers();
      h.set('Z', 'last');
      h.set('A', 'first');
      assert.deepStrictEqual([...h.keys()], ['a', 'z']);
    });

    it('should iterate values in key-sorted order', () => {
      const h = new Headers();
      h.set('Z', 'last');
      h.set('A', 'first');
      assert.deepStrictEqual([...h.values()], ['first', 'last']);
    });
  });

  describe('forEach', () => {
    it('should call callback for each header', () => {
      const h = new Headers();
      h.set('X-One', '1');
      h.set('X-Two', '2');
      const collected: Array<[string, string]> = [];
      h.forEach((value, key) => {
        collected.push([key, value]);
      });
      assert.strictEqual(collected.length, 2);
    });
  });

  describe('Symbol.iterator', () => {
    it('should be iterable', () => {
      const h = new Headers();
      h.set('Key', 'Value');
      const result: Array<[string, string]> = [];
      for (const [k, v] of h) {
        result.push([k, v]);
      }
      assert.deepStrictEqual(result, [['key', 'Value']]);
    });
  });

  describe('constructor with init', () => {
    it('should accept a record of headers', () => {
      const h = new Headers({
        'Content-Type': 'text/html',
        Accept: 'text/plain',
      });
      assert.strictEqual(h.get('content-type'), 'text/html');
      assert.strictEqual(h.get('accept'), 'text/plain');
    });

    it('should accept an array of tuples', () => {
      const h = new Headers([
        ['Content-Type', 'text/html'],
        ['Accept', 'text/plain'],
      ]);
      assert.strictEqual(h.get('content-type'), 'text/html');
      assert.strictEqual(h.get('accept'), 'text/plain');
    });

    it('should accept another Headers instance', () => {
      const original = new Headers({ 'X-Test': 'hello' });
      const copy = new Headers(original);
      assert.strictEqual(copy.get('x-test'), 'hello');
    });
  });
});

describe('atob / btoa', () => {
  it('should round-trip encode and decode', () => {
    const original = 'Hello, World!';
    const encoded = btoa(original);
    const decoded = atob(encoded);
    assert.strictEqual(decoded, original);
  });

  it('btoa should produce valid base64', () => {
    assert.strictEqual(btoa('Hello'), 'SGVsbG8=');
  });

  it('atob should decode valid base64', () => {
    assert.strictEqual(atob('SGVsbG8='), 'Hello');
  });
});

describe('TextEncoder', () => {
  it('should encode a string to Uint8Array', () => {
    const encoder = new NogginTextEncoder();
    const result = encoder.encode('hello');
    assert.ok(result instanceof Uint8Array);
    assert.strictEqual(result.length, 5);
    assert.strictEqual(result[0], 104); // 'h'
  });
});

describe('TextDecoder', () => {
  it('should decode Uint8Array to string', () => {
    const decoder = new NogginTextDecoder();
    const bytes = new Uint8Array([104, 101, 108, 108, 111]);
    const result = decoder.decode(bytes);
    assert.strictEqual(result, 'hello');
  });
});

describe('structuredClone', () => {
  it('should deep clone an object', () => {
    const obj = { a: 1, b: { c: 2 } };
    const cloned = nogginStructuredClone(obj);
    assert.deepStrictEqual(cloned, obj);
    assert.notStrictEqual(cloned, obj);
    assert.notStrictEqual(cloned.b, obj.b);
  });
});

describe('queueMicrotask', () => {
  it('should execute a callback', async () => {
    let executed = false;
    nogginQueueMicrotask(() => {
      executed = true;
    });
    // Wait for microtask to flush
    await new Promise<void>((resolve) => {
      nogginQueueMicrotask(() => resolve());
    });
    assert.strictEqual(executed, true);
  });
});

describe('Window web API properties', () => {
  it('should expose FormData on window', () => {
    const win = createWindow();
    assert.strictEqual(win.FormData, FormData);
  });

  it('should expose Headers on window', () => {
    const win = createWindow();
    assert.strictEqual(win.Headers, Headers);
  });

  it('should expose TextEncoder on window', () => {
    const win = createWindow();
    assert.strictEqual(win.TextEncoder, NogginTextEncoder);
  });

  it('should expose TextDecoder on window', () => {
    const win = createWindow();
    assert.strictEqual(win.TextDecoder, NogginTextDecoder);
  });

  it('should expose Blob on window', () => {
    const win = createWindow();
    assert.strictEqual(win.Blob, NogginBlob);
  });

  it('should expose atob on window', () => {
    const win = createWindow();
    assert.strictEqual(win.atob('SGVsbG8='), 'Hello');
  });

  it('should expose btoa on window', () => {
    const win = createWindow();
    assert.strictEqual(win.btoa('Hello'), 'SGVsbG8=');
  });

  it('should expose structuredClone on window', () => {
    const win = createWindow();
    const obj = { x: 1 };
    const cloned = win.structuredClone(obj);
    assert.deepStrictEqual(cloned, obj);
    assert.notStrictEqual(cloned, obj);
  });

  it('should expose queueMicrotask on window', async () => {
    const win = createWindow();
    let called = false;
    win.queueMicrotask(() => {
      called = true;
    });
    await new Promise<void>((resolve) => {
      win.queueMicrotask(() => resolve());
    });
    assert.strictEqual(called, true);
  });
});
