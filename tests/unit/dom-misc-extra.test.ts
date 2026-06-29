import { describe, it, expect } from '../../src/index.js';
import {
  DataTransferItem,
  DataTransferItemList,
} from '../../src/dom/data-transfer.js';
import { FormData } from '../../src/dom/form-data.js';
import { Selection } from '../../src/dom/selection.js';
import { Document } from '../../src/dom/index.js';
import { Range } from '../../src/dom/range.js';

describe('DataTransferItem', () => {
  it('getAsString calls callback for string items', () => {
    const item = new DataTransferItem('string', 'text/plain', 'hello');
    let received = '';
    item.getAsString((data) => {
      received = data;
    });
    expect(received).toBe('hello');
  });

  it('getAsString does not call callback for non-string items', () => {
    const item = new DataTransferItem('file', 'image/png', null);
    let called = false;
    item.getAsString(() => {
      called = true;
    });
    expect(called).toBe(false);
  });

  it('getAsFile returns null', () => {
    const item = new DataTransferItem('string', 'text/plain', 'hello');
    expect(item.getAsFile()).toBeNull();
  });

  it('DataTransferItemList.add with File returns null', () => {
    const list = new DataTransferItemList();
    // Simulate adding a file-like object (not a string with no type)
    const result = (
      list as unknown as Record<string, (blob: Blob) => unknown>
    ).add(new Blob(['test']));
    expect(result).toBeNull();
  });

  it('DataTransferItemList.remove out of bounds is safe', () => {
    const list = new DataTransferItemList();
    list.remove(5); // Should not throw
    expect(list.length).toBe(0);
  });
});

describe('FormData extra coverage', () => {
  it('values() iterates over values', () => {
    const fd = new FormData();
    fd.append('a', '1');
    fd.append('b', '2');
    const values = [...fd.values()];
    expect(values).toEqual(['1', '2']);
  });

  it('keys() iterates over keys', () => {
    const fd = new FormData();
    fd.append('a', '1');
    fd.append('b', '2');
    const keys = [...fd.keys()];
    expect(keys).toEqual(['a', 'b']);
  });

  it('entries() iterates over entries', () => {
    const fd = new FormData();
    fd.append('a', '1');
    const entries = [...fd.entries()];
    expect(entries).toEqual([['a', '1']]);
  });

  it('Symbol.iterator works', () => {
    const fd = new FormData();
    fd.append('x', 'y');
    const entries = [...fd];
    expect(entries).toEqual([['x', 'y']]);
  });

  it('forEach calls callback for each entry', () => {
    const fd = new FormData();
    fd.append('a', '1');
    fd.append('b', '2');
    const results: string[] = [];
    fd.forEach((value, key) => {
      results.push(`${key}=${value}`);
    });
    expect(results).toEqual(['a=1', 'b=2']);
  });

  it('set replaces existing entries', () => {
    const fd = new FormData();
    fd.append('a', '1');
    fd.append('a', '2');
    fd.set('a', '3');
    expect(fd.getAll('a')).toEqual(['3']);
  });
});

describe('Selection extra coverage', () => {
  it('containsNode with allowPartial=true', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    const span = doc.createElement('span');
    const text = doc.createTextNode('Hello');
    span.appendChild(text);
    div.appendChild(span);
    doc.appendChild(div);

    const selection = new Selection();
    const range = new Range();
    range.selectNodeContents(span);
    selection.addRange(range);

    expect(selection.containsNode(div, true)).toBe(true);
  });

  it('containsNode returns false when no ranges', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    const selection = new Selection();
    expect(selection.containsNode(div)).toBe(false);
    expect(selection.containsNode(div, true)).toBe(false);
  });

  it('collapseToStart throws with no ranges', () => {
    const selection = new Selection();
    expect(() => selection.collapseToStart()).toThrow('InvalidStateError');
  });

  it('collapseToEnd throws with no ranges', () => {
    const selection = new Selection();
    expect(() => selection.collapseToEnd()).toThrow('InvalidStateError');
  });
});

describe('Cookie extra - httpOnly and expires', () => {
  it('getCookieString skips httpOnly cookies', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { CookieJar } = require('../../src/dom/cookie.js');
    const jar = new CookieJar();
    jar.setCookieString('secret=value; HttpOnly');
    expect(jar.getCookieString()).toBe('');
  });

  it('getCookieString skips expired cookies', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { CookieJar } = require('../../src/dom/cookie.js');
    const jar = new CookieJar();
    // Set a cookie with max-age=0 should delete it
    jar.setCookieString('temp=val; Max-Age=0');
    expect(jar.getCookieString()).toBe('');
  });

  it('setCookieString with secure flag', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { CookieJar } = require('../../src/dom/cookie.js');
    const jar = new CookieJar();
    jar.setCookieString('secure=val; Secure');
    expect(jar.getCookieString()).toBe('secure=val');
  });

  it('setCookieString with SameSite', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { CookieJar } = require('../../src/dom/cookie.js');
    const jar = new CookieJar();
    jar.setCookieString('site=val; SameSite=Strict');
    expect(jar.getCookieString()).toBe('site=val');
  });

  it('setCookieString with valid expires date', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { CookieJar } = require('../../src/dom/cookie.js');
    const jar = new CookieJar();
    const future = new Date(Date.now() + 100000).toUTCString();
    jar.setCookieString(`future=val; Expires=${future}`);
    expect(jar.getCookieString()).toBe('future=val');
  });

  it('setCookieString with past expires date deletes cookie', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { CookieJar } = require('../../src/dom/cookie.js');
    const jar = new CookieJar();
    jar.setCookieString('old=val; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
    expect(jar.getCookieString()).toBe('');
  });

  it('setCookieString with domain and path', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { CookieJar } = require('../../src/dom/cookie.js');
    const jar = new CookieJar();
    jar.setCookieString('dom=val; Domain=example.com; Path=/api');
    expect(jar.getCookieString()).toBe('dom=val');
  });

  it('setCookieString ignores empty or invalid strings', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { CookieJar } = require('../../src/dom/cookie.js');
    const jar = new CookieJar();
    jar.setCookieString('');
    jar.setCookieString('noequals');
    jar.setCookieString('=value');
    expect(jar.getCookieString()).toBe('');
  });
});
