import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Document } from '../../src/dom/index.js';
import { Window } from '../../src/dom/window.js';

describe('Element extras', () => {
  describe('dataset', () => {
    it('should get data attribute via dataset', () => {
      const doc = new Document();
      const el = doc.createElement('div');
      el.setAttribute('data-foo', 'bar');
      assert.strictEqual(el.dataset.foo, 'bar');
    });

    it('should set data attribute via dataset', () => {
      const doc = new Document();
      const el = doc.createElement('div');
      el.dataset.foo = 'bar';
      assert.strictEqual(el.getAttribute('data-foo'), 'bar');
    });

    it('should convert camelCase to kebab-case', () => {
      const doc = new Document();
      const el = doc.createElement('div');
      el.dataset.fooBar = 'baz';
      assert.strictEqual(el.getAttribute('data-foo-bar'), 'baz');
      assert.strictEqual(el.dataset.fooBar, 'baz');
    });

    it('should delete data attribute via delete', () => {
      const doc = new Document();
      const el = doc.createElement('div');
      el.dataset.foo = 'bar';
      delete el.dataset.foo;
      assert.strictEqual(el.hasAttribute('data-foo'), false);
    });

    it('should return undefined for non-existent data attribute', () => {
      const doc = new Document();
      const el = doc.createElement('div');
      assert.strictEqual(el.dataset.nope, undefined);
    });

    it('should list keys via Object.keys based on data attributes', () => {
      const doc = new Document();
      const el = doc.createElement('div');
      el.setAttribute('data-a', '1');
      el.setAttribute('data-b-c', '2');
      const keys = Object.keys(el.dataset);
      assert.ok(keys.includes('a'));
      assert.ok(keys.includes('bC'));
    });
  });

  describe('closest', () => {
    it('should return itself if it matches', () => {
      const doc = new Document();
      const el = doc.createElement('div');
      el.className = 'target';
      doc.appendChild(el);
      assert.strictEqual(el.closest('.target'), el);
    });

    it('should find ancestor', () => {
      const doc = new Document();
      const outer = doc.createElement('div');
      outer.id = 'outer';
      const inner = doc.createElement('span');
      outer.appendChild(inner);
      doc.appendChild(outer);
      assert.strictEqual(inner.closest('#outer'), outer);
    });

    it('should return null if no match', () => {
      const doc = new Document();
      const el = doc.createElement('div');
      doc.appendChild(el);
      assert.strictEqual(el.closest('.nope'), null);
    });
  });

  describe('matches', () => {
    it('should return true if element matches selector', () => {
      const doc = new Document();
      const el = doc.createElement('div');
      el.className = 'foo';
      assert.strictEqual(el.matches('.foo'), true);
    });

    it('should return false if element does not match', () => {
      const doc = new Document();
      const el = doc.createElement('div');
      assert.strictEqual(el.matches('.bar'), false);
    });

    it('should match by tag name', () => {
      const doc = new Document();
      const el = doc.createElement('span');
      assert.strictEqual(el.matches('span'), true);
    });

    it('should match by id', () => {
      const doc = new Document();
      const el = doc.createElement('div');
      el.id = 'test';
      assert.strictEqual(el.matches('#test'), true);
    });
  });

  describe('children', () => {
    it('should return only element children', () => {
      const doc = new Document();
      const parent = doc.createElement('div');
      const child1 = doc.createElement('span');
      const text = doc.createTextNode('hello');
      const child2 = doc.createElement('p');
      parent.appendChild(child1);
      parent.appendChild(text);
      parent.appendChild(child2);
      const children = parent.children;
      assert.strictEqual(children.length, 2);
      assert.strictEqual(children[0], child1);
      assert.strictEqual(children[1], child2);
    });
  });

  describe('childElementCount', () => {
    it('should count element children only', () => {
      const doc = new Document();
      const parent = doc.createElement('div');
      parent.appendChild(doc.createElement('a'));
      parent.appendChild(doc.createTextNode('text'));
      parent.appendChild(doc.createElement('b'));
      assert.strictEqual(parent.childElementCount, 2);
    });
  });

  describe('firstElementChild / lastElementChild', () => {
    it('should return first and last element children', () => {
      const doc = new Document();
      const parent = doc.createElement('div');
      const text = doc.createTextNode('start');
      const first = doc.createElement('a');
      const last = doc.createElement('b');
      parent.appendChild(text);
      parent.appendChild(first);
      parent.appendChild(last);
      assert.strictEqual(parent.firstElementChild, first);
      assert.strictEqual(parent.lastElementChild, last);
    });

    it('should return null if no element children', () => {
      const doc = new Document();
      const parent = doc.createElement('div');
      parent.appendChild(doc.createTextNode('text'));
      assert.strictEqual(parent.firstElementChild, null);
      assert.strictEqual(parent.lastElementChild, null);
    });
  });

  describe('nextElementSibling / previousElementSibling', () => {
    it('should return next and previous element siblings', () => {
      const doc = new Document();
      const parent = doc.createElement('div');
      const a = doc.createElement('a');
      const text = doc.createTextNode('mid');
      const b = doc.createElement('b');
      parent.appendChild(a);
      parent.appendChild(text);
      parent.appendChild(b);
      assert.strictEqual(a.nextElementSibling, b);
      assert.strictEqual(b.previousElementSibling, a);
    });

    it('should return null at boundaries', () => {
      const doc = new Document();
      const parent = doc.createElement('div');
      const only = doc.createElement('span');
      parent.appendChild(only);
      assert.strictEqual(only.nextElementSibling, null);
      assert.strictEqual(only.previousElementSibling, null);
    });
  });

  describe('before / after', () => {
    it('should insert element before', () => {
      const doc = new Document();
      const parent = doc.createElement('div');
      const ref = doc.createElement('span');
      parent.appendChild(ref);
      const newEl = doc.createElement('p');
      ref.before(newEl);
      assert.strictEqual(parent.childNodes[0], newEl);
      assert.strictEqual(parent.childNodes[1], ref);
    });

    it('should insert element after', () => {
      const doc = new Document();
      const parent = doc.createElement('div');
      const ref = doc.createElement('span');
      parent.appendChild(ref);
      const newEl = doc.createElement('p');
      ref.after(newEl);
      assert.strictEqual(parent.childNodes[0], ref);
      assert.strictEqual(parent.childNodes[1], newEl);
    });
  });

  describe('prepend / append', () => {
    it('should prepend child', () => {
      const doc = new Document();
      const parent = doc.createElement('div');
      const existing = doc.createElement('span');
      parent.appendChild(existing);
      const newEl = doc.createElement('p');
      parent.prepend(newEl);
      assert.strictEqual(parent.childNodes[0], newEl);
      assert.strictEqual(parent.childNodes[1], existing);
    });

    it('should append child', () => {
      const doc = new Document();
      const parent = doc.createElement('div');
      const existing = doc.createElement('span');
      parent.appendChild(existing);
      const newEl = doc.createElement('p');
      parent.append(newEl);
      assert.strictEqual(parent.childNodes[0], existing);
      assert.strictEqual(parent.childNodes[1], newEl);
    });

    it('should accept multiple nodes', () => {
      const doc = new Document();
      const parent = doc.createElement('div');
      const a = doc.createElement('a');
      const b = doc.createElement('b');
      parent.append(a, b);
      assert.strictEqual(parent.childNodes.length, 2);
    });
  });

  describe('remove', () => {
    it('should remove element from parent', () => {
      const doc = new Document();
      const parent = doc.createElement('div');
      const child = doc.createElement('span');
      parent.appendChild(child);
      child.remove();
      assert.strictEqual(parent.childNodes.length, 0);
      assert.strictEqual(child.parentNode, null);
    });

    it('should do nothing if no parent', () => {
      const doc = new Document();
      const el = doc.createElement('div');
      // Should not throw
      el.remove();
    });
  });

  describe('replaceWith', () => {
    it('should replace element with another', () => {
      const doc = new Document();
      const parent = doc.createElement('div');
      const old = doc.createElement('span');
      parent.appendChild(old);
      const replacement = doc.createElement('p');
      old.replaceWith(replacement);
      assert.strictEqual(parent.childNodes.length, 1);
      assert.strictEqual(parent.childNodes[0], replacement);
      assert.strictEqual(old.parentNode, null);
    });
  });

  describe('getBoundingClientRect', () => {
    it('should return a DOMRect with all zeros by default', () => {
      const doc = new Document();
      const el = doc.createElement('div');
      const rect = el.getBoundingClientRect();
      assert.strictEqual(rect.x, 0);
      assert.strictEqual(rect.y, 0);
      assert.strictEqual(rect.width, 0);
      assert.strictEqual(rect.height, 0);
      assert.strictEqual(rect.top, 0);
      assert.strictEqual(rect.right, 0);
      assert.strictEqual(rect.bottom, 0);
      assert.strictEqual(rect.left, 0);
    });

    it('should allow setting custom bounds', () => {
      const doc = new Document();
      const el = doc.createElement('div');
      el.setBoundingClientRect({ x: 10, y: 20, width: 100, height: 50 });
      const rect = el.getBoundingClientRect();
      assert.strictEqual(rect.x, 10);
      assert.strictEqual(rect.y, 20);
      assert.strictEqual(rect.width, 100);
      assert.strictEqual(rect.height, 50);
      assert.strictEqual(rect.top, 20);
      assert.strictEqual(rect.right, 110);
      assert.strictEqual(rect.bottom, 70);
      assert.strictEqual(rect.left, 10);
    });
  });
});

describe('matchMedia', () => {
  it('should return a MediaQueryList', () => {
    const win = new Window();
    const mql = win.matchMedia('(max-width: 600px)');
    assert.strictEqual(mql.media, '(max-width: 600px)');
    assert.strictEqual(typeof mql.matches, 'boolean');
  });

  it('should default matches to false', () => {
    const win = new Window();
    const mql = win.matchMedia('(max-width: 600px)');
    assert.strictEqual(mql.matches, false);
  });

  it('should support addEventListener and removeEventListener', () => {
    const win = new Window();
    const mql = win.matchMedia('(max-width: 600px)');
    let called = false;
    const listener = (): void => {
      called = true;
    };
    mql.addEventListener('change', listener);
    mql.removeEventListener('change', listener);
    assert.strictEqual(called, false);
  });

  it('should support deprecated addListener / removeListener', () => {
    const win = new Window();
    const mql = win.matchMedia('(prefers-color-scheme: dark)');
    const listener = (): void => {};
    mql.addListener(listener);
    mql.removeListener(listener);
  });

  it('should allow setting default matches via options', () => {
    const win = new Window({ matchMediaMatches: true });
    const mql = win.matchMedia('(min-width: 100px)');
    assert.strictEqual(mql.matches, true);
  });
});
