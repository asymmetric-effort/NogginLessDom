import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Element } from '../../src/dom/index.js';
import { DOMTokenList } from '../../src/dom/token-list.js';

describe('DOMTokenList', () => {
  function makeEl(className?: string): Element {
    const el = new Element('div');
    if (className) el.setAttribute('class', className);
    return el;
  }

  it('should have correct length', () => {
    const el = makeEl('foo bar baz');
    assert.strictEqual(el.classList.length, 3);
  });

  it('should have length 0 for empty class', () => {
    const el = makeEl();
    assert.strictEqual(el.classList.length, 0);
  });

  it('should support item(index)', () => {
    const el = makeEl('a b c');
    assert.strictEqual(el.classList.item(0), 'a');
    assert.strictEqual(el.classList.item(1), 'b');
    assert.strictEqual(el.classList.item(2), 'c');
    assert.strictEqual(el.classList.item(3), null);
  });

  it('should support contains()', () => {
    const el = makeEl('foo bar');
    assert.strictEqual(el.classList.contains('foo'), true);
    assert.strictEqual(el.classList.contains('baz'), false);
  });

  it('should support add()', () => {
    const el = makeEl('foo');
    el.classList.add('bar', 'baz');
    assert.strictEqual(el.classList.contains('foo'), true);
    assert.strictEqual(el.classList.contains('bar'), true);
    assert.strictEqual(el.classList.contains('baz'), true);
    assert.strictEqual(el.classList.length, 3);
  });

  it('should not duplicate when adding existing token', () => {
    const el = makeEl('foo');
    el.classList.add('foo');
    assert.strictEqual(el.classList.length, 1);
  });

  it('should support remove()', () => {
    const el = makeEl('foo bar baz');
    el.classList.remove('bar');
    assert.strictEqual(el.classList.contains('bar'), false);
    assert.strictEqual(el.classList.length, 2);
  });

  it('should support remove() with multiple tokens', () => {
    const el = makeEl('a b c d');
    el.classList.remove('b', 'd');
    assert.strictEqual(el.classList.length, 2);
    assert.strictEqual(el.classList.contains('a'), true);
    assert.strictEqual(el.classList.contains('c'), true);
  });

  it('should support toggle() adding', () => {
    const el = makeEl('foo');
    const result = el.classList.toggle('bar');
    assert.strictEqual(result, true);
    assert.strictEqual(el.classList.contains('bar'), true);
  });

  it('should support toggle() removing', () => {
    const el = makeEl('foo bar');
    const result = el.classList.toggle('bar');
    assert.strictEqual(result, false);
    assert.strictEqual(el.classList.contains('bar'), false);
  });

  it('should support toggle() with force=true', () => {
    const el = makeEl('foo');
    const result = el.classList.toggle('foo', true);
    assert.strictEqual(result, true);
    assert.strictEqual(el.classList.contains('foo'), true);
  });

  it('should support toggle() with force=false', () => {
    const el = makeEl('foo bar');
    const result = el.classList.toggle('bar', false);
    assert.strictEqual(result, false);
    assert.strictEqual(el.classList.contains('bar'), false);
  });

  it('should support toggle() with force=false when absent', () => {
    const el = makeEl('foo');
    const result = el.classList.toggle('bar', false);
    assert.strictEqual(result, false);
    assert.strictEqual(el.classList.contains('bar'), false);
  });

  it('should support replace()', () => {
    const el = makeEl('foo bar');
    const result = el.classList.replace('foo', 'baz');
    assert.strictEqual(result, true);
    assert.strictEqual(el.classList.contains('foo'), false);
    assert.strictEqual(el.classList.contains('baz'), true);
  });

  it('should return false from replace() when token not found', () => {
    const el = makeEl('foo bar');
    const result = el.classList.replace('nope', 'baz');
    assert.strictEqual(result, false);
  });

  it('should have value property that returns class string', () => {
    const el = makeEl('foo bar');
    assert.strictEqual(el.classList.value, 'foo bar');
  });

  it('should set value property', () => {
    const el = makeEl('foo');
    el.classList.value = 'a b c';
    assert.strictEqual(el.classList.length, 3);
    assert.strictEqual(el.classList.contains('a'), true);
    assert.strictEqual(el.classList.contains('foo'), false);
  });

  it('should support toString()', () => {
    const el = makeEl('foo bar');
    assert.strictEqual(el.classList.toString(), 'foo bar');
  });

  it('should support for..of via Symbol.iterator', () => {
    const el = makeEl('a b c');
    const collected: string[] = [];
    for (const token of el.classList) {
      collected.push(token);
    }
    assert.deepStrictEqual(collected, ['a', 'b', 'c']);
  });

  it('should support entries()', () => {
    const el = makeEl('x y');
    const entries = [...el.classList.entries()];
    assert.deepStrictEqual(entries, [
      [0, 'x'],
      [1, 'y'],
    ]);
  });

  it('should support keys()', () => {
    const el = makeEl('x y');
    const keys = [...el.classList.keys()];
    assert.deepStrictEqual(keys, [0, 1]);
  });

  it('should support values()', () => {
    const el = makeEl('x y');
    const values = [...el.classList.values()];
    assert.deepStrictEqual(values, ['x', 'y']);
  });

  it('should support forEach()', () => {
    const el = makeEl('a b');
    const collected: [string, number][] = [];
    el.classList.forEach((token, index) => {
      collected.push([token, index]);
    });
    assert.deepStrictEqual(collected, [
      ['a', 0],
      ['b', 1],
    ]);
  });

  it('should sync with element className', () => {
    const el = makeEl('foo');
    el.classList.add('bar');
    assert.strictEqual(el.className, 'foo bar');
  });

  it('should be instanceof DOMTokenList', () => {
    const el = makeEl('foo');
    assert.ok(el.classList instanceof DOMTokenList);
  });
});
