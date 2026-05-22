import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DataTransfer,
  DataTransferItemList,
} from '../../src/dom/data-transfer.js';
import { DragEvent } from '../../src/dom/events.js';

describe('DataTransferItemList', () => {
  it('should start with length 0', () => {
    const list = new DataTransferItemList();
    assert.strictEqual(list.length, 0);
  });

  it('should add string items', () => {
    const list = new DataTransferItemList();
    const item = list.add('hello', 'text/plain');
    assert.strictEqual(list.length, 1);
    assert.strictEqual(item.kind, 'string');
    assert.strictEqual(item.type, 'text/plain');
  });

  it('should remove items by index', () => {
    const list = new DataTransferItemList();
    list.add('a', 'text/plain');
    list.add('b', 'text/html');
    assert.strictEqual(list.length, 2);
    list.remove(0);
    assert.strictEqual(list.length, 1);
  });

  it('should clear all items', () => {
    const list = new DataTransferItemList();
    list.add('a', 'text/plain');
    list.add('b', 'text/html');
    list.clear();
    assert.strictEqual(list.length, 0);
  });

  it('should return items by index via get()', () => {
    const list = new DataTransferItemList();
    list.add('hello', 'text/plain');
    const item = list.get(0);
    assert.strictEqual(item?.kind, 'string');
    assert.strictEqual(item?.type, 'text/plain');
  });

  it('should return undefined for out-of-bounds index', () => {
    const list = new DataTransferItemList();
    assert.strictEqual(list.get(0), undefined);
  });
});

describe('DataTransfer', () => {
  it('should set and get data by type', () => {
    const dt = new DataTransfer();
    dt.setData('text/plain', 'hello');
    assert.strictEqual(dt.getData('text/plain'), 'hello');
  });

  it('should return empty string for unknown type', () => {
    const dt = new DataTransfer();
    assert.strictEqual(dt.getData('text/plain'), '');
  });

  it('should overwrite data for same type', () => {
    const dt = new DataTransfer();
    dt.setData('text/plain', 'one');
    dt.setData('text/plain', 'two');
    assert.strictEqual(dt.getData('text/plain'), 'two');
  });

  it('should track types', () => {
    const dt = new DataTransfer();
    dt.setData('text/plain', 'a');
    dt.setData('text/html', '<b>b</b>');
    assert.deepStrictEqual(dt.types.sort(), ['text/html', 'text/plain']);
  });

  it('should not duplicate types on overwrite', () => {
    const dt = new DataTransfer();
    dt.setData('text/plain', 'a');
    dt.setData('text/plain', 'b');
    assert.deepStrictEqual(dt.types, ['text/plain']);
  });

  it('should clearData for a specific type', () => {
    const dt = new DataTransfer();
    dt.setData('text/plain', 'a');
    dt.setData('text/html', '<b>b</b>');
    dt.clearData('text/plain');
    assert.strictEqual(dt.getData('text/plain'), '');
    assert.strictEqual(dt.getData('text/html'), '<b>b</b>');
    assert.deepStrictEqual(dt.types, ['text/html']);
  });

  it('should clearData for all types when no argument', () => {
    const dt = new DataTransfer();
    dt.setData('text/plain', 'a');
    dt.setData('text/html', '<b>b</b>');
    dt.clearData();
    assert.strictEqual(dt.getData('text/plain'), '');
    assert.strictEqual(dt.getData('text/html'), '');
    assert.deepStrictEqual(dt.types, []);
  });

  it('should default dropEffect to "none"', () => {
    const dt = new DataTransfer();
    assert.strictEqual(dt.dropEffect, 'none');
  });

  it('should allow setting dropEffect', () => {
    const dt = new DataTransfer();
    dt.dropEffect = 'copy';
    assert.strictEqual(dt.dropEffect, 'copy');
  });

  it('should default effectAllowed to "uninitialized"', () => {
    const dt = new DataTransfer();
    assert.strictEqual(dt.effectAllowed, 'uninitialized');
  });

  it('should allow setting effectAllowed', () => {
    const dt = new DataTransfer();
    dt.effectAllowed = 'copyMove';
    assert.strictEqual(dt.effectAllowed, 'copyMove');
  });

  it('should have an empty files array', () => {
    const dt = new DataTransfer();
    assert.ok(Array.isArray(dt.files));
    assert.strictEqual(dt.files.length, 0);
  });

  it('should expose items as DataTransferItemList', () => {
    const dt = new DataTransfer();
    assert.ok(dt.items instanceof DataTransferItemList);
  });

  it('should sync items when setData is called', () => {
    const dt = new DataTransfer();
    dt.setData('text/plain', 'hello');
    assert.strictEqual(dt.items.length, 1);
    const item = dt.items.get(0);
    assert.strictEqual(item?.kind, 'string');
    assert.strictEqual(item?.type, 'text/plain');
  });

  it('should setDragImage as no-op without throwing', () => {
    const dt = new DataTransfer();
    assert.doesNotThrow(() => {
      dt.setDragImage(null, 0, 0);
    });
  });
});

describe('DragEvent with DataTransfer', () => {
  it('should default dataTransfer to null', () => {
    const event = new DragEvent('dragstart');
    assert.strictEqual(event.dataTransfer, null);
  });

  it('should accept dataTransfer option', () => {
    const dt = new DataTransfer();
    dt.setData('text/plain', 'drag me');
    const event = new DragEvent('dragstart', { dataTransfer: dt });
    assert.ok(event.dataTransfer instanceof DataTransfer);
    assert.strictEqual(event.dataTransfer.getData('text/plain'), 'drag me');
  });

  it('should retain mouse event properties alongside dataTransfer', () => {
    const dt = new DataTransfer();
    const event = new DragEvent('drop', {
      dataTransfer: dt,
      clientX: 100,
      clientY: 200,
      bubbles: true,
    });
    assert.strictEqual(event.clientX, 100);
    assert.strictEqual(event.clientY, 200);
    assert.strictEqual(event.bubbles, true);
    assert.ok(event.dataTransfer instanceof DataTransfer);
  });
});
