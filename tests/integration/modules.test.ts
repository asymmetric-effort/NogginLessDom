import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  describe as nldDescribe,
  it as nldIt,
  expect,
  Document,
  Element,
  TextNode,
  Event,
  Node,
  fn,
  spyOn,
  useFakeTimers,
  useRealTimers,
} from '../../src/index.js';

describe('integration: module exports', () => {
  it('should export all test-runner functions', () => {
    assert.strictEqual(typeof nldDescribe, 'function');
    assert.strictEqual(typeof nldIt, 'function');
  });

  it('should export expect', () => {
    assert.strictEqual(typeof expect, 'function');
  });

  it('should export DOM classes', () => {
    assert.strictEqual(typeof Document, 'function');
    assert.strictEqual(typeof Element, 'function');
    assert.strictEqual(typeof TextNode, 'function');
    assert.strictEqual(typeof Event, 'function');
    assert.strictEqual(typeof Node, 'function');
  });

  it('should export mocking utilities', () => {
    assert.strictEqual(typeof fn, 'function');
    assert.strictEqual(typeof spyOn, 'function');
    assert.strictEqual(typeof useFakeTimers, 'function');
    assert.strictEqual(typeof useRealTimers, 'function');
  });
});

describe('integration: assertions with DOM', () => {
  it('should use expect with DOM elements', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    div.setAttribute('id', 'test');
    div.textContent = 'Hello World';
    doc.appendChild(div);

    const found = doc.getElementById('test');
    expect(found).toBeDefined();
    expect(found!.tagName).toBe('DIV');
    expect(found!.id).toBe('test');
    expect(found!.textContent).toBe('Hello World');
  });

  it('should use expect with nested DOM structure', () => {
    const doc = new Document();
    const ul = doc.createElement('ul');
    const li1 = doc.createElement('li');
    const li2 = doc.createElement('li');
    li1.textContent = 'Item 1';
    li2.textContent = 'Item 2';
    ul.appendChild(li1);
    ul.appendChild(li2);
    doc.appendChild(ul);

    expect(ul.childNodes).toHaveLength(2);
    expect(ul.childNodes[0]!.textContent).toBe('Item 1');
    expect(ul.childNodes[1]!.textContent).toBe('Item 2');
  });
});

describe('integration: mocking with assertions', () => {
  it('should verify mock calls with expect', () => {
    const callback = fn((x: number) => x * 2);
    callback(5);
    callback(10);

    expect(callback.mock.calls).toHaveLength(2);
    expect(callback.mock.calls[0]).toEqual([5]);
    expect(callback.mock.results[0]).toEqual({ type: 'return', value: 10 });
  });

  it('should spy on DOM event handlers', () => {
    const doc = new Document();
    const button = doc.createElement('button');
    const handler = fn();

    button.addEventListener('click', handler);
    button.dispatchEvent(new Event('click'));

    expect(handler.mock.calls).toHaveLength(1);
  });

  it('should combine fake timers with assertions', () => {
    const timer = useFakeTimers(0);
    const callback = fn();

    globalThis.setTimeout(callback, 1000);
    expect(callback.mock.calls).toHaveLength(0);

    timer.advanceTimersByTime(1000);
    expect(callback.mock.calls).toHaveLength(1);

    useRealTimers();
  });
});
