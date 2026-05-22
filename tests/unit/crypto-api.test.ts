import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createWindow } from '../../src/dom/window.js';

describe('Crypto API', () => {
  it('window.crypto exists', () => {
    const window = createWindow();
    assert.ok(window.crypto);
    assert.strictEqual(typeof window.crypto, 'object');
  });

  it('window.crypto.randomUUID() returns string matching UUID format', () => {
    const window = createWindow();
    const uuid = window.crypto.randomUUID();
    assert.strictEqual(typeof uuid, 'string');
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
    assert.match(uuid, uuidRegex);
  });

  it('window.crypto.getRandomValues(new Uint8Array(16)) fills array', () => {
    const window = createWindow();
    const arr = new Uint8Array(16);
    window.crypto.getRandomValues(arr);
    // It's astronomically unlikely that all 16 bytes remain zero
    const allZero = arr.every((v) => v === 0);
    assert.strictEqual(allZero, false);
  });

  it('window.crypto.getRandomValues returns the same typed array passed in', () => {
    const window = createWindow();
    const arr = new Uint8Array(16);
    const result = window.crypto.getRandomValues(arr);
    assert.strictEqual(result, arr);
  });
});
