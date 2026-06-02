import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DataTransfer,
  DataTransferItemList,
  DataTransferItem,
} from '../../src/dom/data-transfer.js';
import { DragEvent } from '../../src/dom/events.js';

describe('Drag and Drop API', () => {
  describe('DataTransfer', () => {
    it('setData/getData roundtrip', () => {
      const dt = new DataTransfer();
      dt.setData('text/plain', 'hello');
      assert.equal(dt.getData('text/plain'), 'hello');
    });

    it('getData returns empty string for unknown type', () => {
      const dt = new DataTransfer();
      assert.equal(dt.getData('unknown'), '');
    });

    it('setData overwrites existing data', () => {
      const dt = new DataTransfer();
      dt.setData('text/plain', 'first');
      dt.setData('text/plain', 'second');
      assert.equal(dt.getData('text/plain'), 'second');
    });

    it('types returns all set types', () => {
      const dt = new DataTransfer();
      dt.setData('text/plain', 'a');
      dt.setData('text/html', 'b');
      assert.deepEqual(dt.types, ['text/plain', 'text/html']);
    });

    it('clearData with type removes specific type', () => {
      const dt = new DataTransfer();
      dt.setData('text/plain', 'a');
      dt.setData('text/html', 'b');
      dt.clearData('text/plain');
      assert.equal(dt.getData('text/plain'), '');
      assert.equal(dt.getData('text/html'), 'b');
    });

    it('clearData without type clears all data', () => {
      const dt = new DataTransfer();
      dt.setData('text/plain', 'a');
      dt.setData('text/html', 'b');
      dt.clearData();
      assert.deepEqual(dt.types, []);
      assert.equal(dt.getData('text/plain'), '');
    });

    it('has dropEffect and effectAllowed defaults', () => {
      const dt = new DataTransfer();
      assert.equal(dt.dropEffect, 'none');
      assert.equal(dt.effectAllowed, 'uninitialized');
    });

    it('dropEffect and effectAllowed are settable', () => {
      const dt = new DataTransfer();
      dt.dropEffect = 'copy';
      dt.effectAllowed = 'move';
      assert.equal(dt.dropEffect, 'copy');
      assert.equal(dt.effectAllowed, 'move');
    });

    it('files is an empty array by default', () => {
      const dt = new DataTransfer();
      assert.equal(dt.files.length, 0);
    });

    it('setDragImage is a no-op', () => {
      const dt = new DataTransfer();
      // Should not throw
      dt.setDragImage({}, 0, 0);
    });

    it('items stays in sync with setData', () => {
      const dt = new DataTransfer();
      dt.setData('text/plain', 'hello');
      assert.equal(dt.items.length, 1);
      dt.setData('text/html', '<b>hi</b>');
      assert.equal(dt.items.length, 2);
    });

    it('items syncs after clearData with specific type', () => {
      const dt = new DataTransfer();
      dt.setData('text/plain', 'a');
      dt.setData('text/html', 'b');
      dt.clearData('text/plain');
      assert.equal(dt.items.length, 1);
    });
  });

  describe('DataTransferItemList', () => {
    it('add and length', () => {
      const list = new DataTransferItemList();
      assert.equal(list.length, 0);
      const item = list.add('hello', 'text/plain');
      assert.equal(list.length, 1);
      assert.notEqual(item, null);
    });

    it('remove decreases length', () => {
      const list = new DataTransferItemList();
      list.add('a', 'text/plain');
      list.add('b', 'text/html');
      assert.equal(list.length, 2);
      list.remove(0);
      assert.equal(list.length, 1);
    });

    it('remove with out-of-range index is no-op', () => {
      const list = new DataTransferItemList();
      list.add('a', 'text/plain');
      list.remove(5);
      list.remove(-1);
      assert.equal(list.length, 1);
    });

    it('clear empties the list', () => {
      const list = new DataTransferItemList();
      list.add('a', 'text/plain');
      list.add('b', 'text/html');
      list.clear();
      assert.equal(list.length, 0);
    });

    it('get returns item at index', () => {
      const list = new DataTransferItemList();
      list.add('hello', 'text/plain');
      const item = list.get(0);
      assert.notEqual(item, undefined);
      assert.equal(item!.kind, 'string');
      assert.equal(item!.type, 'text/plain');
    });

    it('get returns undefined for invalid index', () => {
      const list = new DataTransferItemList();
      assert.equal(list.get(0), undefined);
    });
  });

  describe('DataTransferItem', () => {
    it('has kind and type', () => {
      const item = new DataTransferItem('string', 'text/plain', 'data');
      assert.equal(item.kind, 'string');
      assert.equal(item.type, 'text/plain');
    });

    it('getAsString calls callback with data', () => {
      const item = new DataTransferItem('string', 'text/plain', 'hello world');
      let result = '';
      item.getAsString((data) => {
        result = data;
      });
      assert.equal(result, 'hello world');
    });

    it('getAsString does not call callback for file items', () => {
      const item = new DataTransferItem('file', 'image/png', null);
      let called = false;
      item.getAsString(() => {
        called = true;
      });
      assert.equal(called, false);
    });

    it('getAsFile returns null', () => {
      const item = new DataTransferItem('string', 'text/plain', 'data');
      assert.equal(item.getAsFile(), null);
    });
  });

  describe('DragEvent', () => {
    it('has dataTransfer property', () => {
      const dt = new DataTransfer();
      dt.setData('text/plain', 'dragged');
      const ev = new DragEvent('dragstart', { dataTransfer: dt });
      assert.equal(ev.dataTransfer, dt);
      assert.equal(ev.dataTransfer!.getData('text/plain'), 'dragged');
    });

    it('dataTransfer defaults to null', () => {
      const ev = new DragEvent('dragstart');
      assert.equal(ev.dataTransfer, null);
    });

    it('inherits MouseEvent properties', () => {
      const ev = new DragEvent('drop', {
        clientX: 50,
        clientY: 60,
        bubbles: true,
      });
      assert.equal(ev.clientX, 50);
      assert.equal(ev.clientY, 60);
      assert.equal(ev.bubbles, true);
      assert.equal(ev.type, 'drop');
    });
  });
});
