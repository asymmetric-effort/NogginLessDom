import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Document } from '../../src/dom/index.js';

describe('Element methods extra', () => {
  describe('toggleAttribute', () => {
    it('should add attribute when missing', () => {
      const doc = new Document();
      const el = doc.createElement('div');
      el.toggleAttribute('hidden');
      assert.strictEqual(el.hasAttribute('hidden'), true);
      assert.strictEqual(el.getAttribute('hidden'), '');
    });

    it('should remove attribute when present', () => {
      const doc = new Document();
      const el = doc.createElement('div');
      el.setAttribute('hidden', '');
      el.toggleAttribute('hidden');
      assert.strictEqual(el.hasAttribute('hidden'), false);
    });

    it('should always add with force=true', () => {
      const doc = new Document();
      const el = doc.createElement('div');
      el.toggleAttribute('hidden', true);
      assert.strictEqual(el.hasAttribute('hidden'), true);
      // calling again with force=true should keep it
      el.toggleAttribute('hidden', true);
      assert.strictEqual(el.hasAttribute('hidden'), true);
    });

    it('should always remove with force=false', () => {
      const doc = new Document();
      const el = doc.createElement('div');
      el.setAttribute('hidden', '');
      el.toggleAttribute('hidden', false);
      assert.strictEqual(el.hasAttribute('hidden'), false);
      // calling again with force=false when already absent should remain absent
      el.toggleAttribute('hidden', false);
      assert.strictEqual(el.hasAttribute('hidden'), false);
    });

    it('should return boolean indicating attribute presence', () => {
      const doc = new Document();
      const el = doc.createElement('div');
      // adding returns true
      const r1 = el.toggleAttribute('hidden');
      assert.strictEqual(r1, true);
      // removing returns false
      const r2 = el.toggleAttribute('hidden');
      assert.strictEqual(r2, false);
      // force=true returns true
      const r3 = el.toggleAttribute('hidden', true);
      assert.strictEqual(r3, true);
      // force=false returns false
      const r4 = el.toggleAttribute('hidden', false);
      assert.strictEqual(r4, false);
    });
  });

  describe('getAttributeNames', () => {
    it('should return all attribute names', () => {
      const doc = new Document();
      const el = doc.createElement('div');
      el.setAttribute('id', 'foo');
      el.setAttribute('class', 'bar');
      el.setAttribute('data-x', '1');
      const names = el.getAttributeNames();
      assert.deepStrictEqual(names, ['id', 'class', 'data-x']);
    });

    it('should return empty array when no attributes', () => {
      const doc = new Document();
      const el = doc.createElement('div');
      const names = el.getAttributeNames();
      assert.deepStrictEqual(names, []);
    });
  });

  describe('hasAttributes', () => {
    it('should return true when attributes exist', () => {
      const doc = new Document();
      const el = doc.createElement('div');
      el.setAttribute('id', 'test');
      assert.strictEqual(el.hasAttributes(), true);
    });

    it('should return false when no attributes exist', () => {
      const doc = new Document();
      const el = doc.createElement('div');
      assert.strictEqual(el.hasAttributes(), false);
    });
  });

  describe('setAttributeNS / getAttributeNS / removeAttributeNS / hasAttributeNS', () => {
    it('should set and get a namespaced attribute', () => {
      const doc = new Document();
      const el = doc.createElement('div');
      el.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '/foo');
      assert.strictEqual(
        el.getAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href'),
        '/foo',
      );
    });

    it('should set and get with null namespace', () => {
      const doc = new Document();
      const el = doc.createElement('div');
      el.setAttributeNS(null, 'foo', 'bar');
      assert.strictEqual(el.getAttributeNS(null, 'foo'), 'bar');
    });

    it('should return null for missing namespaced attribute', () => {
      const doc = new Document();
      const el = doc.createElement('div');
      assert.strictEqual(el.getAttributeNS('http://example.com', 'nope'), null);
    });

    it('should remove a namespaced attribute', () => {
      const doc = new Document();
      const el = doc.createElement('div');
      el.setAttributeNS(null, 'foo', 'bar');
      el.removeAttributeNS(null, 'foo');
      assert.strictEqual(el.getAttributeNS(null, 'foo'), null);
      assert.strictEqual(el.hasAttributeNS(null, 'foo'), false);
    });

    it('should check existence with hasAttributeNS', () => {
      const doc = new Document();
      const el = doc.createElement('div');
      assert.strictEqual(el.hasAttributeNS(null, 'foo'), false);
      el.setAttributeNS(null, 'foo', 'bar');
      assert.strictEqual(el.hasAttributeNS(null, 'foo'), true);
    });
  });
});
