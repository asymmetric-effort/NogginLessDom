import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Document } from '../../src/dom/index.js';

describe('document.cookie', () => {
  it('should set and get a simple cookie', () => {
    const doc = new Document();
    doc.cookie = 'name=value';
    assert.strictEqual(doc.cookie, 'name=value');
  });

  it('should set multiple cookies', () => {
    const doc = new Document();
    doc.cookie = 'a=1';
    doc.cookie = 'b=2';
    const cookies = doc.cookie.split('; ').sort();
    assert.deepStrictEqual(cookies, ['a=1', 'b=2']);
  });

  it('should replace a cookie with the same name', () => {
    const doc = new Document();
    doc.cookie = 'a=1';
    doc.cookie = 'a=2';
    assert.strictEqual(doc.cookie, 'a=2');
  });

  it('should handle cookie with path attribute', () => {
    const doc = new Document();
    doc.cookie = 'a=1; path=/';
    assert.strictEqual(doc.cookie, 'a=1');
  });

  it('should handle cookie with domain attribute', () => {
    const doc = new Document();
    doc.cookie = 'a=1; domain=example.com';
    assert.strictEqual(doc.cookie, 'a=1');
  });

  it('should hide httpOnly cookies from getter', () => {
    const doc = new Document();
    doc.cookie = 'visible=yes';
    doc.cookie = 'secret=hidden; HttpOnly';
    assert.strictEqual(doc.cookie, 'visible=yes');
  });

  it('should handle secure flag', () => {
    const doc = new Document();
    doc.cookie = 'a=1; Secure';
    assert.strictEqual(doc.cookie, 'a=1');
  });

  it('should handle samesite attribute', () => {
    const doc = new Document();
    doc.cookie = 'a=1; SameSite=Strict';
    assert.strictEqual(doc.cookie, 'a=1');
  });

  it('should expire cookies with max-age=0', () => {
    const doc = new Document();
    doc.cookie = 'a=1';
    doc.cookie = 'a=1; max-age=0';
    assert.strictEqual(doc.cookie, '');
  });

  it('should expire cookies with negative max-age', () => {
    const doc = new Document();
    doc.cookie = 'a=1';
    doc.cookie = 'a=; max-age=-1';
    assert.strictEqual(doc.cookie, '');
  });

  it('should expire cookies with past expires date', () => {
    const doc = new Document();
    doc.cookie = 'a=1';
    doc.cookie = 'a=1; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    assert.strictEqual(doc.cookie, '');
  });

  it('should keep cookies with future expires date', () => {
    const doc = new Document();
    doc.cookie = 'a=1; expires=Thu, 01 Jan 2099 00:00:00 GMT';
    assert.strictEqual(doc.cookie, 'a=1');
  });

  it('should return empty string when no cookies set', () => {
    const doc = new Document();
    assert.strictEqual(doc.cookie, '');
  });

  it('should handle cookie value with equals sign', () => {
    const doc = new Document();
    doc.cookie = 'token=abc=def';
    assert.strictEqual(doc.cookie, 'token=abc=def');
  });

  it('should handle cookie with empty value', () => {
    const doc = new Document();
    doc.cookie = 'empty=';
    assert.strictEqual(doc.cookie, 'empty=');
  });
});
