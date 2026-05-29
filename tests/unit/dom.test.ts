import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  Document,
  Element,
  TextNode,
  Event,
  Node,
} from '../../src/dom/index.js';

describe('DOM', () => {
  describe('Node', () => {
    it('should create a node with type and name', () => {
      const node = new Node(1, 'DIV');
      assert.strictEqual(node.nodeType, 1);
      assert.strictEqual(node.nodeName, 'DIV');
      assert.deepStrictEqual(node.childNodes, []);
      assert.strictEqual(node.parentNode, null);
    });

    it('should appendChild and set parentNode', () => {
      const parent = new Node(1, 'DIV');
      const child = new Node(1, 'SPAN');
      const returned = parent.appendChild(child);
      assert.strictEqual(returned, child);
      assert.strictEqual(child.parentNode, parent);
      assert.strictEqual(parent.childNodes.length, 1);
      assert.strictEqual(parent.childNodes[0], child);
    });

    it('should removeChild', () => {
      const parent = new Node(1, 'DIV');
      const child = new Node(1, 'SPAN');
      parent.appendChild(child);
      parent.removeChild(child);
      assert.strictEqual(parent.childNodes.length, 0);
      assert.strictEqual(child.parentNode, null);
    });

    it('should throw when removing non-existent child', () => {
      const parent = new Node(1, 'DIV');
      const child = new Node(1, 'SPAN');
      assert.throws(() => parent.removeChild(child), /Node not found/);
    });

    it('should get and set textContent', () => {
      const node = new Node(1, 'DIV');
      node.textContent = 'Hello';
      assert.strictEqual(node.textContent, 'Hello');
      assert.strictEqual(node.childNodes.length, 1);
      assert.ok(node.childNodes[0] instanceof TextNode);
    });

    it('should clear children when setting empty textContent', () => {
      const node = new Node(1, 'DIV');
      node.textContent = 'Hello';
      node.textContent = '';
      assert.strictEqual(node.childNodes.length, 0);
      assert.strictEqual(node.textContent, '');
    });
  });

  describe('TextNode', () => {
    it('should create with data', () => {
      const text = new TextNode('Hello');
      assert.strictEqual(text.data, 'Hello');
      assert.strictEqual(text.nodeType, 3);
      assert.strictEqual(text.nodeName, '#text');
      assert.strictEqual(text.textContent, 'Hello');
    });

    it('should update textContent via data', () => {
      const text = new TextNode('Hello');
      text.textContent = 'World';
      assert.strictEqual(text.data, 'World');
    });
  });

  describe('Element', () => {
    it('should create with uppercase tagName', () => {
      const el = new Element('div');
      assert.strictEqual(el.tagName, 'DIV');
      assert.strictEqual(el.nodeType, 1);
    });

    it('should get and set attributes', () => {
      const el = new Element('div');
      el.setAttribute('class', 'test');
      assert.strictEqual(el.getAttribute('class'), 'test');
      assert.strictEqual(el.className, 'test');
      assert.ok(el.hasAttribute('class'));
      assert.strictEqual(el.getAttribute('missing'), null);
    });

    it('should set id via setAttribute', () => {
      const el = new Element('div');
      el.setAttribute('id', 'myId');
      assert.strictEqual(el.id, 'myId');
    });

    it('should remove attributes', () => {
      const el = new Element('div');
      el.setAttribute('data-x', 'y');
      el.removeAttribute('data-x');
      assert.ok(!el.hasAttribute('data-x'));
    });

    it('should add and remove event listeners', () => {
      const el = new Element('div');
      const calls: string[] = [];
      const listener = (): void => {
        calls.push('clicked');
      };
      el.addEventListener('click', listener);
      el.dispatchEvent(new Event('click'));
      assert.strictEqual(calls.length, 1);

      el.removeEventListener('click', listener);
      el.dispatchEvent(new Event('click'));
      assert.strictEqual(calls.length, 1);
    });

    it('should dispatch events and return defaultPrevented status', () => {
      const el = new Element('button');
      el.addEventListener('click', (e) => e.preventDefault());
      const result = el.dispatchEvent(new Event('click', { cancelable: true }));
      assert.strictEqual(result, false);
    });

    describe('classList', () => {
      it('should add classes', () => {
        const el = new Element('div');
        el.classList.add('foo', 'bar');
        assert.ok(el.classList.contains('foo'));
        assert.ok(el.classList.contains('bar'));
      });

      it('should remove classes', () => {
        const el = new Element('div');
        el.classList.add('foo', 'bar');
        el.classList.remove('foo');
        assert.ok(!el.classList.contains('foo'));
        assert.ok(el.classList.contains('bar'));
      });

      it('should toggle classes', () => {
        const el = new Element('div');
        const added = el.classList.toggle('foo');
        assert.strictEqual(added, true);
        assert.ok(el.classList.contains('foo'));
        const removed = el.classList.toggle('foo');
        assert.strictEqual(removed, false);
        assert.ok(!el.classList.contains('foo'));
      });
    });
  });

  describe('Event', () => {
    it('should create with type', () => {
      const e = new Event('click');
      assert.strictEqual(e.type, 'click');
      assert.strictEqual(e.bubbles, false);
      assert.strictEqual(e.cancelable, false);
    });

    it('should create with options', () => {
      const e = new Event('click', { bubbles: true, cancelable: true });
      assert.strictEqual(e.bubbles, true);
      assert.strictEqual(e.cancelable, true);
    });

    it('should preventDefault when cancelable', () => {
      const e = new Event('click', { cancelable: true });
      e.preventDefault();
      assert.strictEqual(e.defaultPrevented, true);
    });

    it('should not preventDefault when not cancelable', () => {
      const e = new Event('click', { cancelable: false });
      e.preventDefault();
      assert.strictEqual(e.defaultPrevented, false);
    });

    it('should stopPropagation', () => {
      const e = new Event('click');
      e.stopPropagation();
      assert.strictEqual(e.propagationStopped, true);
    });
  });

  describe('Document', () => {
    it('should create with correct nodeType', () => {
      const doc = new Document();
      assert.strictEqual(doc.nodeType, 9);
      assert.strictEqual(doc.nodeName, '#document');
    });

    it('should createElement', () => {
      const doc = new Document();
      const div = doc.createElement('div');
      assert.ok(div instanceof Element);
      assert.strictEqual(div.tagName, 'DIV');
    });

    it('should createTextNode', () => {
      const doc = new Document();
      const text = doc.createTextNode('Hello');
      assert.ok(text instanceof TextNode);
      assert.strictEqual(text.data, 'Hello');
    });

    it('should getElementById', () => {
      const doc = new Document();
      const div = doc.createElement('div');
      div.setAttribute('id', 'test');
      doc.appendChild(div);
      const found = doc.getElementById('test');
      assert.strictEqual(found, div);
    });

    it('should return null for missing getElementById', () => {
      const doc = new Document();
      assert.strictEqual(doc.getElementById('missing'), null);
    });

    it('should find nested elements by id', () => {
      const doc = new Document();
      const outer = doc.createElement('div');
      const inner = doc.createElement('span');
      inner.setAttribute('id', 'deep');
      outer.appendChild(inner);
      doc.appendChild(outer);
      assert.strictEqual(doc.getElementById('deep'), inner);
    });
  });

  // GHSA-4r52-c9x8-qr87: Unbounded re-entrant event dispatch
  describe('re-entrant event dispatch depth limit', () => {
    it('should throw when dispatch depth exceeds MAX_DISPATCH_DEPTH', () => {
      const el = new Element('div');
      // Add a listener that re-dispatches the same event type
      el.addEventListener('test-recurse', () => {
        el.dispatchEvent(new Event('test-recurse'));
      });

      assert.throws(
        () => el.dispatchEvent(new Event('test-recurse')),
        /Maximum event dispatch depth.*exceeded/,
      );
    });

    it('should allow normal dispatch within depth limit', () => {
      const el = new Element('div');
      let count = 0;
      el.addEventListener('normal', () => {
        count++;
      });
      el.dispatchEvent(new Event('normal'));
      el.dispatchEvent(new Event('normal'));
      assert.strictEqual(count, 2);
    });

    it('should recover dispatch depth after error', () => {
      const el = new Element('div');
      el.addEventListener('bad', () => {
        el.dispatchEvent(new Event('bad'));
      });

      assert.throws(() => el.dispatchEvent(new Event('bad')));

      // After the error, dispatch depth should be reset, so normal dispatch works
      let called = false;
      const el2 = new Element('span');
      el2.addEventListener('ok', () => {
        called = true;
      });
      el2.dispatchEvent(new Event('ok'));
      assert.strictEqual(called, true);
    });
  });
});
