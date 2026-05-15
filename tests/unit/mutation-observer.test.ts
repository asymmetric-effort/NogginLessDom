import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Document, TextNode } from '../../src/dom/index.js';
import {
  MutationObserver,
  MutationRecord,
} from '../../src/dom/mutation-observer.js';

describe('MutationObserver', () => {
  describe('constructor', () => {
    it('should create a MutationObserver with a callback', () => {
      const observer = new MutationObserver(() => {});
      assert.ok(observer instanceof MutationObserver);
    });
  });

  describe('observe and disconnect', () => {
    it('should observe a target node', () => {
      const doc = new Document();
      const div = doc.createElement('div');
      const observer = new MutationObserver(() => {});
      // Should not throw
      observer.observe(div, { childList: true });
      observer.disconnect();
    });

    it('should stop observing after disconnect', async () => {
      const doc = new Document();
      const div = doc.createElement('div');
      const records: MutationRecord[] = [];
      const observer = new MutationObserver((mutations) => {
        records.push(...mutations);
      });
      observer.observe(div, { childList: true });
      observer.disconnect();

      const child = doc.createElement('span');
      div.appendChild(child);
      await Promise.resolve();
      assert.strictEqual(records.length, 0);
    });
  });

  describe('childList mutations', () => {
    it('should detect appendChild', async () => {
      const doc = new Document();
      const div = doc.createElement('div');
      const records: MutationRecord[] = [];
      const observer = new MutationObserver((mutations) => {
        records.push(...mutations);
      });
      observer.observe(div, { childList: true });

      const child = doc.createElement('span');
      div.appendChild(child);

      await Promise.resolve();
      assert.strictEqual(records.length, 1);
      assert.strictEqual(records[0]!.type, 'childList');
      assert.strictEqual(records[0]!.target, div);
      assert.strictEqual(records[0]!.addedNodes.length, 1);
      assert.strictEqual(records[0]!.addedNodes[0], child);
      assert.strictEqual(records[0]!.removedNodes.length, 0);
      observer.disconnect();
    });

    it('should detect removeChild', async () => {
      const doc = new Document();
      const div = doc.createElement('div');
      const child = doc.createElement('span');
      div.appendChild(child);

      const records: MutationRecord[] = [];
      const observer = new MutationObserver((mutations) => {
        records.push(...mutations);
      });
      observer.observe(div, { childList: true });

      div.removeChild(child);

      await Promise.resolve();
      assert.strictEqual(records.length, 1);
      assert.strictEqual(records[0]!.type, 'childList');
      assert.strictEqual(records[0]!.removedNodes.length, 1);
      assert.strictEqual(records[0]!.removedNodes[0], child);
      assert.strictEqual(records[0]!.addedNodes.length, 0);
      observer.disconnect();
    });

    it('should detect insertBefore', async () => {
      const doc = new Document();
      const div = doc.createElement('div');
      const existing = doc.createElement('span');
      div.appendChild(existing);

      const records: MutationRecord[] = [];
      const observer = new MutationObserver((mutations) => {
        records.push(...mutations);
      });
      observer.observe(div, { childList: true });

      const newChild = doc.createElement('p');
      div.insertBefore(newChild, existing);

      await Promise.resolve();
      assert.strictEqual(records.length, 1);
      assert.strictEqual(records[0]!.type, 'childList');
      assert.strictEqual(records[0]!.addedNodes[0], newChild);
      assert.strictEqual(records[0]!.nextSibling, existing);
      observer.disconnect();
    });

    it('should detect replaceChild', async () => {
      const doc = new Document();
      const div = doc.createElement('div');
      const oldChild = doc.createElement('span');
      div.appendChild(oldChild);

      const records: MutationRecord[] = [];
      const observer = new MutationObserver((mutations) => {
        records.push(...mutations);
      });
      observer.observe(div, { childList: true });

      const newChild = doc.createElement('p');
      div.replaceChild(newChild, oldChild);

      await Promise.resolve();
      // replaceChild should produce a record with both addedNodes and removedNodes
      assert.ok(records.length >= 1);
      const addedFound = records.some((r) => r.addedNodes.includes(newChild));
      const removedFound = records.some((r) =>
        r.removedNodes.includes(oldChild),
      );
      assert.ok(addedFound);
      assert.ok(removedFound);
      observer.disconnect();
    });

    it('should include previousSibling and nextSibling', async () => {
      const doc = new Document();
      const div = doc.createElement('div');
      const first = doc.createElement('span');
      const last = doc.createElement('em');
      div.appendChild(first);
      div.appendChild(last);

      const records: MutationRecord[] = [];
      const observer = new MutationObserver((mutations) => {
        records.push(...mutations);
      });
      observer.observe(div, { childList: true });

      const middle = doc.createElement('p');
      div.insertBefore(middle, last);

      await Promise.resolve();
      assert.strictEqual(records.length, 1);
      assert.strictEqual(records[0]!.previousSibling, first);
      assert.strictEqual(records[0]!.nextSibling, last);
      observer.disconnect();
    });
  });

  describe('attribute mutations', () => {
    it('should detect setAttribute', async () => {
      const doc = new Document();
      const div = doc.createElement('div');
      const records: MutationRecord[] = [];
      const observer = new MutationObserver((mutations) => {
        records.push(...mutations);
      });
      observer.observe(div, { attributes: true });

      div.setAttribute('class', 'test');

      await Promise.resolve();
      assert.strictEqual(records.length, 1);
      assert.strictEqual(records[0]!.type, 'attributes');
      assert.strictEqual(records[0]!.target, div);
      assert.strictEqual(records[0]!.attributeName, 'class');
      observer.disconnect();
    });

    it('should detect removeAttribute', async () => {
      const doc = new Document();
      const div = doc.createElement('div');
      div.setAttribute('data-id', '123');

      const records: MutationRecord[] = [];
      const observer = new MutationObserver((mutations) => {
        records.push(...mutations);
      });
      observer.observe(div, { attributes: true });

      div.removeAttribute('data-id');

      await Promise.resolve();
      assert.strictEqual(records.length, 1);
      assert.strictEqual(records[0]!.type, 'attributes');
      assert.strictEqual(records[0]!.attributeName, 'data-id');
      observer.disconnect();
    });

    it('should capture old attribute value with attributeOldValue', async () => {
      const doc = new Document();
      const div = doc.createElement('div');
      div.setAttribute('class', 'old-class');

      const records: MutationRecord[] = [];
      const observer = new MutationObserver((mutations) => {
        records.push(...mutations);
      });
      observer.observe(div, { attributes: true, attributeOldValue: true });

      div.setAttribute('class', 'new-class');

      await Promise.resolve();
      assert.strictEqual(records[0]!.oldValue, 'old-class');
      observer.disconnect();
    });

    it('should not capture old value without attributeOldValue', async () => {
      const doc = new Document();
      const div = doc.createElement('div');
      div.setAttribute('class', 'old-class');

      const records: MutationRecord[] = [];
      const observer = new MutationObserver((mutations) => {
        records.push(...mutations);
      });
      observer.observe(div, { attributes: true });

      div.setAttribute('class', 'new-class');

      await Promise.resolve();
      assert.strictEqual(records[0]!.oldValue, null);
      observer.disconnect();
    });
  });

  describe('attributeFilter', () => {
    it('should only observe filtered attributes', async () => {
      const doc = new Document();
      const div = doc.createElement('div');
      const records: MutationRecord[] = [];
      const observer = new MutationObserver((mutations) => {
        records.push(...mutations);
      });
      observer.observe(div, { attributes: true, attributeFilter: ['class'] });

      div.setAttribute('id', 'test');
      div.setAttribute('class', 'test');

      await Promise.resolve();
      assert.strictEqual(records.length, 1);
      assert.strictEqual(records[0]!.attributeName, 'class');
      observer.disconnect();
    });
  });

  describe('characterData mutations', () => {
    it('should detect text node data changes', async () => {
      const doc = new Document();
      const div = doc.createElement('div');
      const text = new TextNode('hello');
      div.appendChild(text);

      const records: MutationRecord[] = [];
      const observer = new MutationObserver((mutations) => {
        records.push(...mutations);
      });
      observer.observe(div, { characterData: true, subtree: true });

      text.data = 'world';

      await Promise.resolve();
      assert.strictEqual(records.length, 1);
      assert.strictEqual(records[0]!.type, 'characterData');
      assert.strictEqual(records[0]!.target, text);
      observer.disconnect();
    });

    it('should capture old character data value with characterDataOldValue', async () => {
      const doc = new Document();
      const div = doc.createElement('div');
      const text = new TextNode('hello');
      div.appendChild(text);

      const records: MutationRecord[] = [];
      const observer = new MutationObserver((mutations) => {
        records.push(...mutations);
      });
      observer.observe(div, {
        characterData: true,
        characterDataOldValue: true,
        subtree: true,
      });

      text.data = 'world';

      await Promise.resolve();
      assert.strictEqual(records[0]!.oldValue, 'hello');
      observer.disconnect();
    });
  });

  describe('subtree', () => {
    it('should observe mutations in subtree', async () => {
      const doc = new Document();
      const div = doc.createElement('div');
      const child = doc.createElement('span');
      div.appendChild(child);

      const records: MutationRecord[] = [];
      const observer = new MutationObserver((mutations) => {
        records.push(...mutations);
      });
      observer.observe(div, { childList: true, subtree: true });

      const grandchild = doc.createElement('p');
      child.appendChild(grandchild);

      await Promise.resolve();
      assert.strictEqual(records.length, 1);
      assert.strictEqual(records[0]!.target, child);
      assert.strictEqual(records[0]!.addedNodes[0], grandchild);
      observer.disconnect();
    });

    it('should observe attribute mutations in subtree', async () => {
      const doc = new Document();
      const div = doc.createElement('div');
      const child = doc.createElement('span');
      div.appendChild(child);

      const records: MutationRecord[] = [];
      const observer = new MutationObserver((mutations) => {
        records.push(...mutations);
      });
      observer.observe(div, { attributes: true, subtree: true });

      child.setAttribute('class', 'test');

      await Promise.resolve();
      assert.strictEqual(records.length, 1);
      assert.strictEqual(records[0]!.type, 'attributes');
      assert.strictEqual(records[0]!.target, child);
      observer.disconnect();
    });

    it('should not observe mutations outside subtree', async () => {
      const doc = new Document();
      const div = doc.createElement('div');
      const sibling = doc.createElement('span');

      const records: MutationRecord[] = [];
      const observer = new MutationObserver((mutations) => {
        records.push(...mutations);
      });
      observer.observe(div, { childList: true, subtree: true });

      sibling.appendChild(doc.createElement('p'));

      await Promise.resolve();
      assert.strictEqual(records.length, 0);
      observer.disconnect();
    });
  });

  describe('takeRecords', () => {
    it('should return queued records and clear the queue', async () => {
      const doc = new Document();
      const div = doc.createElement('div');
      const callbackRecords: MutationRecord[] = [];
      const observer = new MutationObserver((mutations) => {
        callbackRecords.push(...mutations);
      });
      observer.observe(div, { childList: true });

      const child = doc.createElement('span');
      div.appendChild(child);

      // takeRecords before microtask fires
      const taken = observer.takeRecords();
      assert.strictEqual(taken.length, 1);
      assert.strictEqual(taken[0]!.addedNodes[0], child);

      // After microtask, callback should not fire since records were taken
      await Promise.resolve();
      assert.strictEqual(callbackRecords.length, 0);
      observer.disconnect();
    });
  });

  describe('MutationRecord defaults', () => {
    it('should have correct defaults on record', async () => {
      const doc = new Document();
      const div = doc.createElement('div');
      const records: MutationRecord[] = [];
      const observer = new MutationObserver((mutations) => {
        records.push(...mutations);
      });
      observer.observe(div, { attributes: true });

      div.setAttribute('id', 'test');

      await Promise.resolve();
      const record = records[0]!;
      assert.strictEqual(record.type, 'attributes');
      assert.strictEqual(record.attributeNamespace, null);
      assert.strictEqual(record.addedNodes.length, 0);
      assert.strictEqual(record.removedNodes.length, 0);
      assert.strictEqual(record.previousSibling, null);
      assert.strictEqual(record.nextSibling, null);
      observer.disconnect();
    });
  });

  describe('callback receives observer as second argument', () => {
    it('should pass the observer to the callback', async () => {
      const doc = new Document();
      const div = doc.createElement('div');
      let receivedObserver: unknown = null;
      const observer = new MutationObserver((_mutations, obs) => {
        receivedObserver = obs;
      });
      observer.observe(div, { childList: true });

      div.appendChild(doc.createElement('span'));

      await Promise.resolve();
      assert.strictEqual(receivedObserver, observer);
      observer.disconnect();
    });
  });
});
