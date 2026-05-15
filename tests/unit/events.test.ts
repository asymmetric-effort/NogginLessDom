import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Event } from '../../src/dom/index.js';
import {
  CustomEvent,
  MouseEvent,
  KeyboardEvent,
  FocusEvent,
  InputEvent,
} from '../../src/dom/events.js';

describe('CustomEvent', () => {
  it('should extend Event', () => {
    const ev = new CustomEvent('myevent');
    assert.ok(ev instanceof Event);
    assert.strictEqual(ev.type, 'myevent');
  });

  it('should have detail property', () => {
    const ev = new CustomEvent('myevent', { detail: { foo: 42 } });
    assert.deepStrictEqual(ev.detail, { foo: 42 });
  });

  it('should default detail to null', () => {
    const ev = new CustomEvent('myevent');
    assert.strictEqual(ev.detail, null);
  });

  it('should support bubbles and cancelable', () => {
    const ev = new CustomEvent('x', { bubbles: true, cancelable: true });
    assert.strictEqual(ev.bubbles, true);
    assert.strictEqual(ev.cancelable, true);
  });
});

describe('MouseEvent', () => {
  it('should extend Event', () => {
    const ev = new MouseEvent('click');
    assert.ok(ev instanceof Event);
    assert.strictEqual(ev.type, 'click');
  });

  it('should have mouse properties with defaults', () => {
    const ev = new MouseEvent('click');
    assert.strictEqual(ev.clientX, 0);
    assert.strictEqual(ev.clientY, 0);
    assert.strictEqual(ev.button, 0);
    assert.strictEqual(ev.buttons, 0);
    assert.strictEqual(ev.altKey, false);
    assert.strictEqual(ev.ctrlKey, false);
    assert.strictEqual(ev.shiftKey, false);
    assert.strictEqual(ev.metaKey, false);
  });

  it('should accept custom mouse properties', () => {
    const ev = new MouseEvent('click', {
      clientX: 100,
      clientY: 200,
      button: 2,
      buttons: 3,
      altKey: true,
      ctrlKey: true,
      shiftKey: true,
      metaKey: true,
    });
    assert.strictEqual(ev.clientX, 100);
    assert.strictEqual(ev.clientY, 200);
    assert.strictEqual(ev.button, 2);
    assert.strictEqual(ev.buttons, 3);
    assert.strictEqual(ev.altKey, true);
    assert.strictEqual(ev.ctrlKey, true);
    assert.strictEqual(ev.shiftKey, true);
    assert.strictEqual(ev.metaKey, true);
  });
});

describe('KeyboardEvent', () => {
  it('should extend Event', () => {
    const ev = new KeyboardEvent('keydown');
    assert.ok(ev instanceof Event);
  });

  it('should have keyboard properties with defaults', () => {
    const ev = new KeyboardEvent('keydown');
    assert.strictEqual(ev.key, '');
    assert.strictEqual(ev.code, '');
    assert.strictEqual(ev.altKey, false);
    assert.strictEqual(ev.ctrlKey, false);
    assert.strictEqual(ev.shiftKey, false);
    assert.strictEqual(ev.metaKey, false);
    assert.strictEqual(ev.repeat, false);
  });

  it('should accept custom keyboard properties', () => {
    const ev = new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      altKey: true,
      repeat: true,
    });
    assert.strictEqual(ev.key, 'Enter');
    assert.strictEqual(ev.code, 'Enter');
    assert.strictEqual(ev.altKey, true);
    assert.strictEqual(ev.repeat, true);
  });
});

describe('FocusEvent', () => {
  it('should extend Event', () => {
    const ev = new FocusEvent('focus');
    assert.ok(ev instanceof Event);
  });

  it('should have relatedTarget default to null', () => {
    const ev = new FocusEvent('focus');
    assert.strictEqual(ev.relatedTarget, null);
  });

  it('should accept relatedTarget', () => {
    const target = {} as unknown as EventTarget;
    const ev = new FocusEvent('blur', { relatedTarget: target });
    assert.strictEqual(ev.relatedTarget, target);
  });
});

describe('InputEvent', () => {
  it('should extend Event', () => {
    const ev = new InputEvent('input');
    assert.ok(ev instanceof Event);
  });

  it('should have defaults', () => {
    const ev = new InputEvent('input');
    assert.strictEqual(ev.data, null);
    assert.strictEqual(ev.inputType, '');
  });

  it('should accept custom properties', () => {
    const ev = new InputEvent('input', {
      data: 'hello',
      inputType: 'insertText',
    });
    assert.strictEqual(ev.data, 'hello');
    assert.strictEqual(ev.inputType, 'insertText');
  });
});
