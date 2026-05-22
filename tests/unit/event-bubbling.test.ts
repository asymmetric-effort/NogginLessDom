import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Document, Event } from '../../src/dom/index.js';

describe('Event bubbling', () => {
  it('should propagate bubbles:true event to parent', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    const span = doc.createElement('span');
    div.appendChild(span);

    let bubbled = false;
    div.addEventListener('click', () => {
      bubbled = true;
    });
    span.dispatchEvent(new Event('click', { bubbles: true }));
    assert.strictEqual(bubbled, true);
  });

  it('should propagate through multiple ancestors', () => {
    const doc = new Document();
    const grandparent = doc.createElement('div');
    const parent = doc.createElement('div');
    const child = doc.createElement('span');
    grandparent.appendChild(parent);
    parent.appendChild(child);

    const order: string[] = [];
    parent.addEventListener('click', () => order.push('parent'));
    grandparent.addEventListener('click', () => order.push('grandparent'));

    child.dispatchEvent(new Event('click', { bubbles: true }));
    assert.deepStrictEqual(order, ['parent', 'grandparent']);
  });

  it('should NOT propagate when bubbles is false', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    const span = doc.createElement('span');
    div.appendChild(span);

    let bubbled = false;
    div.addEventListener('click', () => {
      bubbled = true;
    });
    span.dispatchEvent(new Event('click', { bubbles: false }));
    assert.strictEqual(bubbled, false);
  });

  it('should stop bubbling when stopPropagation is called', () => {
    const doc = new Document();
    const grandparent = doc.createElement('div');
    const parent = doc.createElement('div');
    const child = doc.createElement('span');
    grandparent.appendChild(parent);
    parent.appendChild(child);

    const order: string[] = [];
    parent.addEventListener('click', (e) => {
      order.push('parent');
      e.stopPropagation();
    });
    grandparent.addEventListener('click', () => order.push('grandparent'));

    child.dispatchEvent(new Event('click', { bubbles: true }));
    assert.deepStrictEqual(order, ['parent']);
  });

  it('should fire multiple listeners on same ancestor', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    const span = doc.createElement('span');
    div.appendChild(span);

    const calls: number[] = [];
    div.addEventListener('click', () => calls.push(1));
    div.addEventListener('click', () => calls.push(2));

    span.dispatchEvent(new Event('click', { bubbles: true }));
    assert.deepStrictEqual(calls, [1, 2]);
  });

  it('should set event.target to the original target element', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    const span = doc.createElement('span');
    div.appendChild(span);

    let receivedTarget: EventTarget | null = null;
    div.addEventListener('click', (e) => {
      receivedTarget = e.target;
    });

    span.dispatchEvent(new Event('click', { bubbles: true }));
    assert.strictEqual(receivedTarget, span);
  });

  it('should set event.currentTarget to the current element handling the event', () => {
    const doc = new Document();
    const div = doc.createElement('div');
    const span = doc.createElement('span');
    div.appendChild(span);

    let targetOnChild: EventTarget | null = null;
    let currentTargetOnChild: EventTarget | null = null;
    let targetOnParent: EventTarget | null = null;
    let currentTargetOnParent: EventTarget | null = null;

    span.addEventListener('click', (e) => {
      targetOnChild = e.target;
      currentTargetOnChild = e.currentTarget;
    });
    div.addEventListener('click', (e) => {
      targetOnParent = e.target;
      currentTargetOnParent = e.currentTarget;
    });

    span.dispatchEvent(new Event('click', { bubbles: true }));

    assert.strictEqual(targetOnChild, span);
    assert.strictEqual(currentTargetOnChild, span);
    assert.strictEqual(targetOnParent, span);
    assert.strictEqual(currentTargetOnParent, div);
  });
});
